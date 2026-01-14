from __future__ import annotations

from dataclasses import dataclass

ASPECTS = {
    "conjunction": 0,
    "opposition": 180,
    "square": 90,
    "trine": 120,
    "sextile": 60,
}


@dataclass(frozen=True)
class AspectResult:
    planet1: str
    planet2: str
    type: str
    exact_angle: float
    orb: float
    applying: bool | None


def _normalize_angle(angle: float) -> float:
    angle = angle % 360
    if angle > 180:
        angle = 360 - angle
    return angle


def calculate_aspects(
    bodies: list[dict[str, float]],
    orbs: dict[str, float],
) -> list[AspectResult]:
    results: list[AspectResult] = []
    for i, body1 in enumerate(bodies):
        for body2 in bodies[i + 1 :]:
            separation = _normalize_angle(abs(body1["longitude"] - body2["longitude"]))
            for aspect_name, aspect_angle in ASPECTS.items():
                orb_allowed = orbs.get(aspect_name)
                if orb_allowed is None:
                    continue
                orb = abs(separation - aspect_angle)
                if orb <= orb_allowed:
                    relative_speed = body1["speed"] - body2["speed"]
                    applying = None
                    if relative_speed != 0:
                        applying = (separation - aspect_angle) * relative_speed < 0
                    results.append(
                        AspectResult(
                            planet1=body1["name"],
                            planet2=body2["name"],
                            type=aspect_name,
                            exact_angle=aspect_angle,
                            orb=round(orb, 3),
                            applying=applying,
                        )
                    )
    return results
