from fastapi.testclient import TestClient

from tests.school_factory import School, build_structure, login, make_member, make_school

API = "/api/v1"


def _setup() -> tuple[School, dict[str, str], str, str]:
    school = make_school("ucad")
    ids = build_structure(school.admin, school.teacher_id)
    admin = school.admin
    admin.post(
        f"{API}/school/members/{school.student_id}/enrollments", json={"cohort_id": ids["cohort"]}
    )
    python = admin.post(
        f"{API}/school/courses",
        json={
            "unit_id": ids["unit"],
            "name": "Python",
            "coefficient": 1,
            "teacher_id": str(school.teacher_id),
        },
    ).json()["id"]
    unit_b = admin.post(
        f"{API}/school/units",
        json={
            "cohort_id": ids["cohort"],
            "period_id": ids["period"],
            "name": "Mathématiques",
            "credits": 4,
        },
    ).json()["id"]
    maths = admin.post(
        f"{API}/school/courses",
        json={"unit_id": unit_b, "name": "Analyse", "teacher_id": str(school.teacher_id)},
    ).json()["id"]
    return school, ids, python, maths


def _assess(
    teacher: TestClient, course: str, title: str, weight: float, max_score: float | None = None
) -> str:
    body: dict[str, object] = {"title": title, "weight": weight}
    if max_score:
        body["max_score"] = max_score
    r = teacher.post(f"{API}/teaching/courses/{course}/assessments", json=body)
    assert r.status_code == 201, r.text
    return str(r.json()["id"])


def _grade(
    teacher: TestClient, assessment: str, student: str, score: float | None, absent: bool = False
) -> None:
    r = teacher.put(
        f"{API}/teaching/assessments/{assessment}/grades",
        json={"grades": [{"student_id": student, "score": score, "absent": absent}]},
    )
    assert r.status_code == 200, r.text
    teacher.patch(f"{API}/teaching/assessments/{assessment}", json={"published": True})


def test_results_engine_with_compensation() -> None:
    school, ids, python, maths = _setup()
    t, sid = school.teacher, str(school.student_id)
    _grade(t, _assess(t, ids["course"], "Examen", 2), sid, 12)
    _grade(t, _assess(t, ids["course"], "TP", 1, max_score=10), sid, 8)
    _grade(t, _assess(t, python, "Projet", 1), sid, None, absent=True)
    _grade(t, _assess(t, maths, "Partiel", 1), sid, 14)
    # Unpublished assessment: ignored.
    hidden = _assess(t, maths, "Rattrapage", 1)
    t.put(
        f"{API}/teaching/assessments/{hidden}/grades",
        json={"grades": [{"student_id": sid, "score": 0}]},
    )

    results = school.student.get(f"{API}/me/results").json()
    period = results["periods"][0]
    units = {u["name"]: u for u in period["units"]}
    courses = {c["name"]: c["average"] for c in units["Programmation"]["courses"]}
    assert courses == {"Algorithmique": 13.33, "Python": 0.0}
    assert units["Programmation"]["average"] == 8.89
    assert units["Programmation"]["validated"] and units["Programmation"]["compensated"]
    assert units["Mathématiques"]["average"] == 14.0 and not units["Mathématiques"]["compensated"]
    assert period["average"] == 10.93 and period["validated"]
    assert (period["credits_earned"], period["credits_total"]) == (10, 10)
    assert [a["title"] for a in units["Mathématiques"]["courses"][0]["assessments"]] == ["Partiel"]

    # Without compensation, the weak unit is not validated.
    school.admin.patch(f"{API}/school/settings", json={"compensation": False})
    period = school.student.get(f"{API}/me/results").json()["periods"][0]
    assert period["credits_earned"] == 4
    # Admin sees the same thing.
    assert (
        school.admin.get(f"{API}/school/students/{sid}/results").json()["periods"][0]["average"]
        == 10.93
    )


