from typing import Annotated

from pydantic import Field

from app.schemas.common import (
    InputModel,
    Locale,
    MediumText,
    Name,
    NotNull,
    OutputModel,
    ShortText,
    TimeZoneName,
)


class ProfileRead(OutputModel):
    email: str
    first_name: str
    promotion: str | None
    academic_year: int | None
    speciality: str | None
    td_group: str | None
    tp_group: str | None
    locale: Locale
    timezone: str


class ProfileUpdate(InputModel):
    first_name: NotNull[Name] = None
    promotion: ShortText = None
    academic_year: Annotated[int | None, Field(ge=1, le=8)] = None
    speciality: MediumText = None
    td_group: ShortText = None
    tp_group: ShortText = None
    locale: NotNull[Locale] = None
    timezone: NotNull[TimeZoneName] = None
