"""Announcements targeted at everyone, students, teachers or one cohort."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.api.crud import check_refs, get_scoped
from app.api.deps import Ctx, DbSession, require
from app.core.errors import AppError, NotFoundError
from app.models import Announcement, Cohort, Course, Enrollment, Unit
from app.schemas.campus import AnnouncementCreate, AnnouncementRead
from app.schemas.teaching import Ref
from app.services import audit

router = APIRouter(prefix="/announcements", tags=["announcements"])
Member = Annotated[Ctx, Depends(require("timetable.read", "announcements"))]
Publisher = Annotated[Ctx, Depends(require("announcements.publish", "announcements"))]


def _taught_cohorts(ctx: Ctx) -> object:
    return (
        select(Unit.cohort_id)
        .join(Course, Course.unit_id == Unit.id)
        .where(Course.teacher_id == ctx.membership.id)
    )


def _read(db: Session, ctx: Ctx, a: Announcement) -> AnnouncementRead:
    cohort = db.get(Cohort, a.cohort_id) if a.cohort_id else None
    return AnnouncementRead(
        id=a.id,
        title=a.title,
        body=a.body,
        audience=a.audience,
        cohort=Ref(id=cohort.id, name=cohort.name) if cohort else None,
        author=a.author.user.first_name if a.author else None,
        created_at=a.created_at,
        can_delete=ctx.role == "admin" or a.author_id == ctx.membership.id,
    )


@router.get("")
def feed(
    ctx: Member, db: DbSession, limit: Annotated[int, Query(ge=1, le=100)] = 50
) -> list[AnnouncementRead]:
    """What the caller is allowed to read, newest first."""
    query = (
        select(Announcement)
        .where(Announcement.institution_id == ctx.institution_id)
        .order_by(Announcement.created_at.desc())
        .limit(limit)
    )
    if ctx.role == "student":
        mine = select(Enrollment.cohort_id).where(Enrollment.student_id == ctx.membership.id)
        query = query.where(
            or_(
                Announcement.audience.in_(["all", "students"]),
                (Announcement.audience == "cohort") & Announcement.cohort_id.in_(mine),
            )
        )
    elif ctx.role == "teacher":
        query = query.where(
            or_(
                Announcement.audience.in_(["all", "teachers"]),
                Announcement.author_id == ctx.membership.id,
                (Announcement.audience == "cohort")
                & Announcement.cohort_id.in_(_taught_cohorts(ctx)),  # type: ignore[arg-type]
            )
        )
    return [_read(db, ctx, a) for a in db.scalars(query)]


@router.post("", status_code=status.HTTP_201_CREATED)
def publish(data: AnnouncementCreate, ctx: Publisher, db: DbSession) -> AnnouncementRead:
    check_refs(db, ctx, {"cohort_id": Cohort}, {"cohort_id": data.cohort_id})
    if ctx.role != "admin":
        # Teachers write to the cohorts they teach, nothing broader.
        taught = set(db.scalars(_taught_cohorts(ctx)))  # type: ignore[call-overload]
        if data.audience != "cohort" or data.cohort_id not in taught:
            raise AppError(
                status.HTTP_403_FORBIDDEN, "forbidden", "Teachers post to their own cohorts only."
            )
    a = Announcement(
        institution_id=ctx.institution_id, author_id=ctx.membership.id, **data.model_dump()
    )
    db.add(a)
    db.flush()
    audit.record(
        db,
        actor_id=ctx.user.id,
        institution_id=ctx.institution_id,
        action="announcement.published",
        target_type="announcement",
        target_id=a.id,
        details={"audience": data.audience},
    )
    db.commit()
    db.refresh(a)
    return _read(db, ctx, a)


@router.delete("/{announcement_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove(announcement_id: uuid.UUID, ctx: Member, db: DbSession) -> None:
    a = get_scoped(db, Announcement, announcement_id, ctx)
    if ctx.role != "admin" and a.author_id != ctx.membership.id:
        raise NotFoundError("Announcement")
    db.delete(a)
    audit.record(
        db,
        actor_id=ctx.user.id,
        institution_id=ctx.institution_id,
        action="announcement.deleted",
        target_type="announcement",
        target_id=announcement_id,
    )
    db.commit()
