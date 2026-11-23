"""Administration commands.

    uv run python -m app.cli create-superadmin --email you@example.com --first-name Moi

The password is asked interactively (or read from CAMPUSHUB_PASSWORD for scripts).
Super administrators are never created through the web: there is no sign-up path to
the platform console.
"""

import argparse
import getpass
import os
import sys

from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models import Profile, User
from app.services import audit


def create_superadmin(email: str, first_name: str) -> None:
    password = os.environ.get("CAMPUSHUB_PASSWORD") or getpass.getpass("Mot de passe : ")
    if len(password) < 12:
        sys.exit("Le mot de passe d'un super administrateur doit faire au moins 12 caractères.")
    email = email.strip().lower()
    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.email == email))
        if user is None:
            user = User(email=email, password_hash=hash_password(password))
            user.profile = Profile(first_name=first_name)
            db.add(user)
        user.is_superadmin = True
        db.flush()
        audit.record(
            db, actor_id=user.id, institution_id=None, action="platform.superadmin_granted"
        )
        db.commit()
    print(f"Super administrateur prêt : {email}")


def main() -> None:
    parser = argparse.ArgumentParser(prog="python -m app.cli")
    sub = parser.add_subparsers(dest="command", required=True)
    cmd = sub.add_parser("create-superadmin", help="create (or promote) a platform administrator")
    cmd.add_argument("--email", required=True)
    cmd.add_argument("--first-name", required=True)
    args = parser.parse_args()
    if args.command == "create-superadmin":
        create_superadmin(args.email, args.first_name)


if __name__ == "__main__":
    main()
