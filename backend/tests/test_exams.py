from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient


def test_exam_crud(alice: TestClient) -> None:
    subject = alice.post("/api/v1/subjects", json={"name": "Probabilités"}).json()
    created = alice.post(
        "/api/v1/exams",
        json={
            "title": "Partiel",
            "subject_id": subject["id"],
            "exam_at": "2030-01-15T08:00:00+01:00",
            "room": " Amphi Nord ",
        },
    )
    assert created.status_code == 201
    exam = created.json()
    assert exam["exam_at"] == "2030-01-15T07:00:00Z" and exam["room"] == "Amphi Nord"
    assert exam["subject"]["name"] == "Probabilités"

    url = f"/api/v1/exams/{exam['id']}"
    updated = alice.patch(url, json={"room": "", "description": "Calculatrice autorisée"})
    assert updated.json()["room"] is None
    assert updated.json()["description"] == "Calculatrice autorisée"
    assert alice.get(url).json()["title"] == "Partiel"

    assert alice.delete(url).status_code == 204
    assert alice.get(url).status_code == 404


def test_exam_validation(alice: TestClient) -> None:
    for payload in [
        {"exam_at": "2030-01-15T08:00:00Z"},
        {"title": "Partiel"},
        {"title": "Partiel", "exam_at": "2030-01-15T08:00:00"},
        {"title": "Partiel", "exam_at": "2030-01-15T08:00:00Z", "room": "x" * 101},
    ]:
        assert alice.post("/api/v1/exams", json=payload).status_code == 422, payload


def test_exam_list_when_filter(alice: TestClient) -> None:
    now = datetime.now(UTC)
    for title, delta in [
        ("Passé récent", -1),
        ("Passé ancien", -30),
        ("Bientôt", 2),
        ("Plus tard", 20),
    ]:
        alice.post(
            "/api/v1/exams",
            json={"title": title, "exam_at": (now + timedelta(days=delta)).isoformat()},
        )

    def titles(when: str) -> list[str]:
        return [e["title"] for e in alice.get(f"/api/v1/exams?when={when}").json()["items"]]

    assert titles("all") == ["Passé ancien", "Passé récent", "Bientôt", "Plus tard"]
    assert titles("upcoming") == ["Bientôt", "Plus tard"]
    assert titles("past") == ["Passé récent", "Passé ancien"]


def test_exam_date_range_filter(alice: TestClient) -> None:
    for title, at in [("A", "2030-03-01T08:00:00Z"), ("B", "2030-03-02T08:00:00Z")]:
        alice.post("/api/v1/exams", json={"title": title, "exam_at": at})
    response = alice.get(
        "/api/v1/exams", params={"after": "2030-03-02T00:00:00Z", "before": "2030-03-03T00:00:00Z"}
    )
    assert [e["title"] for e in response.json()["items"]] == ["B"]
