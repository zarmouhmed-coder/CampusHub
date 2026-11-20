from pydantic import BaseModel

from app.schemas.assignment import AssignmentRead
from app.schemas.exam import ExamRead


class DashboardCounts(BaseModel):
    todo: int
    in_progress: int
    done: int
    overdue: int
    due_this_week: int
    upcoming_exams: int
    subjects: int


class WeekProgress(BaseModel):
    """Assignments due in the current calendar week (Monday-Sunday, Europe/Paris)."""

    todo: int
    in_progress: int
    done: int
    total: int


class DashboardSummary(BaseModel):
    upcoming_assignments: list[AssignmentRead]
    overdue_assignments: list[AssignmentRead]
    upcoming_exams: list[ExamRead]
    counts: DashboardCounts
    week: WeekProgress
