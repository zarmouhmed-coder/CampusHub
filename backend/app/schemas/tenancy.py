import uuid
from datetime import datetime
from typing import Annotated, Literal

from pydantic import AfterValidator, EmailStr, Field

from app.schemas.common import InputModel, Locale, Name, OutputModel, ShortText, TimeZoneName

RoleName = Literal["admin", "teacher", "student"]
ModuleName = Literal["grades", "timetable", "attendance", "finance", "announcements", "documents"]
PlanName = Literal["essential", "standard", "premium"]


def _lower(value: str) -> str:
    return value.strip().lower()


Email = Annotated[EmailStr, AfterValidator(_lower)]
HexColor = Annotated[str, Field(pattern=r"^#[0-9a-fA-F]{6}$")]
Currency = Annotated[str, Field(pattern=r"^[A-Z]{3}$")]


class InstitutionRead(OutputModel):
    id: uuid.UUID
    name: str
    slug: str
    status: str
    plan: str
    modules: list[str]
    country: str | None
    locale: str
    timezone: str
    currency: str
    grade_max: float
    pass_mark: float
    compensation: bool
    primary_color: str | None
    logo_url: str | None


class MembershipBrief(OutputModel):
    institution_id: uuid.UUID
    institution_name: str
    role: str


class MeRead(OutputModel):
    id: uuid.UUID
    email: str
    first_name: str
    locale: Locale
    timezone: str
    created_at: datetime
    is_superadmin: bool
    role: str | None
    membership_id: uuid.UUID | None
    institution: InstitutionRead | None
    memberships: list[MembershipBrief]


class SwitchInstitution(InputModel):
    institution_id: uuid.UUID


class PasswordResetRequest(InputModel):
    email: Email


class PasswordResetConfirm(InputModel):
    token: Annotated[str, Field(min_length=10, max_length=200)]
    password: Annotated[str, Field(min_length=8, max_length=128)]


class InvitationCreate(InputModel):
    email: Email
    role: RoleName
    first_name: Name | None = None
    student_number: ShortText = None
    cohort_id: uuid.UUID | None = None


class InvitationResult(OutputModel):
    email: str
    status: Literal["invited", "added"]
    invitation_url: str | None = None


class InvitationRead(OutputModel):
    id: uuid.UUID
    email: str
    first_name: str | None
    role: str
    cohort_id: uuid.UUID | None
    expires_at: datetime
    accepted_at: datetime | None
    created_at: datetime


class InvitationPublic(OutputModel):
    email: str
    first_name: str | None
    role: str
    institution_name: str
    institution_locale: str
    expired: bool
    accepted: bool


class InvitationAccept(InputModel):
    first_name: Name
    password: Annotated[str, Field(min_length=8, max_length=128)]


class InstitutionSettingsUpdate(InputModel):
    """What an institution admin may change about their own institution."""

    name: Name | None = None
    locale: Locale | None = None
    timezone: TimeZoneName | None = None
    currency: Currency | None = None
    grade_max: Annotated[float, Field(gt=0, le=1000)] | None = None
    pass_mark: Annotated[float, Field(gt=0, le=1000)] | None = None
    compensation: bool | None = None
    primary_color: HexColor | None = None
    logo_url: Annotated[str, Field(max_length=500, pattern=r"^https://")] | None = None
