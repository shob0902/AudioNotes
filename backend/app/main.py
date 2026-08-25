"""
FastAPI application entrypoint.

Kept intentionally thin: app construction, middleware, and global exception
handling only. All business logic lives in routes/services/workers.
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.routes import auth, health, notes
from app.utils.exceptions import AppError
from app.utils.logging import configure_logging, get_logger

configure_logging()
logger = get_logger(__name__)

settings = get_settings()

app = FastAPI(
    title="Audio Notes Platform API",
    description=(
        "Upload audio, get it transcribed via Gnani Speech-to-Text, and "
        "summarized via Groq's LLM API. See /architecture on the frontend "
        "for a full explanation of the processing pipeline."
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError):
    """Ensures every AppError subclass reaches the client as a clean,
    human-readable message — technical detail stays in the server logs."""
    logger.error(
        "unhandled_app_error",
        extra={"path": str(request.url.path), "detail": exc.technical_detail},
    )
    return JSONResponse(status_code=500, content={"detail": exc.user_message})


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """Last-resort handler: never leak a stack trace or internal detail to
    the client."""
    logger.exception("unhandled_exception", extra={"path": str(request.url.path)})
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected error occurred. Please try again."},
    )


app.include_router(health.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(notes.router, prefix="/api")
