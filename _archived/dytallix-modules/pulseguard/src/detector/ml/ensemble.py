from __future__ import annotations
from typing import Dict, List, Tuple


def combine_scores(anomaly_scores: List[float], clf_scores: List[float], graph_score: float) -> Tuple[float, List[str]]:
    """Combine anomaly, classifier, and graph scores.
    Returns (score, reasons) with simple weighted ensemble.
    """
    reasons: List[str] = []
    if not anomaly_scores and not clf_scores:
        return graph_score, ["graph_only"]
    a = sum(anomaly_scores) / max(1, len(anomaly_scores)) if anomaly_scores else 0.0
    c = sum(clf_scores) / max(1, len(clf_scores)) if clf_scores else 0.0
    # Weigh anomaly higher initially to suppress noise, but keep classifier influence
    score = 0.5 * a + 0.3 * c + 0.2 * graph_score
    if a > 0.8:
        reasons.append("high_anomaly")
    if c > 0.8:
        reasons.append("high_classifier")
    if graph_score > 0.7:
        reasons.append("risky_graph_structure")
    return max(0.0, min(1.0, score)), reasons

