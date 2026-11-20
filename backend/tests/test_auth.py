from fastapi.testclient import TestClient

from app.core.config import get_settings
from tests.conftest import PASSWORD, register

COOKIE = get_settings().session_cookie_name


def test_register_creates_account_and_session(client: TestClient) -> None:
    response = client.post(
        "/api/v1/auth/register",
        json={"first_name": "  Léa ", "email": " Lea@TelecomNancy.EU ", "password": PASSWORD},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["email"] == "lea@telecomnancy.eu"  # normalised
    assert body["first_name"] == "Léa"
    assert "password" not in str(body)

    cookie = response.headers["set-cookie"]
    assert "HttpOnly" in cookie and "SameSite=lax" in cookie
    assert client.get("/api/v1/auth/me").json()["email"] == "lea@telecomnancy.eu"


def test_register_rejects_duplicate_email_case_insensitively(client: TestClient) -> None:
    register(client, "lea@telecomnancy.eu")
    response = client.post(
        "/api/v1/auth/register",
        json={"first_name": "X", "email": "LEA@telecomnancy.eu", "password": PASSWORD},
    )
    assert response.status_code == 409
    assert "existe déjà" in response.json()["detail"]


def test_register_validates_input(client: TestClient) -> None:
    cases = [
        {"first_name": "Léa", "email": "not-an-email", "password": PASSWORD},
        {"first_name": "Léa", "email": "a@b.fr", "password": "short"},
        {"first_name": "   ", "email": "a@b.fr", "password": PASSWORD},
        {"email": "a@b.fr", "password": PASSWORD},
    ]
    for payload in cases:
        assert client.post("/api/v1/auth/register", json=payload).status_code == 422, payload


def test_login_success(client: TestClient) -> None:
    register(client)
    client.post("/api/v1/auth/logout")
    response = client.post(
        "/api/v1/auth/login", json={"email": "LEA@telecomnancy.eu", "password": PASSWORD}
    )
    assert response.status_code == 200
    assert response.json()["first_name"] == "Léa"
    assert client.get("/api/v1/auth/me").status_code == 200


def test_login_rejects_wrong_password_and_unknown_email(client: TestClient) -> None:
    register(client)
    client.post("/api/v1/auth/logout")
    for email, password in [("lea@telecomnancy.eu", "wrong-password"), ("nobody@x.fr", PASSWORD)]:
        response = client.post("/api/v1/auth/login", json={"email": email, "password": password})
        assert response.status_code == 401
        assert response.json()["detail"] == "E-mail ou mot de passe incorrect."
    assert client.get("/api/v1/auth/me").status_code == 401


def test_login_is_rate_limited(client: TestClient) -> None:
    register(client)
    client.post("/api/v1/auth/logout")
    bad = {"email": "lea@telecomnancy.eu", "password": "wrong-password"}
    for _ in range(get_settings().login_max_attempts):
        assert client.post("/api/v1/auth/login", json=bad).status_code == 401
    response = client.post("/api/v1/auth/login", json=bad)
    assert response.status_code == 429
    assert int(response.headers["retry-after"]) > 0
    # Even the right password is refused while blocked.
    good = {"email": "lea@telecomnancy.eu", "password": PASSWORD}
    assert client.post("/api/v1/auth/login", json=good).status_code == 429


def test_logout_revokes_session_server_side(client: TestClient) -> None:
    register(client)
    token = client.cookies.get(COOKIE)
    assert token is not None
    assert client.post("/api/v1/auth/logout").status_code == 204
    assert client.get("/api/v1/auth/me").status_code == 401
    # Replaying the old cookie does not work: the session was deleted in the database.
    client.cookies.set(COOKIE, token)
    assert client.get("/api/v1/auth/me").status_code == 401


def test_protected_routes_require_authentication(client: TestClient) -> None:
    for path in [
        "/api/v1/auth/me",
        "/api/v1/profile/me",
        "/api/v1/subjects",
        "/api/v1/assignments",
        "/api/v1/exams",
        "/api/v1/dashboard/summary",
    ]:
        assert client.get(path).status_code == 401, path
    client.cookies.set(COOKIE, "forged-token")
    assert client.get("/api/v1/auth/me").status_code == 401


def test_csrf_origin_check(alice: TestClient) -> None:
    payload = {"name": "Réseaux"}
    evil = alice.post("/api/v1/subjects", json=payload, headers={"Origin": "https://evil.example"})
    assert evil.status_code == 403
    ok = alice.post("/api/v1/subjects", json=payload, headers={"Origin": "http://localhost:3000"})
    assert ok.status_code == 201


def test_rate_limit_is_per_email(client: TestClient) -> None:
    """Failures on one account must not lock other accounts (same client IP)."""
    register(client, "victim@telecomnancy.eu")
    register(client, "other@telecomnancy.eu")
    client.post("/api/v1/auth/logout")
    bad = {"email": "victim@telecomnancy.eu", "password": "wrong-password"}
    for _ in range(get_settings().login_max_attempts + 1):
        client.post("/api/v1/auth/login", json=bad)
    good = {"email": "other@telecomnancy.eu", "password": PASSWORD}
    assert client.post("/api/v1/auth/login", json=good).status_code == 200
