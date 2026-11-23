from fastapi.testclient import TestClient

from app.core.email import outbox
from tests.conftest import PASSWORD, register
from tests.school_factory import build_structure, login, make_member, make_school, make_user


def test_me_exposes_role_and_institution() -> None:
    school = make_school("ucad")
    me = school.teacher.get("/api/v1/auth/me").json()
    assert me["role"] == "teacher"
    assert me["institution"]["slug"] == "ucad"
    assert me["institution"]["grade_max"] == 20
    assert [m["role"] for m in me["memberships"]] == ["teacher"]


def test_personal_account_has_no_institution(client: TestClient) -> None:
    register(client)
    me = client.get("/api/v1/auth/me").json()
    assert me["role"] is None and me["institution"] is None and me["memberships"] == []
    response = client.get("/api/v1/school/departments")
    assert response.status_code == 403 and response.json()["code"] == "no_institution"


def test_permissions_are_enforced_by_role() -> None:
    school = make_school("ucad")
    body = {"name": "Mathématiques"}
    for client in (school.teacher, school.student):
        r = client.post("/api/v1/school/departments", json=body)
        assert r.status_code == 403 and r.json()["code"] == "forbidden"
        assert client.get("/api/v1/school/settings").status_code == 403
        assert client.get("/api/v1/school/invitations").status_code == 403
    assert school.admin.post("/api/v1/school/departments", json=body).status_code == 201
    # Teachers can read the structure, students cannot.
    assert school.teacher.get("/api/v1/school/departments").status_code == 200
    assert school.student.get("/api/v1/school/departments").status_code == 403


def test_structure_rules() -> None:
    school = make_school("ucad")
    ids = build_structure(school.admin, school.teacher_id)
    api = school.admin

    # A course teacher must be a teacher (not a student).
    r = api.post(
        "/api/v1/school/courses",
        json={"unit_id": ids["unit"], "name": "X", "teacher_id": str(school.student_id)},
    )
    assert r.status_code == 422 and r.json()["code"] == "teacher_not_found"

    # A unit's period must belong to the cohort's academic year.
    other_year = api.post(
        "/api/v1/school/academic-years",
        json={"name": "2027-2028", "starts_on": "2027-10-01", "ends_on": "2028-07-31"},
    ).json()["id"]
    other_period = api.post(
        "/api/v1/school/periods",
        json={
            "academic_year_id": other_year,
            "name": "S1",
            "starts_on": "2027-10-01",
            "ends_on": "2028-02-01",
        },
    ).json()["id"]
    r = api.post(
        "/api/v1/school/units",
        json={"cohort_id": ids["cohort"], "period_id": other_period, "name": "X"},
    )
    assert r.status_code == 422 and r.json()["code"] == "period_mismatch"

    # Only one current academic year.
    api.patch(f"/api/v1/school/academic-years/{other_year}", json={"is_current": True})
    years = {y["name"]: y["is_current"] for y in api.get("/api/v1/school/academic-years").json()}
    assert years == {"2026-2027": False, "2027-2028": True}

    # A programme still used by a cohort cannot be deleted.
    r = api.delete(f"/api/v1/school/programs/{ids['program']}")
    assert r.status_code == 409 and r.json()["code"] == "in_use"
    # Duplicates are reported clearly.
    r = api.post("/api/v1/school/programs", json={"name": "Licence Informatique"})
    assert r.status_code == 409 and r.json()["code"] == "duplicate"
    # Filters
    assert len(api.get(f"/api/v1/school/units?cohort_id={ids['cohort']}").json()) == 1
    assert api.get("/api/v1/school/units?cohort_id=nope").status_code == 422


