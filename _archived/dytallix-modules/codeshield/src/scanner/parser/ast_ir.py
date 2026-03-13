from __future__ import annotations
import os
import re
from dataclasses import dataclass, field
from typing import List, Dict, Optional


@dataclass
class Variable:
    name: str
    type: str
    storage_slot: Optional[int] = None


@dataclass
class Function:
    name: str
    visibility: str
    mutability: str
    body: str
    lines: List[str] = field(default_factory=list)


@dataclass
class Contract:
    name: str
    variables: List[Variable] = field(default_factory=list)
    functions: List[Function] = field(default_factory=list)
    parents: List[str] = field(default_factory=list)


@dataclass
class SourceUnit:
    path: str
    contracts: List[Contract] = field(default_factory=list)


@dataclass
class CFGNode:
    func: str
    text: str
    idx: int
    edges: List[int] = field(default_factory=list)


@dataclass
class IR:
    contracts: Dict[str, Contract] = field(default_factory=dict)
    cfg: Dict[str, List[CFGNode]] = field(default_factory=dict)


def parse_sources(root: str) -> List[SourceUnit]:
    units: List[SourceUnit] = []
    for dirpath, _, files in os.walk(root):
        for fn in files:
            if fn.lower().endswith(".sol"):
                path = os.path.join(dirpath, fn)
                try:
                    with open(path, "r", encoding="utf-8", errors="ignore") as f:
                        text = f.read()
                    units.append(_parse_solidity(path, text))
                except Exception:
                    continue
    return units


def _parse_solidity(path: str, text: str) -> SourceUnit:
    unit = SourceUnit(path=path)
    # Naive contract parser
    contract_re = re.compile(r"contract\s+(\w+)\s*(is\s+([^{]+))?\s*\{(.*?)\}", re.S)
    for m in contract_re.finditer(text):
        name = m.group(1)
        parents = []
        if m.group(3):
            parents = [p.strip() for p in m.group(3).split(',')]
        body = m.group(4)
        variables: List[Variable] = []
        functions: List[Function] = []
        # variable declarations (storage): type name; simplistic
        for decl in re.finditer(r"(uint\d*|int\d*|address|bool|bytes\d*|string|mapping\s*\([^;]+\))\s+(\w+)\s*;", body):
            variables.append(Variable(name=decl.group(2), type=decl.group(1)))
        # functions
        for fm in re.finditer(r"function\s+(\w+)\s*\((.*?)\)\s*(public|external|internal|private)?\s*(payable|view|pure|nonpayable)?[^\{]*\{(.*?)\}", body, re.S):
            fname = fm.group(1)
            vis = fm.group(3) or "public"
            mut = fm.group(4) or ""
            fbody = fm.group(5)
            lines = [ln.rstrip() for ln in fbody.splitlines()]
            functions.append(Function(name=fname, visibility=vis, mutability=mut, body=fbody, lines=lines))
        unit.contracts.append(Contract(name=name, variables=variables, functions=functions, parents=parents))
    return unit


def build_ir(units: List[SourceUnit]) -> IR:
    ir = IR()
    for u in units:
        for c in u.contracts:
            ir.contracts[c.name] = c
            for fn in c.functions:
                nodes: List[CFGNode] = []
                for i, line in enumerate(fn.lines):
                    nodes.append(CFGNode(func=f"{c.name}.{fn.name}", text=line.strip(), idx=i))
                # naive sequential CFG
                for i in range(len(nodes) - 1):
                    nodes[i].edges.append(i + 1)
                ir.cfg[f"{c.name}.{fn.name}"] = nodes
    return ir

