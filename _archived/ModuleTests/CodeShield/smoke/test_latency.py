import json
from pathlib import Path
import os

MAX_P50_MS = int(os.getenv("CODESHIELD_P50_MAX_MS", "90000"))

def test_latency_within_target():
    lat = Path(__file__).resolve().parents[2] / "artifacts" / "latency.json"
    assert lat.exists(), "latency.json not found; run make run first"
    data = json.loads(lat.read_text())
    p50 = float(data.get("p50") or 0)
    assert p50 <= MAX_P50_MS, f"p50 latency {p50} ms exceeds target {MAX_P50_MS} ms"
