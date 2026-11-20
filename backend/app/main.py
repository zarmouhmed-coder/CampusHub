import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.router import api_router
from app.core.config import get_settings
from app.core.middleware import origin_check

logger = logging.getLogger("campushub")


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="CampusHub API",
        version="0.1.0",
        # Interactive docs are handy locally; hidden in production.
        docs_url=None if settings.is_production else "/api/docs",
        redoc_url=None,
        openapi_url=None if settings.is_production else "/api/openapi.json",
    )

    app.middleware("http")(origin_check(settings.allowed_origins))
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,  # explicit list, never "*"
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "DELETE"],
        allow_headers=["Content-Type"],
    )

    @app.exception_handler(Exception)
    async def unhandled_error(request: Request, exc: Exception) -> JSONResponse:
        # Full details go to the logs, never to the client.
        logger.exception("Unhandled error on %s %s", request.method, request.url.path)
        return JSONResponse({"detail": "Erreur interne du serveur."}, status_code=500)

    app.include_router(api_router)
    return app


app = create_app()
