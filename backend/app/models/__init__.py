"""Import every model here so that Alembic and SQLAlchemy see the full metadata."""

from app.models.academic import (
    AcademicYear,
    Announcement,
    Assessment,
    Attendance,
    ClassSession,
    Cohort,
    Course,
    Department,
    Enrollment,
    Grade,
    Invoice,
    IssuedDocument,
    Payment,
    Period,
    Program,
    Room,
    Unit,
)
from app.models.items import Assignment, Exam
from app.models.profile import Profile
from app.models.subject import Subject
from app.models.tenancy import (
    AuditLog,
    Institution,
    Invitation,
    Membership,
    PasswordReset,
)
from app.models.user import User, UserSession

__all__ = [
    "AcademicYear",
    "Announcement",
    "Assessment",
    "Assignment",
    "Attendance",
    "AuditLog",
    "ClassSession",
    "Cohort",
    "Course",
    "Department",
    "Enrollment",
    "Exam",
    "Grade",
    "Institution",
    "Invitation",
    "Invoice",
    "IssuedDocument",
    "Membership",
    "PasswordReset",
    "Payment",
    "Period",
    "Profile",
    "Program",
    "Room",
    "Subject",
    "Unit",
    "User",
    "UserSession",
]
