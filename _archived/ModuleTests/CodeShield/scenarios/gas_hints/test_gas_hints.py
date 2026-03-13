from pathlib import Path
import json

# Validate gas hints present for synthetic Gas_* contracts

def test_gas_hints_present():
    reports = Path(__file__).resolve().parents[2] / "artifacts" / "reports"
    assert reports.exists(), "run pipeline first"
    ok = False
    for p in reports.glob("*.json"):
        data = json.loads(p.read_text())
        if data.get("contract_name", "").startswith("Gas_"):
            if data.get("gas_hints"):
                ok = True
                break
    assert ok, "Expected gas_hints for Gas_* contracts"
