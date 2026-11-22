"""profile locale and timezone

Revision ID: 0f409e7666a4
Revises: f86c060ac652
Create Date: 2026-11-22 13:49:03.433459

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0f409e7666a4"
down_revision: str | Sequence[str] | None = "f86c060ac652"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Interface language and timezone per user (existing users: French, Europe/Paris)."""
    op.add_column(
        "profiles", sa.Column("locale", sa.String(length=5), server_default="fr", nullable=False)
    )
    op.add_column(
        "profiles",
        sa.Column("timezone", sa.String(length=64), server_default="Europe/Paris", nullable=False),
    )
    # Not detected by autogenerate: written by hand.
    op.create_check_constraint(
        op.f("ck_profiles_locale_supported"), "profiles", "locale IN ('fr', 'en')"
    )


def downgrade() -> None:
    op.drop_constraint(op.f("ck_profiles_locale_supported"), "profiles", type_="check")
    op.drop_column("profiles", "timezone")
    op.drop_column("profiles", "locale")
