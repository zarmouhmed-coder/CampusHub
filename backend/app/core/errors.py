"""API errors carry a stable machine-readable `code` next to a human `detail`.

The frontend translates the code into the user's language; `detail` (English)
is a fallback for developers and API clients.
"""

from fastapi import status


class AppError(Exception):
    def __init__(
        self,
        status_code: int,
        code: str,
        detail: str,
        headers: dict[str, str] | None = None,
    ) -> None:
        super().__init__(detail)
        self.status_code = status_code
        self.code = code
        self.detail = detail
        self.headers = headers


class NotFoundError(AppError):
    def __init__(self, resource: str) -> None:
        super().__init__(status.HTTP_404_NOT_FOUND, "not_found", f"{resource} not found.")


class ConflictError(AppError):
    def __init__(self, code: str, detail: str) -> None:
        super().__init__(status.HTTP_409_CONFLICT, code, detail)


class InvalidReferenceError(AppError):
    """A body field references a resource that does not exist for this user."""

    def __init__(self, code: str, detail: str) -> None:
        super().__init__(status.HTTP_422_UNPROCESSABLE_CONTENT, code, detail)
