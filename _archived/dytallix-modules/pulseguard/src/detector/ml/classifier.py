from __future__ import annotations
from typing import Dict, List

_xgb = None
_lgb = None
try:
    import xgboost as _xgb  # type: ignore
except Exception:
    pass
try:
    import lightgbm as _lgb  # type: ignore
except Exception:
    pass


def score_batch(features: List[Dict[str, float]]) -> List[float]:
    """Score features with available GBM libs if present; otherwise simple heuristic.
    In v0.1.0, models are not trained; use a linear projection as baseline.
    """
    scores: List[float] = []
    for f in features:
        # Simple normalized combination: value and gas increase risk slightly; contract creation moderately.
        v = float(f.get("value", 0.0))
        g = float(f.get("gas", 0.0))
        c = float(f.get("is_contract_creation", 0.0))
        # Normalize rough magnitudes
        vn = min(1.0, v / 100.0)
        gn = min(1.0, g / 1_000_000.0)
        s = 0.2 * vn + 0.2 * gn + 0.3 * c + 0.3 * float(f.get("recency", 0.5))
        scores.append(max(0.0, min(1.0, s)))
    return scores

