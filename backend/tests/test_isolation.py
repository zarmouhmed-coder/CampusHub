"""A student must never read, modify or delete another student's data."""

from fastapi.testclient import TestClient
from sqlalchemy import text

from app.db.session import engine


def _seed(client: TestClient) -> dict[str, str]:
    subject = client.post("/api/v1/subjects", json={"name": "Secret"}).json()
    assignment = client.post(
        "/api/v1/assignments",
        json={"title": "Secret TP", "subject_id": subject["id"], "due_at": "2030-01-01T10:00:00Z"},
    ).json()
    exam = client.post(
        "/api/v1/exams", json={"title": "Secret exam", "exam_at": "2030-01-02T10:00:00Z"}
    ).json()
    return {"subjects": subject["id"], "assignments": assignment["id"], "exams": exam["id"]}


def test_users_cannot_access_each_others_resources(alice: TestClient, bob: TestClient) -> None:
    ids = _seed(alice)

    for resource, item_id in ids.items():
        url = f"/api/v1/{resource}/{item_id}"
        # Bob sees a 404, exactly as for an id that does not exist.
        assert bob.get(url).status_code == 404
        assert bob.patch(url, json={"title": "pwned", "name": "pwned"}).status_code in (404, 422)
        assert bob.delete(url).status_code == 404
        # Alice's data is untouched.
        assert alice.get(url).status_code == 200

    assert bob.get("/api/v1/subjects").json() == []
    assert bob.get("/api/v1/assignments").json()["total"] == 0
    assert bob.get("/api/v1/exams").json()["total"] == 0
    assert (
        bob.get("/api/v1/assignments", params={"subject_id": ids["subjects"]}).json()["total"] == 0
    )
    summary = bob.get("/api/v1/dashboard/summary").json()
    assert summary["counts"]["subjects"] == 0 and summary["upcoming_assignments"] == []


def test_patch_by_other_user_does_not_modify(alice: TestClient, bob: TestClient) -> None:
    ids = _seed(alice)
    assert (
        bob.patch(f"/api/v1/assignments/{ids['assignments']}", json={"status": "done"}).status_code
        == 404
    )
    assert alice.get(f"/api/v1/assignments/{ids['assignments']}").json()["status"] == "todo"


def test_cannot_link_item_to_another_users_subject(alice: TestClient, bob: TestClient) -> None:
    alice_subject = _seed(alice)["subjects"]

    for resource, extra in [
        ("assignments", {"due_at": "2030-01-01T10:00:00Z"}),
        ("exams", {"exam_at": "2030-01-01T10:00:00Z"}),
    ]:
        payload = {"title": "x", "subject_id": alice_subject, **extra}
        response = bob.post(f"/api/v1/{resource}", json=payload)
        assert response.status_code == 422
        assert response.json()["code"] == "subject_not_found"

        own = bob.post(f"/api/v1/{resource}", json={"title": "x", **extra}).json()
        response = bob.patch(f"/api/v1/{resource}/{own['id']}", json={"subject_id": alice_subject})
        assert response.status_code == 422


def test_database_rejects_cross_user_subject_link(alice: TestClient, bob: TestClient) -> None:
    """Defence in depth: even a buggy service could not link Bob's item to Alice's subject."""
    alice_subject = _seed(alice)["subjects"]
    bob_assignment = bob.post(
        "/api/v1/assignments", json={"title": "x", "due_at": "2030-01-01T10:00:00Z"}
    ).json()
    with engine.connect() as conn:
        try:
            conn.execute(
                text("UPDATE assignments SET subject_id = :s WHERE id = :a"),
                {"s": alice_subject, "a": bob_assignment["id"]},
            )
            raise AssertionError("foreign key should have rejected the update")
        except Exception as exc:  # noqa: BLE001
            assert "fk_assignments_subject_id_user_id_subjects" in str(exc)


def test_deleting_a_user_deletes_all_their_data(alice: TestClient, bob: TestClient) -> None:
    _seed(alice)
    _seed(bob)
    with engine.begin() as conn:
        conn.execute(text("DELETE FROM users WHERE email = 'alice@telecomnancy.eu'"))
        remaining = {
            table: conn.scalar(text(f"SELECT count(*) FROM {table}"))
            for table in ["users", "profiles", "user_sessions", "subjects", "assignments", "exams"]
        }
    assert remaining == {
        "users": 1,
        "profiles": 1,
        "user_sessions": 1,
        "subjects": 1,
        "assignments": 1,
        "exams": 1,
    }
    assert alice.get("/api/v1/auth/me").status_code == 401
