from datetime import date, timedelta

from tests.school_factory import School, build_structure, login, make_member, make_school

API = "/api/v1"


def _setup() -> tuple[School, dict[str, str], str]:
    school = make_school("ucad")
    ids = build_structure(school.admin, school.teacher_id)
    school.admin.post(
        f"{API}/school/members/{school.student_id}/enrollments", json={"cohort_id": ids["cohort"]}
    )
    room = school.admin.post(
        f"{API}/school/rooms", json={"name": "Amphi A", "capacity": 300}
    ).json()["id"]
    return school, ids, room


def _slot(
    school: School, ids: dict[str, str], room: str | None, start: str, end: str, repeat: int = 0
) -> object:
    return school.admin.post(
        f"{API}/school/sessions",
        json={
            "course_id": ids["course"],
            "room_id": room,
            "starts_at": start,
            "ends_at": end,
            "kind": "CM",
            "repeat_weeks": repeat,
        },
    )


def test_timetable_and_conflicts() -> None:
    school, ids, room = _setup()
    r = _slot(school, ids, room, "2026-11-23T08:00:00Z", "2026-11-23T10:00:00Z", repeat=2)
    assert r.status_code == 201 and len(r.json()) == 3  # type: ignore[attr-defined]
    assert r.json()[2]["starts_at"] == "2026-12-07T08:00:00Z"  # type: ignore[attr-defined]

    # Overlap: same cohort and teacher, even without a room.
    r = _slot(school, ids, None, "2026-11-23T09:00:00Z", "2026-11-23T11:00:00Z")
    assert r.status_code == 409 and r.json()["code"] == "schedule_conflict"  # type: ignore[attr-defined]
    # Back-to-back slots are fine.
    assert (
        _slot(school, ids, room, "2026-11-23T10:00:00Z", "2026-11-23T12:00:00Z").status_code == 201
    )  # type: ignore[attr-defined]

    # Another cohort in the same room at the same time: room conflict.
    other_cohort = school.admin.post(
        f"{API}/school/cohorts",
        json={"program_id": ids["program"], "academic_year_id": ids["year"], "name": "L1 Info B"},
    ).json()["id"]
    unit = school.admin.post(
        f"{API}/school/units",
        json={"cohort_id": other_cohort, "period_id": ids["period"], "name": "U"},
    ).json()["id"]
    course_b = school.admin.post(
        f"{API}/school/courses", json={"unit_id": unit, "name": "Anglais"}
    ).json()["id"]
    r = school.admin.post(
        f"{API}/school/sessions",
        json={
            "course_id": course_b,
            "room_id": room,
            "starts_at": "2026-11-30T08:30:00Z",
            "ends_at": "2026-11-30T09:30:00Z",
        },
    )
    assert r.status_code == 409 and "room" in r.json()["detail"]

    window = "start=2026-11-23T00:00:00Z&end=2026-12-14T00:00:00Z"
    assert len(school.student.get(f"{API}/timetable?{window}").json()) == 4
    assert len(school.teacher.get(f"{API}/timetable?{window}").json()) == 4
    assert len(school.admin.get(f"{API}/timetable?{window}&room_id={room}").json()) == 4
    make_member(school.id, "autre@ucad.edu", "student")
    assert login("autre@ucad.edu").get(f"{API}/timetable?{window}").json() == []
    assert school.student.post(f"{API}/school/sessions", json={}).status_code in (403, 422)
    assert (
        school.student.get(
            f"{API}/timetable?start=2026-01-01T00:00:00Z&end=2026-12-01T00:00:00Z"
        ).status_code
        == 422
    )


def test_attendance() -> None:
    school, ids, room = _setup()
    session = _slot(school, ids, room, "2026-11-23T08:00:00Z", "2026-11-23T10:00:00Z").json()[0][
        "id"
    ]  # type: ignore[attr-defined]
    sid = str(school.student_id)
    roster = school.teacher.get(f"{API}/teaching/sessions/{session}/attendance").json()
    assert [(r["student_id"], r["status"]) for r in roster] == [(sid, None)]
    r = school.teacher.put(
        f"{API}/teaching/sessions/{session}/attendance",
        json={"records": [{"student_id": sid, "status": "absent"}]},
    )
    assert r.json()[0]["status"] == "absent"
    outsider = make_member(school.id, "x@ucad.edu", "student")
    r = school.teacher.put(
        f"{API}/teaching/sessions/{session}/attendance",
        json={"records": [{"student_id": str(outsider), "status": "present"}]},
    )
    assert r.json()["code"] == "student_not_found"
    make_member(school.id, "prof2@ucad.edu", "teacher")
    assert (
        login("prof2@ucad.edu").get(f"{API}/teaching/sessions/{session}/attendance").status_code
        == 403
    )

    mine = school.student.get(f"{API}/me/attendance").json()
    assert (mine["recorded"], mine["absent"], mine["rate"]) == (1, 1, 0.0)
    record = school.admin.get(f"{API}/school/attendance").json()[0]
    fixed = school.admin.patch(
        f"{API}/school/attendance/{record['id']}",
        json={"status": "excused", "note": "Certificat médical"},
    ).json()
    assert fixed["status"] == "excused"
    assert school.student.get(f"{API}/me/attendance").json()["excused"] == 1
    assert school.teacher.get(f"{API}/school/attendance").status_code == 403


