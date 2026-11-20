import uuid
from datetime import datetime

from app.models.enums import AssignmentStatus, Priority
from app.schemas.common import InputModel, LongText, NotNull, OutputModel, Title, UtcDatetime
from app.schemas.subject import SubjectSummary


class AssignmentCreate(InputModel):
    title: Title
    description: LongText = None
    subject_id: uuid.UUID | None = None
    due_at: UtcDatetime
    priority: Priority = Priority.NORMAL
    status: AssignmentStatus = AssignmentStatus.TODO


class AssignmentUpdate(InputModel):
    title: NotNull[Title] = None
    description: LongText = None
    subject_id: uuid.UUID | None = None
    due_at: NotNull[UtcDatetime] = None
    priority: NotNull[Priority] = None
    status: NotNull[AssignmentStatus] = None


class AssignmentRead(OutputModel):
    id: uuid.UUID
    title: str
    description: str | None
    subject: SubjectSummary | None
    due_at: datetime
    priority: Priority
    status: AssignmentStatus
    created_at: datetime
    updated_at: datetime
