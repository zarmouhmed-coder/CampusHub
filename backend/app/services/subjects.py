import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.errors import ConflictError
from app.models import Subject, User
from app.schemas.subject import SubjectCreate, SubjectUpdate
from app.services.common import get_owned

LABEL = "Matière"


def _ensure_name_available(
    db: Session, user: User, name: str, exclude_id: uuid.UUID | None = None
) -> None:
    query = select(Subject.id).where(
        Subject.user_id == user.id, func.lower(Subject.name) == name.lower()
    )
    if exclude_id is not None:
        query = query.where(Subject.id != exclude_id)
    if db.scalar(query) is not None:
        raise ConflictError("Tu as déjà une matière portant ce nom.")


def list_subjects(db: Session, user: User) -> list[Subject]:
    query = select(Subject).where(Subject.user_id == user.id).order_by(func.lower(Subject.name))
    return list(db.scalars(query))


def get_subject(db: Session, user: User, subject_id: uuid.UUID) -> Subject:
    return get_owned(db, Subject, subject_id, user, LABEL)


def create_subject(db: Session, user: User, data: SubjectCreate) -> Subject:
    _ensure_name_available(db, user, data.name)
    subject = Subject(user_id=user.id, **data.model_dump())
    db.add(subject)
    db.flush()
    return subject


def update_subject(db: Session, user: User, subject_id: uuid.UUID, data: SubjectUpdate) -> Subject:
    subject = get_subject(db, user, subject_id)
    changes = data.model_dump(exclude_unset=True)
    if "name" in changes:
        _ensure_name_available(db, user, changes["name"], exclude_id=subject.id)
    for field, value in changes.items():
        setattr(subject, field, value)
    db.flush()
    db.refresh(subject)
    return subject


def delete_subject(db: Session, user: User, subject_id: uuid.UUID) -> None:
    # Linked assignments and exams are kept: the database sets their subject_id to NULL.
    db.delete(get_subject(db, user, subject_id))
    db.flush()
