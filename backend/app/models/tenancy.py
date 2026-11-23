"""Institutions (tenants), memberships, invitations, password resets and audit log."""

import uuid
from datetime import datetime
from decimal import Decimal
from enum import StrEnum
from typing import Any

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Numeric,
    String,
    UniqueConstraint,
    func,
    true,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.db.tenant import TenantMixin, tenant_fk, tenant_unique
from app.models.user import User


class Role(StrEnum):
    ADMIN = "admin"
    TEACHER = "teacher"
    STUDENT = "student"


class Module(StrEnum):
    """Features an institution can have enabled (depends on its plan)."""

    GRADES = "grades"
    TIMETABLE = "timetable"
    ATTENDANCE = "attendance"
    FINANCE = "finance"
    ANNOUNCEMENTS = "announcements"
    DOCUMENTS = "documents"


PLAN_MODULES: dict[str, list[str]] = {
    "essential": ["grades", "timetable", "attendance", "announcements"],
    "standard": ["grades", "timetable", "attendance", "announcements", "documents"],
    "premium": [m.value for m in Module],
}


class Institution(TimestampMixin, Base):
    __tablename__ = "institutions"
    __table_args__ = (
        CheckConstraint("slug ~ '^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$'", name="slug_format"),
        CheckConstraint("status IN ('active', 'suspended')", name="status_valid"),
        CheckConstraint("plan IN ('essential', 'standard', 'premium')", name="plan_valid"),
        CheckConstraint("locale IN ('fr', 'en')", name="locale_supported"),
        CheckConstraint("pass_mark > 0 AND pass_mark <= grade_max", name="grading_valid"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(150))
    slug: Mapped[str] = mapped_column(String(60), unique=True)
    status: Mapped[str] = mapped_column(String(16), default="active")
    plan: Mapped[str] = mapped_column(String(16), default="standard")
    modules: Mapped[list[str]] = mapped_column(JSONB, default=list)
    country: Mapped[str | None] = mapped_column(String(2))
    locale: Mapped[str] = mapped_column(String(5), default="fr")
    timezone: Mapped[str] = mapped_column(String(64), default="Africa/Dakar")
    currency: Mapped[str] = mapped_column(String(3), default="XOF")
    # Grading system: scores are entered on any scale, results are expressed on grade_max.
    grade_max: Mapped[Decimal] = mapped_column(Numeric(6, 2), default=Decimal(20))
    pass_mark: Mapped[Decimal] = mapped_column(Numeric(6, 2), default=Decimal(10))
    compensation: Mapped[bool] = mapped_column(Boolean, default=True, server_default=true())
    primary_color: Mapped[str | None] = mapped_column(String(7))
    logo_url: Mapped[str | None] = mapped_column(String(500))


class Membership(TimestampMixin, TenantMixin, Base):
    """A user's role in an institution. One membership per (user, institution)."""

    __tablename__ = "memberships"
    __table_args__ = (
        tenant_unique("memberships"),
        UniqueConstraint("user_id", "institution_id", name="uq_memberships_user_institution"),
        UniqueConstraint("institution_id", "student_number", name="uq_memberships_student_number"),
        CheckConstraint("role IN ('admin', 'teacher', 'student')", name="role_valid"),
        CheckConstraint("status IN ('active', 'disabled')", name="status_valid"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    role: Mapped[str] = mapped_column(String(16))
    status: Mapped[str] = mapped_column(String(16), default="active")
    student_number: Mapped[str | None] = mapped_column(String(50))

    user: Mapped[User] = relationship(lazy="joined")
    institution: Mapped[Institution] = relationship(lazy="joined")


class Invitation(TenantMixin, Base):
    __tablename__ = "invitations"
    __table_args__ = (
        tenant_unique("invitations"),
        tenant_fk("invitations", "cohort_id", "cohorts", "SET NULL"),
        CheckConstraint("role IN ('admin', 'teacher', 'student')", name="role_valid"),
    )

    email: Mapped[str] = mapped_column(String(320))
    first_name: Mapped[str | None] = mapped_column(String(100))
    role: Mapped[str] = mapped_column(String(16))
    student_number: Mapped[str | None] = mapped_column(String(50))
    cohort_id: Mapped[uuid.UUID | None]
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    institution: Mapped[Institution] = relationship(lazy="joined")


class PasswordReset(Base):
    __tablename__ = "password_resets"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class AuditLog(Base):
    """Who did what, when. Kept when the actor or the institution is deleted."""

    __tablename__ = "audit_logs"
    __table_args__ = (Index("ix_audit_logs_institution_created", "institution_id", "created_at"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    institution_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("institutions.id", ondelete="SET NULL")
    )
    actor_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    action: Mapped[str] = mapped_column(String(60))
    target_type: Mapped[str | None] = mapped_column(String(40))
    target_id: Mapped[str | None] = mapped_column(String(64))
    details: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )

    actor: Mapped[User | None] = relationship(lazy="joined")
