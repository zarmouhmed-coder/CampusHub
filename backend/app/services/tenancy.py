import uuid
from datetime import UTC, datetime, timedelta
from typing import Literal

from fastapi import status
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.email import send_email
from app.core.errors import AppError, ConflictError, InvalidReferenceError
from app.core.security import generate_session_token, hash_password, hash_session_token
from app.models import (
    Cohort,
    Enrollment,
    Institution,
    Invitation,
    Membership,
    PasswordReset,
    Profile,
    User,
    UserSession,
)
from app.schemas.tenancy import InstitutionRead, InvitationCreate, MembershipBrief, MeRead
from app.services import audit


def me(db: Session, session: UserSession) -> MeRead:
    user = session.user
    rows = db.execute(
        select(Membership, Institution)
        .join(Institution, Institution.id == Membership.institution_id)
        .where(Membership.user_id == user.id, Membership.status == "active")
        .order_by(Membership.created_at)
    ).all()
    active = next((m for m, i in rows if i.id == session.institution_id), None)
    return MeRead(
        id=user.id,
        email=user.email,
        first_name=user.first_name,
        locale=user.locale,
        timezone=user.timezone,
        created_at=user.created_at,
        is_superadmin=user.is_superadmin,
        role=active.role if active else None,
        membership_id=active.id if active else None,
        institution=InstitutionRead.model_validate(active.institution) if active else None,
        memberships=[
            MembershipBrief(institution_id=i.id, institution_name=i.name, role=m.role)
            for m, i in rows
            if i.status == "active"
        ],
    )


def switch_institution(db: Session, session: UserSession, institution_id: uuid.UUID) -> None:
    membership = db.scalar(
        select(Membership).where(
            Membership.user_id == session.user_id,
            Membership.institution_id == institution_id,
            Membership.status == "active",
        )
    )
    if membership is None or membership.institution.status != "active":
        raise AppError(
            status.HTTP_403_FORBIDDEN, "no_institution", "Not a member of this institution."
        )
    session.institution_id = institution_id


# ---------- Password reset ----------


def request_password_reset(db: Session, email: str) -> None:
    """Always succeeds silently: never reveal whether an account exists."""
    user = db.scalar(select(User).where(User.email == email, User.is_active.is_(True)))
    if user is None:
        return
    token = generate_session_token()
    db.add(
        PasswordReset(
            user_id=user.id,
            token_hash=hash_session_token(token),
            expires_at=datetime.now(UTC)
            + timedelta(minutes=get_settings().password_reset_ttl_minutes),
        )
    )
    link = f"{get_settings().frontend_url}/reset-password/{token}"
    send_email(
        user.email,
        "CampusHub — réinitialisation du mot de passe / password reset",
        f"Bonjour {user.first_name},\n\nPour choisir un nouveau mot de passe : {link}\n"
        f"To choose a new password: {link}\n\nCe lien expire dans une heure / expires in one hour.",
    )


def confirm_password_reset(db: Session, token: str, password: str) -> None:
    reset = db.scalar(
        select(PasswordReset).where(
            PasswordReset.token_hash == hash_session_token(token),
            PasswordReset.used_at.is_(None),
            PasswordReset.expires_at > datetime.now(UTC),
        )
    )
    if reset is None:
        raise AppError(status.HTTP_400_BAD_REQUEST, "invalid_token", "Invalid or expired link.")
    user = db.get(User, reset.user_id)
    assert user is not None
    user.password_hash = hash_password(password)
    reset.used_at = datetime.now(UTC)
    # Every existing session is closed: whoever knew the old password is logged out.
    db.execute(delete(UserSession).where(UserSession.user_id == user.id))
    audit.record(db, actor_id=user.id, institution_id=None, action="auth.password_reset")


# ---------- Memberships and invitations ----------


def _ensure_cohort(db: Session, institution_id: uuid.UUID, cohort_id: uuid.UUID | None) -> None:
    if cohort_id is None:
        return
    found = db.scalar(
        select(Cohort.id).where(Cohort.id == cohort_id, Cohort.institution_id == institution_id)
    )
    if found is None:
        raise InvalidReferenceError("cohort_not_found", "The selected cohort does not exist.")


