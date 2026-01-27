from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, time, timedelta
import os
from typing import Callable, Iterable

import swisseph as swe

from app.api.models import (
    AIInterpretationRequest,
    AIInterpretationResponse,
    AspectEntry,
    ChartMetadata,
    ChartPoints,
    HouseCusp,
    LunationRequest,
    LunationResponse,
    NatalChartRequest,
    NatalChartResponse,
    PlanetPosition,
    ProgressionRequest,
    SignPosition,
    SolarReturnRequest,
)
from app.astro.aspects import calculate_aspects
from app.astro.geocode import geocode_place
from app.astro.houses import calculate_houses
from app.astro.interpretations import get_interpretation
from app.astro.timezone import local_to_utc, resolve_timezone
from app.core.config import settings
from app.utils.signs import describe_sign, to_sign_position

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
    ephemeris_path = os.getenv("ASTRO_EPHEMERIS_PATH") or settings.ephemeris_path
    if ephemeris_path:
        swe.set_ephe_path(ephemeris_path)
        flags.append(f"EPHE_PATH={ephemeris_path}")
    else:
        flags.append("DEFAULT_EPHE")
    if zodiac == "sidereal":
        mode_key = (sidereal_mode or "LAHIRI").upper()
        mode = SIDEREAL_MODES.get(mode_key)
        if mode is None:
            raise ValueError(
                "sidereal_mode inválido. Use: FAGAN_BRADLEY, LAHIRI, KRISHNAMURTI ou RAMAN."
            )
        swe.set_sid_mode(mode)
        flags.append(f"SIDEREAL_MODE={mode_key}")
    elif zodiac == "tropical":
        flags.append("TROPICAL")
    return flags


def _calc_body(jd_ut: float, body: int) -> EphemerisResult:
    data, _ = swe.calc_ut(jd_ut, body)
    return EphemerisResult(longitude=data[0], latitude=data[1], speed=data[3])


def _angle_diff(value: float, target: float) -> float:
    return (value - target + 180) % 360 - 180


def _julian_day(value: datetime) -> float:
    return swe.julday(
        value.year,
        value.month,
        value.day,
        value.hour + value.minute / 60 + value.second / 3600,
    )


def _sun_longitude(value: datetime) -> float:
    jd_ut = _julian_day(value)
    return _calc_body(jd_ut, swe.SUN).longitude


def _moon_longitude(value: datetime) -> float:
    jd_ut = _julian_day(value)
    return _calc_body(jd_ut, swe.MOON).longitude


def _find_event_time(
    start: datetime,
    end: datetime,
    angle_fn: Callable[[datetime], float],
    target: float,
) -> datetime:
    step = timedelta(hours=6)
    candidate = start
    best_time = start
    best_delta = abs(_angle_diff(angle_fn(start), target))
    last_value = _angle_diff(angle_fn(start), target)
    while candidate <= end:
        current = _angle_diff(angle_fn(candidate), target)
        if abs(current) < best_delta:
            best_delta = abs(current)
            best_time = candidate
        if current == 0 or (current > 0 > last_value) or (current < 0 < last_value):
            low = candidate - step
            high = candidate
            for _ in range(24):
                mid = low + (high - low) / 2
                mid_value = _angle_diff(angle_fn(mid), target)
                if abs(mid_value) < 1e-4:
                    return mid
                if (mid_value > 0 > _angle_diff(angle_fn(low), target)) or (
                    mid_value < 0 < _angle_diff(angle_fn(low), target)
                ):
                    high = mid
                else:
                    low = mid
            return low + (high - low) / 2
        last_value = current
        candidate += step
    return best_time


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
    summary = _build_summary(
        planets, sample_points.asc, sample_points.mc, payload.language
    )
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
    jd_ut = _julian_day(utc_dt)

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


