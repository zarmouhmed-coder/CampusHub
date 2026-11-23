from fastapi import APIRouter, Request, Response, status

from app.api.deps import CurrentSession, DbSession
from app.core.config import get_settings
from app.core.errors import AppError
from app.core.rate_limit import LoginRateLimiter
from app.models import User
from app.schemas.auth import LoginRequest, RegisterRequest
from app.schemas.tenancy import (
    MeRead,
    PasswordResetConfirm,
    PasswordResetRequest,
    SwitchInstitution,
)
from app.services import auth as auth_service
from app.services import tenancy

router = APIRouter(prefix="/auth", tags=["auth"])

_settings = get_settings()
login_limiter = LoginRateLimiter(_settings.login_max_attempts, _settings.login_window_seconds)


def _set_session_cookie(response: Response, token: str) -> None:
    settings = get_settings()
    response.set_cookie(
        key=settings.session_cookie_name,
        value=token,
        max_age=settings.session_ttl_days * 24 * 3600,
        httponly=True,  # unreadable from JavaScript (XSS cannot steal it)
        secure=settings.session_cookie_secure,  # HTTPS only in production
        samesite="lax",  # not sent on cross-site POST/PATCH/DELETE
        path="/",
    )


def _login_response(db: DbSession, response: Response, user: User) -> MeRead:
    token = auth_service.create_session(db, user)
    db.commit()
    _set_session_cookie(response, token)
    session = auth_service.get_session_from_token(db, token)
    assert session is not None
    return tenancy.me(db, session)


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(data: RegisterRequest, db: DbSession, response: Response) -> MeRead:
    """Create an account and open a session right away."""
    user = auth_service.register_user(db, data)
    return _login_response(db, response, user)


@router.post("/login")
def login(data: LoginRequest, db: DbSession, response: Response) -> MeRead:
    # Throttled per e-mail: protects each account against password guessing.
    # Per-IP throttling is not done here: behind the Next.js proxy every request comes
    # from the same address. It belongs to the public reverse proxy (see docs/decisions.md).
    key = f"email:{data.email}"
    retry_after = login_limiter.retry_after(key)
    if retry_after:
        raise AppError(
            status.HTTP_429_TOO_MANY_REQUESTS,
            "too_many_attempts",
            "Too many login attempts. Try again in a few minutes.",
            {"Retry-After": str(retry_after)},
        )
    user = auth_service.authenticate(db, data.email, data.password)
    if user is None:
        login_limiter.record_failure(key)
        raise AppError(
            status.HTTP_401_UNAUTHORIZED, "invalid_credentials", "Invalid e-mail or password."
        )
    login_limiter.reset(key)
    return _login_response(db, response, user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(request: Request, db: DbSession, response: Response) -> None:
    """Revoke the session server-side and clear the cookie. Idempotent."""
    settings = get_settings()
    token = request.cookies.get(settings.session_cookie_name)
    if token:
        auth_service.revoke_session(db, token)
        db.commit()
    response.delete_cookie(
        settings.session_cookie_name,
        path="/",
        httponly=True,
        secure=settings.session_cookie_secure,
        samesite="lax",
    )


@router.get("/me")
def me(session: CurrentSession, db: DbSession) -> MeRead:
    """The user, their role in the active institution and that institution's settings."""
    return tenancy.me(db, session)


@router.post("/institution")
def switch_institution(data: SwitchInstitution, session: CurrentSession, db: DbSession) -> MeRead:
    """Switch the active institution (for people who belong to several)."""
    tenancy.switch_institution(db, session, data.institution_id)
    db.commit()
    return tenancy.me(db, session)


@router.post("/password-reset", status_code=status.HTTP_204_NO_CONTENT)
def request_password_reset(data: PasswordResetRequest, db: DbSession) -> None:
    """Sends a reset link if the account exists. Same answer either way."""
    key = f"reset:{data.email}"
    if login_limiter.retry_after(key):
        return
    login_limiter.record_failure(key)
    tenancy.request_password_reset(db, data.email)
    db.commit()


@router.post("/password-reset/confirm", status_code=status.HTTP_204_NO_CONTENT)
def confirm_password_reset(data: PasswordResetConfirm, db: DbSession) -> None:
    tenancy.confirm_password_reset(db, data.token, data.password)
    db.commit()
