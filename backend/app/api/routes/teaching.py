"""Teacher space: own courses, assessments and grade entry (admins see every course)."""

import uuid
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.crud import _flush, get_scoped
from app.api.deps import Ctx, DbSession, require
from app.core.errors import AppError, InvalidReferenceError
from app.models import Assessment, Cohort, Course, Enrollment, Grade, Membership, Period, Unit, User
from app.schemas.teaching import (
    AssessmentCreate,
    AssessmentRead,
    AssessmentUpdate,
    CourseDetail,
    GradesUpdate,
    Ref,
    RosterEntry,
)
from app.services import audit

router = APIRouter(prefix="/teaching", tags=["teaching"])
Teacher = Annotated[Ctx, Depends(require("grades.enter", "grades"))]


def owned_course(db: Session, ctx: Ctx, course_id: uuid.UUID) -> Course:
    """A teacher only reaches their own courses; an admin reaches all of them."""
    course = get_scoped(db, Course, course_id, ctx)
    if not ctx.can("grades.manage") and course.teacher_id != ctx.membership.id:
        raise AppError(status.HTTP_403_FORBIDDEN, "forbidden", "Not your course.")
    return course


def _detail(db: Session, course: Course) -> CourseDetail:
    unit = course.unit
    cohort = db.get(Cohort, unit.cohort_id)
    period = db.get(Period, unit.period_id)
    assert cohort is not None and period is not None
    students = db.scalar(select(func.count()).where(Enrollment.cohort_id == cohort.id)) or 0
    teacher = course.teacher
    return CourseDetail(
        id=course.id,
        name=course.name,
        code=course.code,
        coefficient=float(course.coefficient),
        unit=Ref(id=unit.id, name=unit.name),
        unit_credits=float(unit.credits),
        cohort=Ref(id=cohort.id, name=cohort.name),
        period=Ref(id=period.id, name=period.name),
        teacher=Ref(id=teacher.id, name=teacher.user.first_name) if teacher else None,
        students=students,
    )


@router.get("/courses")
def my_courses(
    ctx: Teacher, db: DbSession, cohort_id: uuid.UUID | None = None
) -> list[CourseDetail]:
    query = select(Course).where(Course.institution_id == ctx.institution_id).order_by(Course.name)
    if not ctx.can("grades.manage"):
        query = query.where(Course.teacher_id == ctx.membership.id)
    if cohort_id:
        query = query.join(Unit, Unit.id == Course.unit_id).where(Unit.cohort_id == cohort_id)
    return [_detail(db, c) for c in db.scalars(query)]


@router.get("/courses/{course_id}")
def course_detail(course_id: uuid.UUID, ctx: Teacher, db: DbSession) -> CourseDetail:
    return _detail(db, owned_course(db, ctx, course_id))


def _assessment_read(db: Session, a: Assessment) -> AssessmentRead:
    graded = db.scalar(
        select(func.count()).where(
            Grade.assessment_id == a.id, (Grade.score.is_not(None)) | Grade.absent.is_(True)
        )
    )
    read = AssessmentRead.model_validate(a)
    read.graded = graded or 0
    return read


@router.get("/courses/{course_id}/assessments")
def list_assessments(course_id: uuid.UUID, ctx: Teacher, db: DbSession) -> list[AssessmentRead]:
    owned_course(db, ctx, course_id)
    rows = db.scalars(
        select(Assessment)
        .where(Assessment.course_id == course_id)
        .order_by(Assessment.held_on, Assessment.created_at)
    )
    return [_assessment_read(db, a) for a in rows]


@router.post("/courses/{course_id}/assessments", status_code=status.HTTP_201_CREATED)
def create_assessment(
    course_id: uuid.UUID, data: AssessmentCreate, ctx: Teacher, db: DbSession
) -> AssessmentRead:
    owned_course(db, ctx, course_id)
    values = data.model_dump()
    values["max_score"] = values["max_score"] or float(ctx.institution.grade_max)
    assessment = Assessment(institution_id=ctx.institution_id, course_id=course_id, **values)
    db.add(assessment)
    _flush(db)
    audit.record(
        db,
        actor_id=ctx.user.id,
        institution_id=ctx.institution_id,
        action="assessment.created",
        target_type="assessment",
        target_id=assessment.id,
    )
    db.commit()
    return _assessment_read(db, assessment)


