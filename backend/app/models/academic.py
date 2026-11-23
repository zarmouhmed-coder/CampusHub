"""Academic structure (LMD-friendly), teaching, results, timetable, attendance,
finance, announcements and issued documents. All tables are institution-scoped."""

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    false,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.db.tenant import TenantMixin, tenant_fk, tenant_unique
from app.models.tenancy import Membership


class Department(TimestampMixin, TenantMixin, Base):
    __tablename__ = "departments"
    __table_args__ = (
        tenant_unique("departments"),
        UniqueConstraint("institution_id", "name", name="uq_departments_name"),
    )
    name: Mapped[str] = mapped_column(String(150))
    code: Mapped[str | None] = mapped_column(String(30))


class Program(TimestampMixin, TenantMixin, Base):
    """A degree programme / formation (e.g. "Licence Informatique")."""

    __tablename__ = "programs"
    __table_args__ = (
        tenant_unique("programs"),
        tenant_fk("programs", "department_id", "departments", "SET NULL"),
        UniqueConstraint("institution_id", "name", name="uq_programs_name"),
    )
    department_id: Mapped[uuid.UUID | None]
    name: Mapped[str] = mapped_column(String(150))
    code: Mapped[str | None] = mapped_column(String(30))
    level: Mapped[str | None] = mapped_column(String(30))


class AcademicYear(TimestampMixin, TenantMixin, Base):
    __tablename__ = "academic_years"
    __table_args__ = (
        tenant_unique("academic_years"),
        UniqueConstraint("institution_id", "name", name="uq_academic_years_name"),
        CheckConstraint("ends_on > starts_on", name="dates_order"),
    )
    name: Mapped[str] = mapped_column(String(30))
    starts_on: Mapped[date] = mapped_column(Date)
    ends_on: Mapped[date] = mapped_column(Date)
    is_current: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())


class Period(TimestampMixin, TenantMixin, Base):
    """Semester, trimester… any subdivision of an academic year."""

    __tablename__ = "periods"
    __table_args__ = (
        tenant_unique("periods"),
        tenant_fk("periods", "academic_year_id", "academic_years"),
        CheckConstraint("ends_on > starts_on", name="dates_order"),
    )
    academic_year_id: Mapped[uuid.UUID]
    name: Mapped[str] = mapped_column(String(60))
    position: Mapped[int] = mapped_column(Integer, default=1)
    starts_on: Mapped[date] = mapped_column(Date)
    ends_on: Mapped[date] = mapped_column(Date)


class Cohort(TimestampMixin, TenantMixin, Base):
    """A class / promotion: one programme, one academic year."""

    __tablename__ = "cohorts"
    __table_args__ = (
        tenant_unique("cohorts"),
        tenant_fk("cohorts", "program_id", "programs", "RESTRICT"),
        tenant_fk("cohorts", "academic_year_id", "academic_years", "RESTRICT"),
    )
    program_id: Mapped[uuid.UUID]
    academic_year_id: Mapped[uuid.UUID]
    name: Mapped[str] = mapped_column(String(100))


class Enrollment(TenantMixin, Base):
    __tablename__ = "enrollments"
    __table_args__ = (
        tenant_unique("enrollments"),
        tenant_fk("enrollments", "cohort_id", "cohorts"),
        tenant_fk("enrollments", "student_id", "memberships"),
        UniqueConstraint("cohort_id", "student_id", name="uq_enrollments_cohort_student"),
    )
    cohort_id: Mapped[uuid.UUID]
    student_id: Mapped[uuid.UUID] = mapped_column(index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Room(TimestampMixin, TenantMixin, Base):
    __tablename__ = "rooms"
    __table_args__ = (
        tenant_unique("rooms"),
        UniqueConstraint("institution_id", "name", name="uq_rooms_name"),
        CheckConstraint("capacity IS NULL OR capacity > 0", name="capacity_positive"),
    )
    name: Mapped[str] = mapped_column(String(100))
    building: Mapped[str | None] = mapped_column(String(100))
    capacity: Mapped[int | None] = mapped_column(Integer)


class Unit(TimestampMixin, TenantMixin, Base):
    """Teaching unit (UE) of a cohort for a period; carries the ECTS-like credits."""

    __tablename__ = "units"
    __table_args__ = (
        tenant_unique("units"),
        tenant_fk("units", "cohort_id", "cohorts"),
        tenant_fk("units", "period_id", "periods", "RESTRICT"),
        CheckConstraint("credits >= 0", name="credits_positive"),
    )
    cohort_id: Mapped[uuid.UUID]
    period_id: Mapped[uuid.UUID]
    code: Mapped[str | None] = mapped_column(String(30))
    name: Mapped[str] = mapped_column(String(150))
    credits: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=Decimal(0))


