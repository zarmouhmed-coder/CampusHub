import uuid
from datetime import date, datetime
from typing import Annotated, Any, Literal

from pydantic import Field

from app.schemas.common import InputModel, NotNull, OutputModel, Title


class Ref(OutputModel):
    id: uuid.UUID
    name: str


class CourseDetail(OutputModel):
    id: uuid.UUID
    name: str
    code: str | None
    coefficient: float
    unit: Ref
    unit_credits: float
    cohort: Ref
    period: Ref
    teacher: Ref | None
    students: int


Weight = Annotated[float, Field(gt=0, le=100)]
MaxScore = Annotated[float, Field(gt=0, le=1000)]


class AssessmentCreate(InputModel):
    title: Title
    weight: Weight = 1
    max_score: MaxScore | None = None  # defaults to the institution's scale
    held_on: date | None = None


class AssessmentUpdate(InputModel):
    title: NotNull[Title] = None
    weight: NotNull[Weight] = None
    max_score: NotNull[MaxScore] = None
    held_on: date | None = None
    published: NotNull[bool] = None


class AssessmentRead(OutputModel):
    id: uuid.UUID
    course_id: uuid.UUID
    title: str
    weight: float
    max_score: float
    held_on: date | None
    published: bool
    graded: int = 0


class RosterEntry(OutputModel):
    student_id: uuid.UUID
    first_name: str
    email: str
    student_number: str | None
    score: float | None
    absent: bool


class GradeInput(InputModel):
    student_id: uuid.UUID
    score: Annotated[float, Field(ge=0)] | None = None
    absent: bool = False


class GradesUpdate(InputModel):
    grades: Annotated[list[GradeInput], Field(max_length=2000)]


# ---------- Results ----------


class AssessmentResult(OutputModel):
    title: str
    weight: float
    max_score: float
    score: float | None
    absent: bool


class CourseResult(OutputModel):
    id: uuid.UUID
    name: str
    coefficient: float
    average: float | None
    assessments: list[AssessmentResult]


class UnitResult(OutputModel):
    id: uuid.UUID
    code: str | None
    name: str
    credits: float
    average: float | None
    validated: bool
    compensated: bool
    courses: list[CourseResult]


class PeriodResult(OutputModel):
    id: uuid.UUID
    name: str
    academic_year: str
    cohort: str
    average: float | None
    credits_total: float
    credits_earned: float
    validated: bool
    units: list[UnitResult]


class StudentResults(OutputModel):
    student_id: uuid.UUID
    first_name: str
    student_number: str | None
    grade_max: float
    pass_mark: float
    periods: list[PeriodResult]


# ---------- Documents ----------

DocumentKind = Literal["transcript", "enrollment_certificate"]


class DocumentCreate(InputModel):
    student_id: uuid.UUID
    kind: DocumentKind
    period_id: uuid.UUID | None = None


class DocumentRead(OutputModel):
    id: uuid.UUID
    student_id: uuid.UUID
    kind: str
    code: str
    issued_at: datetime
    revoked_at: datetime | None
    payload: dict[str, Any]


class Verification(OutputModel):
    valid: bool
    revoked: bool
    kind: str
    code: str
    institution: str
    student_name: str
    student_number: str | None
    issued_at: datetime
    summary: list[dict[str, Any]]