def test_institutions_are_isolated() -> None:
    a = make_school("ucad")
    b = make_school("ugb")
    ids = build_structure(a.admin, a.teacher_id)

    # B sees nothing of A, by list or by id, and cannot reference A's rows.
    assert b.admin.get("/api/v1/school/programs").json() == []
    assert b.admin.get(f"/api/v1/school/programs/{ids['program']}").status_code == 404
    assert (
        b.admin.patch(f"/api/v1/school/programs/{ids['program']}", json={"name": "x"}).status_code
        == 404
    )
    assert b.admin.delete(f"/api/v1/school/cohorts/{ids['cohort']}").status_code == 404
    year_b = b.admin.post(
        "/api/v1/school/academic-years",
        json={"name": "2026", "starts_on": "2026-10-01", "ends_on": "2027-07-01"},
    ).json()["id"]
    r = b.admin.post(
        "/api/v1/school/cohorts",
        json={"program_id": ids["program"], "academic_year_id": year_b, "name": "x"},
    )
    assert r.status_code == 422 and r.json()["code"] == "program_not_found"
    # B's admin cannot assign A's teacher nor manage A's members.
    r = b.admin.patch(f"/api/v1/school/members/{a.student_id}", json={"status": "disabled"})
    assert r.status_code == 404
    assert {m["email"] for m in b.admin.get("/api/v1/school/members").json()} == {
        "admin@ugb.edu",
        "prof@ugb.edu",
        "etu@ugb.edu",
    }


def test_invitation_flow() -> None:
    school = make_school("ucad")
    ids = build_structure(school.admin, school.teacher_id)
    r = school.admin.post(
        "/api/v1/school/invitations",
        json={
            "email": "Nouveau@UCAD.edu",
            "role": "student",
            "first_name": "Ibrahima",
            "cohort_id": ids["cohort"],
            "student_number": "2026-001",
        },
    )
    assert r.status_code == 201
    body = r.json()
    assert body["status"] == "invited" and "/invite/" in body["invitation_url"]
    assert outbox[-1].to == "nouveau@ucad.edu" and body["invitation_url"] in outbox[-1].body

    token = body["invitation_url"].rsplit("/", 1)[1]
    with TestClient(school.admin.app) as anon:
        info = anon.get(f"/api/v1/invitations/{token}").json()
        assert info["institution_name"] == "Université UCAD" and info["role"] == "student"
        r = anon.post(
            f"/api/v1/invitations/{token}/accept",
            json={"first_name": "Ibrahima", "password": PASSWORD},
        )
        assert r.status_code == 201
        me = anon.get("/api/v1/auth/me").json()
        assert me["role"] == "student" and me["institution"]["slug"] == "ucad"
        assert (
            anon.post(
                f"/api/v1/invitations/{token}/accept",
                json={"first_name": "X", "password": PASSWORD},
            ).status_code
            == 410
        )

    members = school.admin.get(f"/api/v1/school/members?cohort_id={ids['cohort']}").json()
    assert [(m["email"], m["student_number"]) for m in members] == [
        ("nouveau@ucad.edu", "2026-001")
    ]

    # Existing account: added immediately. Twice: conflict.
    make_user("deja@inscrit.fr")
    r = school.admin.post(
        "/api/v1/school/invitations", json={"email": "deja@inscrit.fr", "role": "teacher"}
    )
    assert r.json()["status"] == "added" and r.json()["invitation_url"] is None
    r = school.admin.post(
        "/api/v1/school/invitations", json={"email": "deja@inscrit.fr", "role": "teacher"}
    )
    assert r.status_code == 409 and r.json()["code"] == "already_member"


def test_csv_import_reports_each_row() -> None:
    school = make_school("ucad")
    rows = [
        {"email": "a@ucad.edu", "role": "student", "first_name": "A"},
        {"email": "b@ucad.edu", "role": "teacher"},
        {"email": "etu@ucad.edu", "role": "student"},  # already a member
    ]
    r = school.admin.post("/api/v1/school/invitations/import", json={"rows": rows})
    assert [(x["email"], x["status"], x["error"]) for x in r.json()] == [
        ("a@ucad.edu", "invited", None),
        ("b@ucad.edu", "invited", None),
        ("etu@ucad.edu", "error", "already_member"),
    ]
    assert len(school.admin.get("/api/v1/school/invitations").json()) == 2


def test_last_admin_is_protected() -> None:
    school = make_school("ucad")
    r = school.admin.patch(f"/api/v1/school/members/{school.admin_id}", json={"role": "teacher"})
    assert r.status_code == 409 and r.json()["code"] == "last_admin"
    r = school.admin.patch(f"/api/v1/school/members/{school.teacher_id}", json={"role": "admin"})
    assert r.status_code == 200
    r = school.admin.patch(f"/api/v1/school/members/{school.admin_id}", json={"role": "teacher"})
    assert r.status_code == 200


