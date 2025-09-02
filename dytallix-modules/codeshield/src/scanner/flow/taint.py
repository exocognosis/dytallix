from __future__ import annotations
import re
from typing import Dict, List
from ..parser.ast_ir import IR


class TaintFinding(Dict):
    pass


def analyze_taint(ir: IR) -> List[TaintFinding]:
    findings: List[TaintFinding] = []
    # very simple data/privilege surface taint heuristics
    src_patterns = [r"msg\.sender", r"tx\.origin", r"msg\.value"]
    sink_patterns = [r"\.call\(", r"transfer\(", r"send\(", r"delegatecall\("]
    for fn_qual, nodes in ir.cfg.items():
        has_source = any(any(re.search(p, n.text) for p in src_patterns) for n in nodes)
        has_sink = any(any(re.search(p, n.text) for p in sink_patterns) for n in nodes)
        if has_source and has_sink:
            # crude: if source appears before sink → potential taint flow
            s_idx = min((n.idx for n in nodes if any(re.search(p, n.text) for p in src_patterns)), default=None)
            k_idx = min((n.idx for n in nodes if any(re.search(p, n.text) for p in sink_patterns)), default=None)
            if s_idx is not None and k_idx is not None and s_idx <= k_idx:
                findings.append({
                    "rule_id": "TAINT-001",
                    "severity": "HIGH",
                    "func": fn_qual,
                    "reason": "Untrusted input may reach sensitive sink",
                })
    return findings

