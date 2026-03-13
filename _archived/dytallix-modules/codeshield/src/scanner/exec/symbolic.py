from __future__ import annotations
from typing import List, Dict
from ..parser.ast_ir import IR


class SymFinding(Dict):
    pass


def symbolic_execute(ir: IR, max_steps: int = 200) -> List[SymFinding]:
    """Bounded symbolic executor stub: detect reentrancy-like patterns.
    Heuristic: external call before state write.
    """
    findings: List[SymFinding] = []
    for fn_qual, nodes in ir.cfg.items():
        saw_external = False
        for n in nodes[:max_steps]:
            text = n.text
            if any(k in text for k in [".call(", "delegatecall(", ".send(", ".transfer("]):
                saw_external = True
            if saw_external and any(k in text for k in ["=", "++", "--"]):
                # crude state write detection (assignment or increments)
                findings.append({
                    "rule_id": "EXEC-REENTRANCY",
                    "severity": "HIGH",
                    "func": fn_qual,
                    "reason": "External call before state update (possible reentrancy)",
                })
                break
    return findings

