from typing import Any

from fastapi.testclient import TestClient


def _create(client: TestClient, **fields: object) -> Any:
    payload = {"title": "Devoir", "due_at": "2030-01-10T10:00:00Z", **fields}
    response = client.post("/api/v1/assignments", json=payload)
    assert response.status_code == 201, response.text
    return response.json()


def test_assignment_crud(alice: TestClient) -> None:
    subject = alice.post("/api/v1/subjects", json={"name": "Java", "color": "#16a34a"}).json()
    created = _create(
        alice,
        title="TP Java",
        description="Rendu sur Arche",
        subject_id=subject["id"],
        due_at="2030-01-10T23:59:00+01:00",
        priority="high",
    )
    # Defaults, UTC normalisation and embedded subject.
    assert created["status"] == "todo"
    assert created["due_at"] == "2030-01-10T22:59:00Z"
    assert created["subject"] == {"id": subject["id"], "name": "Java", "color": "#16a34a"}

    url = f"/api/v1/assignments/{created['id']}"
    assert alice.get(url).json()["title"] == "TP Java"

    updated = alice.patch(url, json={"status": "in_progress", "subject_id": None})
    assert updated.status_code == 200
    assert updated.json()["status"] == "in_progress" and updated.json()["subject"] is None
    assert updated.json()["title"] == "TP Java"
    assert updated.json()["updated_at"] >= created["updated_at"]

    assert alice.patch(url, json={"status": "done"}).json()["status"] == "done"
    assert alice.delete(url).status_code == 204
    assert alice.get(url).status_code == 404
    assert alice.delete(url).status_code == 404


def test_assignment_validation(alice: TestClient) -> None:
    for payload in [
        {"due_at": "2030-01-10T10:00:00Z"},  # missing title
        {"title": "  ", "due_at": "2030-01-10T10:00:00Z"},
        {"title": "A"},  # missing due date
        {"title": "A", "due_at": "2030-01-10T10:00:00"},  # no timezone
        {"title": "A", "due_at": "not a date"},
        {"title": "A", "due_at": "2030-01-10T10:00:00Z", "priority": "urgent"},
        {"title": "A", "due_at": "2030-01-10T10:00:00Z", "status": "finished"},
        {"title": "A", "due_at": "2030-01-10T10:00:00Z", "user_id": "x"},
    ]:
        assert alice.post("/api/v1/assignments", json=payload).status_code == 422, payload

    item = _create(alice)
    for patch in [{"title": None}, {"due_at": None}, {"status": None}]:
        assert alice.patch(f"/api/v1/assignments/{item['id']}", json=patch).status_code == 422, (
            patch
        )


def test_assignment_list_sort_filters_and_pagination(alice: TestClient) -> None:
    java = alice.post("/api/v1/subjects", json={"name": "Java"}).json()
    _create(alice, title="C", due_at="2030-03-01T10:00:00Z", priority="low")
    _create(alice, title="A", due_at="2030-01-01T10:00:00Z", subject_id=java["id"])
    _create(alice, title="B", due_at="2030-02-01T10:00:00Z", priority="high", status="done")

    def titles(query: str = "") -> list[str]:
        response = alice.get(f"/api/v1/assignments{query}")
        assert response.status_code == 200, response.text
        return [a["title"] for a in response.json()["items"]]

    assert titles() == ["A", "B", "C"]
    assert titles("?order=desc") == ["C", "B", "A"]
    assert titles("?status=done") == ["B"]
    assert titles("?priority=high") == ["B"]
    assert titles(f"?subject_id={java['id']}") == ["A"]

    page = alice.get("/api/v1/assignments?limit=2&offset=1").json()
    assert [a["title"] for a in page["items"]] == ["B", "C"]
    assert page["total"] == 3 and page["limit"] == 2 and page["offset"] == 1
    assert alice.get("/api/v1/assignments?status=nope").status_code == 422
    assert alice.get("/api/v1/assignments?limit=1000").status_code == 422
