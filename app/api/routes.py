from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, Response

from app.api.models import (
    AIInterpretationRequest,
    AIInterpretationResponse,
    LunationRequest,
    LunationResponse,
    NatalChartRequest,
    NatalChartResponse,
    ProgressionRequest,
    SolarReturnRequest,
)
from app.astro.ephemeris import (
    build_ai_interpretation,
    build_rtf_report,
    calculate_lunation,
    calculate_natal_chart,
    calculate_progression,
    calculate_solar_return,
)
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


@router.post("/chart/solar-return", response_model=NatalChartResponse)
async def solar_return(payload: SolarReturnRequest) -> NatalChartResponse:
    try:
        chart = calculate_solar_return(payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        logger.exception("Failed to calculate solar return")
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    return chart


@router.post("/chart/progression", response_model=NatalChartResponse)
async def progression(payload: ProgressionRequest) -> NatalChartResponse:
    try:
        chart = calculate_progression(payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        logger.exception("Failed to calculate progression")
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    return chart


@router.post("/lunation", response_model=LunationResponse)
async def lunation(payload: LunationRequest) -> LunationResponse:
    try:
        return calculate_lunation(payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        logger.exception("Failed to calculate lunation")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/report/doc")
async def report_doc(payload: NatalChartRequest) -> Response:
    try:
        content = build_rtf_report(payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        logger.exception("Failed to build report")
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    return Response(
        content=content,
        media_type="application/rtf",
        headers={"Content-Disposition": "attachment; filename=astrolumen-report.doc"},
    )


@router.post("/interpretation/ai", response_model=AIInterpretationResponse)
async def ai_interpretation(
    payload: AIInterpretationRequest,
) -> AIInterpretationResponse:
    try:
        return build_ai_interpretation(payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        logger.exception("Failed to build ai interpretation")
        raise HTTPException(status_code=500, detail=str(exc)) from exc
