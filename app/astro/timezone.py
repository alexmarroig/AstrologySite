from __future__ import annotations

from datetime import datetime
from functools import lru_cache

from dateutil.tz import gettz
from timezonefinder import TimezoneFinder

_TIMEZONE_FINDER = TimezoneFinder()


@lru_cache(maxsize=2048)
def resolve_timezone(lat: float, lon: float) -> str:
    tz = _TIMEZONE_FINDER.timezone_at(lat=lat, lng=lon)
    if not tz:
        raise ValueError("Timezone não encontrada para as coordenadas")
    return tz


def local_to_utc(local_dt: datetime, timezone_name: str) -> datetime:
    tzinfo = gettz(timezone_name)
    if tzinfo is None:
        raise ValueError(
            f"Timezone inválida ou não encontrada: {timezone_name}"
        )
    try:
        localized = local_dt.replace(tzinfo=tzinfo)
        utc_tz = gettz("UTC")
        if utc_tz is None:
            raise ValueError("Timezone UTC não encontrada")
        return localized.astimezone(utc_tz)
    except Exception as exc:
        raise ValueError(
            "Falha ao converter data/hora para UTC"
        ) from exc
