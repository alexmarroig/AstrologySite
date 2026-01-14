from __future__ import annotations

from datetime import datetime
from zoneinfo import ZoneInfo

from timezonefinder import TimezoneFinder


def resolve_timezone(lat: float, lon: float) -> str:
    tf = TimezoneFinder()
    tz = tf.timezone_at(lat=lat, lng=lon)
    if not tz:
        raise ValueError("Timezone não encontrada para as coordenadas")
    return tz


def local_to_utc(local_dt: datetime, timezone_name: str) -> datetime:
    tzinfo = ZoneInfo(timezone_name)
    localized = local_dt.replace(tzinfo=tzinfo)
    return localized.astimezone(ZoneInfo("UTC"))
