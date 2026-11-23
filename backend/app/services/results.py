"""Results engine: course, unit (UE) and period averages, credits and compensation.

Rules (configurable per institution):
- Only *published* assessments count. A missing grade is ignored; "absent" counts as 0.
- Course average: assessments weighted by `weight`, each score rescaled to grade_max.
- Unit average: course averages weighted by `coefficient`. Validated if >= pass_mark.
- Period average: unit averages weighted by credits (plain mean if no credits).
- Compensation (if enabled): a period with an average >= pass_mark validates all its
  units, the weak ones being flagged `compensated`.
"""

import uuid
from collections import defaultdict
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import (
    AcademicYear,
    Assessment,
    Cohort,
    Course,
    Enrollment,
    Grade,
    Institution,
    Membership,
    Period,
    Unit,
)
from app.schemas.teaching import (
    AssessmentResult,
    CourseResult,
    PeriodResult,
    StudentResults,
    UnitResult,
)


def _weighted(pairs: list[tuple[float, float]]) -> float | None:
    """Weighted mean of (value, weight); plain mean if all weights are 0."""
    if not pairs:
        return None
    total = sum(w for _, w in pairs)
    if total == 0:
        return round(sum(v for v, _ in pairs) / len(pairs), 2)
    return round(sum(v * w for v, w in pairs) / total, 2)


def compute(
    db: Session, institution: Institution, student: Membership, period_id: uuid.UUID | None = None
) -> StudentResults:
    grade_max = float(institution.grade_max)
    pass_mark = float(institution.pass_mark)

    cohort_ids = list(
        db.scalars(select(Enrollment.cohort_id).where(Enrollment.student_id == student.id))
    )
    unit_query = select(Unit).where(Unit.cohort_id.in_(cohort_ids)).order_by(Unit.code, Unit.name)
    if period_id is not None:
        unit_query = unit_query.where(Unit.period_id == period_id)
    units = list(db.scalars(unit_query))
    courses = list(
        db.scalars(
            select(Course).where(Course.unit_id.in_([u.id for u in units])).order_by(Course.name)
        )
    )
    assessments = list(
        db.scalars(
            select(Assessment)
            .where(
                Assessment.course_id.in_([c.id for c in courses]), Assessment.published.is_(True)
            )
            .order_by(Assessment.held_on, Assessment.created_at)
        )
    )
    grades = {
        g.assessment_id: g
        for g in db.scalars(
            select(Grade).where(
                Grade.student_id == student.id,
                Grade.assessment_id.in_([a.id for a in assessments]),
            )
        )
    }

    by_course: dict[uuid.UUID, list[Assessment]] = defaultdict(list)
    for a in assessments:
        by_course[a.course_id].append(a)
    by_unit: dict[uuid.UUID, list[Course]] = defaultdict(list)
    for c in courses:
        by_unit[c.unit_id].append(c)

    def course_result(course: Course) -> CourseResult:
        items, pairs = [], []
        for a in by_course[course.id]:
            g = grades.get(a.id)
            score = float(g.score) if g and g.score is not None else None
            absent = bool(g and g.absent)
            items.append(
                AssessmentResult(
                    title=a.title,
                    weight=float(a.weight),
                    max_score=float(a.max_score),
                    score=score,
                    absent=absent,
                )
            )
            if absent:
                pairs.append((0.0, float(a.weight)))
            elif score is not None:
                pairs.append((score / float(a.max_score) * grade_max, float(a.weight)))
        return CourseResult(
            id=course.id,
            name=course.name,
            coefficient=float(course.coefficient),
            average=_weighted(pairs),
            assessments=items,
        )

    periods = {
        p.id: p
        for p in db.scalars(select(Period).where(Period.id.in_({u.period_id for u in units})))
    }
    years = {
        y.id: y
        for y in db.scalars(
            select(AcademicYear).where(
                AcademicYear.id.in_({p.academic_year_id for p in periods.values()})
            )
        )
    }
    cohorts = {c.id: c for c in db.scalars(select(Cohort).where(Cohort.id.in_(cohort_ids)))}

    groups: dict[tuple[uuid.UUID, uuid.UUID], list[Unit]] = defaultdict(list)
    for u in units:
        groups[(u.period_id, u.cohort_id)].append(u)

    results: list[PeriodResult] = []
    for (pid, cid), unit_list in groups.items():
        unit_results = []
        for u in unit_list:
            course_results = [course_result(c) for c in by_unit[u.id]]
            avg = _weighted(
                [(c.average, c.coefficient) for c in course_results if c.average is not None]
            )
            unit_results.append(
                UnitResult(
                    id=u.id,
                    code=u.code,
                    name=u.name,
                    credits=float(u.credits),
                    average=avg,
                    validated=avg is not None and avg >= pass_mark,
                    compensated=False,
                    courses=course_results,
                )
            )
        period_avg = _weighted(
            [(u.average, u.credits) for u in unit_results if u.average is not None]
        )
        period_ok = period_avg is not None and period_avg >= pass_mark
        if period_ok and institution.compensation:
            for ur in unit_results:
                if ur.average is not None and not ur.validated:
                    ur.validated, ur.compensated = True, True
        period = periods[pid]
        results.append(
            PeriodResult(
                id=pid,
                name=period.name,
                academic_year=years[period.academic_year_id].name,
                cohort=cohorts[cid].name,
                average=period_avg,
                credits_total=sum(u.credits for u in unit_results),
                credits_earned=sum(u.credits for u in unit_results if u.validated),
                validated=period_ok,
                units=unit_results,
            )
        )
    results.sort(key=lambda r: (periods[r.id].starts_on, periods[r.id].position))
    return StudentResults(
        student_id=student.id,
        first_name=student.user.first_name,
        student_number=student.student_number,
        grade_max=grade_max,
        pass_mark=pass_mark,
        periods=results,
    )


def to_decimal(value: float | None) -> Decimal | None:
    return None if value is None else Decimal(str(value))