def test_disabled_member_loses_access() -> None:
    school = make_school("ucad")
    school.admin.patch(f"/api/v1/school/members/{school.teacher_id}", json={"status": "disabled"})
    r = school.teacher.get("/api/v1/school/departments")
    assert r.status_code == 403 and r.json()["code"] == "no_institution"


def test_platform_console_and_suspension() -> None:
    school = make_school("ucad")
    make_user("owner@campushub.io", "Owner", superadmin=True)
    owner = login("owner@campushub.io")
    assert school.admin.get("/api/v1/platform/institutions").status_code == 403

    r = owner.post(
        "/api/v1/platform/institutions",
        json={
            "name": "ISM Dakar",
            "slug": "ism-dakar",
            "country": "SN",
            "plan": "essential",
            "admin_email": "dir@ism.sn",
        },
    )
    assert r.status_code == 201
    assert r.json()["institution"]["modules"] == [
        "grades",
        "timetable",
        "attendance",
        "announcements",
    ]
    assert "/invite/" in r.json()["invitation_url"]
    assert (
        owner.post(
            "/api/v1/platform/institutions",
            json={"name": "x", "slug": "ism-dakar", "admin_email": "a@b.co"},
        ).status_code
        == 409
    )

    stats = owner.get("/api/v1/platform/stats").json()
    assert (
        stats["institutions"] == 2 and stats["students"] == 1 and stats["by_plan"]["essential"] == 1
    )

    owner.patch(f"/api/v1/platform/institutions/{school.id}", json={"status": "suspended"})
    r = school.admin.get("/api/v1/school/settings")
    assert r.status_code == 403 and r.json()["code"] == "institution_suspended"
    actions = [a["action"] for a in owner.get("/api/v1/platform/audit").json()]
    assert "platform.institution_suspended" in actions and "platform.institution_created" in actions

    owner.patch(
        f"/api/v1/platform/institutions/{school.id}",
        json={"status": "active", "modules": ["grades"]},
    )
    r = school.admin.get("/api/v1/school/settings")
    assert r.status_code == 200 and r.json()["modules"] == ["grades"]


def test_password_reset() -> None:
    make_school("ucad")
    student = login("etu@ucad.edu")
    with TestClient(student.app) as anon:
        assert (
            anon.post("/api/v1/auth/password-reset", json={"email": "unknown@x.fr"}).status_code
            == 204
        )
        assert outbox == []
        assert (
            anon.post("/api/v1/auth/password-reset", json={"email": "etu@ucad.edu"}).status_code
            == 204
        )
        token = outbox[-1].body.split("/reset-password/")[1].split()[0]
        r = anon.post(
            "/api/v1/auth/password-reset/confirm",
            json={"token": token, "password": "nouveau-mdp-123"},
        )
        assert r.status_code == 204
        # Old sessions are closed, the link cannot be reused, the new password works.
        assert student.get("/api/v1/auth/me").status_code == 401
        r = anon.post(
            "/api/v1/auth/password-reset/confirm",
            json={"token": token, "password": "autre-mdp-456"},
        )
        assert r.json()["code"] == "invalid_token"
        r = anon.post(
            "/api/v1/auth/login", json={"email": "etu@ucad.edu", "password": "nouveau-mdp-123"}
        )
        assert r.status_code == 200


def test_switch_institution() -> None:
    a = make_school("ucad")
    b = make_school("ugb")
    make_member(b.id, "prof@ucad.edu", "teacher")
    teacher = login("prof@ucad.edu")
    me = teacher.get("/api/v1/auth/me").json()
    assert me["institution"]["slug"] == "ucad" and len(me["memberships"]) == 2
    me = teacher.post("/api/v1/auth/institution", json={"institution_id": str(b.id)}).json()
    assert me["institution"]["slug"] == "ugb"
    stranger = make_school("esp")
    r = teacher.post("/api/v1/auth/institution", json={"institution_id": str(stranger.id)})
    assert r.status_code == 403
    assert a.id != b.id
