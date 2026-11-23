"""Tuition fees: invoices, payments (cash, bank, mobile money…), balances."""

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Annotated, Literal
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.crud import get_scoped
from app.api.deps import Ctx, DbSession, require
from app.core.errors import ConflictError, InvalidReferenceError
from app.models import Enrollment, Invoice, Membership, Payment
from app.schemas.campus import (
    FinanceSummary,
    InvoiceBulkCreate,
    InvoiceCreate,
    InvoiceRead,
    InvoiceUpdate,
    PaymentCreate,
    PaymentRead,
)
from app.schemas.teaching import Ref
from app.services import audit

router = APIRouter(tags=["finance"])
Bursar = Annotated[Ctx, Depends(require("finance.manage", "finance"))]


def _today(ctx: Ctx) -> date:
    return datetime.now(ZoneInfo(ctx.institution.timezone)).date()


def _status(
    amount: Decimal, paid: Decimal, due_on: date | None, today: date
) -> Literal["paid", "partial", "unpaid", "overdue"]:
    if paid >= amount:
        return "paid"
    if due_on is not None and due_on < today:
        return "overdue"
    return "partial" if paid > 0 else "unpaid"


def _read(db: Session, ctx: Ctx, inv: Invoice) -> InvoiceRead:
    student = db.get(Membership, inv.student_id)
    assert student is not None
    paid = sum((p.amount for p in inv.payments), Decimal(0))
    return InvoiceRead(
        id=inv.id,
        student=Ref(id=student.id, name=student.user.first_name),
        student_number=student.student_number,
        label=inv.label,
        amount=float(inv.amount),
        paid=float(paid),
        balance=float(inv.amount - paid),
        due_on=inv.due_on,
        status=_status(inv.amount, paid, inv.due_on, _today(ctx)),
        currency=ctx.institution.currency,
        payments=[PaymentRead.model_validate(p) for p in inv.payments],
        created_at=inv.created_at,
    )


def _student(db: Session, ctx: Ctx, student_id: uuid.UUID) -> Membership:
    student = get_scoped(db, Membership, student_id, ctx)
    if student.role != "student":
        raise InvalidReferenceError("not_a_student", "Invoices are for students only.")
    return student


@router.post("/school/invoices", status_code=status.HTTP_201_CREATED, tags=["school"])
def create_invoice(data: InvoiceCreate, ctx: Bursar, db: DbSession) -> InvoiceRead:
    _student(db, ctx, data.student_id)
    inv = Invoice(
        institution_id=ctx.institution_id,
        student_id=data.student_id,
        label=data.label,
        amount=Decimal(str(data.amount)),
        due_on=data.due_on,
    )
    db.add(inv)
    db.flush()
    audit.record(
        db,
        actor_id=ctx.user.id,
        institution_id=ctx.institution_id,
        action="finance.invoice_created",
        target_type="invoice",
        target_id=inv.id,
        details={"amount": data.amount},
    )
    db.commit()
    db.refresh(inv)
    return _read(db, ctx, inv)


@router.post("/school/invoices/bulk", status_code=status.HTTP_201_CREATED, tags=["school"])
def bill_cohort(data: InvoiceBulkCreate, ctx: Bursar, db: DbSession) -> list[InvoiceRead]:
    """The same fee for every student currently enrolled in a cohort."""
    from app.models import Cohort

    get_scoped(db, Cohort, data.cohort_id, ctx)
    students = list(
        db.scalars(
            select(Membership.id)
            .join(Enrollment, Enrollment.student_id == Membership.id)
            .where(Enrollment.cohort_id == data.cohort_id, Membership.status == "active")
        )
    )
    if not students:
        raise InvalidReferenceError("empty_cohort", "No student enrolled in this cohort.")
    invoices = [
        Invoice(
            institution_id=ctx.institution_id,
            student_id=s,
            label=data.label,
            amount=Decimal(str(data.amount)),
            due_on=data.due_on,
        )
        for s in students
    ]
    db.add_all(invoices)
    db.flush()
    audit.record(
        db,
        actor_id=ctx.user.id,
        institution_id=ctx.institution_id,
        action="finance.cohort_billed",
        target_type="cohort",
        target_id=data.cohort_id,
        details={"count": len(invoices), "amount": data.amount},
    )
    db.commit()
    for inv in invoices:
        db.refresh(inv)
    return [_read(db, ctx, inv) for inv in invoices]


@router.get("/school/invoices", tags=["school"])
def list_invoices(
    ctx: Bursar,
    db: DbSession,
    student_id: uuid.UUID | None = None,
    status_filter: Annotated[str | None, Query(alias="status")] = None,
) -> list[InvoiceRead]:
    query = (
        select(Invoice)
        .where(Invoice.institution_id == ctx.institution_id)
        .order_by(Invoice.created_at.desc())
        .limit(1000)
    )
    if student_id:
        query = query.where(Invoice.student_id == student_id)
    items = [_read(db, ctx, inv) for inv in db.scalars(query)]
    return [i for i in items if not status_filter or i.status == status_filter]


