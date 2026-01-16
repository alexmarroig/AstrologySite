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

SIGN_METADATA = {
    "Áries": {
        "en": "Aries",
        "element": {"pt-BR": "Fogo", "en": "Fire"},
        "modality": {"pt-BR": "Cardinal", "en": "Cardinal"},
    },
    "Touro": {
        "en": "Taurus",
        "element": {"pt-BR": "Terra", "en": "Earth"},
        "modality": {"pt-BR": "Fixo", "en": "Fixed"},
    },
    "Gêmeos": {
        "en": "Gemini",
        "element": {"pt-BR": "Ar", "en": "Air"},
        "modality": {"pt-BR": "Mutável", "en": "Mutable"},
    },
    "Câncer": {
        "en": "Cancer",
        "element": {"pt-BR": "Água", "en": "Water"},
        "modality": {"pt-BR": "Cardinal", "en": "Cardinal"},
    },
    "Leão": {
        "en": "Leo",
        "element": {"pt-BR": "Fogo", "en": "Fire"},
        "modality": {"pt-BR": "Fixo", "en": "Fixed"},
    },
    "Virgem": {
        "en": "Virgo",
        "element": {"pt-BR": "Terra", "en": "Earth"},
        "modality": {"pt-BR": "Mutável", "en": "Mutable"},
    },
    "Libra": {
        "en": "Libra",
        "element": {"pt-BR": "Ar", "en": "Air"},
        "modality": {"pt-BR": "Cardinal", "en": "Cardinal"},
    },
    "Escorpião": {
        "en": "Scorpio",
        "element": {"pt-BR": "Água", "en": "Water"},
        "modality": {"pt-BR": "Fixo", "en": "Fixed"},
    },
    "Sagitário": {
        "en": "Sagittarius",
        "element": {"pt-BR": "Fogo", "en": "Fire"},
        "modality": {"pt-BR": "Mutável", "en": "Mutable"},
    },
    "Capricórnio": {
        "en": "Capricorn",
        "element": {"pt-BR": "Terra", "en": "Earth"},
        "modality": {"pt-BR": "Cardinal", "en": "Cardinal"},
    },
    "Aquário": {
        "en": "Aquarius",
        "element": {"pt-BR": "Ar", "en": "Air"},
        "modality": {"pt-BR": "Fixo", "en": "Fixed"},
    },
    "Peixes": {
        "en": "Pisces",
        "element": {"pt-BR": "Água", "en": "Water"},
        "modality": {"pt-BR": "Mutável", "en": "Mutable"},
    },
}


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


def describe_sign(sign: str, language: str) -> tuple[str, str, str]:
    meta = SIGN_METADATA.get(sign)
    if not meta:
        return sign, "", ""
    label = meta["en"] if language == "en" else sign
    element = meta["element"]["en"] if language == "en" else meta["element"]["pt-BR"]
    modality = meta["modality"]["en"] if language == "en" else meta["modality"]["pt-BR"]
    return label, element, modality
