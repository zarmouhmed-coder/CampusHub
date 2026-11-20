from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient


def _at(days: float) -> str:
    return (datetime.now(UTC) + timedelta(days=days)).isoformat()


def test_empty_dashboard(alice: TestClient) -> None:
    summary = alice.get("/api/v1/dashboard/summary").json()
    assert summary["upcoming_assignments"] == []
    assert summary["overdue_assignments"] == []
    assert summary["upcoming_exams"] == []
    assert set(summary["counts"].values()) == {0}


def test_dashboard_sorting_and_counters(alice: TestClient) -> None:
    alice.post("/api/v1/subjects", json={"name": "Maths"})
    for title, days, status in [
        ("Dans 10 jours", 10, "todo"),
        ("Demain", 1, "in_progress"),
        ("Dans 3 jours", 3, "todo"),
        ("Terminé demain", 1, "done"),  # done: never listed
        ("En retard 2j", -2, "todo"),
        ("En retard 5j", -5, "in_progress"),
        ("Terminé en retard", -1, "done"),
    ]:
        response = alice.post(
            "/api/v1/assignments", json={"title": title, "due_at": _at(days), "status": status}
        )
        assert response.status_code == 201
    for title, days in [("Exam passé", -3), ("Exam dans 7j", 7), ("Exam demain", 1)]:
        alice.post("/api/v1/exams", json={"title": title, "exam_at": _at(days)})

    summary = alice.get("/api/v1/dashboard/summary").json()

    assert [a["title"] for a in summary["upcoming_assignments"]] == [
        "Demain",
        "Dans 3 jours",
        "Dans 10 jours",
    ]
    assert [a["title"] for a in summary["overdue_assignments"]] == ["En retard 5j", "En retard 2j"]
    assert [e["title"] for e in summary["upcoming_exams"]] == ["Exam demain", "Exam dans 7j"]
    assert summary["counts"] == {
        "todo": 3,
        "in_progress": 2,
        "done": 2,
        "overdue": 2,
        "due_this_week": 2,
        "upcoming_exams": 2,
        "subjects": 1,
    }


def test_dashboard_limits_upcoming_list(alice: TestClient) -> None:
    for i in range(8):
        alice.post("/api/v1/assignments", json={"title": f"D{i}", "due_at": _at(i + 1)})
    upcoming = alice.get("/api/v1/dashboard/summary").json()["upcoming_assignments"]
    assert [a["title"] for a in upcoming] == ["D0", "D1", "D2", "D3", "D4"]
