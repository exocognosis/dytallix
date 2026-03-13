from __future__ import annotations
import re
from typing import Dict, List
from ..parser.ast_ir import IR


class GasHint(Dict):
    pass


def analyze_gas(ir: IR) -> List[GasHint]:
    hints: List[GasHint] = []
    loop_re = re.compile(r"for\s*\(|while\s*\(")
    sload_re = re.compile(r"\w+\s*=\s*\w+\[\w+\]|")
    for fn_qual, nodes in ir.cfg.items():
        text = "\n".join(n.text for n in nodes)
        if loop_re.search(text) and ".transfer(" in text:
            hints.append({
                "rule_id": "GAS-LOOP-EXTCALL",
                "severity": "MEDIUM",
                "func": fn_qual,
                "hint": "External calls in loops can be expensive and unsafe",
                "recommendation": "Batch operations, consider pull over push, avoid external calls in loops",
            })
        # Very naive: repeated patterns of reads/assignments could hint redundant SLOAD
        if text.count("=") > 5:
            hints.append({
                "rule_id": "GAS-REDUNDANT-SLOAD",
                "severity": "LOW",
                "func": fn_qual,
                "hint": "Multiple storage-like assignments; cache state vars locally",
                "recommendation": "Cache storage variables in memory within function scope",
            })
    return hints

