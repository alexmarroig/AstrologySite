from app.monitoring import (
    AnomalyDetector,
    FailurePredictor,
    LogRootCauseAnalyzer,
    PerformanceMonitor,
    UserBehaviorSimulator,
)


def test_performance_monitor_detects_latency_bottleneck() -> None:
    monitor = PerformanceMonitor(window_size=12, bottleneck_factor=1.6)

    for _ in range(6):
        assert monitor.record(latency_ms=100, ok=True) == []

    alerts = []
    for _ in range(6):
        alerts = monitor.record(latency_ms=300, ok=True)

    assert any(alert.category == "performance" for alert in alerts)


def test_failure_predictor_increases_probability_after_failures() -> None:
    predictor = FailurePredictor(alpha=0.5)
    predictor.observe(False)
    predictor.observe(True)
    predictor.observe(True)

    probability = predictor.predict_failure_probability(horizon=3)

    assert 0.5 <= probability <= 1.0


def test_anomaly_detector_flags_outlier_index() -> None:
    values = [10, 11, 10, 9, 10, 60, 11]
    assert AnomalyDetector.detect(values) == [5]


def test_user_behavior_simulator_generates_deterministic_path() -> None:
    simulator = UserBehaviorSimulator(
        transition_map={
            "home": {"produto": 0.8, "home": 0.2},
            "produto": {"checkout": 1.0},
            "checkout": {"checkout": 1.0},
        },
        seed=1,
    )

    result = simulator.simulate("home", steps=4)

    assert result == ["home", "produto", "checkout", "checkout"]


def test_log_root_cause_analyzer_extracts_insights() -> None:
    report = LogRootCauseAnalyzer.analyze(
        [
            "ERROR timeout in postgres query",
            "WARN invalid token signature",
            "ERROR timeout in DB pool",
        ]
    )

    assert report["total_patterns_detected"] == 3
    assert report["insights"][0]["type"] == "db_timeout"
    assert report["insights"][0]["occurrences"] == 2
