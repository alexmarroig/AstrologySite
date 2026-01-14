from __future__ import annotations

from dataclasses import dataclass

SIGNS = [
    "Áries",
    "Touro",
    "Gêmeos",
    "Câncer",
    "Leão",
    "Virgem",
    "Libra",
    "Escorpião",
    "Sagitário",
    "Capricórnio",
    "Aquário",
    "Peixes",
]


@dataclass(frozen=True)
class SignPosition:
    sign: str
    degree: int
    minute: int


def normalize_degree(degree: float) -> float:
    return degree % 360.0


def to_sign_position(degree: float) -> SignPosition:
    normalized = normalize_degree(degree)
    sign_index = int(normalized // 30)
    degree_in_sign = normalized % 30
    degree_int = int(degree_in_sign)
    minute = int(round((degree_in_sign - degree_int) * 60))
    if minute == 60:
        degree_int += 1
        minute = 0
    if degree_int == 30:
        degree_int = 0
        sign_index = (sign_index + 1) % 12
    return SignPosition(sign=SIGNS[sign_index], degree=degree_int, minute=minute)
