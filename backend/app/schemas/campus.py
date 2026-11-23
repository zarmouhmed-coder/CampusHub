"""Timetable, attendance, finance and announcements."""

import uuid
from datetime import date, datetime
from typing import Annotated, Literal, Self

from pydantic import Field, model_validator

from app.schemas.common import InputModel, NotNull, OutputModel, ShortText, Title, UtcDatetime
from app.schemas.teaching import Ref

# ---------- Timetable ----------


class SessionCreate(InputModel):
    course_id: uuid.UUID
    room_id: uuid.UUID | None = None
    starts_at: UtcDatetime
    ends_at: UtcDatetime
    kind: ShortText = None
    # Also create the same slot on the following N weeks.
    repeat_weeks: Annotated[int, Field(ge=0, le=30)] = 0

    @model_validator(mode="after")
    def check_times(self) -> Self:
        if self.ends_at <= self.starts_at:
            raise ValueError("ends_at must be after starts_at")
        if (self.ends_at - self.starts_at).total_seconds() > 12 * 3600:
            raise ValueError("A session cannot last more than 12 hours")
        return self


class SessionUpdate(InputModel):
    room_id: uuid.UUID | None = None
    starts_at: NotNull[UtcDatetime] = None
    ends_at: NotNull[UtcDatetime] = None
    kind: ShortText = None


class SessionRead(OutputModel):
    id: uuid.UUID
    starts_at: datetime
    ends_at: datetime
    kind: str | None
    course: Ref
    cohort: Ref
    room: Ref | None
    teacher: Ref | None


# ---------- Attendance ----------

AttendanceStatus = Literal["present", "absent", "late", "excused"]


class AttendanceEntry(OutputModel):
    student_id: uuid.UUID
    first_name: str
    email: str
    student_number: str | None
    status: AttendanceStatus | None
    note: str | None


class AttendanceInput(InputModel):
    student_id: uuid.UUID
    status: AttendanceStatus
    note: Annotated[str, Field(max_length=200)] | None = None


class AttendanceUpdate(InputModel):
    records: Annotated[list[AttendanceInput], Field(max_length=1000)]


class AttendanceRecord(OutputModel):
    id: uuid.UUID
    student: Ref
    course: Ref
    starts_at: datetime
    status: str
    note: str | None


class AttendanceFix(InputModel):
    status: AttendanceStatus
    note: Annotated[str, Field(max_length=200)] | None = None


class MyAttendance(OutputModel):
    recorded: int
    absent: int
    late: int
    excused: int
    rate: float | None
    records: list[AttendanceRecord]


# ---------- Finance ----------

Amount = Annotated[float, Field(gt=0, le=1_000_000_000)]
PaymentMethod = Literal["cash", "bank_transfer", "mobile_money", "card", "other"]


class InvoiceCreate(InputModel):
    student_id: uuid.UUID
    label: Title
    amount: Amount
    due_on: date | None = None


class InvoiceBulkCreate(InputModel):
    cohort_id: uuid.UUID
    label: Title
    amount: Amount
    due_on: date | None = None


class InvoiceUpdate(InputModel):
    label: NotNull[Title] = None
    amount: NotNull[Amount] = None
    due_on: date | None = None


class PaymentCreate(InputModel):
    amount: Amount
    method: PaymentMethod
    reference: Annotated[str, Field(max_length=100)] | None = None
    paid_on: date


class PaymentRead(OutputModel):
    id: uuid.UUID
    amount: float
    method: str
    reference: str | None
    paid_on: date


class InvoiceRead(OutputModel):
    id: uuid.UUID
    student: Ref
    student_number: str | None
    label: str
    amount: float
    paid: float
    balance: float
    due_on: date | None
    status: Literal["paid", "partial", "unpaid", "overdue"]
    currency: str
    payments: list[PaymentRead]
    created_at: datetime


class FinanceSummary(OutputModel):
    currency: str
    billed: float
    collected: float
    outstanding: float
    overdue: float
    collection_rate: float | None
    by_method: dict[str, float]


# ---------- Announcements ----------

Audience = Literal["all", "students", "teachers", "cohort"]


class AnnouncementCreate(InputModel):
    title: Title
    body: Annotated[str, Field(min_length=1, max_length=5000)]
    audience: Audience
    cohort_id: uuid.UUID | None = None

    @model_validator(mode="after")
    def cohort_matches_audience(self) -> Self:
        if (self.audience == "cohort") != (self.cohort_id is not None):
            raise ValueError("cohort_id is required for, and only for, the 'cohort' audience")
        return self


class AnnouncementRead(OutputModel):
    id: uuid.UUID
    title: str
    body: str
    audience: str
    cohort: Ref | None
    author: str | None
    created_at: datetime
    can_delete: bool = False
