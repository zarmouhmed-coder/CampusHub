"""Student space: everything about "me" in the active institution."""

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select

from app.api.deps import Ctx, DbSession, require
from app.models import IssuedDocument
from app.schemas.teaching import DocumentRead, StudentResults
from app.services import results

router = APIRouter(prefix="/me", tags=["student"])
Student = Annotated[Ctx, Depends(require("student.self"))]


@router.get("/results", dependencies=[Depends(require("student.self", "grades"))])
def my_results(ctx: Student, db: DbSession) -> StudentResults:
    return results.compute(db, ctx.institution, ctx.membership)


@router.get("/documents", dependencies=[Depends(require("student.self", "documents"))])
def my_documents(ctx: Student, db: DbSession) -> list[DocumentRead]:
    rows = db.scalars(
        select(IssuedDocument)
        .where(IssuedDocument.student_id == ctx.membership.id)
        .order_by(IssuedDocument.issued_at.desc())
    )
    return [DocumentRead.model_validate(d) for d in rows]
