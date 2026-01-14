from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, time
import os
from typing import Iterable

import swisseph as swe

from app.api.models import (
    AspectEntry,
    ChartMetadata,
    ChartPoints,
    HouseCusp,
    NatalChartRequest,
    NatalChartResponse,
    PlanetPosition,
    SignPosition,
)
from app.astro.aspects import calculate_aspects
from app.astro.geocode import geocode_place
from app.astro.houses import calculate_houses
from app.astro.timezone import local_to_utc, resolve_timezone
from app.core.config import settings
from app.utils.signs import to_sign_position

PLANETS = {
    "Sun": swe.SUN,
    "Moon": swe.MOON,
    "Mercury": swe.MERCURY,
    "Venus": swe.VENUS,
    "Mars": swe.MARS,
    "Jupiter": swe.JUPITER,
    "Saturn": swe.SATURN,
    "Uranus": swe.URANUS,
    "Neptune": swe.NEPTUNE,
    "Pluto": swe.PLUTO,
    "True Node": swe.TRUE_NODE,
    "Chiron": swe.CHIRON,
}

SIDEREAL_MODES = {
    "FAGAN_BRADLEY": swe.SIDM_FAGAN_BRADLEY,
    "LAHIRI": swe.SIDM_LAHIRI,
    "KRISHNAMURTI": swe.SIDM_KRISHNAMURTI,
    "RAMAN": swe.SIDM_RAMAN,
}


@dataclass(frozen=True)
class EphemerisResult:
    longitude: float
    latitude: float
    speed: float


def _setup_ephemeris(zodiac: str, sidereal_mode: str | None) -> list[str]:
    flags: list[str] = []
    if settings.ephemeris_path:
        swe.set_ephe_path(settings.ephemeris_path)
        flags.append(f"EPHE_PATH={settings.ephemeris_path}")
    if zodiac == "sidereal":
        mode = SIDEREAL_MODES.get(sidereal_mode or "LAHIRI")
        if mode is None:
            raise ValueError("sidereal_mode inválido")
        swe.set_sid_mode(mode)
        flags.append(f"SIDEREAL_MODE={sidereal_mode or 'LAHIRI'}")
    else:
        swe.set_sid_mode(swe.SIDM_FAGAN_BRADLEY, 0, 0)
        flags.append("TROPICAL")
    return flags


def _calc_body(jd_ut: float, body: int) -> EphemerisResult:
    data, _ = swe.calc_ut(jd_ut, body)
    return EphemerisResult(longitude=data[0], latitude=data[1], speed=data[3])


def _format_birth_time(value: time | str) -> str:
    if hasattr(value, "strftime"):
        return value.strftime("%H:%M:%S")
    return str(value)


def _format_utc_datetime(value: datetime) -> str:
    return value.replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _normalize_cusps(cusps: list[float]) -> list[float]:
    if len(cusps) == 13:
        normalized = cusps[1:13]
    elif len(cusps) >= 12:
        normalized = cusps[:12]
    else:
        normalized = list(cusps)
        fill_value = normalized[-1] if normalized else 0.0
        normalized.extend([fill_value] * (12 - len(normalized)))
    return normalized


def _mock_response(payload: NatalChartRequest) -> NatalChartResponse:
    sample_points = ChartPoints(
        asc=SignPosition(sign="Áries", degree=10, minute=20),
        mc=SignPosition(sign="Capricórnio", degree=5, minute=12),
    )
    metadata = ChartMetadata(
        full_name=payload.full_name,
        birth_place=payload.birth_place,
        birth_date=str(payload.birth_date),
        birth_time=_format_birth_time(payload.birth_time),
        timezone="UTC",
        utc_datetime=f"{payload.birth_date}T{_format_birth_time(payload.birth_time)}Z",
        latitude=0.0,
        longitude=0.0,
        zodiac=payload.zodiac,
        house_system=payload.house_system,
        sidereal_mode=payload.sidereal_mode,
        ephemeris_flags=["MOCK_MODE"],
    )
    houses = [
        HouseCusp(index=i + 1, longitude=i * 30.0, sign="Áries", degree=0, minute=0)
        for i in range(12)
    ]
    planets = [
        PlanetPosition(
            name="Sun",
            longitude=15.0,
            latitude=0.0,
            speed=1.0,
            sign="Áries",
            degree=15,
            minute=0,
            house=1,
            retrograde=False,
        )
    ]
    aspects = [
        AspectEntry(
            planet1="Sun",
            planet2="Moon",
            type="conjunction",
            exact_angle=0,
            orb=2.0,
            applying=True,
        )
    ]
    summary = ["Sol em Áries", "Ascendente em Áries", "Lua em Touro"]
    return NatalChartResponse(
        metadata=metadata,
        points=sample_points,
        houses=houses,
        planets=planets,
        aspects=aspects,
        summary=summary,
    )


