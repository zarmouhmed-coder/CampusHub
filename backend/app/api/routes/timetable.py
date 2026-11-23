"""Timetable (with conflict detection) and attendance."""

import uuid
from datetime import datetime, timedelta
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session

from app.api.crud import check_refs, get_scoped
from app.api.deps import Ctx, DbSession, require
from app.api.routes.teaching import owned_course
from app.core.errors import AppError, InvalidReferenceError
from app.models import (
    Attendance,
    ClassSession,
    Cohort,
    Course,
    Enrollment,
    Membership,
    Room,
    Unit,
    User,
)
from app.schemas.campus import (
    AttendanceEntry,
    AttendanceFix,
    AttendanceRecord,
    AttendanceUpdate,
    MyAttendance,
    SessionCreate,
    SessionRead,
    SessionUpdate,
)
from app.schemas.teaching import Ref
from app.services import audit

router = APIRouter(tags=["timetable"])
Planner = Annotated[Ctx, Depends(require("timetable.manage", "timetable"))]
Reader = Annotated[Ctx, Depends(require("timetable.read", "timetable"))]
Recorder = Annotated[Ctx, Depends(require("attendance.record", "attendance"))]


def _read(db: Session, s: ClassSession) -> SessionRead:
    course = s.course
    cohort = db.get(Cohort, course.unit.cohort_id)
    assert cohort is not None
    t = course.teacher
    return SessionRead(
        id=s.id,
        starts_at=s.starts_at,
        ends_at=s.ends_at,
        kind=s.kind,
        course=Ref(id=course.id, name=course.name),
        cohort=Ref(id=cohort.id, name=cohort.name),
        room=Ref(id=s.room.id, name=s.room.name) if s.room else None,
        teacher=Ref(id=t.id, name=t.user.first_name) if t else None,
    )


def _conflicts(
    db: Session,
    ctx: Ctx,
    course: Course,
    room_id: uuid.UUID | None,
    start: datetime,
    end: datetime,
    exclude: uuid.UUID | None = None,
) -> list[dict[str, Any]]:
    """Same room, same teacher or same cohort at overlapping times."""
    overlap = and_(
        ClassSession.institution_id == ctx.institution_id,
        ClassSession.starts_at < end,
        ClassSession.ends_at > start,
    )
    if exclude is not None:
        overlap = and_(overlap, ClassSession.id != exclude)
    found: list[dict[str, Any]] = []
    checks: list[tuple[str, Any]] = []
    if room_id is not None:
        checks.append(("room", ClassSession.room_id == room_id))
    if course.teacher_id is not None:
        checks.append(("teacher", Course.teacher_id == course.teacher_id))
    checks.append(("cohort", Unit.cohort_id == course.unit.cohort_id))
    for kind, condition in checks:
        hit = db.scalar(
            select(ClassSession)
            .join(Course, Course.id == ClassSession.course_id)
            .join(Unit, Unit.id == Course.unit_id)
            .where(overlap, condition)
            .limit(1)
        )
        if hit is not None:
            found.append(
                {"kind": kind, "session_id": str(hit.id), "starts_at": hit.starts_at.isoformat()}
            )
    return found


def _raise_conflicts(conflicts: list[dict[str, Any]]) -> None:
    if conflicts:
        raise AppError(
            status.HTTP_409_CONFLICT,
            "schedule_conflict",
            "; ".join(f"{c['kind']} busy at {c['starts_at']}" for c in conflicts),
        )


@router.post("/school/sessions", status_code=status.HTTP_201_CREATED, tags=["school"])
def create_sessions(data: SessionCreate, ctx: Planner, db: DbSession) -> list[SessionRead]:
    course = get_scoped(db, Course, data.course_id, ctx)
    check_refs(db, ctx, {"room_id": Room}, {"room_id": data.room_id})
    created = []
    for week in range(data.repeat_weeks + 1):
        start = data.starts_at + timedelta(weeks=week)
        end = data.ends_at + timedelta(weeks=week)
        _raise_conflicts(_conflicts(db, ctx, course, data.room_id, start, end))
        session = ClassSession(
            institution_id=ctx.institution_id,
            course_id=course.id,
            room_id=data.room_id,
            starts_at=start,
            ends_at=end,
            kind=data.kind,
        )
        db.add(session)
        db.flush()
        created.append(session)
    audit.record(
        db,
        actor_id=ctx.user.id,
        institution_id=ctx.institution_id,
        action="timetable.sessions_created",
        target_type="course",
        target_id=course.id,
        details={"count": len(created)},
    )
    db.commit()
    return [_read(db, s) for s in created]


