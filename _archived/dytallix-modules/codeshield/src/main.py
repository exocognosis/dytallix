import io
import os
import re
import shutil
import tempfile
import zipfile
import uuid
from typing import Dict, List, Any, Optional

from fastapi import FastAPI, UploadFile, File, HTTPException, Request, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# Simple in-memory report store
REPORTS: Dict[str, List[Dict[str, Any]]] = {}

APP_VERSION = "v0.1.0"

PORT = int(os.getenv("PORT", "8080"))
RULES_PATH = os.getenv("RULES_PATH", os.path.join(os.path.dirname(__file__), "scanner", "rules"))
MAX_FILE_MB = int(os.getenv("MAX_FILE_MB", "15"))
TIMEOUT_SEC = int(os.getenv("TIMEOUT_SEC", "60"))
SCAN_DRIVER = os.getenv("SCAN_DRIVER", "basic").lower()

app = FastAPI(title="CodeShield", version=APP_VERSION)


class ScanRequest(BaseModel):
    bytecode_url: Optional[str] = None
    bytecode: Optional[str] = None
    storage_diff_old: Optional[str] = None  # path in zip for old version
    storage_diff_new: Optional[str] = None  # path in zip for new version


def _basic_rules() -> List[Dict[str, Any]]:
    rules_file = os.path.join(RULES_PATH, "basic_rules.json")
    try:
        import json
        with open(rules_file, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data.get("rules", [])
    except Exception:
        # Fallback set if file missing
        return [
            {
                "rule_id": "SC-001",
                "pattern": r"tx\.origin",
                "severity": "HIGH",
                "description": "tx.origin used for auth",
                "remediation": "Use msg.sender for authentication instead of tx.origin.",
            },
            {
                "rule_id": "SC-002",
                "pattern": r"delegatecall\s*\(",
                "severity": "HIGH",
                "description": "delegatecall usage",
                "remediation": "Avoid delegatecall or strictly validate target and context.",
            },
            {
                "rule_id": "SC-003",
                "pattern": r"(selfdestruct|suicide)\s*\(",
                "severity": "MEDIUM",
                "description": "selfdestruct present",
                "remediation": "Remove selfdestruct or gate it with strict owner-only logic.",
            },
            {
                "rule_id": "SC-004",
                "pattern": r"\.call(?!code)\s*\{|call\.value\s*\(",
                "severity": "HIGH",
                "description": "low-level call/value pattern",
                "remediation": "Use checks-effects-interactions and reentrancy guards.",
            },
        ]


def run_basic_scan(root: str) -> List[Dict[str, Any]]:
    """Scan Solidity files beneath root using simple regex-based rules."""
    rules = _basic_rules()
    compiled = [(r["rule_id"], re.compile(r["pattern"]), r["severity"], r.get("remediation", "")) for r in rules]
    findings: List[Dict[str, Any]] = []
    for dirpath, _, filenames in os.walk(root):
        for name in filenames:
            if not name.lower().endswith(".sol"):
                continue
            fpath = os.path.join(dirpath, name)
            try:
                with open(fpath, "r", encoding="utf-8", errors="ignore") as fh:
                    for lineno, line in enumerate(fh, start=1):
                        for rule_id, creg, severity, remediation in compiled:
                            if creg.search(line):
                                findings.append({
                                    "rule_id": rule_id,
                                    "severity": severity,
                                    "location": f"{os.path.relpath(fpath, root)}:{lineno}",
                                    "snippet": line.strip()[:200],
                                    "remediation": remediation,
                                })
            except Exception:
                continue
    return findings


def run_slither_scan(root: str) -> List[Dict[str, Any]]:
    """Optional Slither driver if available on PATH. Returns findings in our schema."""
    import subprocess, json
    findings: List[Dict[str, Any]] = []
    try:
        # Slither JSON output
        res = subprocess.run(
            ["slither", root, "--json", "-"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=TIMEOUT_SEC,
            check=False,
        )
        if res.returncode != 0 and not res.stdout:
            return findings
        data = json.loads(res.stdout)
        for det in data.get("results", {}).get("detectors", []):
            # Normalize
            elements = det.get("elements", [])
            if not elements:
                continue
            el = elements[0]
            source_mapping = el.get("source_mapping", {})
            filename = source_mapping.get("filename_relative") or source_mapping.get("filename") or "unknown"
            line = source_mapping.get("lines", [None])[0]
            findings.append({
                "rule_id": det.get("check", "SLITHER")[:32],
                "severity": det.get("impact", "MEDIUM").upper(),
                "location": f"{filename}:{line if line else 1}",
                "snippet": (el.get("name") or det.get("description", "")).strip()[:200],
                "remediation": det.get("markdown", "See Slither report."),
            })
    except Exception:
        pass
    return findings


def run_scan(root: str) -> List[Dict[str, Any]]:
    if SCAN_DRIVER == "slither":
        findings = run_slither_scan(root)
        # Fallback to basic if Slither yielded none
        if findings:
            return findings
    return run_basic_scan(root)


def run_advanced_pipeline(root: str, stor_old: Optional[str] = None, stor_new: Optional[str] = None) -> Dict[str, Any]:
    from .scanner.parser.ast_ir import parse_sources, build_ir
    from .scanner.flow.taint import analyze_taint
    from .scanner.exec.symbolic import symbolic_execute
    from .scanner.rules.ranking import rank_findings
    from .scanner.gas.regression import analyze_gas
    from .scanner.diff.storage import storage_diff

    units = parse_sources(root)
    ir = build_ir(units)
    base_findings = run_scan(root)
    taints = analyze_taint(ir)
    sym = symbolic_execute(ir)
    gas_hints = analyze_gas(ir)
    findings: List[Dict[str, Any]] = []
    # Normalize to common schema
    for f in base_findings:
        findings.append({
            "rule_id": f.get("rule_id"),
            "severity": f.get("severity", "MEDIUM"),
            "location": f.get("location", f.get("func", "")),
            "snippet": f.get("snippet", f.get("reason", "")),
            "remediation": f.get("remediation", ""),
            "func": f.get("func"),
        })
    for f in taints + sym:
        findings.append({
            "rule_id": f.get("rule_id"),
            "severity": f.get("severity", "HIGH"),
            "location": f.get("func", ""),
            "snippet": f.get("reason", ""),
            "remediation": "Validate inputs and reorder state updates after external calls",
            "func": f.get("func"),
        })
    for g in gas_hints:
        findings.append({
            "rule_id": g.get("rule_id"),
            "severity": g.get("severity", "LOW"),
            "location": g.get("func", ""),
            "snippet": g.get("hint", ""),
            "remediation": g.get("recommendation", ""),
            "func": g.get("func"),
        })

    # Optional storage diff if paths provided
    if stor_old and stor_new:
        old_path = os.path.join(root, stor_old)
        new_path = os.path.join(root, stor_new)
        if os.path.exists(old_path) and os.path.exists(new_path):
            for d in storage_diff(old_path, new_path):
                findings.append({
                    "rule_id": d.get("rule_id"),
                    "severity": d.get("severity", "HIGH"),
                    "location": d.get("location", "storage"),
                    "snippet": "storage layout diff",
                    "remediation": d.get("remediation", "Review storage layout compatibility"),
                })

    ranked = rank_findings(findings)
    sarif = to_sarif(ranked)
    checksum = sha256_hex(json_dumps(ranked).encode("utf-8"))
    return {"findings": ranked, "sarif": sarif, "checksum": checksum}


def to_sarif(findings: List[Dict[str, Any]]) -> Dict[str, Any]:
    return {
        "version": "2.1.0",
        "$schema": "https://json.schemastore.org/sarif-2.1.0.json",
        "runs": [
            {
                "tool": {"driver": {"name": "CodeShield", "version": APP_VERSION}},
                "results": [
                    {
                        "ruleId": f.get("rule_id"),
                        "level": sev_to_level(f.get("severity", "MEDIUM")),
                        "message": {"text": f.get("snippet", "")},
                        "locations": [
                            {
                                "physicalLocation": {
                                    "artifactLocation": {"uri": (f.get("location", "") or "unknown")}
                                }
                            }
                        ],
                        "properties": {"rank_score": f.get("rank_score", 0)}
                    }
                    for f in findings
                ],
            }
        ],
    }


def sev_to_level(sev: str) -> str:
    s = (sev or "").upper()
    return {"HIGH": "error", "MEDIUM": "warning", "LOW": "note"}.get(s, "warning")


def json_dumps(obj: Any) -> str:
    import json
    return json.dumps(obj, separators=(",", ":"), ensure_ascii=False)


def sha256_hex(b: bytes) -> str:
    import hashlib
    return hashlib.sha256(b).hexdigest()


@app.get("/health")
async def health() -> JSONResponse:
    return JSONResponse({"status": "ok", "version": APP_VERSION})


@app.post("/scan")
async def scan_endpoint(request: Request, file: UploadFile | None = File(default=None)) -> JSONResponse:
    # Handle JSON body if present (bytecode_url stub)
    if file is None:
        try:
            data = await request.json()
            _ = data.get("bytecode_url")
            # Stubbed for v0.1.0: no dynamic analysis yet
        except Exception:
            pass

    # For v0.1.0, a zip of sources is required for advanced pipeline
    if file is None:
        raise HTTPException(status_code=400, detail="Missing file upload (zip)")

    # Basic size guard
    content = await file.read()
    size_mb = len(content) / (1024 * 1024)
    if size_mb > MAX_FILE_MB:
        raise HTTPException(status_code=413, detail=f"File exceeds MAX_FILE_MB={MAX_FILE_MB}")

    # Unzip to temp
    scan_id = str(uuid.uuid4())
    tmpdir = tempfile.mkdtemp(prefix=f"codeshield_{scan_id}_")
    try:
        zf = zipfile.ZipFile(io.BytesIO(content))
        zf.extractall(tmpdir)
        stor_old = None
        stor_new = None
        try:
            body = await request.json()
            stor_old = body.get("storage_diff_old")
            stor_new = body.get("storage_diff_new")
        except Exception:
            pass
        report = run_advanced_pipeline(tmpdir, stor_old=stor_old, stor_new=stor_new)
        REPORTS[scan_id] = report
    except zipfile.BadZipFile:
        shutil.rmtree(tmpdir, ignore_errors=True)
        raise HTTPException(status_code=400, detail="Invalid zip archive")
    except Exception as e:
        shutil.rmtree(tmpdir, ignore_errors=True)
        raise HTTPException(status_code=500, detail=f"Scan error: {e}")
    finally:
        # Clean extracted sources to limit disk usage (keep findings in memory)
        shutil.rmtree(tmpdir, ignore_errors=True)

    return JSONResponse({"id": scan_id, "checksum": REPORTS[scan_id]["checksum"]})


@app.get("/report/{scan_id}")
async def report_endpoint(scan_id: str, format: str = Query(default="json", pattern="^(json|sarif)$")) -> JSONResponse:
    if scan_id not in REPORTS:
        raise HTTPException(status_code=404, detail="Scan id not found")
    report = REPORTS[scan_id]
    if format == "sarif":
        return JSONResponse(report["sarif"])
    return JSONResponse(report["findings"])


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)
