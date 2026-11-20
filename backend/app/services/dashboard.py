from datetime import UTC, datetime, time, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Assignment, Exam, Subject, User
from app.models.enums import AssignmentStatus
from app.schemas.assignment import AssignmentRead
from app.schemas.dashboard import DashboardCounts, DashboardSummary, WeekProgress
from app.schemas.exam import ExamRead

APP_TIME_ZONE = ZoneInfo("Europe/Paris")
UPCOMING_LIMIT = 5
OVERDUE_LIMIT = 10


def calendar_week(now: datetime) -> tuple[datetime, datetime]:
    """[Monday 00:00, next Monday 00:00) in Paris time, as UTC instants."""
    local = now.astimezone(APP_TIME_ZONE)
    monday = local.date() - timedelta(days=local.weekday())
    start = datetime.combine(monday, time.min, APP_TIME_ZONE)
    end = datetime.combine(monday + timedelta(days=7), time.min, APP_TIME_ZONE)
    return start.astimezone(UTC), end.astimezone(UTC)


def get_summary(db: Session, user: User, now: datetime | None = None) -> DashboardSummary:
    now = now or datetime.now(UTC)
    week_end = now + timedelta(days=7)
    open_assignments = select(Assignment).where(
        Assignment.user_id == user.id, Assignment.status != AssignmentStatus.DONE
    )

    upcoming = db.scalars(
        open_assignments.where(Assignment.due_at >= now)
        .order_by(Assignment.due_at)
        .limit(UPCOMING_LIMIT)
    )
    overdue = db.scalars(
        open_assignments.where(Assignment.due_at < now)
        .order_by(Assignment.due_at)
        .limit(OVERDUE_LIMIT)
    )
    exams = db.scalars(
        select(Exam)
        .where(Exam.user_id == user.id, Exam.exam_at >= now)
        .order_by(Exam.exam_at)
        .limit(UPCOMING_LIMIT)
    )

    is_open = Assignment.status != AssignmentStatus.DONE
    counts = db.execute(
        select(
            func.count().filter(Assignment.status == AssignmentStatus.TODO),
            func.count().filter(Assignment.status == AssignmentStatus.IN_PROGRESS),
            func.count().filter(Assignment.status == AssignmentStatus.DONE),
            func.count().filter(is_open, Assignment.due_at < now),
            func.count().filter(is_open, Assignment.due_at >= now, Assignment.due_at < week_end),
        ).where(Assignment.user_id == user.id)
    ).one()
    upcoming_exams = db.scalar(
        select(func.count()).where(Exam.user_id == user.id, Exam.exam_at >= now)
    )
    subjects = db.scalar(select(func.count()).where(Subject.user_id == user.id))

    week_start, week_stop = calendar_week(now)
    week = db.execute(
        select(
            func.count().filter(Assignment.status == AssignmentStatus.TODO),
            func.count().filter(Assignment.status == AssignmentStatus.IN_PROGRESS),
            func.count().filter(Assignment.status == AssignmentStatus.DONE),
        ).where(
            Assignment.user_id == user.id,
            Assignment.due_at >= week_start,
            Assignment.due_at < week_stop,
        )
    ).one()

    return DashboardSummary(
        upcoming_assignments=[AssignmentRead.model_validate(a) for a in upcoming],
        overdue_assignments=[AssignmentRead.model_validate(a) for a in overdue],
        upcoming_exams=[ExamRead.model_validate(e) for e in exams],
        counts=DashboardCounts(
            todo=counts[0],
            in_progress=counts[1],
            done=counts[2],
            overdue=counts[3],
            due_this_week=counts[4],
            upcoming_exams=upcoming_exams or 0,
            subjects=subjects or 0,
        ),
        week=WeekProgress(todo=week[0], in_progress=week[1], done=week[2], total=sum(week)),
    )
