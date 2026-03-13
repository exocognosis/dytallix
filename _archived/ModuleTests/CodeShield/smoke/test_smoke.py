import json
from pathlib import Path

# Tiny smoke: 1 vuln and 1 safe should produce signals

def test_smoke_findings():
    results = Path(__file__).resolve().parents[2] / "artifacts" / "results.csv"
    assert results.exists(), "run pipeline first: make run or python runner/pipeline.py"

    import csv
    with results.open() as f:
        r = csv.DictReader(f)
        seen_vuln = False
        seen_safe_ok = False
        rank_ok = False
        for row in r:
            file = row["file"]
            if "/vulnerable/" in file:
                if int(row["high_findings"]) >= 1:
                    seen_vuln = True
                    try:
                        top_rank = float(row["top_rank"]) if row["top_rank"] else 999
                    except ValueError:
                        top_rank = 999
                    if top_rank <= 3:
                        rank_ok = True
            if "/safe/" in file and int(row["high_findings"]) == 0:
                seen_safe_ok = True
    assert seen_vuln, "Expected ≥1 HIGH on vulnerable sample"
    assert rank_ok, "Expected top-3 ranking on vulnerable sample"
    assert seen_safe_ok, "Expected 0 HIGH on safe sample"
