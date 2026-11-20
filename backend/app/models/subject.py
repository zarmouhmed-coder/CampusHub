import uuid

from sqlalchemy import CheckConstraint, ForeignKey, Index, String, Text, UniqueConstraint, text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin


class Subject(TimestampMixin, Base):
    __tablename__ = "subjects"
    __table_args__ = (
        # A user cannot have two subjects with the same name (case-insensitive).
        Index("uq_subjects_user_id_lower_name", "user_id", text("lower(name)"), unique=True),
        # Target of the composite foreign keys from assignments/exams: guarantees at
        # the database level that an item can only reference a subject of its owner.
        UniqueConstraint("id", "user_id", name="uq_subjects_id_user_id"),
        CheckConstraint("color ~ '^#[0-9a-f]{6}$'", name="color_hex"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(100))
    description: Mapped[str | None] = mapped_column(Text)
    color: Mapped[str | None] = mapped_column(String(7))
