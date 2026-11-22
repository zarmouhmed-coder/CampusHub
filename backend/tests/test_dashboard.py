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
    # Open items due before the end of the current calendar week (depends on today's weekday).
    from zoneinfo import ZoneInfo

    from app.services.dashboard import calendar_week

    now = datetime.now(UTC)
    _, week_end = calendar_week(now, ZoneInfo("Europe/Paris"))
    due_this_week = sum(1 for days in (1, 3, 10) if now + timedelta(days=days) < week_end)
    assert summary["counts"] == {
        "todo": 3,
        "in_progress": 2,
        "done": 2,
        "overdue": 2,
        "due_this_week": due_this_week,
        "upcoming_exams": 2,
        "subjects": 1,
    }


def test_dashboard_limits_upcoming_list(alice: TestClient) -> None:
    for i in range(8):
        alice.post("/api/v1/assignments", json={"title": f"D{i}", "due_at": _at(i + 1)})
    upcoming = alice.get("/api/v1/dashboard/summary").json()["upcoming_assignments"]
    assert [a["title"] for a in upcoming] == ["D0", "D1", "D2", "D3", "D4"]


def test_calendar_week_in_paris() -> None:
    from zoneinfo import ZoneInfo

    from app.services.dashboard import calendar_week

    paris = ZoneInfo("Europe/Paris")

    # Sunday 22 Nov 2026, 23:30 in Paris (22:30 UTC) still belongs to the week of Monday 16.
    start, end = calendar_week(datetime(2026, 11, 22, 22, 30, tzinfo=UTC), paris)
    assert start == datetime(2026, 11, 15, 23, 0, tzinfo=UTC)
    assert end == datetime(2026, 11, 22, 23, 0, tzinfo=UTC)
    # Across the DST switch (29 March 2026): Monday 30 March 00:00 is UTC+2.
    start, end = calendar_week(datetime(2026, 3, 31, 12, 0, tzinfo=UTC), paris)
    assert start == datetime(2026, 3, 29, 22, 0, tzinfo=UTC)


def test_dashboard_week_progress(alice: TestClient) -> None:
    from zoneinfo import ZoneInfo

    from app.services.dashboard import calendar_week

    start, _ = calendar_week(datetime.now(UTC), ZoneInfo("Europe/Paris"))
    for status, offset_days in [
        ("done", 0),
        ("done", 1),
        ("todo", 2),
        ("in_progress", 3),
        ("todo", 9),
    ]:
        alice.post(
            "/api/v1/assignments",
            json={
                "title": status,
                "status": status,
                "due_at": (start + timedelta(days=offset_days, hours=12)).isoformat(),
            },
        )
    week = alice.get("/api/v1/dashboard/summary").json()["week"]
    assert week == {"todo": 1, "in_progress": 1, "done": 2, "total": 4}


def test_week_follows_the_user_timezone() -> None:
    from zoneinfo import ZoneInfo

    from app.services.dashboard import calendar_week

    # Sunday 22 Nov 2026 at 23:30 UTC: still Sunday in Dakar (UTC+0),
    # already Monday 23 in Nairobi (UTC+3), so a new week has started there.
    now = datetime(2026, 11, 22, 23, 30, tzinfo=UTC)
    assert calendar_week(now, ZoneInfo("Africa/Dakar"))[0] == datetime(2026, 11, 16, tzinfo=UTC)
    assert calendar_week(now, ZoneInfo("Africa/Nairobi"))[0] == datetime(
        2026, 11, 22, 21, 0, tzinfo=UTC
    )
