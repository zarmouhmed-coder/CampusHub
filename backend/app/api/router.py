from fastapi import APIRouter

from app.api.routes import (
    assignments,
    auth,
    dashboard,
    exams,
    health,
    invitations,
    platform,
    profile,
    school,
    subjects,
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
):
    api_router.include_router(module.router)
