from pathlib import Path
import csv

def test_corrupted_inputs_return_4xx():
    err = Path(__file__).resolve().parents[2] / "artifacts" / "errors.csv"
    assert err.exists(), "errors.csv not found; run make run first"
    with err.open() as f:
        r = csv.DictReader(f)
        rows = list(r)
    assert rows, "no negative test rows captured"
    bad = [row for row in rows if row.get("status") != "ok"]
    assert not bad, f"expected all 4xx, found non-ok rows: {bad}"
