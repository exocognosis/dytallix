#!/usr/bin/env python3
import os
import json
import time
import uuid
import csv
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional

import httpx
from pydantic import BaseModel, ValidationError

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "artifacts"
REPORTS = ART / "reports"
LOGS = ART / "logs"
ART.mkdir(parents=True, exist_ok=True)
REPORTS.mkdir(parents=True, exist_ok=True)
LOGS.mkdir(parents=True, exist_ok=True)

# Load .env if available for reproducible config
try:
    from dotenv import load_dotenv  # type: ignore
    for _env in [ROOT.parent / "config" / ".env", ROOT.parent / ".env", ROOT / ".env"]:
        if _env.exists():
            load_dotenv(_env)
            break
except Exception:
    pass

class Finding(BaseModel):
    rule_id: str
    severity: str
    rank: float
    message: str
    locations: List[Dict[str, Any]] = []

class GasHint(BaseModel):
    function: str
    gas_estimate: Optional[int]

class StorageDiff(BaseModel):
    slot: int
    description: str
    severity: str

class ReportSchema(BaseModel):
    scan_id: str
    contract_name: str
    findings: List[Finding] = []
    gas_hints: List[GasHint] = []
    storage_diff: List[StorageDiff] = []
    meta: Dict[str, Any] = {}
    status: Optional[str] = None

@dataclass
class Config:
    api_url: str
    timeout_s: int
    batch_size: int
    retries: int
    mock: bool


def env_cfg() -> Config:
    return Config(
        api_url=os.getenv("CODESHIELD_API", "http://localhost:7081"),
        timeout_s=int(os.getenv("CODESHIELD_TIMEOUT_S", "60")),
        batch_size=int(os.getenv("CODESHIELD_BATCH_SIZE", "4")),
        retries=int(os.getenv("CODESHIELD_RETRIES", "2")),
        mock=os.getenv("CODESHIELD_MOCK", "0") in ("1", "true", "True")
    )


def post_scan(client: httpx.Client, files: Dict[str, bytes]) -> str:
    r = client.post("/scan", files={k: (k, v) for k, v in files.items()})
    r.raise_for_status()
    data = r.json()
    return data.get("id") or data.get("scan_id")


def get_report(client: httpx.Client, scan_id: str) -> Dict[str, Any]:
    r = client.get(f"/report/{scan_id}")
    r.raise_for_status()
    return r.json()


def load_manifest() -> List[Path]:
    m = ART / "manifest.csv"
    gas_m = ART / "gas_manifest.csv"
    paths: List[Path] = []
    if m.exists():
        with m.open() as f:
            r = csv.DictReader(f)
            for row in r:
                paths.append((ROOT / row["file"]).resolve())
    else:
        fx = ROOT / "fixtures" / "contracts"
        paths += list((fx / "vulnerable").glob("*.sol")) + list((fx / "safe").glob("*.sol")) + list((fx / "upgradeable").glob("*.sol"))
    if gas_m.exists():
        with gas_m.open() as f:
            r = csv.DictReader(f)
            for row in r:
                paths.append((ART / row["file"]).resolve() if not row["file"].startswith("/") else Path(row["file"]))
    return paths


def mock_report_for(file_path: Path) -> Dict[str, Any]:
    name = file_path.stem
    scan_id = str(uuid.uuid4())
    findings: List[Dict[str, Any]] = []
    storage: List[Dict[str, Any]] = []
    gas_hints: List[Dict[str, Any]] = []
    # Vulnerability mapping by filename hints
    if "/vulnerable/" in str(file_path):
        rule = None
        upper = name.upper()
        if "REENTRANCY" in upper:
            rule = "REENTRANCY"
        elif "TXORIGIN" in upper or "TX_ORIGIN" in upper or "ORIGIN" in upper:
            rule = "TX_ORIGIN"
        elif "DELEGATE" in upper:
            rule = "DELEGATECALL"
        elif "UNCHECKED" in upper:
            rule = "UNCHECKED_CALL"
        elif "INTEGER" in upper or "OVERFLOW" in upper or "UNDERFLOW" in upper:
            rule = "INTEGER_ISSUES"
        elif "STORAGE" in upper and "COLLISION" in upper:
            rule = "STORAGE_COLLISION"
        else:
            rule = "GENERIC_VULN"
        findings.append({
            "rule_id": rule,
            "severity": "HIGH",
            "rank": 1.0,
            "message": f"Mock finding {rule}",
            "locations": []
        })
    # Upgradeable layout drift
    if "/upgradeable/" in str(file_path):
        findings.append({
            "rule_id": "STORAGE_LAYOUT",
            "severity": "HIGH",
            "rank": 2.0,
            "message": "Mock layout drift detected",
            "locations": []
        })
        storage.append({
            "slot": 1,
            "description": "Type width changed",
            "severity": "HIGH"
        })
    # Gas hint for synthetic gas contracts
    if name.startswith("Gas_"):
        gas_hints.append({"function": "g", "gas_estimate": 12345})
    rep = {
        "scan_id": scan_id,
        "contract_name": name,
        "findings": findings,
        "gas_hints": gas_hints,
        "storage_diff": storage,
        "meta": {"mock": True},
        "status": "done"
    }
    return rep


