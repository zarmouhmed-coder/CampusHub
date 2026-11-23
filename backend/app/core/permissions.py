"""Role-based permissions, checked on the server for every request.

Roles are bundles of permissions. Adding a role later (department head, registrar,
parent…) means adding an entry here, not touching the routes.
"""

from app.models.tenancy import Role

ROLE_PERMISSIONS: dict[str, frozenset[str]] = {
    Role.ADMIN: frozenset(
        {
            "institution.manage",
            "people.manage",
            "structure.manage",
            "structure.read",
            "grades.manage",
            "grades.enter",
            "timetable.manage",
            "timetable.read",
            "attendance.record",
            "attendance.manage",
            "finance.manage",
            "announcements.publish",
            "documents.issue",
            "audit.read",
        }
    ),
    Role.TEACHER: frozenset(
        {
            "structure.read",
            "grades.enter",
            "timetable.read",
            "attendance.record",
            "announcements.publish",
        }
    ),
    Role.STUDENT: frozenset({"timetable.read", "student.self"}),
}


def has_permission(role: str, permission: str) -> bool:
    return permission in ROLE_PERMISSIONS.get(role, frozenset())
