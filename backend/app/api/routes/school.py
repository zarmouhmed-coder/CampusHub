"""Institution administration: settings, academic structure, people, audit."""

import uuid
from datetime import UTC, datetime, time, timedelta
from typing import Annotated, Any
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.crud import crud_router, get_scoped
from app.api.deps import Ctx, DbSession, require
from app.core.errors import AppError, ConflictError, InvalidReferenceError
from app.models import (
    AcademicYear,
    Attendance,
    AuditLog,
    ClassSession,
    Cohort,
    Course,
    Department,
    Enrollment,
    Invitation,
    Invoice,
    Membership,
    Payment,
    Period,
    Program,
    Room,
    Unit,
    User,
)
from app.schemas import academic as s
from app.schemas.people import (
    AuditRead,
    EnrollmentChange,
    ImportRequest,
    ImportRowResult,
    MemberRead,
    MemberUpdate,
    SchoolOverview,
)
from app.schemas.tenancy import (
    InstitutionRead,
    InstitutionSettingsUpdate,
    InvitationCreate,
    InvitationRead,
    InvitationResult,
)
from app.services import audit, tenancy

router = APIRouter(prefix="/school", tags=["school"])
Admin = Annotated[Ctx, Depends(require("institution.manage"))]
PeopleAdmin = Annotated[Ctx, Depends(require("people.manage"))]


# ---------- Settings ----------


@router.get("/settings")
def read_settings(ctx: Admin) -> InstitutionRead:
    return InstitutionRead.model_validate(ctx.institution)


@router.patch("/settings")
def update_settings(data: InstitutionSettingsUpdate, ctx: Admin, db: DbSession) -> InstitutionRead:
    changes = data.model_dump(exclude_unset=True)
    institution = ctx.institution
    grade_max = changes.get("grade_max", float(institution.grade_max))
    pass_mark = changes.get("pass_mark", float(institution.pass_mark))
    if pass_mark > grade_max:
        raise InvalidReferenceError("validation_error", "pass_mark must not exceed grade_max.")
    for field, value in changes.items():
        setattr(institution, field, value)
    audit.record(
        db,
        actor_id=ctx.user.id,
        institution_id=institution.id,
        action="institution.settings_updated",
        details={"fields": sorted(changes)},
    )
    db.commit()
    db.refresh(institution)
    return InstitutionRead.model_validate(institution)


# ---------- Academic structure (generic CRUD + business rules) ----------


def _single_current_year(db: Session, ctx: Ctx, year: AcademicYear) -> None:
    if year.is_current:
        for other in db.scalars(
            select(AcademicYear).where(
                AcademicYear.institution_id == ctx.institution_id,
                AcademicYear.id != year.id,
                AcademicYear.is_current.is_(True),
            )
        ):
            other.is_current = False


def _unit_rules(db: Session, ctx: Ctx, values: dict[str, Any], existing: Unit | None) -> None:
    """The unit's period must belong to the cohort's academic year."""
    cohort_id = values.get("cohort_id") or (existing.cohort_id if existing else None)
    period_id = values.get("period_id") or (existing.period_id if existing else None)
    if cohort_id is None or period_id is None:
        return
    cohort = db.get(Cohort, cohort_id)
    period = db.get(Period, period_id)
    if cohort and period and cohort.academic_year_id != period.academic_year_id:
        raise InvalidReferenceError(
            "period_mismatch", "The period does not belong to the cohort's academic year."
        )


def _course_rules(db: Session, ctx: Ctx, values: dict[str, Any], existing: Course | None) -> None:
    teacher_id = values.get("teacher_id")
    if teacher_id is None:
        return
    role = db.scalar(
        select(Membership.role).where(
            Membership.id == teacher_id, Membership.institution_id == ctx.institution_id
        )
    )
    if role not in ("teacher", "admin"):
        raise InvalidReferenceError("teacher_not_found", "The selected teacher does not exist.")


