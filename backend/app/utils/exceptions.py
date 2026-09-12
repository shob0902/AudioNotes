# The app's exception hierarchy, where every error carries a message that is safe to show a user.
# Base error that pairs a user-safe message with the technical detail meant for the logs.
class AppError(Exception):
    def __init__(self, user_message: str, *, retryable: bool = False, technical_detail: str = ""):
        super().__init__(technical_detail or user_message)
        self.user_message = user_message
        self.retryable = retryable
        self.technical_detail = technical_detail or user_message
# Raised when the client sent an unusable file, which is never worth retrying.
class ValidationError(AppError):
    def __init__(self, user_message: str, technical_detail: str = ""):
        super().__init__(user_message, retryable=False, technical_detail=technical_detail)
# Raised when the object storage bucket cannot be read from or written to.
class StorageError(AppError):
    pass
# Raised for bad credentials or an invalid/expired token, which is never worth retrying.
class AuthError(AppError):
    def __init__(self, user_message: str, technical_detail: str = ""):
        super().__init__(user_message, retryable=False, technical_detail=technical_detail)
# Base class for failures coming back from a third-party API.
class ExternalServiceError(AppError):
    pass
# Raised for timeouts, 429s and 5xx responses, which are safe to retry with backoff.
class TransientServiceError(ExternalServiceError):
    def __init__(self, user_message: str, technical_detail: str = ""):
        super().__init__(user_message, retryable=True, technical_detail=technical_detail)
# Raised for bad auth or unsupported input, where retrying would not help.
class PermanentServiceError(ExternalServiceError):
    def __init__(self, user_message: str, technical_detail: str = ""):
        super().__init__(user_message, retryable=False, technical_detail=technical_detail)
