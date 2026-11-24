import time
from collections import defaultdict, deque
from dataclasses import dataclass
from typing import Deque, Dict, Optional

import jwt
from fastapi import Header, HTTPException, Request, status

from app.config import get_settings


@dataclass
class UserContext:
    user_id: Optional[int]
    email: Optional[str]
    name: Optional[str]
    role: Optional[str]
    token: Optional[str]
    session_id: str

    @property
    def is_authenticated(self) -> bool:
        return self.user_id is not None and bool(self.token)

    @property
    def owner_key(self) -> str:
        return f"user:{self.user_id}" if self.is_authenticated else f"guest:{self.session_id}"


class SlidingWindowRateLimiter:
    def __init__(self) -> None:
        self._hits: Dict[str, Deque[float]] = defaultdict(deque)

    def check(self, key: str, limit: int, window_seconds: int = 60) -> None:
        now = time.monotonic()
        q = self._hits[key]
        while q and now - q[0] > window_seconds:
            q.popleft()
        if len(q) >= limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many chat requests. Please wait a moment and try again.",
            )
        q.append(now)

    def reset(self) -> None:
        self._hits.clear()


rate_limiter = SlidingWindowRateLimiter()


def get_user_context(
    request: Request,
    authorization: Optional[str] = Header(default=None),
    x_session_id: Optional[str] = Header(default=None),
) -> UserContext:
    settings = get_settings()
    session_id = (x_session_id or request.client.host if request.client else "guest")[:64]

    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()
        if token:
            try:
                payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
                return UserContext(
                    user_id=int(payload["id"]),
                    email=payload.get("email"),
                    name=payload.get("name"),
                    role=payload.get("role", "customer"),
                    token=token,
                    session_id=session_id,
                )
            except jwt.ExpiredSignatureError:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Session expired. Please sign in again.",
                )
            except jwt.InvalidTokenError:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid authentication token.",
                )

    return UserContext(
        user_id=None,
        email=None,
        name=None,
        role=None,
        token=None,
        session_id=session_id,
    )


def enforce_rate_limit(request: Request) -> None:
    settings = get_settings()
    client_ip = request.client.host if request.client else "unknown"
    auth = request.headers.get("authorization", "")
    key = f"{client_ip}:{hash(auth) if auth else 'anon'}"
    rate_limiter.check(key, limit=settings.rate_limit_per_minute, window_seconds=60)
