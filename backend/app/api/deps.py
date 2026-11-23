import uuid
from collections.abc import Callable
from dataclasses import dataclass
from typing import Annotated

from fastapi import Depends, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.errors import AppError
from app.core.permissions import has_permission
from app.db.session import get_db
from app.models import Institution, Membership, User, UserSession
from app.services import auth as auth_service

DbSession = Annotated[Session, Depends(get_db)]


def get_current_session(request: Request, db: DbSession) -> UserSession:
    """The only source of truth for "who is calling": the session cookie.
    Never a user id coming from the URL or the body."""
    token = request.cookies.get(get_settings().session_cookie_name)
    session = auth_service.get_session_from_token(db, token) if token else None
    if session is None:
        raise AppError(
            status.HTTP_401_UNAUTHORIZED,
            "auth_required",
            "Authentication required.",
            {"WWW-Authenticate": "Cookie"},
        )
    return session


CurrentSession = Annotated[UserSession, Depends(get_current_session)]


def get_current_user(session: CurrentSession) -> User:
    return session.user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_superadmin(user: CurrentUser) -> User:
    if not user.is_superadmin:
        raise AppError(status.HTTP_403_FORBIDDEN, "forbidden", "Platform administrators only.")
    return user


SuperAdmin = Annotated[User, Depends(require_superadmin)]


@dataclass(frozen=True)
class Ctx:
    """Who is acting, in which institution, with which role."""

    user: User
    membership: Membership
    institution: Institution

    @property
    def institution_id(self) -> uuid.UUID:
        return self.institution.id

    @property
    def role(self) -> str:
        return self.membership.role

    def can(self, permission: str) -> bool:
        return has_permission(self.membership.role, permission)


def get_ctx(session: CurrentSession, db: DbSession) -> Ctx:
    """The active institution comes from the server-side session, never from the client."""
    membership = None
    if session.institution_id is not None:
        membership = db.scalar(
            select(Membership).where(
                Membership.user_id == session.user_id,
                Membership.institution_id == session.institution_id,
            )
        )
    if membership is None or membership.status != "active":
        raise AppError(
            status.HTTP_403_FORBIDDEN, "no_institution", "No active institution for this account."
        )
    if membership.institution.status != "active":
        raise AppError(
            status.HTTP_403_FORBIDDEN, "institution_suspended", "This institution is suspended."
        )
    return Ctx(user=session.user, membership=membership, institution=membership.institution)


CurrentCtx = Annotated[Ctx, Depends(get_ctx)]


def require(permission: str, module: str | None = None) -> Callable[[Ctx], Ctx]:
    """Dependency: the caller's role must grant `permission` (and the module be enabled)."""

    def dependency(ctx: CurrentCtx) -> Ctx:
        if module is not None and module not in ctx.institution.modules:
            raise AppError(
                status.HTTP_403_FORBIDDEN,
                "module_disabled",
                f"The '{module}' module is not enabled for this institution.",
            )
        if not ctx.can(permission):
            raise AppError(status.HTTP_403_FORBIDDEN, "forbidden", "Permission denied.")
        return ctx

    return dependency
