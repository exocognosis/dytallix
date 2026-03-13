#!/usr/bin/env python3
import csv
import os
from pathlib import Path
from typing import Dict, List
import itertools
import hashlib
import random
import argparse

ROOT = Path(__file__).resolve().parents[1]
FIX = ROOT / "fixtures" / "contracts"
OUT = ROOT / "artifacts"
CORPUS_OUT = OUT / "corpus"

VULN = FIX / "vulnerable"
SAFE = FIX / "safe"
UPGR = FIX / "upgradeable"

PRAGMAS = ["^0.8.17", "^0.8.19", ">=0.8.20 <0.9.0"]
INH_DEPTHS = [0, 1, 2]

# Deterministic seed supports overrides via TEST_SEED
try:
    _seed = int(os.getenv("TEST_SEED", "1337"))
except ValueError:
    _seed = 1337
random.seed(_seed)


def _variants(src: Path) -> List[Dict[str, str]]:
    base = src.read_text()
    rows: List[Dict[str, str]] = []
    category = src.parent.name
    for pragma, depth in itertools.product(PRAGMAS, INH_DEPTHS):
        code = base
        # inject/replace pragma line
        if "pragma solidity" in code:
            code = code.replace("pragma solidity", f"pragma solidity {pragma};\n// generated variant\n// pragma solidity")
        else:
            code = f"// generated variant\npragma solidity {pragma};\n" + code
        if depth > 0:
            code += "\n" + "\n".join([f"contract B{i} {{ function f{i}() external pure {{}} }}" for i in range(depth)])
            code += f"\ncontract Derived is B{depth-1} {{ }}\n"
        h = hashlib.sha1(f"{src.name}:{pragma}:{depth}".encode()).hexdigest()[:10]
        rel = src.relative_to(FIX)
        out_dir = CORPUS_OUT / category
        out_dir.mkdir(parents=True, exist_ok=True)
        out_name = f"{src.stem}__{h}.sol"
        out_path = out_dir / out_name
        out_path.write_text(code)
        rows.append({
            "id": f"{rel}:{h}",
            "category": category,
            "file": str(out_path.relative_to(ROOT)),
            "pragma": pragma,
            "inheritance_depth": str(depth),
        })
    return rows


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=str(OUT), help="Artifacts out directory")
    args = ap.parse_args()
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    manifest = out / "manifest.csv"

    rows: List[Dict[str, str]] = []
    for d in [VULN, SAFE, UPGR]:
        if d.exists():
            for p in d.glob("*.sol"):
                rows += _variants(p)
    with manifest.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["id","category","file","pragma","inheritance_depth"]) 
        w.writeheader()
        for r in rows:
            w.writerow(r)
    print(f"wrote {manifest} with {len(rows)} rows; corpus in {CORPUS_OUT}")

if __name__ == "__main__":
    main()
