#!/usr/bin/env python3
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "artifacts"
REPORTS = ART / "reports"
LOGS = ART / "logs"

KEEP_LOGS = int(os.getenv("CODESHIELD_RETAIN_LOGS", os.getenv("RETAIN_LOGS_N", "10")))
KEEP_REPORTS = int(os.getenv("CODESHIELD_RETAIN_REPORTS", os.getenv("RETAIN_REPORTS_N", "500")))


def prune_dir(d: Path, pattern: str, keep: int):
    if not d.exists():
        return 0, 0
    files = sorted(d.glob(pattern), key=lambda p: p.stat().st_mtime, reverse=True)
    kept = files[:keep]
    removed = files[keep:]
    for p in removed:
        try:
            p.unlink()
        except Exception:
            pass
    return len(kept), len(removed)


def main():
    ART.mkdir(parents=True, exist_ok=True)
    LOGS.mkdir(parents=True, exist_ok=True)
    REPORTS.mkdir(parents=True, exist_ok=True)

    k_logs, r_logs = prune_dir(LOGS, "run_*.ndjson", KEEP_LOGS)
    # prune stray sarif/json without matching signature retention rules
    k_json, r_json = prune_dir(REPORTS, "*.json", KEEP_REPORTS)
    k_sarif, r_sarif = prune_dir(REPORTS, "*.sarif", KEEP_REPORTS)
    print(f"logs kept={k_logs} removed={r_logs}; reports(json) kept={k_json} removed={r_json}; reports(sarif) kept={k_sarif} removed={r_sarif}")

if __name__ == "__main__":
    main()