def owned_assessment(db: Session, ctx: Ctx, assessment_id: uuid.UUID) -> tuple[Assessment, Course]:
    assessment = get_scoped(db, Assessment, assessment_id, ctx)
    return assessment, owned_course(db, ctx, assessment.course_id)


@router.patch("/assessments/{assessment_id}")
def update_assessment(
    assessment_id: uuid.UUID, data: AssessmentUpdate, ctx: Teacher, db: DbSession
) -> AssessmentRead:
    assessment, _ = owned_assessment(db, ctx, assessment_id)
    changes = data.model_dump(exclude_unset=True)
    if "max_score" in changes:
        highest = db.scalar(
            select(func.max(Grade.score)).where(Grade.assessment_id == assessment.id)
        )
        if highest is not None and Decimal(str(changes["max_score"])) < highest:
            raise InvalidReferenceError(
                "score_above_max", "Existing grades exceed the new maximum."
            )
    for field, value in changes.items():
        setattr(assessment, field, value)
    action = "assessment.published" if changes.get("published") is True else "assessment.updated"
    audit.record(
        db,
        actor_id=ctx.user.id,
        institution_id=ctx.institution_id,
        action=action,
        target_type="assessment",
        target_id=assessment.id,
        details={"fields": sorted(changes)},
    )
    db.commit()
    db.refresh(assessment)
    return _assessment_read(db, assessment)


@router.delete("/assessments/{assessment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_assessment(assessment_id: uuid.UUID, ctx: Teacher, db: DbSession) -> None:
    assessment, _ = owned_assessment(db, ctx, assessment_id)
    db.delete(assessment)
    audit.record(
        db,
        actor_id=ctx.user.id,
        institution_id=ctx.institution_id,
        action="assessment.deleted",
        target_type="assessment",
        target_id=assessment_id,
    )
    db.commit()


def _roster(db: Session, course: Course) -> list[Membership]:
    return list(
        db.scalars(
            select(Membership)
            .join(Enrollment, Enrollment.student_id == Membership.id)
            .join(User, User.id == Membership.user_id)
            .where(Enrollment.cohort_id == course.unit.cohort_id, Membership.status == "active")
            .order_by(User.email)
        )
    )


@router.get("/assessments/{assessment_id}/grades")
def read_grades(assessment_id: uuid.UUID, ctx: Teacher, db: DbSession) -> list[RosterEntry]:
    assessment, course = owned_assessment(db, ctx, assessment_id)
    grades = {
        g.student_id: g
        for g in db.scalars(select(Grade).where(Grade.assessment_id == assessment.id))
    }
    return [
        RosterEntry(
            student_id=m.id,
            first_name=m.user.first_name,
            email=m.user.email,
            student_number=m.student_number,
            score=float(g.score) if (g := grades.get(m.id)) and g.score is not None else None,
            absent=bool(grades.get(m.id) and grades[m.id].absent),
        )
        for m in _roster(db, course)
    ]


@router.put("/assessments/{assessment_id}/grades")
def save_grades(
    assessment_id: uuid.UUID, data: GradesUpdate, ctx: Teacher, db: DbSession
) -> list[RosterEntry]:
    """Saves the whole grid. Only students of the course's cohort can be graded."""
    assessment, course = owned_assessment(db, ctx, assessment_id)
    allowed = {m.id for m in _roster(db, course)}
    existing = {
        g.student_id: g
        for g in db.scalars(select(Grade).where(Grade.assessment_id == assessment.id))
    }
    for item in data.grades:
        if item.student_id not in allowed:
            raise InvalidReferenceError("student_not_found", "Student not enrolled in this course.")
        if item.score is not None and Decimal(str(item.score)) > assessment.max_score:
            raise InvalidReferenceError("score_above_max", f"Score above {assessment.max_score}.")
        grade = existing.get(item.student_id)
        if grade is None:
            grade = Grade(
                institution_id=ctx.institution_id,
                assessment_id=assessment.id,
                student_id=item.student_id,
            )
            db.add(grade)
        grade.score = None if item.absent or item.score is None else Decimal(str(item.score))
        grade.absent = item.absent
    audit.record(
        db,
        actor_id=ctx.user.id,
        institution_id=ctx.institution_id,
        action="grades.saved",
        target_type="assessment",
        target_id=assessment.id,
        details={"count": len(data.grades)},
    )
    db.commit()
    return read_grades(assessment_id, ctx, db)
