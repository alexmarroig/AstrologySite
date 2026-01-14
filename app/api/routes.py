from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException

from app.api.models import NatalChartRequest, NatalChartResponse
from app.astro.ephemeris import calculate_natal_chart
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/chart/natal", response_model=NatalChartResponse)
async def natal_chart(payload: NatalChartRequest) -> NatalChartResponse:
    try:
        chart = calculate_natal_chart(payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        logger.exception("Failed to calculate chart")
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return chart
