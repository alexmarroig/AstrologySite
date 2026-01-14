from __future__ import annotations

import time
from collections import defaultdict, deque
from typing import Deque

from fastapi import HTTPException, Request

from app.core.config import settings

_request_log: dict[str, Deque[float]] = defaultdict(deque)


def rate_limit(request: Request) -> None:
    client_host = request.client.host if request.client else "anonymous"
    now = time.time()
    window = settings.rate_limit_window_seconds
    limit = settings.rate_limit_requests

    entries = _request_log[client_host]
    while entries and now - entries[0] > window:
        entries.popleft()

    if len(entries) >= limit:
        raise HTTPException(status_code=429, detail="Rate limit exceeded")

    entries.append(now)
