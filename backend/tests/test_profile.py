from fastapi.testclient import TestClient


def test_profile_read_and_partial_update(alice: TestClient) -> None:
    profile = alice.get("/api/v1/profile/me").json()
    assert profile["first_name"] == "Alice"
    assert profile["promotion"] is None and profile["td_group"] is None

    response = alice.patch(
        "/api/v1/profile/me",
        json={"promotion": "2027", "academic_year": 2, "speciality": "IAMD", "td_group": "TD2"},
    )
    assert response.status_code == 200
    assert response.json()["academic_year"] == 2

    # Partial update: untouched fields are kept, blank strings become null.
    response = alice.patch("/api/v1/profile/me", json={"first_name": "Alicia", "td_group": "  "})
    body = response.json()
    assert body["first_name"] == "Alicia"
    assert body["promotion"] == "2027" and body["td_group"] is None
    assert alice.get("/api/v1/auth/me").json()["first_name"] == "Alicia"


def test_profile_validation(alice: TestClient) -> None:
    for payload in [
        {"first_name": None},
        {"first_name": ""},
        {"academic_year": 0},
        {"academic_year": 9},
        {"tp_group": "x" * 51},
        {"email": "hack@x.fr"},  # unknown fields are rejected
    ]:
        assert alice.patch("/api/v1/profile/me", json=payload).status_code == 422, payload
