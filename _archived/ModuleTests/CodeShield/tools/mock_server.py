#!/usr/bin/env python3
from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
from typing import Dict, Any, List
import uuid

app = FastAPI(title="CodeShield Mock Server")

DB: Dict[str, Dict[str, Any]] = {}


def build_report_from_filename(filename: str) -> Dict[str, Any]:
    name = filename.rsplit("/", 1)[-1].rsplit("\\", 1)[-1]
    stem = name.rsplit(".", 1)[0]
    upper = stem.upper()
    findings: List[Dict[str, Any]] = []
    storage: List[Dict[str, Any]] = []
    gas_hints: List[Dict[str, Any]] = []

    # Map based on filename hints
    rule = None
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
    elif "COLLISION" in upper:
        rule = "STORAGE_COLLISION"
    if rule is not None:
        findings.append({
            "rule_id": rule,
            "severity": "HIGH",
            "rank": 1.0,
            "message": f"Mock finding {rule}",
            "locations": []
        })

    # Upgradeable layout drift hint
    if "IMPLV2" in upper or "PROXY" in upper:
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

    # Gas hints for synthetic generators
    if stem.startswith("Gas_"):
        gas_hints.append({"function": "g", "gas_estimate": 12345})

    return {
        "contract_name": stem,
        "findings": findings,
        "gas_hints": gas_hints,
        "storage_diff": storage,
        "meta": {"mock": True, "source": "mock_server"},
        "status": "done",
    }


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/scan")
async def scan(files: List[UploadFile] = File(default=[])):
    if not files:
        return JSONResponse(status_code=400, content={"error": "no files"})
    # For simplicity generate a report for the first file
    fid = str(uuid.uuid4())
    filename = files[0].filename or "unknown.sol"
    rep = build_report_from_filename(filename)
    rep["scan_id"] = fid
    DB[fid] = rep
    return {"id": fid}


@app.get("/report/{scan_id}")
def report(scan_id: str):
    rep = DB.get(scan_id)
    if not rep:
        return JSONResponse(status_code=404, content={"error": "not found"})
    return rep