@router.patch("/school/sessions/{session_id}", tags=["school"])
def update_session(
    session_id: uuid.UUID, data: SessionUpdate, ctx: Planner, db: DbSession
) -> SessionRead:
    session = get_scoped(db, ClassSession, session_id, ctx)
    changes = data.model_dump(exclude_unset=True)
    check_refs(db, ctx, {"room_id": Room}, changes)
    start = changes.get("starts_at", session.starts_at)
    end = changes.get("ends_at", session.ends_at)
    if end <= start:
        raise InvalidReferenceError("validation_error", "ends_at must be after starts_at")
    room_id = changes.get("room_id", session.room_id)
    _raise_conflicts(_conflicts(db, ctx, session.course, room_id, start, end, exclude=session.id))
    for field, value in changes.items():
        setattr(session, field, value)
    audit.record(
        db,
        actor_id=ctx.user.id,
        institution_id=ctx.institution_id,
        action="timetable.session_updated",
        target_type="session",
        target_id=session.id,
    )
    db.commit()
    db.refresh(session)
    return _read(db, session)


@router.delete(
    "/school/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["school"]
)
def delete_session(session_id: uuid.UUID, ctx: Planner, db: DbSession) -> None:
    db.delete(get_scoped(db, ClassSession, session_id, ctx))
    audit.record(
        db,
        actor_id=ctx.user.id,
        institution_id=ctx.institution_id,
        action="timetable.session_deleted",
        target_type="session",
        target_id=session_id,
    )
    db.commit()


@router.get("/timetable")
def timetable(
    ctx: Reader,
    db: DbSession,
    start: datetime,
    end: datetime,
    cohort_id: uuid.UUID | None = None,
    room_id: uuid.UUID | None = None,
    teacher_id: uuid.UUID | None = None,
) -> list[SessionRead]:
    """Students: their cohorts. Teachers: their courses. Admins: everything (with filters)."""
    if end <= start or end - start > timedelta(days=62):
        raise InvalidReferenceError(
            "validation_error", "The range must be positive and at most 62 days."
        )
    query = (
        select(ClassSession)
        .join(Course, Course.id == ClassSession.course_id)
        .join(Unit, Unit.id == Course.unit_id)
        .where(
            ClassSession.institution_id == ctx.institution_id,
            ClassSession.starts_at < end,
            ClassSession.ends_at > start,
        )
        .order_by(ClassSession.starts_at)
    )
    if ctx.role == "student":
        query = query.where(
            Unit.cohort_id.in_(
                select(Enrollment.cohort_id).where(Enrollment.student_id == ctx.membership.id)
            )
        )
    elif ctx.role == "teacher":
        query = query.where(Course.teacher_id == ctx.membership.id)
    else:
        if cohort_id:
            query = query.where(Unit.cohort_id == cohort_id)
        if room_id:
            query = query.where(ClassSession.room_id == room_id)
        if teacher_id:
            query = query.where(Course.teacher_id == teacher_id)
    return [_read(db, s) for s in db.scalars(query)]


# ---------- Attendance ----------


def _session_for_recorder(db: Session, ctx: Ctx, session_id: uuid.UUID) -> ClassSession:
    session = get_scoped(db, ClassSession, session_id, ctx)
    if not ctx.can("attendance.manage"):
        owned_course(db, ctx, session.course_id)  # teachers: own courses only
    return session


def _students_of(db: Session, session: ClassSession) -> list[Membership]:
    return list(
        db.scalars(
            select(Membership)
            .join(Enrollment, Enrollment.student_id == Membership.id)
            .join(User, User.id == Membership.user_id)
            .where(
                Enrollment.cohort_id == session.course.unit.cohort_id, Membership.status == "active"
            )
            .order_by(User.email)
        )
    )


@router.get("/teaching/sessions/{session_id}/attendance", tags=["teaching"])
def read_attendance(session_id: uuid.UUID, ctx: Recorder, db: DbSession) -> list[AttendanceEntry]:
    session = _session_for_recorder(db, ctx, session_id)
    records = {
        a.student_id: a
        for a in db.scalars(select(Attendance).where(Attendance.session_id == session.id))
    }
    return [
        AttendanceEntry(
            student_id=m.id,
            first_name=m.user.first_name,
            email=m.user.email,
            student_number=m.student_number,
            status=records[m.id].status if m.id in records else None,
            note=records[m.id].note if m.id in records else None,
        )
        for m in _students_of(db, session)
    ]


