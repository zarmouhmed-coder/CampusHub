"""Schemas of the institution's academic structure."""

import uuid
from datetime import date
from typing import Annotated, Self

from pydantic import Field, model_validator

from app.schemas.common import InputModel, Name, NotNull, OutputModel, ShortText, Title

Code = Annotated[str | None, Field(max_length=30)]
Credits = Annotated[float, Field(ge=0, le=60)]
Coefficient = Annotated[float, Field(gt=0, le=100)]


class _Dates(InputModel):
    @model_validator(mode="after")
    def check_order(self) -> Self:
        starts, ends = getattr(self, "starts_on", None), getattr(self, "ends_on", None)
        if starts and ends and ends <= starts:
            raise ValueError("ends_on must be after starts_on")
        return self


# Departments
class DepartmentCreate(InputModel):
    name: Name
    code: Code = None


class DepartmentUpdate(InputModel):
    name: NotNull[Name] = None
    code: Code = None


class DepartmentRead(OutputModel):
    id: uuid.UUID
    name: str
    code: str | None


# Programs
class ProgramCreate(InputModel):
    name: Name
    code: Code = None
    level: ShortText = None
    department_id: uuid.UUID | None = None


class ProgramUpdate(InputModel):
    name: NotNull[Name] = None
    code: Code = None
    level: ShortText = None
    department_id: uuid.UUID | None = None


class ProgramRead(OutputModel):
    id: uuid.UUID
    name: str
    code: str | None
    level: str | None
    department_id: uuid.UUID | None


# Academic years and periods
class AcademicYearCreate(_Dates):
    name: Annotated[str, Field(min_length=1, max_length=30)]
    starts_on: date
    ends_on: date
    is_current: bool = False


class AcademicYearUpdate(_Dates):
    name: NotNull[Annotated[str, Field(min_length=1, max_length=30)]] = None
    starts_on: NotNull[date] = None
    ends_on: NotNull[date] = None
    is_current: NotNull[bool] = None


class AcademicYearRead(OutputModel):
    id: uuid.UUID
    name: str
    starts_on: date
    ends_on: date
    is_current: bool


class PeriodCreate(_Dates):
    academic_year_id: uuid.UUID
    name: Name
    position: Annotated[int, Field(ge=1, le=12)] = 1
    starts_on: date
    ends_on: date


class PeriodUpdate(_Dates):
    name: NotNull[Name] = None
    position: NotNull[Annotated[int, Field(ge=1, le=12)]] = None
    starts_on: NotNull[date] = None
    ends_on: NotNull[date] = None


class PeriodRead(OutputModel):
    id: uuid.UUID
    academic_year_id: uuid.UUID
    name: str
    position: int
    starts_on: date
    ends_on: date


# Cohorts
class CohortCreate(InputModel):
    program_id: uuid.UUID
    academic_year_id: uuid.UUID
    name: Name


class CohortUpdate(InputModel):
    name: NotNull[Name] = None


class CohortRead(OutputModel):
    id: uuid.UUID
    program_id: uuid.UUID
    academic_year_id: uuid.UUID
    name: str


# Rooms
class RoomCreate(InputModel):
    name: Name
    building: ShortText = None
    capacity: Annotated[int, Field(gt=0, le=10000)] | None = None


class RoomUpdate(InputModel):
    name: NotNull[Name] = None
    building: ShortText = None
    capacity: Annotated[int, Field(gt=0, le=10000)] | None = None


class RoomRead(OutputModel):
    id: uuid.UUID
    name: str
    building: str | None
    capacity: int | None


# Units (UE) and courses
class UnitCreate(InputModel):
    cohort_id: uuid.UUID
    period_id: uuid.UUID
    name: Title
    code: Code = None
    credits: Credits = 0


class UnitUpdate(InputModel):
    name: NotNull[Title] = None
    code: Code = None
    credits: NotNull[Credits] = None
    period_id: NotNull[uuid.UUID] = None


class UnitRead(OutputModel):
    id: uuid.UUID
    cohort_id: uuid.UUID
    period_id: uuid.UUID
    name: str
    code: str | None
    credits: float


class CourseCreate(InputModel):
    unit_id: uuid.UUID
    name: Title
    code: Code = None
    coefficient: Coefficient = 1
    teacher_id: uuid.UUID | None = None


class CourseUpdate(InputModel):
    name: NotNull[Title] = None
    code: Code = None
    coefficient: NotNull[Coefficient] = None
    teacher_id: uuid.UUID | None = None


class CourseRead(OutputModel):
    id: uuid.UUID
    unit_id: uuid.UUID
    name: str
    code: str | None
    coefficient: float
    teacher_id: uuid.UUID | None
