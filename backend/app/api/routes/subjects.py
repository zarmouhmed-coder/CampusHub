import uuid

from fastapi import APIRouter, status

from app.api.deps import CurrentUser, DbSession
from app.models import Subject
from app.schemas.subject import SubjectCreate, SubjectRead, SubjectUpdate
from app.services import subjects as service

router = APIRouter(prefix="/subjects", tags=["subjects"])


@router.get("", response_model=list[SubjectRead])
def list_subjects(user: CurrentUser, db: DbSession) -> list[Subject]:
    return service.list_subjects(db, user)


@router.post("", response_model=SubjectRead, status_code=status.HTTP_201_CREATED)
def create_subject(data: SubjectCreate, user: CurrentUser, db: DbSession) -> Subject:
    subject = service.create_subject(db, user, data)
    db.commit()
    return subject


@router.get("/{subject_id}", response_model=SubjectRead)
def get_subject(subject_id: uuid.UUID, user: CurrentUser, db: DbSession) -> Subject:
    return service.get_subject(db, user, subject_id)


@router.patch("/{subject_id}", response_model=SubjectRead)
def update_subject(
    subject_id: uuid.UUID, data: SubjectUpdate, user: CurrentUser, db: DbSession
) -> Subject:
    subject = service.update_subject(db, user, subject_id, data)
    db.commit()
    return subject


@router.delete("/{subject_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_subject(subject_id: uuid.UUID, user: CurrentUser, db: DbSession) -> None:
    service.delete_subject(db, user, subject_id)
    db.commit()
