from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession
from app.schemas.profile import ProfileRead, ProfileUpdate
from app.services import profile as profile_service

router = APIRouter(prefix="/profile", tags=["profile"])


@router.get("/me")
def read_profile(user: CurrentUser) -> ProfileRead:
    return profile_service.to_read(user)


@router.patch("/me")
def update_profile(data: ProfileUpdate, user: CurrentUser, db: DbSession) -> ProfileRead:
    profile = profile_service.update_profile(db, user, data)
    db.commit()
    return profile
