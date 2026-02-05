from __future__ import annotations

from collections import Counter, deque
from dataclasses import dataclass
from datetime import UTC, datetime
import math
import random
import re
from typing import Iterable


@dataclass(frozen=True)
class Alert:
    """Representa um alerta operacional gerado pelos módulos de monitoramento."""

    category: str
    severity: str
    message: str


class PerformanceMonitor:
    """Monitora latência e taxa de erro para detectar gargalos em tempo real."""

    def __init__(self, window_size: int = 50, bottleneck_factor: float = 1.8) -> None:
        if window_size < 5:
            raise ValueError("window_size deve ser >= 5")
        if bottleneck_factor <= 1.0:
            raise ValueError("bottleneck_factor deve ser > 1.0")
        self._latency_window: deque[float] = deque(maxlen=window_size)
        self._error_window: deque[bool] = deque(maxlen=window_size)
        self._bottleneck_factor = bottleneck_factor

    def record(self, latency_ms: float, ok: bool = True) -> list[Alert]:
        if latency_ms < 0:
            raise ValueError("latency_ms não pode ser negativo")

        self._latency_window.append(latency_ms)
        self._error_window.append(ok)

        return self._build_alerts()

    def snapshot(self) -> dict[str, float]:
        if not self._latency_window:
            return {"avg_latency_ms": 0.0, "p95_latency_ms": 0.0, "error_rate": 0.0}

        latencies = sorted(self._latency_window)
        p95_index = min(len(latencies) - 1, math.ceil(len(latencies) * 0.95) - 1)
        errors = sum(1 for success in self._error_window if not success)

        return {
            "avg_latency_ms": sum(latencies) / len(latencies),
            "p95_latency_ms": latencies[p95_index],
            "error_rate": errors / len(self._error_window),
        }

    def _build_alerts(self) -> list[Alert]:
        if len(self._latency_window) < 10:
            return []

        snapshot = self.snapshot()
        alerts: list[Alert] = []
        baseline = sum(list(self._latency_window)[: len(self._latency_window) // 2]) / (
            len(self._latency_window) // 2
        )

        # Se o p95 crescer muito acima do baseline, há indício de gargalo.
        if baseline > 0 and snapshot["p95_latency_ms"] / baseline >= self._bottleneck_factor:
            alerts.append(
                Alert(
                    category="performance",
                    severity="high",
                    message=(
                        "Gargalo detectado: p95 de latência muito acima da baseline. "
                        "Considere revisar consultas e filas assíncronas."
                    ),
                )
            )

        if snapshot["error_rate"] >= 0.2:
            alerts.append(
                Alert(
                    category="reliability",
                    severity="critical",
                    message="Taxa de erro acima de 20%. Investigue serviços dependentes e deploy recente.",
                )
            )

        return alerts


class FailurePredictor:
    """Prevê risco de falha com base em tendência de erros recentes."""

    def __init__(self, alpha: float = 0.35) -> None:
        if not 0 < alpha <= 1:
            raise ValueError("alpha deve estar no intervalo (0, 1]")
        self.alpha = alpha
        self._ewma_error = 0.0
        self._history: list[float] = []

    def observe(self, failed: bool) -> float:
        value = 1.0 if failed else 0.0
        self._ewma_error = self.alpha * value + (1 - self.alpha) * self._ewma_error
        self._history.append(self._ewma_error)
        return self._ewma_error

    def predict_failure_probability(self, horizon: int = 5) -> float:
        if horizon <= 0:
            raise ValueError("horizon deve ser > 0")
        if len(self._history) < 2:
            return self._ewma_error

        trend = self._history[-1] - self._history[-2]
        projection = self._ewma_error + trend * horizon
        return min(1.0, max(0.0, projection))


class AnomalyDetector:
    """Identifica valores anômalos usando desvio absoluto mediano (MAD)."""

    @staticmethod
    def detect(values: Iterable[float], threshold: float = 3.5) -> list[int]:
        series = list(values)
        if not series:
            return []

        median = _median(series)
        deviations = [abs(v - median) for v in series]
        mad = _median(deviations)

        if mad == 0:
            return []

        flagged: list[int] = []
        for index, value in enumerate(series):
            score = 0.6745 * (value - median) / mad
            if abs(score) >= threshold:
                flagged.append(index)
        return flagged


class UserBehaviorSimulator:
    """Simula comportamento de usuário com cadeia de Markov simples."""

    def __init__(self, transition_map: dict[str, dict[str, float]], seed: int = 42) -> None:
        if not transition_map:
            raise ValueError("transition_map não pode ser vazio")
        self.transition_map = transition_map
        self._rng = random.Random(seed)

    def simulate(self, start_state: str, steps: int) -> list[str]:
        if steps < 1:
            raise ValueError("steps deve ser >= 1")
        state = start_state
        path = [state]

        for _ in range(steps - 1):
            state = self._next_state(state)
            path.append(state)

        return path

    def _next_state(self, current_state: str) -> str:
        options = self.transition_map.get(current_state)
        if not options:
            return current_state
        total = sum(options.values())
        if total <= 0:
            return current_state

        roll = self._rng.random() * total
        cumulative = 0.0
        for state, weight in options.items():
            cumulative += weight
            if roll <= cumulative:
                return state
        return current_state


class LogRootCauseAnalyzer:
    """Analisa logs para sugerir causa raiz e possíveis correções."""

    ERROR_PATTERNS = {
        "db_timeout": {
            "regex": re.compile(r"timeout.*(db|database|postgres)", re.IGNORECASE),
            "cause": "Timeout de banco de dados",
            "suggestion": "Revise índices, pool de conexões e queries de maior custo.",
        },
        "auth_error": {
            "regex": re.compile(r"(unauthorized|invalid token|jwt)", re.IGNORECASE),
            "cause": "Falha de autenticação",
            "suggestion": "Verifique expiração de tokens e sincronização de segredo JWT.",
        },
        "memory_pressure": {
            "regex": re.compile(r"(out of memory|memoryerror|heap)", re.IGNORECASE),
            "cause": "Pressão de memória",
            "suggestion": "Ajuste limites de memória e procure vazamentos nos workers.",
        },
    }

    @classmethod
    def analyze(cls, log_lines: Iterable[str]) -> dict[str, object]:
        matches: Counter[str] = Counter()
        for line in log_lines:
            for key, config in cls.ERROR_PATTERNS.items():
                if config["regex"].search(line):
                    matches[key] += 1

        insights: list[dict[str, str | int]] = []
        for key, count in matches.most_common():
            metadata = cls.ERROR_PATTERNS[key]
            insights.append(
                {
                    "type": key,
                    "occurrences": count,
                    "cause": metadata["cause"],
                    "suggestion": metadata["suggestion"],
                }
            )

        return {
            "generated_at": datetime.now(UTC).isoformat(),
            "total_patterns_detected": sum(matches.values()),
            "insights": insights,
        }


def _median(values: list[float]) -> float:
    ordered = sorted(values)
    mid = len(ordered) // 2
    if len(ordered) % 2 == 0:
        return (ordered[mid - 1] + ordered[mid]) / 2
    return ordered[mid]
