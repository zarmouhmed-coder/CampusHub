from collections.abc import Awaitable, Callable

from fastapi import Request, Response
from fastapi.responses import JSONResponse

SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}


def origin_check(allowed_origins: list[str]) -> Callable[..., Awaitable[Response]]:
    """CSRF defence for cookie-authenticated requests.

    Browsers always send an Origin header on cross-origin requests that change state,
    so any state-changing request coming from an origin that is not ours is rejected.
    Combined with SameSite=Lax cookies and JSON-only bodies, this blocks CSRF.
    Requests without Origin (curl, server-side calls) carry no ambient browser cookie
    from a third-party site, so they are allowed.
    """
    allowed = set(allowed_origins)

    async def middleware(
        request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        if request.method not in SAFE_METHODS:
            origin = request.headers.get("origin")
            if origin is not None and origin.rstrip("/") not in allowed:
                return JSONResponse({"detail": "Origine de la requête non autorisée."}, 403)
        return await call_next(request)

    return middleware
