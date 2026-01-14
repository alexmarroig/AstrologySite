from __future__ import annotations

import logging
from typing import Any

from fastapi import Depends, FastAPI, Request
from fastapi.responses import JSONResponse

from app.api.routes import router as api_router
from app.core.config import settings
from app.core.logging import configure_logging
from app.utils.rate_limit import rate_limit


configure_logging()
logger = logging.getLogger(__name__)

app = FastAPI(
    title="AstroLumen API",
    version="1.0.0",
    description="Backend para cálculo de mapa natal com Swiss Ephemeris.",
)


@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-App-Name"] = settings.app_name
    return response


@app.exception_handler(ValueError)
async def value_error_handler(_: Request, exc: ValueError):
    return JSONResponse(status_code=400, content={"detail": str(exc)})


@app.exception_handler(RuntimeError)
async def runtime_error_handler(_: Request, exc: RuntimeError):
    return JSONResponse(status_code=500, content={"detail": str(exc)})


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(
    api_router,
    prefix="/v1",
    dependencies=[Depends(rate_limit)] if settings.rate_limit_enabled else None,
)


@app.on_event("startup")
async def on_startup() -> None:
    logger.info("AstroLumen API starting", extra={"mock_mode": settings.mock_mode})


@app.on_event("shutdown")
async def on_shutdown() -> None:
    logger.info("AstroLumen API shutting down")
