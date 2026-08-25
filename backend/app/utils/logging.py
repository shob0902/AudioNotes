"""
Structured JSON logging setup shared by the API process and Celery workers.

Usage:
    from app.utils.logging import get_logger
    logger = get_logger(__name__)
    logger.info("note.transcribing", extra={"note_id": str(note.id)})

Never pass API keys / secrets in `extra` — nothing here redacts fields, so
keeping secrets out is the caller's responsibility (services in this codebase
never log raw request headers or API keys).
"""

import logging
import sys

from pythonjsonlogger import jsonlogger

_CONFIGURED = False


def configure_logging(level: str = "INFO") -> None:
    global _CONFIGURED
    if _CONFIGURED:
        return

    handler = logging.StreamHandler(sys.stdout)
    formatter = jsonlogger.JsonFormatter(
        "%(asctime)s %(levelname)s %(name)s %(message)s"
    )
    handler.setFormatter(formatter)

    root = logging.getLogger()
    root.setLevel(level)
    root.handlers = [handler]

    _CONFIGURED = True


def get_logger(name: str) -> logging.Logger:
    configure_logging()
    return logging.getLogger(name)
