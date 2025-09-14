import os
from pathlib import Path
import json

# In mock mode we rely on pipeline outputs. In real mode, this test
# can be extended to hit /health when available.

def test_reports_exist_and_nonempty():
    reports = Path(__file__).resolve().parents[2] / "artifacts" / "reports"
    assert reports.exists(), "reports dir missing"
    files = list(reports.glob("*.json"))
    assert files, "no reports generated"
    for p in files:
        data = json.loads(p.read_text())
        assert data.get("status") in ("done", "completed", "ok")
