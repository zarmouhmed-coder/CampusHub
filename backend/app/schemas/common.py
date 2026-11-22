from datetime import UTC
from typing import Annotated, Any, Literal
from zoneinfo import available_timezones

from pydantic import (
    AfterValidator,
    AwareDatetime,
    BaseModel,
    BeforeValidator,
    ConfigDict,
    Field,
    StringConstraints,
)


def _empty_to_none(value: Any) -> Any:
    """Optional text fields: '   ' and '' are stored as NULL."""
    if isinstance(value, str):
        value = value.strip()
        return value or None
    return value


def _to_utc(value: AwareDatetime) -> AwareDatetime:
    return value.astimezone(UTC)


# Required text: surrounding spaces removed, cannot be blank.
Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
Title = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]

# Optional text: blank values become None.
ShortText = Annotated[Annotated[str, Field(max_length=50)] | None, BeforeValidator(_empty_to_none)]
MediumText = Annotated[
    Annotated[str, Field(max_length=100)] | None, BeforeValidator(_empty_to_none)
]
LongText = Annotated[Annotated[str, Field(max_length=2000)] | None, BeforeValidator(_empty_to_none)]


# Datetimes must carry a timezone (e.g. "2026-12-01T10:00:00+01:00" or "...Z").
UtcDatetime = Annotated[AwareDatetime, AfterValidator(_to_utc)]


class InputModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class OutputModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


def _reject_null(value: Any) -> Any:
    if value is None:
        raise ValueError("Ce champ ne peut pas être vide.")
    return value


def _valid_timezone(value: str) -> str:
    if value not in available_timezones():
        raise ValueError("Unknown timezone (expected an IANA name such as 'Africa/Dakar').")
    return value


Locale = Literal["fr", "en"]
TimeZoneName = Annotated[str, AfterValidator(_valid_timezone)]


# For PATCH bodies: a required field may be omitted, but not explicitly set to null.
type NotNull[T] = Annotated[T | None, AfterValidator(_reject_null)]


class Page[T](BaseModel):
    items: list[T]
    total: int
    limit: int
    offset: int
