import os

from fastapi.testclient import TestClient

from app.main import app


def test_natal_chart_mock() -> None:
    os.environ["ASTRO_MOCK_MODE"] = "true"

    client = TestClient(app)
    payload = {
        "full_name": "Ada Lovelace",
        "birth_date": "1815-12-10",
        "birth_time": "10:00",
        "birth_place": "London, UK",
    }
    response = client.post("/v1/chart/natal", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["metadata"]["full_name"] == "Ada Lovelace"
    assert data["metadata"]["ephemeris_flags"] == ["MOCK_MODE"]
