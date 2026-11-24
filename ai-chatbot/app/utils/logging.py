import logging
import re
import sys


SECRET_PATTERNS = [
    re.compile(r"sk-[a-zA-Z0-9_-]{12,}"),
    re.compile(r"Bearer\s+[a-zA-Z0-9._-]{16,}", re.IGNORECASE),
]


def redact_secrets(text: str) -> str:
    masked = text
    for pat in SECRET_PATTERNS:
        masked = pat.sub("[REDACTED]", masked)
    return masked


class RedactingFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.msg, str):
            record.msg = redact_secrets(record.msg)
        if record.args:
            record.args = tuple(
                redact_secrets(a) if isinstance(a, str) else a for a in record.args
            )
        return True


def configure_logging(level: int = logging.INFO) -> logging.Logger:
    logger = logging.getLogger("abccart.chatbot")
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        formatter = logging.Formatter(
            '{"time":"%(asctime)s","level":"%(levelname)s","logger":"%(name)s","message":"%(message)s"}'
        )
        handler.setFormatter(formatter)
        handler.addFilter(RedactingFilter())
        logger.addHandler(handler)
    logger.setLevel(level)
    return logger


logger = configure_logging()