_STRUCTURE = [
    {
        "model": Department,
        "path": "/departments",
        "create_schema": s.DepartmentCreate,
        "update_schema": s.DepartmentUpdate,
        "read_schema": s.DepartmentRead,
        "order_by": lambda: [Department.name],
    },
    {
        "model": Program,
        "path": "/programs",
        "create_schema": s.ProgramCreate,
        "update_schema": s.ProgramUpdate,
        "read_schema": s.ProgramRead,
        "refs": {"department_id": Department},
        "filters": ["department_id"],
        "order_by": lambda: [Program.name],
    },
    {
        "model": AcademicYear,
        "path": "/academic-years",
        "create_schema": s.AcademicYearCreate,
        "update_schema": s.AcademicYearUpdate,
        "read_schema": s.AcademicYearRead,
        "order_by": lambda: [AcademicYear.starts_on.desc()],
        "after_write": _single_current_year,
    },
    {
        "model": Period,
        "path": "/periods",
        "create_schema": s.PeriodCreate,
        "update_schema": s.PeriodUpdate,
        "read_schema": s.PeriodRead,
        "refs": {"academic_year_id": AcademicYear},
        "filters": ["academic_year_id"],
        "order_by": lambda: [Period.starts_on, Period.position],
    },
    {
        "model": Cohort,
        "path": "/cohorts",
        "create_schema": s.CohortCreate,
        "update_schema": s.CohortUpdate,
        "read_schema": s.CohortRead,
        "refs": {"program_id": Program, "academic_year_id": AcademicYear},
        "filters": ["program_id", "academic_year_id"],
        "order_by": lambda: [Cohort.name],
    },
    {
        "model": Room,
        "path": "/rooms",
        "create_schema": s.RoomCreate,
        "update_schema": s.RoomUpdate,
        "read_schema": s.RoomRead,
        "order_by": lambda: [Room.name],
    },
    {
        "model": Unit,
        "path": "/units",
        "create_schema": s.UnitCreate,
        "update_schema": s.UnitUpdate,
        "read_schema": s.UnitRead,
        "refs": {"cohort_id": Cohort, "period_id": Period},
        "filters": ["cohort_id", "period_id"],
        "order_by": lambda: [Unit.code, Unit.name],
        "validate": _unit_rules,
    },
    {
        "model": Course,
        "path": "/courses",
        "create_schema": s.CourseCreate,
        "update_schema": s.CourseUpdate,
        "read_schema": s.CourseRead,
        "refs": {"unit_id": Unit, "teacher_id": Membership},
        "filters": ["unit_id", "teacher_id"],
        "order_by": lambda: [Course.code, Course.name],
        "validate": _course_rules,
    },
]

for spec in _STRUCTURE:
    router.include_router(crud_router(**spec))  # type: ignore[arg-type]


# ---------- People ----------


def _member_read(db: Session, m: Membership) -> MemberRead:
    cohorts = db.scalars(select(Enrollment.cohort_id).where(Enrollment.student_id == m.id))
    return MemberRead(
        id=m.id,
        user_id=m.user_id,
        email=m.user.email,
        first_name=m.user.first_name,
        role=m.role,
        status=m.status,
        student_number=m.student_number,
        cohort_ids=list(cohorts),
        created_at=m.created_at,
    )


@router.get("/members", tags=["people"])
def list_members(
    ctx: Annotated[Ctx, Depends(require("structure.read"))],
    db: DbSession,
    role: str | None = None,
    cohort_id: uuid.UUID | None = None,
    q: Annotated[str | None, Query(max_length=100)] = None,
) -> list[MemberRead]:
    """Admins see everyone; teachers use it to pick students and colleagues."""
    query = (
        select(Membership)
        .join(User, User.id == Membership.user_id)
        .where(Membership.institution_id == ctx.institution_id)
        .order_by(User.email)
    )
    if role:
        query = query.where(Membership.role == role)
    if cohort_id:
        query = query.join(Enrollment, Enrollment.student_id == Membership.id).where(
            Enrollment.cohort_id == cohort_id
        )
    if q:
        like = f"%{q.lower()}%"
        query = query.where(or_(User.email.like(like), Membership.student_number.ilike(like)))
    return [_member_read(db, m) for m in db.scalars(query)]