def calculate_solar_return(payload: SolarReturnRequest) -> NatalChartResponse:
    natal_chart = calculate_natal_chart(payload)
    natal_sun = next(
        (planet for planet in natal_chart.planets if planet.name == "Sun"), None
    )
    if natal_sun is None:
        raise RuntimeError("Não foi possível determinar o Sol natal.")
    lat, lon, normalized_place = geocode_place(payload.birth_place)
    timezone_name = resolve_timezone(lat, lon)
    base_local = datetime(
        payload.target_year,
        payload.birth_date.month,
        payload.birth_date.day,
        payload.birth_time.hour,
        payload.birth_time.minute,
        payload.birth_time.second,
    )
    start_local = base_local - timedelta(days=3)
    end_local = base_local + timedelta(days=3)
    start_utc = local_to_utc(start_local, timezone_name)
    end_utc = local_to_utc(end_local, timezone_name)
    event_utc = _find_event_time(start_utc, end_utc, _sun_longitude, natal_sun.longitude)
    return calculate_natal_chart(
        NatalChartRequest(
            full_name=payload.full_name,
            birth_date=event_utc.date(),
            birth_time=event_utc.time(),
            birth_place=normalized_place,
            language=payload.language,
            house_system=payload.house_system,
            zodiac=payload.zodiac,
            sidereal_mode=payload.sidereal_mode,
            aspects=payload.aspects,
        )
    )


def calculate_progression(payload: ProgressionRequest) -> NatalChartResponse:
    delta_days = (payload.target_date - payload.birth_date).days
    progressed_date = payload.birth_date + timedelta(days=delta_days / 365.2422)
    return calculate_natal_chart(
        NatalChartRequest(
            full_name=payload.full_name,
            birth_date=progressed_date,
            birth_time=payload.birth_time,
            birth_place=payload.birth_place,
            language=payload.language,
            house_system=payload.house_system,
            zodiac=payload.zodiac,
            sidereal_mode=payload.sidereal_mode,
            aspects=payload.aspects,
        )
    )


def calculate_lunation(payload: LunationRequest) -> LunationResponse:
    reference = datetime.combine(payload.reference_date, time(0, 0))
    start = reference
    end = reference + timedelta(days=30)
    target = 0.0 if payload.phase == "new" else 180.0

    def moon_phase(value: datetime) -> float:
        return (_moon_longitude(value) - _sun_longitude(value)) % 360

    event_utc = _find_event_time(start, end, moon_phase, target)
    moon_lon = _moon_longitude(event_utc)
    sun_lon = _sun_longitude(event_utc)
    summary = (
        "Lua Nova"
        if payload.phase == "new" and payload.language == "pt-BR"
        else "Lua Cheia"
        if payload.phase == "full" and payload.language == "pt-BR"
        else "New Moon"
        if payload.phase == "new"
        else "Full Moon"
    )
    return LunationResponse(
        phase=payload.phase,
        utc_datetime=_format_utc_datetime(event_utc),
        longitude_sun=round(sun_lon, 6),
        longitude_moon=round(moon_lon, 6),
        summary=summary,
    )


def build_ai_interpretation(payload: AIInterpretationRequest) -> AIInterpretationResponse:
    chart = calculate_natal_chart(payload)
    sun = next((p for p in chart.planets if p.name == "Sun"), None)
    moon = next((p for p in chart.planets if p.name == "Moon"), None)
    asc = chart.points.asc
    highlights = []
    interpretation = []

    def append_with_fallback(
        stored_text: str | None,
        fallback_text: str | None,
    ) -> None:
        if stored_text:
            interpretation.append(stored_text)
            return
        if settings.ai_fallback_enabled and fallback_text:
            interpretation.append(fallback_text)

    if sun:
        label, element, modality = describe_sign(sun.sign, payload.language)
        highlights.append(
            f"{'Sol' if payload.language == 'pt-BR' else 'Sun'} em {label}"
        )
        append_with_fallback(
            get_interpretation(
                "planet_sign",
                planet="Sun",
                sign=sun.sign,
                language=payload.language,
            ),
            f"{'Identidade' if payload.language == 'pt-BR' else 'Identity'}: "
            f"{label} ({element}, {modality}).",
        )
        append_with_fallback(
            get_interpretation(
                "planet_house",
                planet="Sun",
                house=sun.house,
                language=payload.language,
            ),
            f"{'Propósito' if payload.language == 'pt-BR' else 'Purpose'}: "
            f"{'Casa' if payload.language == 'pt-BR' else 'House'} {sun.house}.",
        )
    if moon:
        label, element, modality = describe_sign(moon.sign, payload.language)
        highlights.append(
            f"{'Lua' if payload.language == 'pt-BR' else 'Moon'} em {label}"
        )
        append_with_fallback(
            get_interpretation(
                "planet_sign",
                planet="Moon",
                sign=moon.sign,
                language=payload.language,
            ),
            f"{'Emoções' if payload.language == 'pt-BR' else 'Emotions'}: "
            f"{label} ({element}, {modality}).",
        )
        append_with_fallback(
            get_interpretation(
                "planet_house",
                planet="Moon",
                house=moon.house,
                language=payload.language,
            ),
            f"{'Necessidades' if payload.language == 'pt-BR' else 'Needs'}: "
            f"{'Casa' if payload.language == 'pt-BR' else 'House'} {moon.house}.",
        )
    asc_label, asc_element, asc_modality = describe_sign(asc.sign, payload.language)
    highlights.append(
        f"{'Ascendente' if payload.language == 'pt-BR' else 'Ascendant'} em {asc_label}"
    )
    append_with_fallback(
        get_interpretation(
            "point_sign",
            planet="Ascendant",
            sign=asc.sign,
            language=payload.language,
        ),
        f"{'Aparência' if payload.language == 'pt-BR' else 'Appearance'}: "
        f"{asc_label} ({asc_element}, {asc_modality}).",
    )

    for aspect in chart.aspects:
        stored_text = get_interpretation(
            "aspect",
            planet=aspect.planet1,
            other_planet=aspect.planet2,
            aspect=aspect.type,
            language=payload.language,
        ) or get_interpretation(
            "aspect",
            planet=aspect.planet2,
            other_planet=aspect.planet1,
            aspect=aspect.type,
            language=payload.language,
        )
        append_with_fallback(stored_text, None)
    focus_hint = {
        "general": "Foco geral" if payload.language == "pt-BR" else "General focus",
        "relationships": "Relacionamentos"
        if payload.language == "pt-BR"
        else "Relationships",
        "career": "Carreira" if payload.language == "pt-BR" else "Career",
    }[payload.focus]
    interpretation.append(focus_hint)
    return AIInterpretationResponse(
        metadata=chart.metadata,
        focus=payload.focus,
        highlights=highlights,
        interpretation=interpretation,
    )


