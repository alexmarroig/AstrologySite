from __future__ import annotations

import sqlite3
from pathlib import Path
from typing import Iterable

from app.core.config import settings


def _get_connection() -> sqlite3.Connection:
    db_path = Path(settings.interpretations_db_path)
    db_path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(db_path)
    connection.row_factory = sqlite3.Row
    return connection


def init_interpretations_store() -> None:
    with _get_connection() as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS interpretations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                kind TEXT NOT NULL,
                planet TEXT,
                sign TEXT,
                house INTEGER,
                aspect TEXT,
                other_planet TEXT,
                language TEXT NOT NULL,
                text TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_interpretations_kind_planet_sign
                ON interpretations(kind, planet, sign);
            CREATE INDEX IF NOT EXISTS idx_interpretations_kind_planet_other_aspect
                ON interpretations(kind, planet, other_planet, aspect);
            CREATE UNIQUE INDEX IF NOT EXISTS idx_interpretations_unique
                ON interpretations(kind, planet, sign, house, aspect, other_planet, language);
            """
        )
        _seed_interpretations(connection)


def _seed_interpretations(connection: sqlite3.Connection) -> None:
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
    columns = (
        "kind",
        "planet",
        "sign",
        "house",
        "aspect",
        "other_planet",
        "language",
        "text",
    )
    placeholders = ", ".join(f":{column}" for column in columns)
    statement = (
        f"INSERT OR IGNORE INTO interpretations ({', '.join(columns)}) "
        f"VALUES ({placeholders})"
    )
    connection.executemany(statement, samples)


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
    filters = [
        ("planet", planet),
        ("sign", sign),
        ("house", house),
        ("aspect", aspect),
        ("other_planet", other_planet),
    ]
    base_query = "SELECT text FROM interpretations WHERE kind = ? AND language = ?"

    def build_query() -> tuple[str, list[object]]:
        conditions = []
        params: list[object] = [kind, language]
        for column, value in filters:
            if value is None:
                conditions.append(f"{column} IS NULL")
            else:
                conditions.append(f"{column} = ?")
                params.append(value)
        query = f"{base_query} AND {' AND '.join(conditions)}"
        return query, params

    with _get_connection() as connection:
        query, params = build_query()
        row = connection.execute(query, params).fetchone()
        if row:
            return str(row["text"])
        if language != "pt-BR":
            fallback_params = params[:]
            fallback_params[1] = "pt-BR"
            row = connection.execute(query, fallback_params).fetchone()
            if row:
                return str(row["text"])
    return None
