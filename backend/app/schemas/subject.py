import uuid
from datetime import datetime
from typing import Annotated, Any

from pydantic import BeforeValidator, Field

from app.schemas.common import InputModel, LongText, Name, NotNull, OutputModel


def _normalize_color(value: Any) -> Any:
    if isinstance(value, str):
        value = value.strip().lower()
        return value or None
    return value


# "#4f46e5"-style hex colour, stored lowercase.
Color = Annotated[
    Annotated[str, Field(pattern=r"^#[0-9a-f]{6}$")] | None, BeforeValidator(_normalize_color)
]


class SubjectCreate(InputModel):
    name: Name
    description: LongText = None
    color: Color = None


class SubjectUpdate(InputModel):
    name: NotNull[Name] = None
    description: LongText = None
    color: Color = None


class SubjectSummary(OutputModel):
    """Compact form embedded in assignments and exams."""

    id: uuid.UUID
    name: str
    color: str | None


class SubjectRead(SubjectSummary):
    description: str | None
    created_at: datetime
    updated_at: datetime