def _remaining_admins(db: Session, ctx: Ctx, excluding: uuid.UUID) -> int:
    return (
        db.scalar(
            select(func.count()).where(
                Membership.institution_id == ctx.institution_id,
                Membership.role == "admin",
                Membership.status == "active",
                Membership.id != excluding,
            )
        )
        or 0
    )


@router.patch("/members/{member_id}", tags=["people"])
def update_member(
    member_id: uuid.UUID, data: MemberUpdate, ctx: PeopleAdmin, db: DbSession
) -> MemberRead:
    member = get_scoped(db, Membership, member_id, ctx)
    changes = data.model_dump(exclude_unset=True)
    losing_admin = member.role == "admin" and (
        changes.get("role", "admin") != "admin" or changes.get("status", "active") != "active"
    )
    if losing_admin and _remaining_admins(db, ctx, member.id) == 0:
        raise ConflictError("last_admin", "An institution must keep at least one administrator.")
    for field, value in changes.items():
        setattr(member, field, value)
    audit.record(
        db,
        actor_id=ctx.user.id,
        institution_id=ctx.institution_id,
        action="member.updated",
        target_type="membership",
        target_id=member.id,
        details={k: str(v) for k, v in changes.items()},
    )
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ConflictError(
            "student_number_taken", "This student number is already used."
        ) from None
    return _member_read(db, member)


@router.post(
    "/members/{member_id}/enrollments", status_code=status.HTTP_201_CREATED, tags=["people"]
)
def enroll(
    member_id: uuid.UUID, data: EnrollmentChange, ctx: PeopleAdmin, db: DbSession
) -> MemberRead:
    member = get_scoped(db, Membership, member_id, ctx)
    get_scoped(db, Cohort, data.cohort_id, ctx)
    if member.role != "student":
        raise InvalidReferenceError("not_a_student", "Only students can be enrolled in a cohort.")
    exists = db.scalar(
        select(Enrollment.id).where(
            Enrollment.student_id == member.id, Enrollment.cohort_id == data.cohort_id
        )
    )
    if exists is None:
        db.add(
            Enrollment(
                institution_id=ctx.institution_id, cohort_id=data.cohort_id, student_id=member.id
            )
        )
        audit.record(
            db,
            actor_id=ctx.user.id,
            institution_id=ctx.institution_id,
            action="member.enrolled",
            target_type="membership",
            target_id=member.id,
            details={"cohort_id": str(data.cohort_id)},
        )
        db.commit()
    return _member_read(db, member)


@router.delete("/members/{member_id}/enrollments/{cohort_id}", tags=["people"])
def unenroll(
    member_id: uuid.UUID, cohort_id: uuid.UUID, ctx: PeopleAdmin, db: DbSession
) -> MemberRead:
    member = get_scoped(db, Membership, member_id, ctx)
    enrollment = db.scalar(
        select(Enrollment).where(
            Enrollment.student_id == member.id, Enrollment.cohort_id == cohort_id
        )
    )
    if enrollment is not None:
        db.delete(enrollment)
        audit.record(
            db,
            actor_id=ctx.user.id,
            institution_id=ctx.institution_id,
            action="member.unenrolled",
            target_type="membership",
            target_id=member.id,
            details={"cohort_id": str(cohort_id)},
        )
        db.commit()
    return _member_read(db, member)


# ---------- Invitations ----------


@router.get("/invitations", tags=["people"])
def list_invitations(ctx: PeopleAdmin, db: DbSession) -> list[InvitationRead]:
    rows = db.scalars(
        select(Invitation)
        .where(Invitation.institution_id == ctx.institution_id, Invitation.accepted_at.is_(None))
        .order_by(Invitation.created_at.desc())
    )
    return [InvitationRead.model_validate(i) for i in rows]


@router.post("/invitations", status_code=status.HTTP_201_CREATED, tags=["people"])
def create_invitation(data: InvitationCreate, ctx: PeopleAdmin, db: DbSession) -> InvitationResult:
    result, url = tenancy.invite(db, institution=ctx.institution, data=data, actor_id=ctx.user.id)
    db.commit()
    return InvitationResult(email=data.email, status=result, invitation_url=url)