@router.patch("/school/invoices/{invoice_id}", tags=["school"])
def update_invoice(
    invoice_id: uuid.UUID, data: InvoiceUpdate, ctx: Bursar, db: DbSession
) -> InvoiceRead:
    inv = get_scoped(db, Invoice, invoice_id, ctx)
    changes = data.model_dump(exclude_unset=True)
    paid = sum((p.amount for p in inv.payments), Decimal(0))
    if "amount" in changes and Decimal(str(changes["amount"])) < paid:
        raise InvalidReferenceError(
            "amount_below_paid", "The amount cannot be lower than what was paid."
        )
    for field, value in changes.items():
        setattr(inv, field, Decimal(str(value)) if field == "amount" else value)
    audit.record(
        db,
        actor_id=ctx.user.id,
        institution_id=ctx.institution_id,
        action="finance.invoice_updated",
        target_type="invoice",
        target_id=inv.id,
        details={"fields": sorted(changes)},
    )
    db.commit()
    db.refresh(inv)
    return _read(db, ctx, inv)


@router.delete(
    "/school/invoices/{invoice_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["school"]
)
def delete_invoice(invoice_id: uuid.UUID, ctx: Bursar, db: DbSession) -> None:
    inv = get_scoped(db, Invoice, invoice_id, ctx)
    if inv.payments:
        raise ConflictError("has_payments", "Delete the payments first: financial history is kept.")
    db.delete(inv)
    audit.record(
        db,
        actor_id=ctx.user.id,
        institution_id=ctx.institution_id,
        action="finance.invoice_deleted",
        target_type="invoice",
        target_id=invoice_id,
    )
    db.commit()


@router.post(
    "/school/invoices/{invoice_id}/payments", status_code=status.HTTP_201_CREATED, tags=["school"]
)
def record_payment(
    invoice_id: uuid.UUID, data: PaymentCreate, ctx: Bursar, db: DbSession
) -> InvoiceRead:
    """Records money received (cash, transfer, mobile money with its transaction reference…)."""
    inv = get_scoped(db, Invoice, invoice_id, ctx)
    paid = sum((p.amount for p in inv.payments), Decimal(0))
    amount = Decimal(str(data.amount))
    if amount > inv.amount - paid:
        raise InvalidReferenceError("overpayment", "The payment exceeds the remaining balance.")
    payment = Payment(
        institution_id=ctx.institution_id,
        invoice_id=inv.id,
        amount=amount,
        method=data.method,
        reference=data.reference,
        paid_on=data.paid_on,
        recorded_by_id=ctx.user.id,
    )
    db.add(payment)
    db.flush()
    audit.record(
        db,
        actor_id=ctx.user.id,
        institution_id=ctx.institution_id,
        action="finance.payment_recorded",
        target_type="invoice",
        target_id=inv.id,
        details={"amount": data.amount, "method": data.method, "reference": data.reference},
    )
    db.commit()
    db.expire(inv)
    return _read(db, ctx, get_scoped(db, Invoice, invoice_id, ctx))


@router.delete(
    "/school/payments/{payment_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["school"]
)
def delete_payment(payment_id: uuid.UUID, ctx: Bursar, db: DbSession) -> None:
    payment = get_scoped(db, Payment, payment_id, ctx)
    audit.record(
        db,
        actor_id=ctx.user.id,
        institution_id=ctx.institution_id,
        action="finance.payment_cancelled",
        target_type="invoice",
        target_id=payment.invoice_id,
        details={"amount": float(payment.amount), "reference": payment.reference},
    )
    db.delete(payment)
    db.commit()


@router.get("/school/finance/summary", tags=["school"])
def finance_summary(ctx: Bursar, db: DbSession) -> FinanceSummary:
    iid = ctx.institution_id
    billed = (
        db.scalar(
            select(func.coalesce(func.sum(Invoice.amount), 0)).where(Invoice.institution_id == iid)
        )
        or 0
    )
    collected = (
        db.scalar(
            select(func.coalesce(func.sum(Payment.amount), 0)).where(Payment.institution_id == iid)
        )
        or 0
    )
    by_method = {
        m: float(v)
        for m, v in db.execute(
            select(Payment.method, func.sum(Payment.amount))
            .where(Payment.institution_id == iid)
            .group_by(Payment.method)
        ).all()
    }
    overdue = sum((i.balance for i in list_invoices(ctx, db) if i.status == "overdue"), 0.0)
    return FinanceSummary(
        currency=ctx.institution.currency,
        billed=float(billed),
        collected=float(collected),
        outstanding=float(billed) - float(collected),
        overdue=overdue,
        collection_rate=round(float(collected) / float(billed) * 100, 1) if billed else None,
        by_method=by_method,
    )


@router.get("/me/invoices", tags=["student"])
def my_invoices(
    ctx: Annotated[Ctx, Depends(require("student.self", "finance"))], db: DbSession
) -> list[InvoiceRead]:
    rows = db.scalars(
        select(Invoice)
        .where(Invoice.student_id == ctx.membership.id)
        .order_by(Invoice.due_on, Invoice.created_at)
    )
    return [_read(db, ctx, inv) for inv in rows]
