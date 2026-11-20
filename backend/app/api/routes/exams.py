import uuid
from typing import Annotated, Literal

from fastapi import APIRouter, Query, status
from pydantic import AwareDatetime

from app.api.deps import CurrentUser, DbSession
from app.models import Exam
from app.schemas.common import Page
from app.schemas.exam import ExamCreate, ExamRead, ExamUpdate
from app.services import exams as service

router = APIRouter(prefix="/exams", tags=["exams"])


@router.get("")
def list_exams(
    user: CurrentUser,
    db: DbSession,
    when: Literal["all", "upcoming", "past"] = "all",
    subject_id: uuid.UUID | None = None,
    after: AwareDatetime | None = None,
    before: AwareDatetime | None = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> Page[ExamRead]:
    """Exams in chronological order (most recent first for `when=past`).
    `after` is inclusive, `before` exclusive (ISO 8601 with timezone)."""
    items, total = service.list_exams(
        db, user, service.ExamFilters(when, subject_id, after, before, limit, offset)
    )
    return Page(
        items=[ExamRead.model_validate(e) for e in items], total=total, limit=limit, offset=offset
    )


@router.post("", response_model=ExamRead, status_code=status.HTTP_201_CREATED)
def create_exam(data: ExamCreate, user: CurrentUser, db: DbSession) -> Exam:
    exam = service.create_exam(db, user, data)
    db.commit()
    return exam


@router.get("/{exam_id}", response_model=ExamRead)
def get_exam(exam_id: uuid.UUID, user: CurrentUser, db: DbSession) -> Exam:
    return service.get_exam(db, user, exam_id)


@router.patch("/{exam_id}", response_model=ExamRead)
def update_exam(exam_id: uuid.UUID, data: ExamUpdate, user: CurrentUser, db: DbSession) -> Exam:
    exam = service.update_exam(db, user, exam_id, data)
    db.commit()
    return exam


@router.delete("/{exam_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_exam(exam_id: uuid.UUID, user: CurrentUser, db: DbSession) -> None:
    service.delete_exam(db, user, exam_id)
    db.commit()