class Course(TimestampMixin, TenantMixin, Base):
    """A course (ECUE) inside a unit, taught by one teacher."""

    __tablename__ = "courses"
    __table_args__ = (
        tenant_unique("courses"),
        tenant_fk("courses", "unit_id", "units"),
        tenant_fk("courses", "teacher_id", "memberships", "SET NULL"),
        CheckConstraint("coefficient > 0", name="coefficient_positive"),
    )
    unit_id: Mapped[uuid.UUID] = mapped_column(index=True)
    teacher_id: Mapped[uuid.UUID | None] = mapped_column(index=True)
    code: Mapped[str | None] = mapped_column(String(30))
    name: Mapped[str] = mapped_column(String(150))
    coefficient: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=Decimal(1))

    unit: Mapped[Unit] = relationship(
        primaryjoin="foreign(Course.unit_id) == Unit.id", viewonly=True, lazy="joined"
    )
    teacher: Mapped[Membership | None] = relationship(
        primaryjoin="foreign(Course.teacher_id) == Membership.id", viewonly=True, lazy="joined"
    )


class Assessment(TimestampMixin, TenantMixin, Base):
    __tablename__ = "assessments"
    __table_args__ = (
        tenant_unique("assessments"),
        tenant_fk("assessments", "course_id", "courses"),
        CheckConstraint("weight > 0", name="weight_positive"),
        CheckConstraint("max_score > 0", name="max_score_positive"),
    )
    course_id: Mapped[uuid.UUID] = mapped_column(index=True)
    title: Mapped[str] = mapped_column(String(150))
    weight: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=Decimal(1))
    max_score: Mapped[Decimal] = mapped_column(Numeric(6, 2))
    held_on: Mapped[date | None] = mapped_column(Date)
    published: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())


class Grade(TenantMixin, Base):
    __tablename__ = "grades"
    __table_args__ = (
        tenant_unique("grades"),
        tenant_fk("grades", "assessment_id", "assessments"),
        tenant_fk("grades", "student_id", "memberships"),
        UniqueConstraint("assessment_id", "student_id", name="uq_grades_assessment_student"),
        CheckConstraint("score IS NULL OR score >= 0", name="score_positive"),
    )
    assessment_id: Mapped[uuid.UUID]
    student_id: Mapped[uuid.UUID] = mapped_column(index=True)
    score: Mapped[Decimal | None] = mapped_column(Numeric(6, 2))
    absent: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class ClassSession(TenantMixin, Base):
    """One slot of the timetable."""

    __tablename__ = "class_sessions"
    __table_args__ = (
        tenant_unique("class_sessions"),
        tenant_fk("class_sessions", "course_id", "courses"),
        tenant_fk("class_sessions", "room_id", "rooms", "SET NULL"),
        CheckConstraint("ends_at > starts_at", name="times_order"),
        Index("ix_class_sessions_institution_starts", "institution_id", "starts_at"),
    )
    course_id: Mapped[uuid.UUID] = mapped_column(index=True)
    room_id: Mapped[uuid.UUID | None]
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    kind: Mapped[str | None] = mapped_column(String(20))  # CM, TD, TP…

    course: Mapped[Course] = relationship(
        primaryjoin="foreign(ClassSession.course_id) == Course.id", viewonly=True, lazy="joined"
    )
    room: Mapped[Room | None] = relationship(
        primaryjoin="foreign(ClassSession.room_id) == Room.id", viewonly=True, lazy="joined"
    )


