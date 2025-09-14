from pathlib import Path
import json

# For mock mode, we assert that reentrancy-like samples are detected,
# standing in for symbolic execution reaching dangerous paths.

def test_symexec_like_detection():
    reports = Path(__file__).resolve().parents[2] / "artifacts" / "reports"
    assert reports.exists(), "run pipeline first"
    ok = False
    for p in reports.glob("*.json"):
        data = json.loads(p.read_text())
        if data.get("contract_name","" ).lower().find("reentrancy")!=-1:
            if any(f.get("rule_id")=="REENTRANCY" for f in data.get("findings", [])):
                ok = True
                break
    assert ok, "Expected REENTRANCY finding on reentrancy sample"
