"""Issued documents (transcripts, certificates) and their public verification."""

import uuid
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy import select

from app.api.crud import get_scoped
from app.api.deps import Ctx, CurrentCtx, DbSession, require
from app.core.errors import AppError, NotFoundError
from app.models import Institution, IssuedDocument, Membership
from app.schemas.teaching import DocumentCreate, DocumentRead, StudentResults, Verification
from app.services import audit, documents, results

router = APIRouter(tags=["documents"])
Registrar = Annotated[Ctx, Depends(require("documents.issue", "documents"))]


@router.get("/school/students/{student_id}/results", tags=["school"])
def student_results(
    student_id: uuid.UUID,
    ctx: Annotated[Ctx, Depends(require("grades.manage", "grades"))],
    db: DbSession,
) -> StudentResults:
    student = get_scoped(db, Membership, student_id, ctx)
    return results.compute(db, ctx.institution, student)


@router.post("/school/documents", status_code=status.HTTP_201_CREATED)
def issue_document(data: DocumentCreate, ctx: Registrar, db: DbSession) -> DocumentRead:
    student = get_scoped(db, Membership, data.student_id, ctx)
    if student.role != "student":
        raise AppError(status.HTTP_422_UNPROCESSABLE_CONTENT, "not_a_student", "Not a student.")
    doc = documents.issue(db, ctx.institution, student, data.kind, data.period_id, ctx.user.id)
    audit.record(
        db,
        actor_id=ctx.user.id,
        institution_id=ctx.institution_id,
        action="document.issued",
        target_type="document",
        target_id=doc.id,
        details={"kind": doc.kind, "code": doc.code},
    )
    db.commit()
    return DocumentRead.model_validate(doc)


@router.get("/school/documents")
def list_documents(
    ctx: Registrar, db: DbSession, student_id: uuid.UUID | None = None
) -> list[DocumentRead]:
    query = (
        select(IssuedDocument)
        .where(IssuedDocument.institution_id == ctx.institution_id)
        .order_by(IssuedDocument.issued_at.desc())
        .limit(500)
    )
    if student_id:
        query = query.where(IssuedDocument.student_id == student_id)
    return [DocumentRead.model_validate(d) for d in db.scalars(query)]


@router.post("/school/documents/{document_id}/revoke")
def revoke_document(document_id: uuid.UUID, ctx: Registrar, db: DbSession) -> DocumentRead:
    doc = get_scoped(db, IssuedDocument, document_id, ctx)
    if doc.revoked_at is None:
        doc.revoked_at = datetime.now(UTC)
        audit.record(
            db,
            actor_id=ctx.user.id,
            institution_id=ctx.institution_id,
            action="document.revoked",
            target_type="document",
            target_id=doc.id,
            details={"code": doc.code},
        )
        db.commit()
    return DocumentRead.model_validate(doc)


@router.get("/documents/{document_id}")
def read_document(document_id: uuid.UUID, ctx: CurrentCtx, db: DbSession) -> DocumentRead:
    """The full document: its owner, or staff allowed to issue documents."""
    doc = get_scoped(db, IssuedDocument, document_id, ctx)
    if doc.student_id != ctx.membership.id and not ctx.can("documents.issue"):
        raise NotFoundError("Document")
    return DocumentRead.model_validate(doc)


@router.get("/verify/{code}", tags=["public"])
def verify(code: str, db: DbSession) -> Verification:
    """Public: anyone holding the paper (an employer, another school) checks it here."""
    doc = documents.find_by_code(db, code)
    if doc is None:
        raise AppError(
            status.HTTP_404_NOT_FOUND, "document_not_found", "Unknown verification code."
        )
    institution = db.get(Institution, doc.institution_id)
    assert institution is not None
    student = doc.payload["student"]
    return Verification(
        valid=doc.revoked_at is None,
        revoked=doc.revoked_at is not None,
        kind=doc.kind,
        code=doc.code,
        institution=institution.name,
        student_name=student["first_name"],
        student_number=student.get("student_number"),
        issued_at=doc.issued_at,
        summary=documents.summary(doc),
    )
