import time
from collections import defaultdict, deque
from threading import Lock


class LoginRateLimiter:
    """In-memory sliding window of failed login attempts.

    Good enough for a single backend process (V0.1). With several workers or
    servers, this state should move to a shared store (PostgreSQL or Redis).
    """

    def __init__(self, max_attempts: int, window_seconds: int) -> None:
        self.max_attempts = max_attempts
        self.window_seconds = window_seconds
        self._failures: dict[str, deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def _prune(self, key: str, now: float) -> deque[float]:
        attempts = self._failures[key]
        while attempts and attempts[0] <= now - self.window_seconds:
            attempts.popleft()
        return attempts

    def retry_after(self, *keys: str) -> int:
        """Seconds to wait if any key is blocked, else 0."""
        now = time.monotonic()
        with self._lock:
            wait = 0.0
            for key in keys:
                attempts = self._prune(key, now)
                if len(attempts) >= self.max_attempts:
                    wait = max(wait, attempts[0] + self.window_seconds - now)
            return int(wait) + 1 if wait > 0 else 0

    def record_failure(self, *keys: str) -> None:
        now = time.monotonic()
        with self._lock:
            for key in keys:
                self._prune(key, now).append(now)

    def reset(self, *keys: str) -> None:
        with self._lock:
            for key in keys:
                self._failures.pop(key, None)
