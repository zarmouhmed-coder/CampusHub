from typing import Annotated

from pydantic import Field

from app.schemas.common import InputModel, MediumText, Name, NotNull, OutputModel, ShortText


class ProfileRead(OutputModel):
    email: str
    first_name: str
    promotion: str | None
    academic_year: int | None
    speciality: str | None
    td_group: str | None
    tp_group: str | None


class ProfileUpdate(InputModel):
    first_name: NotNull[Name] = None
    promotion: ShortText = None
    academic_year: Annotated[int | None, Field(ge=1, le=8)] = None
    speciality: MediumText = None
    td_group: ShortText = None
    tp_group: ShortText = None