def main() -> int:
    cfg = env_cfg()
    client = None if cfg.mock else httpx.Client(base_url=cfg.api_url, timeout=cfg.timeout_s)

    corpus = load_manifest()

    ts = int(time.time())
    results_csv = ART / "results.csv"
    errors_csv = ART / "errors.csv"
    latency_json = ART / "latency.json"
    log_path = LOGS / f"run_{ts}.ndjson"

    latencies: List[float] = []
    ok = 0
    fail = 0

    def write_report(scan_id: str, rep: Dict[str, Any]):
        (REPORTS / f"{scan_id}.json").write_text(json.dumps(rep, indent=2))
        if "sarif" in rep:
            (REPORTS / f"{scan_id}.sarif").write_text(json.dumps(rep["sarif"], indent=2))

    with open(results_csv, "w", newline="") as fr, open(errors_csv, "w", newline="") as fe, open(log_path, "w") as flog:
        rw = csv.DictWriter(fr, fieldnames=["id","file","status","high_findings","top_rank","latency_ms"]) 
        rw.writeheader()
        ew = csv.DictWriter(fe, fieldnames=["id","file","status","error"]) 
        ew.writeheader()
        rows_for_parquet: List[Dict[str, Any]] = []
        for p in corpus:
            sid = str(uuid.uuid4())
            t0 = time.time()
            try:
                if cfg.mock:
                    rep = mock_report_for(p)
                    scan_id = rep["scan_id"]
                else:
                    assert client is not None
                    files = {p.name: p.read_bytes()}
                    scan_id = post_scan(client, files)
                    # simple poll loop
                    rep: Dict[str, Any] = {}
                    for _ in range(max(1, cfg.retries) * 10):
                        time.sleep(0.5)
                        rep = get_report(client, scan_id)
                        if rep.get("status") in {"done", "completed", "ok"}:
                            break
                schema = ReportSchema.model_validate(rep)
                highs = [f for f in schema.findings if f.severity.upper() == "HIGH"]
                top_rank = min((f.rank for f in schema.findings), default=None)
                latency_ms = (time.time() - t0) * 1000.0
                latencies.append(latency_ms)
                rw.writerow({
                    "id": sid,
                    "file": str(p),
                    "status": rep.get("status"),
                    "high_findings": len(highs),
                    "top_rank": top_rank if top_rank is not None else "",
                    "latency_ms": f"{latency_ms:.1f}",
                })
                rows_for_parquet.append({
                    "id": sid,
                    "file": str(p),
                    "status": rep.get("status"),
                    "high_findings": len(highs),
                    "top_rank": top_rank if top_rank is not None else None,
                    "latency_ms": latency_ms,
                })
                write_report(scan_id, rep)
                ok += 1
            except (httpx.HTTPError, ValidationError, KeyError, ValueError, AssertionError) as e:
                fail += 1
                ew.writerow({"id": sid, "file": str(p), "status": "error", "error": str(e)})
            flog.write(json.dumps({"file": str(p), "ok": ok, "fail": fail}) + "\n")

    # latency percentiles
    latencies.sort()
    def pct(q: float):
        if not latencies:
            return None
        idx = min(len(latencies)-1, int(len(latencies)*q))
        return float(latencies[idx])
    latency = {
        "p50": pct(0.5),
        "p90": pct(0.9),
        "p99": pct(0.99),
    }
    latency_json.write_text(json.dumps(latency, indent=2))

    # optional parquet
    try:
        import pandas as pd
        df = pd.DataFrame(rows_for_parquet)
        if not df.empty:
            df.to_parquet(ART / "results.parquet", index=False)
    except Exception:
        pass

    if client is not None:
        client.close()
    return 0 if fail == 0 else 1

if __name__ == "__main__":
    raise SystemExit(main())
