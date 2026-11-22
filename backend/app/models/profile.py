import uuid
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, ForeignKey, SmallInteger, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User


class Profile(TimestampMixin, Base):
    """Student profile, 1-1 with User (the user id is the primary key)."""

    __tablename__ = "profiles"
    __table_args__ = (
        CheckConstraint("academic_year BETWEEN 1 AND 8", name="academic_year_range"),
        CheckConstraint("locale IN ('fr', 'en')", name="locale_supported"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    first_name: Mapped[str] = mapped_column(String(100))
    promotion: Mapped[str | None] = mapped_column(String(50))
    academic_year: Mapped[int | None] = mapped_column(SmallInteger)
    speciality: Mapped[str | None] = mapped_column(String(100))
    td_group: Mapped[str | None] = mapped_column(String(50))
    tp_group: Mapped[str | None] = mapped_column(String(50))
    # Interface language and IANA timezone used to display dates and compute "today"/"this week".
    locale: Mapped[str] = mapped_column(String(5), default="fr", server_default="fr")
    timezone: Mapped[str] = mapped_column(
        String(64), default="Europe/Paris", server_default="Europe/Paris"
    )

    user: Mapped["User"] = relationship(back_populates="profile")
