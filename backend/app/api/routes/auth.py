from fastapi import APIRouter, Request, Response, status

from app.api.deps import CurrentUser, DbSession
from app.core.config import get_settings
from app.core.errors import AppError
from app.core.rate_limit import LoginRateLimiter
from app.models import User
from app.schemas.auth import LoginRequest, RegisterRequest, UserRead
from app.services import auth as auth_service

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


def _login_response(db: DbSession, response: Response, user: User) -> UserRead:
    token = auth_service.create_session(db, user)
    db.commit()
    _set_session_cookie(response, token)
    return UserRead.model_validate(user)


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(data: RegisterRequest, db: DbSession, response: Response) -> UserRead:
    """Create an account and open a session right away."""
    user = auth_service.register_user(db, data)
    return _login_response(db, response, user)


@router.post("/login")
def login(data: LoginRequest, db: DbSession, response: Response) -> UserRead:
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
def me(user: CurrentUser) -> UserRead:
    return UserRead.model_validate(user)
