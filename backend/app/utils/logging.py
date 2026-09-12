# Structured JSON logging shared by the request handlers and the background tasks.
import logging
import sys
from pythonjsonlogger import jsonlogger
_CONFIGURED = False
# Points the root logger at stdout with a JSON formatter, and only ever does so once.
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
# Returns a named logger, making sure logging has been configured first.
def get_logger(name: str) -> logging.Logger:
    configure_logging()
    return logging.getLogger(name)
