import uuid
from datetime import datetime
from typing import Annotated, Any

from pydantic import Field

from app.schemas.common import InputModel, NotNull, OutputModel, ShortText
from app.schemas.tenancy import InvitationCreate, RoleName


class MemberRead(OutputModel):
    id: uuid.UUID
    user_id: uuid.UUID
    email: str
    first_name: str
    role: str
    status: str
    student_number: str | None
    cohort_ids: list[uuid.UUID]
    created_at: datetime


class MemberUpdate(InputModel):
    role: NotNull[RoleName] = None
    status: NotNull[Annotated[str, Field(pattern="^(active|disabled)$")]] = None
    student_number: ShortText = None


class EnrollmentChange(InputModel):
    cohort_id: uuid.UUID


class ImportRequest(InputModel):
    rows: Annotated[list[InvitationCreate], Field(min_length=1, max_length=1000)]


class ImportRowResult(OutputModel):
    email: str
    status: str  # invited | added | error
    error: str | None = None
    invitation_url: str | None = None


class AuditRead(OutputModel):
    id: uuid.UUID
    action: str
    target_type: str | None
    target_id: str | None
    details: dict[str, Any]
    actor_email: str | None
    institution_id: uuid.UUID | None
    created_at: datetime


class SchoolOverview(OutputModel):
    students: int
    teachers: int
    admins: int
    pending_invitations: int
    cohorts: int
    courses: int
    sessions_today: int
    attendance_rate_30d: float | None
    billed: float
    collected: float
    currency: str
