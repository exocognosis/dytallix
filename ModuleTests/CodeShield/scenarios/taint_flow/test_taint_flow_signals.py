from pathlib import Path
import json

# Ensure that at least one vulnerable contract triggers a HIGH finding,
# simulating taint/flow engine coverage.

def test_taint_flow_signals_present():
    reports = Path(__file__).resolve().parents[2] / "artifacts" / "reports"
    assert reports.exists(), "run pipeline first"
    highs = 0
    for p in reports.glob("*.json"):
        data = json.loads(p.read_text())
        highs += sum(1 for f in data.get("findings", []) if (f.get("severity","" ).upper()=="HIGH"))
    assert highs > 0, "Expected at least one HIGH finding across reports"
