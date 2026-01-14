from datetime import datetime, timedelta

from app.astro.timezone import local_to_utc


def test_local_to_utc_london() -> None:
    local_dt = datetime(2024, 1, 15, 12, 0, 0)
    utc_dt = local_to_utc(local_dt, "Europe/London")

    assert utc_dt.tzinfo is not None
    assert utc_dt.utcoffset() == timedelta(0)
    assert utc_dt.hour == 12
