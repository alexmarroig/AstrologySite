from __future__ import annotations

from datetime import date, time
from typing import Literal

from pydantic import BaseModel, Field, field_validator


class AspectOrbs(BaseModel):
    conjunction: float = 8
    opposition: float = 8
    square: float = 6
    trine: float = 6
    sextile: float = 4


class AspectsConfig(BaseModel):
    orbs: AspectOrbs = Field(default_factory=AspectOrbs)


class NatalChartRequest(BaseModel):
    full_name: str = Field(..., min_length=1)
    birth_date: date
    birth_time: time
    birth_place: str = Field(..., min_length=2)
    language: Literal["pt-BR", "en"] = "pt-BR"
    house_system: Literal["P", "K", "W", "O", "R", "C"] = "P"
    zodiac: Literal["tropical", "sidereal"] = "tropical"
    sidereal_mode: str | None = None
    aspects: AspectsConfig = Field(default_factory=AspectsConfig)

    @field_validator("full_name", "birth_place")
    @classmethod
    def strip_whitespace(cls, value: str) -> str:
        return value.strip()


class SignPosition(BaseModel):
    sign: str
    degree: int
    minute: int


class PlanetPosition(BaseModel):
    name: str
    longitude: float
    latitude: float
    speed: float
    sign: str
    degree: int
    minute: int
    house: int
    retrograde: bool
    dignities: list[str] | None = None


class HouseCusp(BaseModel):
    index: int
    longitude: float
    sign: str
    degree: int
    minute: int


class AspectEntry(BaseModel):
    planet1: str
    planet2: str
    type: str
    exact_angle: float
    orb: float
    applying: bool | None


class ChartMetadata(BaseModel):
    full_name: str
    birth_place: str
    birth_date: str
    birth_time: str
    timezone: str
    utc_datetime: str
    latitude: float
    longitude: float
    zodiac: str
    house_system: str
    sidereal_mode: str | None
    ephemeris_flags: list[str]


class ChartPoints(BaseModel):
    asc: SignPosition
    mc: SignPosition
    vertex: SignPosition | None = None
    fortune: SignPosition | None = None


class NatalChartResponse(BaseModel):
    metadata: ChartMetadata
    points: ChartPoints
    houses: list[HouseCusp]
    planets: list[PlanetPosition]
    aspects: list[AspectEntry]
    summary: list[str]
