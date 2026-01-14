from __future__ import annotations

import logging
from functools import lru_cache

from geopy.extra.rate_limiter import RateLimiter
from geopy.geocoders import Nominatim

from app.core.config import settings

logger = logging.getLogger(__name__)


def normalize_place(place: str) -> str:
    return " ".join(place.strip().split())


@lru_cache(maxsize=1)
def get_geolocator() -> Nominatim:
    return Nominatim(user_agent=settings.geocode_user_agent, timeout=settings.geocode_timeout)


@lru_cache(maxsize=1)
def get_geocode_rate_limiter() -> RateLimiter:
    geolocator = get_geolocator()
    return RateLimiter(geolocator.geocode, min_delay_seconds=settings.geocode_min_delay_seconds)


@lru_cache(maxsize=256)
def _geocode_place_cached(normalized_place: str) -> tuple[float, float, str]:
    location = get_geocode_rate_limiter()(normalized_place, language="en")
    if not location:
        raise ValueError("Não foi possível encontrar o local informado.")
    logger.info(
        "Geocode resolved",
        extra={"place": normalized_place, "lat": location.latitude, "lon": location.longitude},
    )
    return location.latitude, location.longitude, location.address


def geocode_place(place: str) -> tuple[float, float, str]:
    normalized_place = normalize_place(place)
    return _geocode_place_cached(normalized_place)
