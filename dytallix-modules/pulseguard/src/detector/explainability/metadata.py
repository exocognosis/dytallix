from __future__ import annotations
from typing import Dict, List


def top_feature_reasons(features: List[Dict[str, float]]) -> List[str]:
    if not features:
        return []
    # Aggregate absolute magnitudes
    agg: Dict[str, float] = {}
    for f in features:
        for k, v in f.items():
            agg[k] = agg.get(k, 0.0) + abs(float(v))
    ranked = sorted(agg.items(), key=lambda x: -x[1])
    return [k for k, _ in ranked[:3]]


def subgraph_context(paths: List[List[str]], limit: int = 3) -> List[List[str]]:
    return paths[:limit]

