from pathlib import Path
import json

# Validate that for known vulnerable samples, the expected rule ids appear
# and that ranking places critical items near the top.

EXPECTED = {
    "Reentrancy": "REENTRANCY",
    "TxOrigin": "TX_ORIGIN",
    "DelegatecallAbuse": "DELEGATECALL",
    "UncheckedCall": "UNCHECKED_CALL",
    "IntegerIssues": "INTEGER_ISSUES",
    "StorageCollision": "STORAGE_COLLISION",
}

def test_expected_rules_present_and_ranked():
    reports = Path(__file__).resolve().parents[2] / "artifacts" / "reports"
    assert reports.exists(), "run pipeline first"
    seen = {k: False for k in EXPECTED}
    ranks = []
    for p in reports.glob("*.json"):
        data = json.loads(p.read_text())
        name = data.get("contract_name", "")
        for key, rule in EXPECTED.items():
            if key in name:
                rule_ids = [f.get("rule_id") for f in data.get("findings", [])]
                if rule in rule_ids:
                    seen[key] = True
                    rvals = [f.get("rank", 999) for f in data.get("findings", []) if f.get("rule_id")==rule]
                    if rvals:
                        ranks.append(min(rvals))
    assert all(seen.values()), f"Missing expected rule ids: {[k for k,v in seen.items() if not v]}"
    assert ranks and min(ranks) <= 3, "Expected top-3 rank for at least one critical finding"
