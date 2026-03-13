from __future__ import annotations
import json
import subprocess
from typing import List, Dict, Any


def scan(root: str, timeout_sec: int = 60) -> List[Dict[str, Any]]:
    findings: List[Dict[str, Any]] = []
    try:
        res = subprocess.run(
            ["slither", root, "--json", "-"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=timeout_sec,
            check=False,
        )
        if res.returncode != 0 and not res.stdout:
            return findings
        data = json.loads(res.stdout)
        for det in data.get("results", {}).get("detectors", []):
            elements = det.get("elements", [])
            if not elements:
                continue
            el = elements[0]
            sm = el.get("source_mapping", {})
            filename = sm.get("filename_relative") or sm.get("filename") or "unknown"
            line = sm.get("lines", [None])[0]
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

