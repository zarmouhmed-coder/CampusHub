import uuid
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Literal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Exam, User
from app.schemas.exam import ExamCreate, ExamUpdate
from app.services.common import ensure_subject_owned, get_owned

LABEL = "Examen"


@dataclass(frozen=True)
class ExamFilters:
    when: Literal["all", "upcoming", "past"] = "all"
    subject_id: uuid.UUID | None = None
    limit: int = 50
    offset: int = 0


def list_exams(db: Session, user: User, filters: ExamFilters) -> tuple[list[Exam], int]:
    now = datetime.now(UTC)
    query = select(Exam).where(Exam.user_id == user.id)
    if filters.subject_id is not None:
        query = query.where(Exam.subject_id == filters.subject_id)
    if filters.when == "upcoming":
        query = query.where(Exam.exam_at >= now)
    elif filters.when == "past":
        query = query.where(Exam.exam_at < now)

    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    # Past exams: most recent first. Otherwise: chronological.
    order = Exam.exam_at.desc() if filters.when == "past" else Exam.exam_at.asc()
    items = db.scalars(query.order_by(order).limit(filters.limit).offset(filters.offset))
    return list(items), total


def get_exam(db: Session, user: User, exam_id: uuid.UUID) -> Exam:
    return get_owned(db, Exam, exam_id, user, LABEL)


def create_exam(db: Session, user: User, data: ExamCreate) -> Exam:
    ensure_subject_owned(db, data.subject_id, user)
    exam = Exam(user_id=user.id, **data.model_dump())
    db.add(exam)
    db.flush()
    db.refresh(exam)
    return exam


def update_exam(db: Session, user: User, exam_id: uuid.UUID, data: ExamUpdate) -> Exam:
    exam = get_exam(db, user, exam_id)
    changes = data.model_dump(exclude_unset=True)
    if "subject_id" in changes:
        ensure_subject_owned(db, changes["subject_id"], user)
    for field, value in changes.items():
        setattr(exam, field, value)
    db.flush()
    db.refresh(exam)
    return exam


def delete_exam(db: Session, user: User, exam_id: uuid.UUID) -> None:
    db.delete(get_exam(db, user, exam_id))
    db.flush()
