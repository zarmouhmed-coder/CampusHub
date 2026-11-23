from fastapi import APIRouter

from app.api.routes import (
    announcements,
    assignments,
    auth,
    dashboard,
    documents,
    exams,
    finance,
    health,
    invitations,
    me,
    platform,
    profile,
    school,
    subjects,
    teaching,
    timetable,
)

api_router = APIRouter(prefix="/api/v1")
for module in (
    health,
    auth,
    invitations,
    profile,
    subjects,
    assignments,
    exams,
    dashboard,
    platform,
    school,
    teaching,
    me,
    documents,
    timetable,
    finance,
    announcements,
):
    api_router.include_router(module.router)
