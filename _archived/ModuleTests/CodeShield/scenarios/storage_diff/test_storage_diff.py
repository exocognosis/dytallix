import json
from pathlib import Path

# Assumes runner/pipeline produced reports in artifacts/reports/
# Expect a storage diff finding with High severity ranked top-N

def test_storage_diff_flagged():
    reports = Path(__file__).resolve().parents[2] / "artifacts" / "reports"
    assert reports.exists(), "reports dir not found"
    found = False
    for p in reports.glob("*.json"):
        data = json.loads(p.read_text())
        if any(f.get("severity", "").upper()=="HIGH" and "layout" in f.get("message", "").lower() for f in data.get("findings", [])):
            found = True
            break
    assert found, "Expected storage layout drift High finding"
