import uuid
from datetime import datetime

from app.schemas.common import (
    InputModel,
    LongText,
    MediumText,
    NotNull,
    OutputModel,
    Title,
    UtcDatetime,
)
from app.schemas.subject import SubjectSummary


class ExamCreate(InputModel):
    title: Title
    subject_id: uuid.UUID | None = None
    exam_at: UtcDatetime
    room: MediumText = None
    description: LongText = None


class ExamUpdate(InputModel):
    title: NotNull[Title] = None
    subject_id: uuid.UUID | None = None
    exam_at: NotNull[UtcDatetime] = None
    room: MediumText = None
    description: LongText = None


class ExamRead(OutputModel):
    id: uuid.UUID
    title: str
    subject: SubjectSummary | None
    exam_at: datetime
    room: str | None
    description: str | None
    created_at: datetime
    updated_at: datetime
