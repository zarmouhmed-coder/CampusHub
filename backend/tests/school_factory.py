"""Builds institutions and members directly in the database, then signs in through the API."""

import uuid
from dataclasses import dataclass

from fastapi.testclient import TestClient
from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.main import app
from app.models import Institution, Membership, Profile, User
from app.models.tenancy import PLAN_MODULES
from tests.conftest import PASSWORD


def make_institution(slug: str, plan: str = "premium", **extra: object) -> uuid.UUID:
    with SessionLocal() as db:
        inst = Institution(
            name=f"Université {slug.upper()}",
            slug=slug,
            plan=plan,
            modules=PLAN_MODULES[plan],
            **extra,
        )
        db.add(inst)
        db.commit()
        return inst.id


def make_user(email: str, first_name: str = "Test", superadmin: bool = False) -> uuid.UUID:
    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.email == email))
        if user is None:
            user = User(
                email=email, password_hash=hash_password(PASSWORD), is_superadmin=superadmin
            )
            user.profile = Profile(first_name=first_name)
            db.add(user)
            db.commit()
        return user.id


def make_member(
    institution_id: uuid.UUID, email: str, role: str, first_name: str = "Test"
) -> uuid.UUID:
    user_id = make_user(email, first_name)
    with SessionLocal() as db:
        m = Membership(user_id=user_id, institution_id=institution_id, role=role)
        db.add(m)
        db.commit()
        return m.id


def login(email: str) -> TestClient:
    client = TestClient(app)
    response = client.post("/api/v1/auth/login", json={"email": email, "password": PASSWORD})
    assert response.status_code == 200, response.text
    return client


@dataclass
class School:
    id: uuid.UUID
    admin: TestClient
    teacher: TestClient
    student: TestClient
    teacher_id: uuid.UUID
    student_id: uuid.UUID
    admin_id: uuid.UUID


def make_school(slug: str) -> School:
    inst = make_institution(slug)
    admin_id = make_member(inst, f"admin@{slug}.edu", "admin", "Awa")
    teacher_id = make_member(inst, f"prof@{slug}.edu", "teacher", "Moussa")
    student_id = make_member(inst, f"etu@{slug}.edu", "student", "Fatou")
    return School(
        id=inst,
        admin=login(f"admin@{slug}.edu"),
        teacher=login(f"prof@{slug}.edu"),
        student=login(f"etu@{slug}.edu"),
        teacher_id=teacher_id,
        student_id=student_id,
        admin_id=admin_id,
    )


def build_structure(admin: TestClient, teacher_id: uuid.UUID) -> dict[str, str]:
    """Year -> semester -> programme -> cohort -> unit (6 credits) -> course."""

    def post(path: str, body: dict[str, object]) -> str:
        r = admin.post(f"/api/v1/school/{path}", json=body)
        assert r.status_code == 201, r.text
        return str(r.json()["id"])

    year = post(
        "academic-years",
        {
            "name": "2026-2027",
            "starts_on": "2026-10-01",
            "ends_on": "2027-07-31",
            "is_current": True,
        },
    )
    period = post(
        "periods",
        {
            "academic_year_id": year,
            "name": "Semestre 1",
            "starts_on": "2026-10-01",
            "ends_on": "2027-02-15",
        },
    )
    program = post("programs", {"name": "Licence Informatique", "level": "L1"})
    cohort = post("cohorts", {"program_id": program, "academic_year_id": year, "name": "L1 Info A"})
    unit = post(
        "units", {"cohort_id": cohort, "period_id": period, "name": "Programmation", "credits": 6}
    )
    course = post(
        "courses",
        {"unit_id": unit, "name": "Algorithmique", "coefficient": 2, "teacher_id": str(teacher_id)},
    )
    return {
        "year": year,
        "period": period,
        "program": program,
        "cohort": cohort,
        "unit": unit,
        "course": course,
    }
