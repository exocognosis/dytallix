from __future__ import annotations
import os
import re
from typing import Dict, List, Tuple


def _extract_storage_vars(root: str) -> List[Tuple[str, str]]:
    vars_: List[Tuple[str, str]] = []
    for dirpath, _, files in os.walk(root):
        for fn in files:
            if not fn.endswith('.sol'):
                continue
            try:
                with open(os.path.join(dirpath, fn), 'r', encoding='utf-8', errors='ignore') as f:
                    text = f.read()
            except Exception:
                continue
            body = text
            for m in re.finditer(r"(uint\d*|int\d*|address|bool|bytes\d*|string|mapping\s*\([^;]+\))\s+(\w+)\s*;", body):
                vars_.append((m.group(2), m.group(1)))
    return vars_


def storage_diff(old_root: str, new_root: str) -> List[Dict]:
    """Compare storage layout across two source roots.
    Flags variable order / type changes (naive, by appearance order).
    """
    old_vars = _extract_storage_vars(old_root)
    new_vars = _extract_storage_vars(new_root)
    findings: List[Dict] = []
    # Check order change by name list
    old_names = [n for n, _ in old_vars]
    new_names = [n for n, _ in new_vars]
    if old_names and new_names and old_names != new_names:
        findings.append({
            "rule_id": "STOR-DIFF-ORDER",
            "severity": "HIGH",
            "location": "storage",
            "remediation": "Changing storage variable order in upgradeable contracts risks storage corruption",
        })
    # Check type changes
    name_to_type_old = {n: t for n, t in old_vars}
    name_to_type_new = {n: t for n, t in new_vars}
    for n, t in name_to_type_old.items():
        if n in name_to_type_new and name_to_type_new[n] != t:
            findings.append({
                "rule_id": "STOR-DIFF-TYPE",
                "severity": "HIGH",
                "location": f"{n}",
                "remediation": f"Type change {t} -> {name_to_type_new[n]} may break storage layout",
            })
    return findings

