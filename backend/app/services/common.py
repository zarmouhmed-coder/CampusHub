import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import InvalidReferenceError, NotFoundError
from app.models import Assignment, Exam, Subject, User


def get_owned[M: (Subject, Assignment, Exam)](
    db: Session, model: type[M], item_id: uuid.UUID, user: User, label: str
) -> M:
    """Load an item by id *and* owner. Another user's item is reported as missing (404),
    so that ids belonging to other students cannot even be probed."""
    item = db.scalar(select(model).where(model.id == item_id, model.user_id == user.id))
    if item is None:
        raise NotFoundError(label)
    return item


def ensure_subject_owned(db: Session, subject_id: uuid.UUID | None, user: User) -> None:
    if subject_id is None:
        return
    exists = db.scalar(
        select(Subject.id).where(Subject.id == subject_id, Subject.user_id == user.id)
    )
    if exists is None:
        raise InvalidReferenceError("subject_not_found", "The selected subject does not exist.")
