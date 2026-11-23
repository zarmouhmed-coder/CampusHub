import os
from collections.abc import Iterator
from typing import Any

import pytest

# Must happen before the app (and its engine) is imported.
os.environ["DATABASE_URL"] = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql+psycopg://campushub:campushub@localhost:5432/campushub_test",
)
os.environ["ENVIRONMENT"] = "test"
os.environ["ALLOWED_ORIGINS"] = "http://localhost:3000"
os.environ["EMAIL_BACKEND"] = "memory"

from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.engine import make_url

from alembic import command
from app.api.routes.auth import login_limiter
from app.core.email import outbox
from app.db.base import Base
from app.db.session import engine
from app.main import app

TABLES = ", ".join(table.name for table in Base.metadata.sorted_tables)
PASSWORD = "correct-horse-battery"


@pytest.fixture(scope="session", autouse=True)
def database() -> Iterator[None]:
    database_name = make_url(os.environ["DATABASE_URL"]).database or ""
    if not database_name.endswith("_test"):
        pytest.exit(f"Refusing to run tests against non-test database '{database_name}'.")
    # Rebuild the schema from scratch with the real migrations.
    with engine.begin() as conn:
        conn.execute(text("DROP SCHEMA public CASCADE; CREATE SCHEMA public"))
    config = Config("alembic.ini")
    config.set_main_option("sqlalchemy.url", os.environ["DATABASE_URL"])
    command.upgrade(config, "head")
    yield


@pytest.fixture(autouse=True)
def clean_tables() -> Iterator[None]:
    yield
    with engine.begin() as conn:
        conn.execute(text(f"TRUNCATE {TABLES} CASCADE"))
    login_limiter._failures.clear()
    outbox.clear()


@pytest.fixture
def client() -> Iterator[TestClient]:
    with TestClient(app) as c:
        yield c


def register(client: TestClient, email: str = "lea@telecomnancy.eu", **extra: Any) -> TestClient:
    payload = {"first_name": "Léa", "email": email, "password": PASSWORD, **extra}
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201, response.text
    return client


@pytest.fixture
def alice() -> Iterator[TestClient]:
    """A logged-in client (own cookie jar)."""
    with TestClient(app) as c:
        yield register(c, "alice@telecomnancy.eu", first_name="Alice")


@pytest.fixture
def bob() -> Iterator[TestClient]:
    with TestClient(app) as c:
        yield register(c, "bob@telecomnancy.eu", first_name="Bob")
