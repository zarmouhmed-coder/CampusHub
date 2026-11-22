import uuid
from datetime import datetime
from typing import Annotated

from pydantic import AfterValidator, EmailStr, Field

from app.schemas.common import InputModel, Locale, Name, OutputModel, TimeZoneName


def _normalize_email(value: str) -> str:
    return value.strip().lower()


Email = Annotated[EmailStr, AfterValidator(_normalize_email)]


class RegisterRequest(InputModel):
    first_name: Name
    email: Email
    password: Annotated[str, Field(min_length=8, max_length=128)]
    # Sent by the browser at sign-up; editable later in the profile.
    locale: Locale = "fr"
    timezone: TimeZoneName = "Europe/Paris"


class LoginRequest(InputModel):
    email: Email
    # No length rule on login: never tell an attacker which passwords are impossible.
    password: Annotated[str, Field(max_length=128)]


class UserRead(OutputModel):
    id: uuid.UUID
    email: str
    first_name: str
    locale: Locale
    timezone: str
    created_at: datetime