@router.delete(
    "/invitations/{invitation_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["people"]
)
def revoke_invitation(invitation_id: uuid.UUID, ctx: PeopleAdmin, db: DbSession) -> None:
    invitation = get_scoped(db, Invitation, invitation_id, ctx)
    db.delete(invitation)
    audit.record(
        db,
        actor_id=ctx.user.id,
        institution_id=ctx.institution_id,
        action="member.invitation_revoked",
        details={"email": invitation.email},
    )
    db.commit()


@router.post("/invitations/import", tags=["people"])
def import_people(data: ImportRequest, ctx: PeopleAdmin, db: DbSession) -> list[ImportRowResult]:
    """Bulk invitations (the browser parses the CSV). Each row succeeds or fails on its own."""
    results: list[ImportRowResult] = []
    for row in data.rows:
        try:
            with db.begin_nested():
                result, url = tenancy.invite(
                    db, institution=ctx.institution, data=row, actor_id=ctx.user.id
                )
            results.append(ImportRowResult(email=row.email, status=result, invitation_url=url))
        except AppError as exc:
            results.append(ImportRowResult(email=row.email, status="error", error=exc.code))
    db.commit()
    return results


# ---------- Audit and overview ----------


@router.get("/audit", tags=["audit"])
def school_audit(
    ctx: Annotated[Ctx, Depends(require("audit.read"))],
    db: DbSession,
    limit: Annotated[int, Query(ge=1, le=200)] = 100,
) -> list[AuditRead]:
    rows = db.scalars(
        select(AuditLog)
        .where(AuditLog.institution_id == ctx.institution_id)
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
    )
    return [to_audit_read(a) for a in rows]


def to_audit_read(a: AuditLog) -> AuditRead:
    return AuditRead(
        id=a.id,
        action=a.action,
        target_type=a.target_type,
        target_id=a.target_id,
        details=a.details,
        actor_email=a.actor.email if a.actor else None,
        institution_id=a.institution_id,
        created_at=a.created_at,
    )


@router.get("/overview")
def overview(ctx: Admin, db: DbSession) -> SchoolOverview:
    iid = ctx.institution_id
    roles = dict(
        db.execute(
            select(Membership.role, func.count())
            .where(Membership.institution_id == iid, Membership.status == "active")
            .group_by(Membership.role)
        ).all()
    )
    tz = ZoneInfo(ctx.institution.timezone)
    today = datetime.now(tz).date()
    day_start = datetime.combine(today, time.min, tz).astimezone(UTC)
    since = datetime.now(UTC) - timedelta(days=30)
    present, total = db.execute(
        select(
            func.count().filter(Attendance.status.in_(["present", "late"])),
            func.count(),
        )
        .join(ClassSession, ClassSession.id == Attendance.session_id)
        .where(Attendance.institution_id == iid, ClassSession.starts_at >= since)
    ).one()

    def count(model: Any, *where: Any) -> int:
        return (
            db.scalar(
                select(func.count()).select_from(model).where(model.institution_id == iid, *where)
            )
            or 0
        )

    return SchoolOverview(
        students=roles.get("student", 0),
        teachers=roles.get("teacher", 0),
        admins=roles.get("admin", 0),
        pending_invitations=count(Invitation, Invitation.accepted_at.is_(None)),
        cohorts=count(Cohort),
        courses=count(Course),
        sessions_today=count(
            ClassSession,
            ClassSession.starts_at >= day_start,
            ClassSession.starts_at < day_start + timedelta(days=1),
        ),
        attendance_rate_30d=round(present / total * 100, 1) if total else None,
        billed=float(
            db.scalar(
                select(func.coalesce(func.sum(Invoice.amount), 0)).where(
                    Invoice.institution_id == iid
                )
            )
            or 0
        ),
        collected=float(
            db.scalar(
                select(func.coalesce(func.sum(Payment.amount), 0)).where(
                    Payment.institution_id == iid
                )
            )
            or 0
        ),
        currency=ctx.institution.currency,
    )