def test_finance() -> None:
    school, ids, _ = _setup()
    make_member(school.id, "etu2@ucad.edu", "student")
    sid = str(school.student_id)
    past = (date.today() - timedelta(days=5)).isoformat()

    r = school.admin.post(
        f"{API}/school/invoices/bulk",
        json={
            "cohort_id": ids["cohort"],
            "label": "Scolarité S1",
            "amount": 450000,
            "due_on": past,
        },
    )
    assert r.status_code == 201 and len(r.json()) == 1  # only enrolled students
    invoice = r.json()[0]
    assert invoice["status"] == "overdue" and invoice["currency"] == "XOF"

    pay = {
        "amount": 150000,
        "method": "mobile_money",
        "reference": "WAVE-TX-88231",
        "paid_on": date.today().isoformat(),
    }
    r = school.admin.post(f"{API}/school/invoices/{invoice['id']}/payments", json=pay)
    assert r.json()["paid"] == 150000 and r.json()["balance"] == 300000
    r = school.admin.post(
        f"{API}/school/invoices/{invoice['id']}/payments", json={**pay, "amount": 400000}
    )
    assert r.json()["code"] == "overpayment"
    r = school.admin.patch(f"{API}/school/invoices/{invoice['id']}", json={"amount": 100000})
    assert r.json()["code"] == "amount_below_paid"
    assert (
        school.admin.delete(f"{API}/school/invoices/{invoice['id']}").json()["code"]
        == "has_payments"
    )
    r = school.admin.post(
        f"{API}/school/invoices/{invoice['id']}/payments",
        json={**pay, "amount": 300000, "method": "cash"},
    )
    assert r.json()["status"] == "paid"

    summary = school.admin.get(f"{API}/school/finance/summary").json()
    assert (
        summary["billed"] == 450000
        and summary["collected"] == 450000
        and summary["collection_rate"] == 100
    )
    assert summary["by_method"] == {"mobile_money": 150000, "cash": 300000}

    mine = school.student.get(f"{API}/me/invoices").json()
    assert [i["status"] for i in mine] == ["paid"] and mine[0]["payments"][0][
        "reference"
    ] == "WAVE-TX-88231"
    assert school.teacher.get(f"{API}/school/invoices").status_code == 403
    r = school.admin.post(
        f"{API}/school/invoices",
        json={"student_id": str(school.teacher_id), "label": "x", "amount": 1},
    )
    assert r.json()["code"] == "not_a_student"
    assert (
        school.admin.post(
            f"{API}/school/invoices",
            json={"student_id": sid, "label": "Inscription", "amount": 50000},
        ).json()["status"]
        == "unpaid"
    )
    # Another institution sees none of it.
    other = make_school("ugb")
    assert other.admin.get(f"{API}/school/invoices").json() == []
    assert (
        other.admin.post(f"{API}/school/invoices/{invoice['id']}/payments", json=pay).status_code
        == 404
    )


def test_announcements_targeting() -> None:
    school, ids, _ = _setup()
    other_cohort = school.admin.post(
        f"{API}/school/cohorts",
        json={"program_id": ids["program"], "academic_year_id": ids["year"], "name": "M1"},
    ).json()["id"]

    def post(client, body):  # type: ignore[no-untyped-def]
        return client.post(f"{API}/announcements", json={"title": "Info", "body": "Texte", **body})

    assert post(school.admin, {"audience": "all"}).status_code == 201
    assert post(school.admin, {"audience": "teachers", "title": "Conseil"}).status_code == 201
    assert (
        post(
            school.admin, {"audience": "cohort", "cohort_id": other_cohort, "title": "M1 only"}
        ).status_code
        == 201
    )
    assert (
        post(
            school.teacher, {"audience": "cohort", "cohort_id": ids["cohort"], "title": "TP annulé"}
        ).status_code
        == 201
    )
    # Teachers: own cohorts only, no broadcast.
    assert post(school.teacher, {"audience": "all"}).status_code == 403
    assert (
        post(school.teacher, {"audience": "cohort", "cohort_id": other_cohort}).status_code == 403
    )
    assert post(school.student, {"audience": "all"}).status_code == 403
    assert post(school.admin, {"audience": "cohort"}).status_code == 422

    def titles(client):  # type: ignore[no-untyped-def]
        return {a["title"] for a in client.get(f"{API}/announcements").json()}

    assert titles(school.student) == {"Info", "TP annulé"}
    assert titles(school.teacher) == {"Info", "Conseil", "TP annulé"}
    assert len(titles(school.admin)) == 4
    teacher_post = next(
        a for a in school.teacher.get(f"{API}/announcements").json() if a["title"] == "TP annulé"
    )
    assert teacher_post["can_delete"]
    assert school.student.delete(f"{API}/announcements/{teacher_post['id']}").status_code == 404
    assert school.teacher.delete(f"{API}/announcements/{teacher_post['id']}").status_code == 204


def test_overview() -> None:
    school, _, _ = _setup()
    data = school.admin.get(f"{API}/school/overview").json()
    assert (
        data["students"],
        data["teachers"],
        data["admins"],
        data["cohorts"],
        data["courses"],
    ) == (1, 1, 1, 1, 1)
    assert data["currency"] == "XOF" and data["attendance_rate_30d"] is None
    assert school.teacher.get(f"{API}/school/overview").status_code == 403
