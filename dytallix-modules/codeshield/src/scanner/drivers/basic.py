import os
import re
from typing import List, Dict, Any


def load_rules(rules_path: str) -> List[Dict[str, Any]]:
    rules_file = os.path.join(rules_path, "basic_rules.json")
    try:
        import json
        with open(rules_file, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data.get("rules", [])
    except Exception:
        return []


def scan(root: str, rules: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    compiled = [
        (r.get("rule_id", f"R{i:03d}"), re.compile(r.get("pattern", "")), r.get("severity", "MEDIUM"), r.get("remediation", ""))
        for i, r in enumerate(rules)
        if r.get("pattern")
    ]
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

