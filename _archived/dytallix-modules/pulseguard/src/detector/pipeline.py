from __future__ import annotations
from collections import deque
from typing import Deque, Dict, List


class RollingStatsPipeline:
    def __init__(self, window: int = 200, keys: List[str] | None = None):
        self.window = window
        self.keys = keys or ["value", "gas", "is_external"]
        self._buf: Deque[Dict[str, float]] = deque(maxlen=window)

    def add(self, feats: Dict[str, float]) -> None:
        self._buf.append({k: float(feats.get(k, 0.0)) for k in self.keys})

    def score(self, feats: Dict[str, float]) -> float:
        # If no history, return baseline 0
        if not self._buf:
            return 0.0
        n = len(self._buf)
        means = {k: 0.0 for k in self.keys}
        for row in self._buf:
            for k in self.keys:
                means[k] += row.get(k, 0.0)
        for k in self.keys:
            means[k] /= n
        vars_ = {k: 0.0 for k in self.keys}
        for row in self._buf:
            for k in self.keys:
                d = row.get(k, 0.0) - means[k]
                vars_[k] += d * d
        for k in self.keys:
            vars_[k] = vars_[k] / max(1, n - 1)
        parts: List[float] = []
        for k in self.keys:
            mu = means[k]
            sigma = (vars_[k] ** 0.5) if vars_[k] > 0 else 1.0
            z = abs((feats.get(k, 0.0) - mu) / sigma)
            s = 1.0 - (1.0 / (1.0 + (z)))
            parts.append(max(0.0, min(1.0, s)))
        return sum(parts) / max(1, len(parts))

