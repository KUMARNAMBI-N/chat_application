import re
from typing import Tuple

from app.utils.logging import redact_secrets

INJECTION_PATTERNS = [
    re.compile(r"ignore\s+(all\s+)?(previous|prior|above)\s+instructions", re.IGNORECASE),
    re.compile(r"reveal\s+(your\s+)?(system\s+prompt|api\s+key|secret)", re.IGNORECASE),
    re.compile(r"print\s+(the\s+)?(env|environment\s+variables|openai_api_key)", re.IGNORECASE),
    re.compile(r"bypass\s+(auth|authentication|security)", re.IGNORECASE),
    re.compile(r"show\s+(another|other)\s+(user|customer)'?s?\s+orders", re.IGNORECASE),
]


def detect_prompt_injection(message: str) -> Tuple[bool, str]:
    for pat in INJECTION_PATTERNS:
        if pat.search(message):
            return (
                True,
                "I can only help with ABC Cart shopping, products, your own cart, and your own orders. I cannot reveal internal instructions, keys, or other customers' information.",
            )
    return False, ""


def sanitize_output_text(text: str) -> str:
    return redact_secrets(text or "")


def strip_untrusted_markup(text: str, max_len: int = 400) -> str:
    cleaned = re.sub(r"\s+", " ", str(text or "")).strip()
    return cleaned[:max_len]
