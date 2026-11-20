from fastapi import APIRouter

from app.api.routes import assignments, auth, dashboard, exams, health, profile, subjects

api_router = APIRouter(prefix="/api/v1")
for module in (health, auth, profile, subjects, assignments, exams, dashboard):
    api_router.include_router(module.router)
