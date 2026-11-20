"""Import every model here so that Alembic and SQLAlchemy see the full metadata."""

from app.models.items import Assignment, Exam
from app.models.profile import Profile
from app.models.subject import Subject
from app.models.user import User, UserSession

__all__ = ["Assignment", "Exam", "Profile", "Subject", "User", "UserSession"]
