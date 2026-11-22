import logging

from fastapi import FastAPI, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.router import api_router
from app.core.config import get_settings
from app.core.errors import AppError
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

    @app.exception_handler(AppError)
    async def app_error(request: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(
            {"code": exc.code, "detail": exc.detail}, exc.status_code, headers=exc.headers
        )

    @app.exception_handler(RequestValidationError)
    async def validation_error(request: Request, exc: RequestValidationError) -> JSONResponse:
        # Same shape as FastAPI's default (`detail` = list of issues) plus a code.
        return JSONResponse(
            {"code": "validation_error", "detail": jsonable_encoder(exc.errors())},
            status.HTTP_422_UNPROCESSABLE_CONTENT,
        )

    @app.exception_handler(Exception)
    async def unhandled_error(request: Request, exc: Exception) -> JSONResponse:
        # Full details go to the logs, never to the client.
        logger.exception("Unhandled error on %s %s", request.method, request.url.path)
        return JSONResponse(
            {"code": "internal_error", "detail": "Internal server error."}, status_code=500
        )

    app.include_router(api_router)
    return app


app = create_app()
