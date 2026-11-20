from sqlalchemy.orm import Session

from app.models import User
from app.schemas.profile import ProfileRead, ProfileUpdate


def to_read(user: User) -> ProfileRead:
    p = user.profile
    return ProfileRead(
        email=user.email,
        first_name=p.first_name,
        promotion=p.promotion,
        academic_year=p.academic_year,
        speciality=p.speciality,
        td_group=p.td_group,
        tp_group=p.tp_group,
    )


def update_profile(db: Session, user: User, data: ProfileUpdate) -> ProfileRead:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(user.profile, field, value)
    db.flush()
    return to_read(user)
