from typing import Annotated

from fastapi import Depends, Request, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.errors import AppError
from app.db.session import get_db
from app.models import User
from app.services import auth as auth_service

DbSession = Annotated[Session, Depends(get_db)]


def get_current_user(request: Request, db: DbSession) -> User:
    """The only source of truth for "who is calling": the session cookie.
    Never a user id coming from the URL or the body."""
    token = request.cookies.get(get_settings().session_cookie_name)
    user = auth_service.get_user_from_token(db, token) if token else None
    if user is None:
        raise AppError(
            status.HTTP_401_UNAUTHORIZED,
            "auth_required",
            "Authentication required.",
            {"WWW-Authenticate": "Cookie"},
        )
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
