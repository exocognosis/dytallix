from __future__ import annotations
from typing import Dict, List


def rank_findings(findings: List[Dict]) -> List[Dict]:
    """Rank findings by exploitability using a heuristic ensemble.
    Factors:
      - base severity
      - rule priority (reentrancy/taint > others)
      - presence of multiple corroborating signals
    """
    def sev_score(sev: str) -> float:
        return {"LOW": 0.2, "MEDIUM": 0.5, "HIGH": 0.9}.get(sev.upper(), 0.5)

    # count by func/rule to raise combined signals
    by_func: Dict[str, int] = {}
    for f in findings:
        func = f.get("func") or f.get("location", "global").split(":")[0]
        by_func[func] = by_func.get(func, 0) + 1

    ranked: List[Dict] = []
    for f in findings:
        base = sev_score(f.get("severity", "MEDIUM"))
        rule_id = f.get("rule_id", "")
        bonus = 0.0
        if "REENTRANCY" in rule_id or rule_id in {"SC-004", "TAINT-001"}:
            bonus += 0.3
        if by_func.get(f.get("func") or f.get("location", "global").split(":")[0], 0) > 1:
            bonus += 0.2
        score = max(0.0, min(1.0, base + bonus))
        f2 = dict(f)
        f2["rank_score"] = round(score, 3)
        ranked.append(f2)

    ranked.sort(key=lambda x: (-x["rank_score"], x.get("severity", "")))
    return ranked