@router.put("/teaching/sessions/{session_id}/attendance", tags=["teaching"])
def save_attendance(
    session_id: uuid.UUID, data: AttendanceUpdate, ctx: Recorder, db: DbSession
) -> list[AttendanceEntry]:
    session = _session_for_recorder(db, ctx, session_id)
    allowed = {m.id for m in _students_of(db, session)}
    existing = {
        a.student_id: a
        for a in db.scalars(select(Attendance).where(Attendance.session_id == session.id))
    }
    for item in data.records:
        if item.student_id not in allowed:
            raise InvalidReferenceError(
                "student_not_found", "Student not expected in this session."
            )
        record = existing.get(item.student_id)
        if record is None:
            record = Attendance(
                institution_id=ctx.institution_id, session_id=session.id, student_id=item.student_id
            )
            db.add(record)
        record.status, record.note = item.status, item.note
    audit.record(
        db,
        actor_id=ctx.user.id,
        institution_id=ctx.institution_id,
        action="attendance.recorded",
        target_type="session",
        target_id=session.id,
        details={"count": len(data.records)},
    )
    db.commit()
    return read_attendance(session_id, ctx, db)


def _records(db: Session, query: Any) -> list[AttendanceRecord]:
    out = []
    for a, s, course, m in db.execute(query):
        out.append(
            AttendanceRecord(
                id=a.id,
                student=Ref(id=m.id, name=m.user.first_name),
                course=Ref(id=course.id, name=course.name),
                starts_at=s.starts_at,
                status=a.status,
                note=a.note,
            )
        )
    return out


def _records_query(institution_id: uuid.UUID) -> Any:
    return (
        select(Attendance, ClassSession, Course, Membership)
        .join(ClassSession, ClassSession.id == Attendance.session_id)
        .join(Course, Course.id == ClassSession.course_id)
        .join(Membership, Membership.id == Attendance.student_id)
        .where(Attendance.institution_id == institution_id)
        .order_by(ClassSession.starts_at.desc())
    )


@router.get("/me/attendance", tags=["student"])
def my_attendance(
    ctx: Annotated[Ctx, Depends(require("student.self", "attendance"))], db: DbSession
) -> MyAttendance:
    counts = dict(
        db.execute(
            select(Attendance.status, func.count())
            .where(Attendance.student_id == ctx.membership.id)
            .group_by(Attendance.status)
        ).all()
    )
    total = sum(counts.values())
    records = _records(
        db,
        _records_query(ctx.institution_id)
        .where(Attendance.student_id == ctx.membership.id, Attendance.status != "present")
        .limit(200),
    )
    return MyAttendance(
        recorded=total,
        absent=counts.get("absent", 0),
        late=counts.get("late", 0),
        excused=counts.get("excused", 0),
        rate=round((counts.get("present", 0) + counts.get("late", 0)) / total * 100, 1)
        if total
        else None,
        records=records,
    )


@router.get("/school/attendance", tags=["school"])
def school_attendance(
    ctx: Annotated[Ctx, Depends(require("attendance.manage", "attendance"))],
    db: DbSession,
    cohort_id: uuid.UUID | None = None,
    status_filter: Annotated[str | None, Query(alias="status")] = None,
    limit: Annotated[int, Query(ge=1, le=500)] = 200,
) -> list[AttendanceRecord]:
    query = _records_query(ctx.institution_id).where(Attendance.status != "present").limit(limit)
    if status_filter:
        query = query.where(Attendance.status == status_filter)
    if cohort_id:
        query = query.join(Unit, Unit.id == Course.unit_id).where(Unit.cohort_id == cohort_id)
    return _records(db, query)


@router.patch("/school/attendance/{record_id}", tags=["school"])
def fix_attendance(
    record_id: uuid.UUID,
    data: AttendanceFix,
    ctx: Annotated[Ctx, Depends(require("attendance.manage", "attendance"))],
    db: DbSession,
) -> AttendanceRecord:
    """E.g. mark an absence as excused once a justification is received."""
    record = get_scoped(db, Attendance, record_id, ctx)
    record.status, record.note = data.status, data.note
    audit.record(
        db,
        actor_id=ctx.user.id,
        institution_id=ctx.institution_id,
        action="attendance.corrected",
        target_type="attendance",
        target_id=record.id,
        details={"status": data.status},
    )
    db.commit()
    return _records(db, _records_query(ctx.institution_id).where(Attendance.id == record.id))[0]
