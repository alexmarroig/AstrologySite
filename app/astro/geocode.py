from __future__ import annotations

import logging
from functools import lru_cache

from geopy.geocoders import Nominatim

from app.core.config import settings

logger = logging.getLogger(__name__)


@lru_cache(maxsize=128)
def geocode_place(place: str) -> tuple[float, float, str]:
    geolocator = Nominatim(user_agent=settings.geocode_user_agent)
    location = geolocator.geocode(place, language="en")
    if not location:
        raise ValueError("Local não encontrado no geocoding")
    logger.info("Geocode resolved", extra={"place": place, "lat": location.latitude, "lon": location.longitude})
    return location.latitude, location.longitude, location.address