def test_grade_entry_rules() -> None:
    school, ids, _python, _ = _setup()
    t, sid = school.teacher, str(school.student_id)
    exam = _assess(t, ids["course"], "Examen", 1)
    # Roster = students of the course's cohort.
    roster = t.get(f"{API}/teaching/assessments/{exam}/grades").json()
    assert [r["student_id"] for r in roster] == [sid]
    r = t.put(
        f"{API}/teaching/assessments/{exam}/grades",
        json={"grades": [{"student_id": sid, "score": 25}]},
    )
    assert r.status_code == 422 and r.json()["code"] == "score_above_max"
    outsider = make_member(school.id, "autre@ucad.edu", "student")
    r = t.put(
        f"{API}/teaching/assessments/{exam}/grades",
        json={"grades": [{"student_id": str(outsider), "score": 10}]},
    )
    assert r.status_code == 422 and r.json()["code"] == "student_not_found"
    # Lowering the maximum below an existing grade is refused.
    t.put(
        f"{API}/teaching/assessments/{exam}/grades",
        json={"grades": [{"student_id": sid, "score": 18}]},
    )
    r = t.patch(f"{API}/teaching/assessments/{exam}", json={"max_score": 10})
    assert r.json()["code"] == "score_above_max"
    assert t.get(f"{API}/teaching/courses/{ids['course']}/assessments").json()[0]["graded"] == 1


def test_teaching_permissions() -> None:
    school, ids, _, _ = _setup()
    make_member(school.id, "prof2@ucad.edu", "teacher")
    other = login("prof2@ucad.edu")
    assert other.get(f"{API}/teaching/courses").json() == []
    assert other.get(f"{API}/teaching/courses/{ids['course']}/assessments").status_code == 403
    assert (
        other.post(
            f"{API}/teaching/courses/{ids['course']}/assessments", json={"title": "x"}
        ).status_code
        == 403
    )
    assert school.student.get(f"{API}/teaching/courses").status_code == 403
    assert len(school.teacher.get(f"{API}/teaching/courses").json()) == 3
    assert school.admin.get(f"{API}/teaching/courses").status_code == 200
    # Another institution cannot see this course at all.
    elsewhere = make_school("ugb")
    assert elsewhere.admin.get(f"{API}/teaching/courses/{ids['course']}").status_code == 404
    assert school.teacher.get(f"{API}/me/results").status_code == 403


def test_documents_and_public_verification() -> None:
    school, _ids, _, maths = _setup()
    t, sid = school.teacher, str(school.student_id)
    _grade(t, _assess(t, maths, "Partiel", 1), sid, 15)

    r = school.admin.post(f"{API}/school/documents", json={"student_id": sid, "kind": "transcript"})
    assert r.status_code == 201, r.text
    doc = r.json()
    assert (
        len(doc["code"]) == 14 and doc["payload"]["results"]["periods"][0]["name"] == "Semestre 1"
    )
    cert = school.admin.post(
        f"{API}/school/documents", json={"student_id": sid, "kind": "enrollment_certificate"}
    ).json()
    assert cert["payload"]["enrollments"][0]["program"] == "Licence Informatique"

    with TestClient(school.admin.app) as anyone:
        check = anyone.get(f"{API}/verify/{doc['code'].lower()}").json()
        assert check["valid"] and check["institution"] == "Université UCAD"
        assert check["student_name"] == "Fatou" and check["summary"][0]["credits_earned"] == 4
        assert anyone.get(f"{API}/verify/AAAA-BBBB-CCCC").json()["code"] == "document_not_found"
        school.admin.post(f"{API}/school/documents/{doc['id']}/revoke")
        check = anyone.get(f"{API}/verify/{doc['code']}").json()
        assert not check["valid"] and check["revoked"]

    # The student sees their documents; another student does not.
    assert len(school.student.get(f"{API}/me/documents").json()) == 2
    assert school.student.get(f"{API}/documents/{doc['id']}").status_code == 200
    make_member(school.id, "voisin@ucad.edu", "student")
    assert login("voisin@ucad.edu").get(f"{API}/documents/{doc['id']}").status_code == 404
    assert (
        school.teacher.post(
            f"{API}/school/documents", json={"student_id": sid, "kind": "transcript"}
        ).status_code
        == 403
    )


def test_disabled_module_is_refused() -> None:
    school, _, _, _ = _setup()
    school.admin.patch(f"{API}/school/settings", json={})
    from app.db.session import SessionLocal
    from app.models import Institution

    with SessionLocal() as db:
        inst = db.get(Institution, school.id)
        assert inst is not None
        inst.modules = ["timetable"]
        db.commit()
    r = school.student.get(f"{API}/me/results")
    assert r.status_code == 403 and r.json()["code"] == "module_disabled"
    assert school.teacher.get(f"{API}/teaching/courses").json()["code"] == "module_disabled"
