import uuid
from dataclasses import dataclass
from datetime import datetime
from typing import Literal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Assignment, User
from app.models.enums import AssignmentStatus, Priority
from app.schemas.assignment import AssignmentCreate, AssignmentUpdate
from app.services.common import ensure_subject_owned, get_owned

LABEL = "Assignment"


@dataclass(frozen=True)
class AssignmentFilters:
    status: AssignmentStatus | None = None
    priority: Priority | None = None
    subject_id: uuid.UUID | None = None
    due_after: datetime | None = None
    due_before: datetime | None = None
    order: Literal["asc", "desc"] = "asc"
    limit: int = 50
    offset: int = 0


def list_assignments(
    db: Session, user: User, filters: AssignmentFilters
) -> tuple[list[Assignment], int]:
    query = select(Assignment).where(Assignment.user_id == user.id)
    if filters.status is not None:
        query = query.where(Assignment.status == filters.status)
    if filters.priority is not None:
        query = query.where(Assignment.priority == filters.priority)
    if filters.subject_id is not None:
        query = query.where(Assignment.subject_id == filters.subject_id)
    if filters.due_after is not None:
        query = query.where(Assignment.due_at >= filters.due_after)
    if filters.due_before is not None:
        query = query.where(Assignment.due_at < filters.due_before)

    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    due = Assignment.due_at.asc() if filters.order == "asc" else Assignment.due_at.desc()
    items = db.scalars(
        query.order_by(due, Assignment.created_at).limit(filters.limit).offset(filters.offset)
    )
    return list(items), total


def get_assignment(db: Session, user: User, assignment_id: uuid.UUID) -> Assignment:
    return get_owned(db, Assignment, assignment_id, user, LABEL)


def create_assignment(db: Session, user: User, data: AssignmentCreate) -> Assignment:
    ensure_subject_owned(db, data.subject_id, user)
    assignment = Assignment(user_id=user.id, **data.model_dump())
    db.add(assignment)
    db.flush()
    db.refresh(assignment)
    return assignment


def update_assignment(
    db: Session, user: User, assignment_id: uuid.UUID, data: AssignmentUpdate
) -> Assignment:
    assignment = get_assignment(db, user, assignment_id)
    changes = data.model_dump(exclude_unset=True)
    if "subject_id" in changes:
        ensure_subject_owned(db, changes["subject_id"], user)
    for field, value in changes.items():
        setattr(assignment, field, value)
    db.flush()
    db.refresh(assignment)
    return assignment


def delete_assignment(db: Session, user: User, assignment_id: uuid.UUID) -> None:
    db.delete(get_assignment(db, user, assignment_id))
    db.flush()
