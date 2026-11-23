"""CampusHub owner console (super administrators only), independent of institutions."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select

from app.api.crud import _flush
from app.api.deps import DbSession, SuperAdmin
from app.api.routes.school import to_audit_read
from app.core.errors import NotFoundError
from app.models import AuditLog, Institution, Membership, User
from app.models.tenancy import PLAN_MODULES
from app.schemas.common import InputModel, Locale, Name, OutputModel, TimeZoneName
from app.schemas.people import AuditRead
from app.schemas.tenancy import (
    Currency,
    Email,
    InstitutionRead,
    InvitationCreate,
    ModuleName,
    PlanName,
)
from app.services import audit, tenancy

router = APIRouter(prefix="/platform", tags=["platform"])

Slug = Annotated[str, Field(pattern=r"^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$")]
Country = Annotated[str, Field(pattern=r"^[A-Z]{2}$")]


class InstitutionCreate(InputModel):
    name: Name
    slug: Slug
    country: Country | None = None
    locale: Locale = "fr"
    timezone: TimeZoneName = "Africa/Dakar"
    currency: Currency = "XOF"
    plan: PlanName = "standard"
    admin_email: Email
    admin_first_name: Name | None = None


class InstitutionUpdate(InputModel):
    name: Name | None = None
    status: Annotated[str, Field(pattern="^(active|suspended)$")] | None = None
    plan: PlanName | None = None
    modules: list[ModuleName] | None = None
    country: Country | None = None
    locale: Locale | None = None
    timezone: TimeZoneName | None = None
    currency: Currency | None = None


class InstitutionSummary(InstitutionRead):
    members: int
    students: int


class InstitutionCreated(BaseModel):
    institution: InstitutionRead
    admin_status: str
    invitation_url: str | None


class PlatformUser(OutputModel):
    id: uuid.UUID
    email: str
    first_name: str
    is_superadmin: bool
    is_active: bool
    institutions: list[str]


class PlatformStats(OutputModel):
    institutions: int
    active_institutions: int
    suspended_institutions: int
    users: int
    students: int
    teachers: int
    by_plan: dict[str, int]


def _summary(db: DbSession, inst: Institution) -> InstitutionSummary:
    counts = dict(
        db.execute(
            select(Membership.role, func.count())
            .where(Membership.institution_id == inst.id)
            .group_by(Membership.role)
        ).all()
    )
    return InstitutionSummary(
        **InstitutionRead.model_validate(inst).model_dump(),
        members=sum(counts.values()),
        students=counts.get("student", 0),
    )


@router.get("/institutions")
def list_institutions(_: SuperAdmin, db: DbSession) -> list[InstitutionSummary]:
    return [_summary(db, i) for i in db.scalars(select(Institution).order_by(Institution.name))]


@router.post("/institutions", status_code=status.HTTP_201_CREATED)
def create_institution(
    data: InstitutionCreate, user: SuperAdmin, db: DbSession
) -> InstitutionCreated:
    """Creates the institution and invites (or adds) its first administrator."""
    inst = Institution(
        name=data.name,
        slug=data.slug,
        country=data.country,
        locale=data.locale,
        timezone=data.timezone,
        currency=data.currency,
        plan=data.plan,
        modules=PLAN_MODULES[data.plan],
    )
    db.add(inst)
    _flush(db)
    audit.record(
        db,
        actor_id=user.id,
        institution_id=inst.id,
        action="platform.institution_created",
        target_type="institution",
        target_id=inst.id,
        details={"name": inst.name, "plan": inst.plan},
    )
    result, url = tenancy.invite(
        db,
        institution=inst,
        data=InvitationCreate(
            email=data.admin_email, role="admin", first_name=data.admin_first_name
        ),
        actor_id=user.id,
    )
    db.commit()
    db.refresh(inst)
    return InstitutionCreated(
        institution=InstitutionRead.model_validate(inst), admin_status=result, invitation_url=url
    )


@router.get("/institutions/{institution_id}")
def get_institution(institution_id: uuid.UUID, _: SuperAdmin, db: DbSession) -> InstitutionSummary:
    inst = db.get(Institution, institution_id)
    if inst is None:
        raise NotFoundError("Institution")
    return _summary(db, inst)


@router.patch("/institutions/{institution_id}")
def update_institution(
    institution_id: uuid.UUID, data: InstitutionUpdate, user: SuperAdmin, db: DbSession
) -> InstitutionSummary:
    inst = db.get(Institution, institution_id)
    if inst is None:
        raise NotFoundError("Institution")
    changes = data.model_dump(exclude_unset=True)
    if "plan" in changes and "modules" not in changes:
        changes["modules"] = PLAN_MODULES[changes["plan"]]
    for field, value in changes.items():
        setattr(inst, field, value)
    _flush(db)
    action = {
        "suspended": "platform.institution_suspended",
        "active": "platform.institution_reactivated",
    }
    audit.record(
        db,
        actor_id=user.id,
        institution_id=inst.id,
        action=action.get(str(changes.get("status")), "platform.institution_updated"),
        target_type="institution",
        target_id=inst.id,
        details={"fields": sorted(changes)},
    )
    db.commit()
    db.refresh(inst)
    return _summary(db, inst)


@router.get("/users")
def list_users(
    _: SuperAdmin,
    db: DbSession,
    q: Annotated[str | None, Query(max_length=100)] = None,
    limit: Annotated[int, Query(ge=1, le=200)] = 100,
) -> list[PlatformUser]:
    query = select(User).order_by(User.created_at.desc()).limit(limit)
    if q:
        query = query.where(User.email.like(f"%{q.lower()}%"))
    users = list(db.scalars(query))
    names: dict[uuid.UUID, list[str]] = {}
    for user_id, name in db.execute(
        select(Membership.user_id, Institution.name)
        .join(Institution, Institution.id == Membership.institution_id)
        .where(Membership.user_id.in_([u.id for u in users]))
    ):
        names.setdefault(user_id, []).append(name)
    return [
        PlatformUser(
            id=u.id,
            email=u.email,
            first_name=u.first_name,
            is_superadmin=u.is_superadmin,
            is_active=u.is_active,
            institutions=names.get(u.id, []),
        )
        for u in users
    ]


@router.get("/stats")
def stats(_: SuperAdmin, db: DbSession) -> PlatformStats:
    by_status = dict(
        db.execute(select(Institution.status, func.count()).group_by(Institution.status)).all()
    )
    by_plan = dict(
        db.execute(select(Institution.plan, func.count()).group_by(Institution.plan)).all()
    )
    roles = dict(db.execute(select(Membership.role, func.count()).group_by(Membership.role)).all())
    return PlatformStats(
        institutions=sum(by_status.values()),
        active_institutions=by_status.get("active", 0),
        suspended_institutions=by_status.get("suspended", 0),
        users=db.scalar(select(func.count()).select_from(User)) or 0,
        students=roles.get("student", 0),
        teachers=roles.get("teacher", 0),
        by_plan=by_plan,
    )


@router.get("/audit")
def platform_audit(
    _: SuperAdmin,
    db: DbSession,
    institution_id: uuid.UUID | None = None,
    limit: Annotated[int, Query(ge=1, le=500)] = 200,
) -> list[AuditRead]:
    query = select(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit)
    if institution_id:
        query = query.where(AuditLog.institution_id == institution_id)
    return [to_audit_read(a) for a in db.scalars(query)]
