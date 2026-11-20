import uuid
from typing import Annotated, Literal

from fastapi import APIRouter, Query, status
from pydantic import AwareDatetime

from app.api.deps import CurrentUser, DbSession
from app.models import Assignment
from app.models.enums import AssignmentStatus, Priority
from app.schemas.assignment import AssignmentCreate, AssignmentRead, AssignmentUpdate
from app.schemas.common import Page
from app.services import assignments as service

router = APIRouter(prefix="/assignments", tags=["assignments"])


@router.get("")
def list_assignments(
    user: CurrentUser,
    db: DbSession,
    status: AssignmentStatus | None = None,
    priority: Priority | None = None,
    subject_id: uuid.UUID | None = None,
    due_after: AwareDatetime | None = None,
    due_before: AwareDatetime | None = None,
    order: Literal["asc", "desc"] = "asc",
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> Page[AssignmentRead]:
    """Assignments sorted by due date (ascending by default), with optional filters.
    `due_after` is inclusive, `due_before` exclusive (ISO 8601 with timezone)."""
    filters = service.AssignmentFilters(
        status, priority, subject_id, due_after, due_before, order, limit, offset
    )
    items, total = service.list_assignments(db, user, filters)
    return Page(
        items=[AssignmentRead.model_validate(a) for a in items],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.post("", response_model=AssignmentRead, status_code=status.HTTP_201_CREATED)
def create_assignment(data: AssignmentCreate, user: CurrentUser, db: DbSession) -> Assignment:
    assignment = service.create_assignment(db, user, data)
    db.commit()
    return assignment


@router.get("/{assignment_id}", response_model=AssignmentRead)
def get_assignment(assignment_id: uuid.UUID, user: CurrentUser, db: DbSession) -> Assignment:
    return service.get_assignment(db, user, assignment_id)


@router.patch("/{assignment_id}", response_model=AssignmentRead)
def update_assignment(
    assignment_id: uuid.UUID, data: AssignmentUpdate, user: CurrentUser, db: DbSession
) -> Assignment:
    assignment = service.update_assignment(db, user, assignment_id, data)
    db.commit()
    return assignment


@router.delete("/{assignment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_assignment(assignment_id: uuid.UUID, user: CurrentUser, db: DbSession) -> None:
    service.delete_assignment(db, user, assignment_id)
    db.commit()
