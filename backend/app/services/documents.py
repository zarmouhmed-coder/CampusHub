import secrets
import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import InvalidReferenceError
from app.models import (
    AcademicYear,
    Cohort,
    Enrollment,
    Institution,
    IssuedDocument,
    Membership,
    Program,
)
from app.services import results

_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # no 0/O, 1/I: easy to read aloud


def new_code() -> str:
    raw = "".join(secrets.choice(_ALPHABET) for _ in range(12))
    return f"{raw[:4]}-{raw[4:8]}-{raw[8:]}"


def build_payload(
    db: Session,
    institution: Institution,
    student: Membership,
    kind: str,
    period_id: uuid.UUID | None,
) -> dict[str, Any]:
    base: dict[str, Any] = {
        "institution": {"name": institution.name, "country": institution.country},
        "student": {
            "first_name": student.user.first_name,
            "email": student.user.email,
            "student_number": student.student_number,
        },
    }
    if kind == "transcript":
        res = results.compute(db, institution, student, period_id)
        if not res.periods:
            raise InvalidReferenceError("no_results", "No results to put on a transcript.")
        base["results"] = res.model_dump(mode="json")
        return base
    rows = db.execute(
        select(Cohort.name, Program.name, Program.level, AcademicYear.name)
        .join(Enrollment, Enrollment.cohort_id == Cohort.id)
        .join(Program, Program.id == Cohort.program_id)
        .join(AcademicYear, AcademicYear.id == Cohort.academic_year_id)
        .where(Enrollment.student_id == student.id)
    ).all()
    if not rows:
        raise InvalidReferenceError("not_enrolled", "The student is not enrolled in any cohort.")
    base["enrollments"] = [
        {"cohort": c, "program": p, "level": lvl, "academic_year": y} for c, p, lvl, y in rows
    ]
    return base


def issue(
    db: Session,
    institution: Institution,
    student: Membership,
    kind: str,
    period_id: uuid.UUID | None,
    issued_by: uuid.UUID,
) -> IssuedDocument:
    doc = IssuedDocument(
        institution_id=institution.id,
        student_id=student.id,
        kind=kind,
        code=new_code(),
        payload=build_payload(db, institution, student, kind, period_id),
        issued_by_id=issued_by,
        issued_at=datetime.now(UTC),
    )
    db.add(doc)
    db.flush()
    return doc


def summary(doc: IssuedDocument) -> list[dict[str, Any]]:
    """What the public verification page shows: the key facts, not the full detail."""
    if doc.kind == "transcript":
        return [
            {
                "period": p["name"],
                "academic_year": p["academic_year"],
                "average": p["average"],
                "credits_earned": p["credits_earned"],
                "credits_total": p["credits_total"],
                "validated": p["validated"],
            }
            for p in doc.payload["results"]["periods"]
        ]
    return list(doc.payload.get("enrollments", []))


def find_by_code(db: Session, code: str) -> IssuedDocument | None:
    return db.scalar(select(IssuedDocument).where(IssuedDocument.code == code.strip().upper()))
