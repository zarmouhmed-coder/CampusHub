from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession
from app.schemas.dashboard import DashboardSummary
from app.services import dashboard as service

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary")
def summary(user: CurrentUser, db: DbSession) -> DashboardSummary:
    """Open assignments (upcoming and overdue), upcoming exams and counters."""
    return service.get_summary(db, user)
