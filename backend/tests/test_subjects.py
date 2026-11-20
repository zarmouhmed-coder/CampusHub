from fastapi.testclient import TestClient


def test_subject_crud(alice: TestClient) -> None:
    created = alice.post(
        "/api/v1/subjects",
        json={"name": " Réseaux ", "description": "TCP/IP", "color": "#4F46E5"},
    )
    assert created.status_code == 201
    subject = created.json()
    assert subject["name"] == "Réseaux" and subject["color"] == "#4f46e5"

    url = f"/api/v1/subjects/{subject['id']}"
    assert alice.get(url).json()["description"] == "TCP/IP"

    updated = alice.patch(url, json={"name": "Réseaux avancés", "color": None})
    assert updated.status_code == 200
    assert updated.json()["name"] == "Réseaux avancés" and updated.json()["color"] is None

    alice.post("/api/v1/subjects", json={"name": "algorithmique"})
    names = [s["name"] for s in alice.get("/api/v1/subjects").json()]
    assert names == ["algorithmique", "Réseaux avancés"]  # case-insensitive alphabetical

    assert alice.delete(url).status_code == 204
    assert alice.get(url).status_code == 404


def test_subject_names_are_unique_per_user_case_insensitive(
    alice: TestClient, bob: TestClient
) -> None:
    assert alice.post("/api/v1/subjects", json={"name": "Maths"}).status_code == 201
    assert alice.post("/api/v1/subjects", json={"name": "Probabilités"}).status_code == 201
    assert alice.post("/api/v1/subjects", json={"name": "MATHS"}).status_code == 409
    # Another user can use the same name.
    assert bob.post("/api/v1/subjects", json={"name": "Maths"}).status_code == 201
    # Renaming onto an existing name is refused too.
    proba = alice.get("/api/v1/subjects").json()[1]
    assert alice.patch(f"/api/v1/subjects/{proba['id']}", json={"name": "maths"}).status_code == 409


def test_subject_validation(alice: TestClient) -> None:
    for payload in [{}, {"name": ""}, {"name": "x" * 101}, {"name": "A", "color": "red"}]:
        assert alice.post("/api/v1/subjects", json=payload).status_code == 422, payload
    assert alice.get("/api/v1/subjects/not-a-uuid").status_code == 422


def test_deleting_subject_keeps_linked_items(alice: TestClient) -> None:
    subject = alice.post("/api/v1/subjects", json={"name": "Réseaux"}).json()
    assignment = alice.post(
        "/api/v1/assignments",
        json={"title": "TP1", "subject_id": subject["id"], "due_at": "2030-01-01T10:00:00Z"},
    ).json()
    exam = alice.post(
        "/api/v1/exams",
        json={"title": "Partiel", "subject_id": subject["id"], "exam_at": "2030-01-02T08:00:00Z"},
    ).json()

    assert alice.delete(f"/api/v1/subjects/{subject['id']}").status_code == 204
    assert alice.get(f"/api/v1/assignments/{assignment['id']}").json()["subject"] is None
    assert alice.get(f"/api/v1/exams/{exam['id']}").json()["subject"] is None
