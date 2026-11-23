from datetime import UTC, datetime

from fastapi import APIRouter, Response, status

from app.api.deps import DbSession
from app.api.routes.auth import _login_response
from app.schemas.tenancy import InvitationAccept, InvitationPublic, MeRead
from app.services import tenancy

router = APIRouter(prefix="/invitations", tags=["invitations"])


@router.get("/{token}")
def read_invitation(token: str, db: DbSession) -> InvitationPublic:
    """Public: what the invitation link is about (shown before choosing a password)."""
    inv = tenancy.find_invitation(db, token)
    return InvitationPublic(
        email=inv.email,
        first_name=inv.first_name,
        role=inv.role,
        institution_name=inv.institution.name,
        institution_locale=inv.institution.locale,
        expired=inv.expires_at <= datetime.now(UTC),
        accepted=inv.accepted_at is not None,
    )


@router.post("/{token}/accept", status_code=status.HTTP_201_CREATED)
def accept_invitation(
    token: str, data: InvitationAccept, db: DbSession, response: Response
) -> MeRead:
    """Creates the account, joins the institution and signs in."""
    user = tenancy.accept_invitation(db, token, data.first_name, data.password)
    return _login_response(db, response, user)
