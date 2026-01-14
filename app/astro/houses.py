from __future__ import annotations

import swisseph as swe


def calculate_houses(jd_ut: float, lat: float, lon: float, house_system: str) -> tuple[list[float], list[float]]:
    cusps, ascmc = swe.houses(jd_ut, lat, lon, house_system)
    return list(cusps), list(ascmc)
