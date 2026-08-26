"""
Application-wide exception hierarchy.

Every exception carries a `user_message` that is safe to show directly in
the UI (no stack traces, no internal URLs, no secrets) and an optional
`retryable` flag, logged alongside the failure for observability (whether a
Retry button makes sense for this kind of failure).
"""


class AppError(Exception):
    """Base class for all application errors with a user-safe message."""

    def __init__(self, user_message: str, *, retryable: bool = False, technical_detail: str = ""):
        super().__init__(technical_detail or user_message)
        self.user_message = user_message
        self.retryable = retryable
        self.technical_detail = technical_detail or user_message


# --- Upload validation -------------------------------------------------------


class ValidationError(AppError):
    """Client sent an unusable file. Never retryable."""

    def __init__(self, user_message: str, technical_detail: str = ""):
        super().__init__(user_message, retryable=False, technical_detail=technical_detail)


# --- Storage ------------------------------------------------------------------


class StorageError(AppError):
    pass


# --- Auth ------------------------------------------------------------------


class AuthError(AppError):
    """Bad credentials, duplicate email, invalid/expired token. Never retryable."""

    def __init__(self, user_message: str, technical_detail: str = ""):
        super().__init__(user_message, retryable=False, technical_detail=technical_detail)


# --- External API errors (Gnani / Groq) ---------------------------------------


class ExternalServiceError(AppError):
    """Base class for third-party API failures."""


class TransientServiceError(ExternalServiceError):
    """Timeouts, 429s, 5xx — safe to retry with backoff."""

    def __init__(self, user_message: str, technical_detail: str = ""):
        super().__init__(user_message, retryable=True, technical_detail=technical_detail)


class PermanentServiceError(ExternalServiceError):
    """Bad auth, malformed request, unsupported input — retrying won't help."""

    def __init__(self, user_message: str, technical_detail: str = ""):
        super().__init__(user_message, retryable=False, technical_detail=technical_detail)
