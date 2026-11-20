from fastapi import HTTPException, status


class NotFoundError(HTTPException):
    def __init__(self, resource: str) -> None:
        super().__init__(status.HTTP_404_NOT_FOUND, f"{resource} introuvable.")


class ConflictError(HTTPException):
    def __init__(self, message: str) -> None:
        super().__init__(status.HTTP_409_CONFLICT, message)


class InvalidReferenceError(HTTPException):
    """A body field references a resource that does not exist for this user."""

    def __init__(self, message: str) -> None:
        super().__init__(status.HTTP_422_UNPROCESSABLE_CONTENT, message)
