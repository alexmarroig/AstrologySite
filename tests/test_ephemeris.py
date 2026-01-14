from datetime import datetime
from zoneinfo import ZoneInfo

from app.astro.ephemeris import _setup_ephemeris
from app.astro.timezone import local_to_utc


def test_tropical_does_not_set_sidereal(monkeypatch) -> None:
    called = {"count": 0}

    def fake_set_sid_mode(*_args, **_kwargs) -> None:
        called["count"] += 1

    monkeypatch.setattr("app.astro.ephemeris.swe.set_sid_mode", fake_set_sid_mode)

    flags = _setup_ephemeris("tropical", None)

    assert called["count"] == 0
    assert "TROPICAL" in flags


def test_local_to_utc_known_timezone() -> None:
    local_dt = datetime(2024, 1, 15, 12, 0, 0)

    utc_dt = local_to_utc(local_dt, "Europe/London")

    assert utc_dt == datetime(2024, 1, 15, 12, 0, 0, tzinfo=ZoneInfo("UTC"))