def build_rtf_report(payload: NatalChartRequest) -> str:
    chart = calculate_natal_chart(payload)
    lines = [
        r"{\rtf1\ansi\deff0",
        r"{\b AstroLumen Report}\par",
        f"Nome: {chart.metadata.full_name}\\par",
        f"Local: {chart.metadata.birth_place}\\par",
        f"Data: {chart.metadata.birth_date} {chart.metadata.birth_time}\\par",
        r"\par",
        r"{\b Resumo}\par",
    ]
    for item in chart.summary:
        lines.append(f"- {item}\\par")
    lines.append("}")
    return "".join(lines)


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
    venus = next((p for p in planets if p.name == "Venus"), None)
    mars = next((p for p in planets if p.name == "Mars"), None)
    summary = []
    if language == "pt-BR":
        if sun:
            sun_label, sun_element, sun_modality = describe_sign(sun.sign, language)
            summary.append(f"Sol em {sun_label} ({sun_element}, {sun_modality})")
        if moon:
            moon_label, moon_element, moon_modality = describe_sign(moon.sign, language)
            summary.append(f"Lua em {moon_label} ({moon_element}, {moon_modality})")
        asc_label, asc_element, asc_modality = describe_sign(asc.sign, language)
        summary.append(f"Ascendente em {asc_label} ({asc_element}, {asc_modality})")
        if venus:
            venus_label, _, _ = describe_sign(venus.sign, language)
            summary.append(f"Vênus em {venus_label}")
        if mars:
            mars_label, _, _ = describe_sign(mars.sign, language)
            summary.append(f"Marte em {mars_label}")
        mc_label, _, _ = describe_sign(mc.sign, language)
        summary.append(f"MC em {mc_label}")
    else:
        if sun:
            sun_label, sun_element, sun_modality = describe_sign(sun.sign, language)
            summary.append(f"Sun in {sun_label} ({sun_element}, {sun_modality})")
        if moon:
            moon_label, moon_element, moon_modality = describe_sign(moon.sign, language)
            summary.append(f"Moon in {moon_label} ({moon_element}, {moon_modality})")
        asc_label, asc_element, asc_modality = describe_sign(asc.sign, language)
        summary.append(f"Ascendant in {asc_label} ({asc_element}, {asc_modality})")
        if venus:
            venus_label, _, _ = describe_sign(venus.sign, language)
            summary.append(f"Venus in {venus_label}")
        if mars:
            mars_label, _, _ = describe_sign(mars.sign, language)
            summary.append(f"Mars in {mars_label}")
        mc_label, _, _ = describe_sign(mc.sign, language)
        summary.append(f"MC in {mc_label}")
    return summary