def add_membership(
    db: Session,
    *,
    institution: Institution,
    user: User,
    role: str,
    student_number: str | None = None,
    cohort_id: uuid.UUID | None = None,
) -> Membership:
    exists = db.scalar(
        select(Membership.id).where(
            Membership.user_id == user.id, Membership.institution_id == institution.id
        )
    )
    if exists is not None:
        raise ConflictError("already_member", "This person is already a member of the institution.")
    if student_number:
        taken = db.scalar(
            select(Membership.id).where(
                Membership.institution_id == institution.id,
                Membership.student_number == student_number,
            )
        )
        if taken is not None:
            raise ConflictError("student_number_taken", "This student number is already used.")
    membership = Membership(
        user_id=user.id,
        institution_id=institution.id,
        role=role,
        student_number=student_number if role == "student" else None,
    )
    db.add(membership)
    db.flush()
    if cohort_id is not None and role == "student":
        db.add(
            Enrollment(institution_id=institution.id, cohort_id=cohort_id, student_id=membership.id)
        )
    return membership


def invite(
    db: Session, *, institution: Institution, data: InvitationCreate, actor_id: uuid.UUID | None
) -> tuple[Literal["invited", "added"], str | None]:
    """Existing account: added right away. New e-mail: invitation link (also e-mailed)."""
    _ensure_cohort(db, institution.id, data.cohort_id)
    user = db.scalar(select(User).where(User.email == data.email))
    if user is not None:
        add_membership(
            db,
            institution=institution,
            user=user,
            role=data.role,
            student_number=data.student_number,
            cohort_id=data.cohort_id,
        )
        send_email(
            user.email,
            f"CampusHub — {institution.name}",
            f"Vous avez été ajouté(e) à {institution.name}.\n"
            f"You were added to {institution.name}.\n{get_settings().frontend_url}/login",
        )
        audit.record(
            db,
            actor_id=actor_id,
            institution_id=institution.id,
            action="member.added",
            target_type="user",
            target_id=user.id,
            details={"email": data.email, "role": data.role},
        )
        return "added", None

    # A new invitation replaces any pending one for the same e-mail.
    db.execute(
        delete(Invitation).where(
            Invitation.institution_id == institution.id,
            Invitation.email == data.email,
            Invitation.accepted_at.is_(None),
        )
    )
    token = generate_session_token()
    db.add(
        Invitation(
            institution_id=institution.id,
            email=data.email,
            first_name=data.first_name,
            role=data.role,
            student_number=data.student_number,
            cohort_id=data.cohort_id,
            token_hash=hash_session_token(token),
            expires_at=datetime.now(UTC) + timedelta(days=get_settings().invitation_ttl_days),
            created_by_id=actor_id,
        )
    )
    url = f"{get_settings().frontend_url}/invite/{token}"
    send_email(
        data.email,
        f"CampusHub — invitation {institution.name}",
        f"{institution.name} vous invite sur CampusHub / invites you to CampusHub:\n{url}",
    )
    audit.record(
        db,
        actor_id=actor_id,
        institution_id=institution.id,
        action="member.invited",
        target_type="invitation",
        details={"email": data.email, "role": data.role},
    )
    return "invited", url


def find_invitation(db: Session, token: str) -> Invitation:
    invitation = db.scalar(
        select(Invitation).where(Invitation.token_hash == hash_session_token(token))
    )
    if invitation is None:
        raise AppError(status.HTTP_404_NOT_FOUND, "invalid_token", "Invalid invitation link.")
    return invitation


def accept_invitation(db: Session, token: str, first_name: str, password: str) -> User:
    invitation = find_invitation(db, token)
    if invitation.accepted_at is not None or invitation.expires_at <= datetime.now(UTC):
        raise AppError(
            status.HTTP_410_GONE, "invitation_expired", "This invitation is no longer valid."
        )
    if invitation.institution.status != "active":
        raise AppError(status.HTTP_403_FORBIDDEN, "institution_suspended", "Institution suspended.")
    if db.scalar(select(User.id).where(User.email == invitation.email)) is not None:
        raise ConflictError("email_taken", "An account already exists with this e-mail address.")
    institution = invitation.institution
    user = User(email=invitation.email, password_hash=hash_password(password))
    user.profile = Profile(
        first_name=first_name, locale=institution.locale, timezone=institution.timezone
    )
    db.add(user)
    db.flush()
    add_membership(
        db,
        institution=institution,
        user=user,
        role=invitation.role,
        student_number=invitation.student_number,
        cohort_id=invitation.cohort_id,
    )
    invitation.accepted_at = datetime.now(UTC)
    audit.record(
        db,
        actor_id=user.id,
        institution_id=institution.id,
        action="member.joined",
        target_type="user",
        target_id=user.id,
    )
    return user
