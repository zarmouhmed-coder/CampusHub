"""Factory for institution-scoped CRUD endpoints.

Every generated route: filters by the caller's institution, checks a permission
(and optional module), verifies that referenced rows belong to the same
institution, turns "still referenced" deletions into 409 `in_use`, and writes
the audit log.
"""

import uuid
from collections.abc import Callable, Sequence
from typing import Any

from fastapi import APIRouter, Depends, Request, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import Ctx, DbSession, require
from app.core.errors import ConflictError, InvalidReferenceError, NotFoundError
from app.db.base import Base
from app.services import audit


def check_refs(db: Session, ctx: Ctx, refs: dict[str, type[Any]], data: dict[str, Any]) -> None:
    for field, model in refs.items():
        value = data.get(field)
        if value is None:
            continue
        found = db.scalar(
            select(model.id).where(model.id == value, model.institution_id == ctx.institution_id)
        )
        if found is None:
            raise InvalidReferenceError(
                f"{field.removesuffix('_id')}_not_found", f"Unknown {field}."
            )


def get_scoped[M](db: Session, model: type[M], item_id: uuid.UUID, ctx: Ctx) -> M:
    """Load a row by id *within the caller's institution* (404 otherwise)."""
    table: Any = model
    item: M | None = db.scalar(
        select(table).where(table.id == item_id, table.institution_id == ctx.institution_id)
    )
    if item is None:
        raise NotFoundError(model.__name__)
    return item


def crud_router(
    *,
    model: type[Base],
    path: str,
    create_schema: type[BaseModel],
    update_schema: type[BaseModel],
    read_schema: type[BaseModel],
    write_permission: str = "structure.manage",
    read_permission: str = "structure.read",
    module: str | None = None,
    refs: dict[str, type[Any]] | None = None,
    filters: Sequence[str] = (),
    order_by: Callable[[], Sequence[Any]] | None = None,
    tag: str = "structure",
    validate: Callable[[Session, Ctx, dict[str, Any], Any], None] | None = None,
    after_write: Callable[[Session, Ctx, Any], None] | None = None,
) -> APIRouter:
    """`validate(db, ctx, values, existing_or_None)` adds business rules;
    `after_write(db, ctx, obj)` runs after create/update (same transaction)."""
    refs = refs or {}
    entity = model.__tablename__
    router = APIRouter(prefix=path, tags=[tag])
    reader = Depends(require(read_permission, module))
    writer = Depends(require(write_permission, module))

    def read(obj: Any) -> BaseModel:
        return read_schema.model_validate(obj)

    @router.get("", response_model=list[read_schema])  # type: ignore[valid-type]
    def list_items(request: Request, db: DbSession, ctx: Ctx = reader) -> list[BaseModel]:
        query = select(model).where(model.institution_id == ctx.institution_id)  # type: ignore[attr-defined]
        for name in filters:
            raw = request.query_params.get(name)
            if raw:
                try:
                    value = uuid.UUID(raw)
                except ValueError:
                    raise InvalidReferenceError("validation_error", f"Invalid {name}.") from None
                query = query.where(getattr(model, name) == value)
        if order_by is not None:
            query = query.order_by(*order_by())
        return [read(o) for o in db.scalars(query)]

    @router.post("", response_model=read_schema, status_code=status.HTTP_201_CREATED)
    def create_item(data: create_schema, db: DbSession, ctx: Ctx = writer) -> BaseModel:  # type: ignore[valid-type]
        values = data.model_dump()  # type: ignore[attr-defined]
        check_refs(db, ctx, refs, values)
        if validate is not None:
            validate(db, ctx, values, None)
        obj = model(institution_id=ctx.institution_id, **values)
        db.add(obj)
        _flush(db)
        if after_write is not None:
            after_write(db, ctx, obj)
        audit.record(
            db,
            actor_id=ctx.user.id,
            institution_id=ctx.institution_id,
            action=f"{entity}.created",
            target_type=entity,
            target_id=obj.id,  # type: ignore[attr-defined]
        )
        db.commit()
        db.refresh(obj)
        return read(obj)

    @router.get("/{item_id}", response_model=read_schema)
    def get_item(item_id: uuid.UUID, db: DbSession, ctx: Ctx = reader) -> BaseModel:
        return read(get_scoped(db, model, item_id, ctx))

    @router.patch("/{item_id}", response_model=read_schema)
    def update_item(
        item_id: uuid.UUID,
        data: update_schema,  # type: ignore[valid-type]
        db: DbSession,
        ctx: Ctx = writer,
    ) -> BaseModel:
        obj = get_scoped(db, model, item_id, ctx)
        changes = data.model_dump(exclude_unset=True)  # type: ignore[attr-defined]
        check_refs(db, ctx, refs, changes)
        if validate is not None:
            validate(db, ctx, changes, obj)
        for field, value in changes.items():
            setattr(obj, field, value)
        _flush(db)
        if after_write is not None:
            after_write(db, ctx, obj)
        audit.record(
            db,
            actor_id=ctx.user.id,
            institution_id=ctx.institution_id,
            action=f"{entity}.updated",
            target_type=entity,
            target_id=item_id,
            details={"fields": sorted(changes)},
        )
        db.commit()
        db.refresh(obj)
        return read(obj)

    @router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
    def delete_item(item_id: uuid.UUID, db: DbSession, ctx: Ctx = writer) -> None:
        db.delete(get_scoped(db, model, item_id, ctx))
        _flush(db)
        audit.record(
            db,
            actor_id=ctx.user.id,
            institution_id=ctx.institution_id,
            action=f"{entity}.deleted",
            target_type=entity,
            target_id=item_id,
        )
        db.commit()

    return router


def _flush(db: Session) -> None:
    """Map database integrity errors to clean API errors."""
    try:
        db.flush()
    except IntegrityError as exc:
        db.rollback()
        constraint = getattr(getattr(exc.orig, "diag", None), "constraint_name", "") or ""
        if constraint.startswith("fk_"):
            raise ConflictError("in_use", "This item is still used elsewhere.") from None
        if constraint.startswith("uq_"):
            raise ConflictError("duplicate", "An item with the same name already exists.") from None
        if constraint.startswith("ck_"):
            raise InvalidReferenceError("validation_error", "Invalid values.") from None
        raise
