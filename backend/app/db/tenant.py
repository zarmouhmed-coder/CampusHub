"""Helpers for institution-scoped ("tenant") tables.

Every tenant table has an `institution_id` and a UNIQUE (id, institution_id).
References between tenant tables use a composite foreign key
(ref_id, institution_id) -> other(id, institution_id): PostgreSQL itself then
guarantees that a row can only point to rows of the same institution.
"""

import uuid

from sqlalchemy import ForeignKey, ForeignKeyConstraint, UniqueConstraint
from sqlalchemy.orm import Mapped, declared_attr, mapped_column


class TenantMixin:
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)

    @declared_attr
    def institution_id(cls) -> Mapped[uuid.UUID]:  # noqa: N805
        return mapped_column(ForeignKey("institutions.id", ondelete="CASCADE"), index=True)


def tenant_unique(table: str) -> UniqueConstraint:
    return UniqueConstraint("id", "institution_id", name=f"uq_{table}_id_institution_id")


def tenant_fk(
    table: str, column: str, target: str, ondelete: str = "CASCADE"
) -> ForeignKeyConstraint:
    """(column, institution_id) -> target(id, institution_id).

    `ondelete="SET NULL"` only clears `column` (PostgreSQL >= 15), never institution_id.
    """
    if ondelete == "SET NULL":
        ondelete = f"SET NULL ({column})"
    return ForeignKeyConstraint(
        [column, "institution_id"],
        [f"{target}.id", f"{target}.institution_id"],
        name=f"fk_{table}_{column}_{target}",
        ondelete=ondelete,
    )
