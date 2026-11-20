"""Assignments and exams: user-owned items optionally linked to a subject."""

import uuid
from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, foreign, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.models.enums import AssignmentStatus, Priority
from app.models.subject import Subject


def _subject_fk(table: str) -> ForeignKeyConstraint:
    # (subject_id, user_id) -> subjects(id, user_id): the subject must belong to the
    # same user. On subject deletion only subject_id is set to NULL (PostgreSQL >= 15),
    # the item itself is kept.
    return ForeignKeyConstraint(
        ["subject_id", "user_id"],
        ["subjects.id", "subjects.user_id"],
        name=f"fk_{table}_subject_id_user_id_subjects",
        ondelete="SET NULL (subject_id)",
    )


def _enum_check(column: str, values: type[Priority] | type[AssignmentStatus]) -> CheckConstraint:
    allowed = ", ".join(f"'{v.value}'" for v in values)
    return CheckConstraint(f"{column} IN ({allowed})", name=f"{column}_valid")


class Assignment(TimestampMixin, Base):
    __tablename__ = "assignments"
    __table_args__ = (
        _subject_fk("assignments"),
        _enum_check("priority", Priority),
        _enum_check("status", AssignmentStatus),
        Index("ix_assignments_user_id_due_at", "user_id", "due_at"),
        Index("ix_assignments_subject_id", "subject_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    subject_id: Mapped[uuid.UUID | None]
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text)
    due_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    priority: Mapped[str] = mapped_column(String(16), default=Priority.NORMAL)
    status: Mapped[str] = mapped_column(String(16), default=AssignmentStatus.TODO)

    # Read-only: subject_id is always set explicitly by the service layer.
    subject: Mapped[Subject | None] = relationship(
        primaryjoin=lambda: foreign(Assignment.subject_id) == Subject.id,
        viewonly=True,
        lazy="joined",
    )


class Exam(TimestampMixin, Base):
    __tablename__ = "exams"
    __table_args__ = (
        _subject_fk("exams"),
        Index("ix_exams_user_id_exam_at", "user_id", "exam_at"),
        Index("ix_exams_subject_id", "subject_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    subject_id: Mapped[uuid.UUID | None]
    title: Mapped[str] = mapped_column(String(200))
    exam_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    room: Mapped[str | None] = mapped_column(String(100))
    description: Mapped[str | None] = mapped_column(Text)

    subject: Mapped[Subject | None] = relationship(
        primaryjoin=lambda: foreign(Exam.subject_id) == Subject.id,
        viewonly=True,
        lazy="joined",
    )
