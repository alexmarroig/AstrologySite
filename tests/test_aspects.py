from app.astro.aspects import calculate_aspects


def test_conjunction_applying() -> None:
    bodies = [
        {"name": "Mars", "longitude": 350.0, "speed": 1.0},
        {"name": "Saturn", "longitude": 0.0, "speed": 0.0},
    ]
    orbs = {"conjunction": 15.0}

    results = calculate_aspects(bodies, orbs)

    assert len(results) == 1
    assert results[0].type == "conjunction"
    assert results[0].applying is True


def test_conjunction_separating() -> None:
    bodies = [
        {"name": "Mars", "longitude": 10.0, "speed": 1.0},
        {"name": "Saturn", "longitude": 0.0, "speed": 0.0},
    ]
    orbs = {"conjunction": 15.0}

    results = calculate_aspects(bodies, orbs)

    assert len(results) == 1
    assert results[0].type == "conjunction"
    assert results[0].applying is False
