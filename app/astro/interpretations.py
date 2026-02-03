from __future__ import annotations

import logging
from typing import Any, Iterable

import psycopg2
from psycopg2.extras import RealDictCursor

from app.core.config import settings

logger = logging.getLogger(__name__)


def _get_connection():
    try:
        connection = psycopg2.connect(settings.database_url, cursor_factory=RealDictCursor)
        return connection
    except Exception:
        logger.exception("Failed to connect to PostgreSQL")
        return None


def init_interpretations_store() -> None:
    """PostgreSQL tables are initialized via sql/schema.sql or migrations."""
    connection = _get_connection()
    if connection:
        try:
            _seed_interpretations(connection)
        finally:
            connection.close()


def _seed_interpretations(connection) -> None:
    samples: Iterable[dict[str, object]] = [
        {
            "kind": "aspect",
            "planet": "Moon",
            "other_planet": "Mars",
            "aspect": "conjunction",
            "language": "pt-BR",
            "text": "Lua conjunta a Marte intensifica emoções e reações rápidas.",
        },
        {
            "kind": "aspect",
            "planet": "Moon",
            "other_planet": "Mars",
            "aspect": "conjunction",
            "language": "en",
            "text": "Moon conjunct Mars heightens emotions and quick reactions.",
        },
        {
            "kind": "planet_house",
            "planet": "Sun",
            "house": 4,
            "language": "pt-BR",
            "text": "Sol na Casa 4 destaca raízes, família e necessidade de segurança.",
        },
        {
            "kind": "planet_house",
            "planet": "Sun",
            "house": 4,
            "language": "en",
            "text": "Sun in the 4th house emphasizes roots, family, and security needs.",
        },
        {
            "kind": "planet_sign",
            "planet": "Venus",
            "sign": "Libra",
            "language": "pt-BR",
            "text": "Vênus em Libra favorece harmonia, beleza e diplomacia nos vínculos.",
        },
        {
            "kind": "planet_sign",
            "planet": "Venus",
            "sign": "Libra",
            "language": "en",
            "text": "Venus in Libra favors harmony, beauty, and diplomacy in bonds.",
        },
    ]
    for sample in samples:
        kind = sample["kind"]
        if kind == "aspect":
            query = """
                INSERT INTO aspect_interpretations (planet1, planet2, aspect_type, language, interpretation)
                VALUES (%s, %s, %s, %s, %s) ON CONFLICT DO NOTHING
            """
            params = (sample["planet"], sample["other_planet"], sample["aspect"], sample["language"], sample["text"])
        elif kind == "planet_house":
            query = """
                INSERT INTO planet_house_interpretations (planet, house_number, language, interpretation)
                VALUES (%s, %s, %s, %s) ON CONFLICT DO NOTHING
            """
            params = (sample["planet"], sample["house"], sample["language"], sample["text"])
        elif kind == "planet_sign":
            query = """
                INSERT INTO planet_sign_interpretations (planet, sign, language, interpretation)
                VALUES (%s, %s, %s, %s) ON CONFLICT DO NOTHING
            """
            params = (sample["planet"], sample["sign"], sample["language"], sample["text"])

        with connection.cursor() as cursor:
            cursor.execute(query, params)
    connection.commit()


def get_interpretation(
    kind: str,
    *,
    planet: str | None = None,
    sign: str | None = None,
    house: int | None = None,
    aspect: str | None = None,
    other_planet: str | None = None,
    language: str = "pt-BR",
) -> str | None:
    table_map = {
        "planet_sign": ("planet_sign_interpretations", ["planet", "sign"]),
        "planet_house": ("planet_house_interpretations", ["planet", "house_number"]),
        "aspect": ("aspect_interpretations", ["planet1", "planet2", "aspect_type"]),
    }

    if kind not in table_map:
        return None

    table_name, columns = table_map[kind]

    # Map input args to table columns
    arg_map = {
        "planet": planet,
        "sign": sign,
        "house_number": house,
        "planet1": planet,
        "planet2": other_planet,
        "aspect_type": aspect,
    }

    conditions = ["language = %s"]
    params = [language]

    for col in columns:
        val = arg_map.get(col)
        if val is None:
            conditions.append(f"{col} IS NULL")
        else:
            conditions.append(f"{col} = %s")
            params.append(val)

    query = f"SELECT interpretation FROM {table_name} WHERE {' AND '.join(conditions)} LIMIT 1"

    connection = _get_connection()
    if not connection:
        return None

    try:
        with connection.cursor() as cursor:
            cursor.execute(query, params)
            row = cursor.fetchone()
            if row:
                return str(row["interpretation"])

            # Fallback to pt-BR if not found
            if language != "pt-BR":
                params[0] = "pt-BR"
                cursor.execute(query, params)
                row = cursor.fetchone()
                if row:
                    return str(row["interpretation"])
    except Exception:
        logger.exception("Error fetching interpretation from PostgreSQL")
    finally:
        connection.close()

    return None
