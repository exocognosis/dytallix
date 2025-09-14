from pathlib import Path
import json

# Sanity check for parser/AST/CFG/SSA coverage: reports must include meta keys
# when available; in mock mode we just assert the schema keys exist.

def test_schema_keys_present():
    reports = Path(__file__).resolve().parents[2] / "artifacts" / "reports"
    assert reports.exists(), "run pipeline first"
    cnt = 0
    for p in reports.glob("*.json"):
        data = json.loads(p.read_text())
        # Basic schema keys asserted by pipeline's Pydantic model
        assert "scan_id" in data and "contract_name" in data and "findings" in data
        cnt += 1
    assert cnt > 0, "No reports found"