def calculate_natal_chart(payload: NatalChartRequest) -> NatalChartResponse:
    if settings.mock_mode or os.getenv("ASTRO_MOCK_MODE", "").lower() in {"1", "true", "yes"}:
        return _mock_response(payload)

    lat, lon, normalized_place = geocode_place(payload.birth_place)
    timezone_name = resolve_timezone(lat, lon)
    local_dt = datetime.combine(payload.birth_date, payload.birth_time)
    utc_dt = local_to_utc(local_dt, timezone_name)
    jd_ut = swe.julday(
        utc_dt.year,
        utc_dt.month,
        utc_dt.day,
        utc_dt.hour + utc_dt.minute / 60 + utc_dt.second / 3600,
    )

    ephemeris_flags = _setup_ephemeris(payload.zodiac, payload.sidereal_mode)

    cusps, ascmc = calculate_houses(jd_ut, lat, lon, payload.house_system)
    normalized_cusps = _normalize_cusps(cusps)
    asc_position = to_sign_position(ascmc[0])
    mc_position = to_sign_position(ascmc[1])

    houses = []
    for idx, cusp in enumerate(normalized_cusps, start=1):
        sign_pos = to_sign_position(cusp)
        houses.append(
            HouseCusp(
                index=idx,
                longitude=round(cusp, 6),
                sign=sign_pos.sign,
                degree=sign_pos.degree,
                minute=sign_pos.minute,
            )
        )

    planets: list[PlanetPosition] = []
    aspects_input: list[dict[str, float]] = []
    for name, body in PLANETS.items():
        result = _calc_body(jd_ut, body)
        sign_pos = to_sign_position(result.longitude)
        house_number = _resolve_house(result.longitude, normalized_cusps)
        planets.append(
            PlanetPosition(
                name=name,
                longitude=round(result.longitude, 6),
                latitude=round(result.latitude, 6),
                speed=round(result.speed, 6),
                sign=sign_pos.sign,
                degree=sign_pos.degree,
                minute=sign_pos.minute,
                house=house_number,
                retrograde=result.speed < 0,
                dignities=None,
            )
        )
        aspects_input.append(
            {"name": name, "longitude": result.longitude, "speed": result.speed}
        )

    aspects = [
        AspectEntry(
            planet1=item.planet1,
            planet2=item.planet2,
            type=item.type,
            exact_angle=item.exact_angle,
            orb=item.orb,
            applying=item.applying,
        )
        for item in calculate_aspects(aspects_input, payload.aspects.orbs.model_dump())
    ]

    summary = _build_summary(planets, asc_position, mc_position, payload.language)

    metadata = ChartMetadata(
        full_name=payload.full_name,
        birth_place=normalized_place,
        birth_date=str(payload.birth_date),
        birth_time=_format_birth_time(payload.birth_time),
        timezone=timezone_name,
        utc_datetime=_format_utc_datetime(utc_dt),
        latitude=round(lat, 6),
        longitude=round(lon, 6),
        zodiac=payload.zodiac,
        house_system=payload.house_system,
        sidereal_mode=payload.sidereal_mode,
        ephemeris_flags=ephemeris_flags,
    )

    points = ChartPoints(
        asc=SignPosition(
            sign=asc_position.sign,
            degree=asc_position.degree,
            minute=asc_position.minute,
        ),
        mc=SignPosition(
            sign=mc_position.sign,
            degree=mc_position.degree,
            minute=mc_position.minute,
        ),
    )

    return NatalChartResponse(
        metadata=metadata,
        points=points,
        houses=houses,
        planets=planets,
        aspects=aspects,
        summary=summary,
    )


def _resolve_house(longitude: float, cusps: list[float]) -> int:
    normalized = longitude % 360
    for idx in range(12):
        start = cusps[idx] % 360
        end = cusps[(idx + 1) % 12] % 360
        if start < end and start <= normalized < end:
            return idx + 1
        if start > end and (normalized >= start or normalized < end):
            return idx + 1
    return 1


def _build_summary(
    planets: Iterable[PlanetPosition],
    asc: SignPosition,
    mc: SignPosition,
    language: str,
) -> list[str]:
    sun = next((p for p in planets if p.name == "Sun"), None)
    moon = next((p for p in planets if p.name == "Moon"), None)
    summary = []
    if language == "pt-BR":
        if sun:
            summary.append(f"Sol em {sun.sign}")
        if moon:
            summary.append(f"Lua em {moon.sign}")
        summary.append(f"Ascendente em {asc.sign}")
        summary.append(f"MC em {mc.sign}")
    else:
        if sun:
            summary.append(f"Sun in {sun.sign}")
        if moon:
            summary.append(f"Moon in {moon.sign}")
        summary.append(f"Ascendant in {asc.sign}")
        summary.append(f"MC in {mc.sign}")
    return summary