class Attendance(TenantMixin, Base):
    __tablename__ = "attendance"
    __table_args__ = (
        tenant_unique("attendance"),
        tenant_fk("attendance", "session_id", "class_sessions"),
        tenant_fk("attendance", "student_id", "memberships"),
        UniqueConstraint("session_id", "student_id", name="uq_attendance_session_student"),
        CheckConstraint("status IN ('present', 'absent', 'late', 'excused')", name="status_valid"),
    )
    session_id: Mapped[uuid.UUID]
    student_id: Mapped[uuid.UUID] = mapped_column(index=True)
    status: Mapped[str] = mapped_column(String(16))
    note: Mapped[str | None] = mapped_column(String(200))
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class Invoice(TimestampMixin, TenantMixin, Base):
    __tablename__ = "invoices"
    __table_args__ = (
        tenant_unique("invoices"),
        tenant_fk("invoices", "student_id", "memberships", "RESTRICT"),
        CheckConstraint("amount > 0", name="amount_positive"),
    )
    student_id: Mapped[uuid.UUID] = mapped_column(index=True)
    label: Mapped[str] = mapped_column(String(150))
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    due_on: Mapped[date | None] = mapped_column(Date)

    payments: Mapped[list["Payment"]] = relationship(
        primaryjoin="foreign(Payment.invoice_id) == Invoice.id",
        viewonly=True,
        lazy="selectin",
        order_by="Payment.paid_on",
    )


class Payment(TenantMixin, Base):
    __tablename__ = "payments"
    __table_args__ = (
        tenant_unique("payments"),
        tenant_fk("payments", "invoice_id", "invoices"),
        CheckConstraint("amount > 0", name="amount_positive"),
        CheckConstraint(
            "method IN ('cash', 'bank_transfer', 'mobile_money', 'card', 'other')",
            name="method_valid",
        ),
    )
    invoice_id: Mapped[uuid.UUID] = mapped_column(index=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    method: Mapped[str] = mapped_column(String(20))
    reference: Mapped[str | None] = mapped_column(String(100))
    paid_on: Mapped[date] = mapped_column(Date)
    recorded_by_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Announcement(TenantMixin, Base):
    __tablename__ = "announcements"
    __table_args__ = (
        tenant_unique("announcements"),
        tenant_fk("announcements", "author_id", "memberships", "SET NULL"),
        tenant_fk("announcements", "cohort_id", "cohorts"),
        CheckConstraint(
            "audience IN ('all', 'students', 'teachers', 'cohort')", name="audience_valid"
        ),
        CheckConstraint("(audience = 'cohort') = (cohort_id IS NOT NULL)", name="cohort_audience"),
        Index("ix_announcements_institution_created", "institution_id", "created_at"),
    )
    author_id: Mapped[uuid.UUID | None]
    title: Mapped[str] = mapped_column(String(200))
    body: Mapped[str] = mapped_column(Text)
    audience: Mapped[str] = mapped_column(String(16))
    cohort_id: Mapped[uuid.UUID | None]
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    author: Mapped[Membership | None] = relationship(
        primaryjoin="foreign(Announcement.author_id) == Membership.id", viewonly=True, lazy="joined"
    )


class IssuedDocument(TenantMixin, Base):
    """A transcript or certificate frozen at issue time, verifiable by its public code."""

    __tablename__ = "issued_documents"
    __table_args__ = (
        tenant_unique("issued_documents"),
        tenant_fk("issued_documents", "student_id", "memberships", "RESTRICT"),
        CheckConstraint("kind IN ('transcript', 'enrollment_certificate')", name="kind_valid"),
    )
    student_id: Mapped[uuid.UUID] = mapped_column(index=True)
    kind: Mapped[str] = mapped_column(String(30))
    code: Mapped[str] = mapped_column(String(20), unique=True)
    payload: Mapped[dict[str, Any]] = mapped_column(JSONB)
    issued_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    issued_by_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
