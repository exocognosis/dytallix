#!/usr/bin/env python3
import csv
from pathlib import Path
import argparse

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "artifacts"

TEMPLATES = [
    ("loop_small", "function g() external pure returns (uint) { uint s=0; for(uint i=0;i<10;i++){s+=i;} return s; }"),
    ("loop_medium", "function g() external pure returns (uint) { uint s=0; for(uint i=0;i<100;i++){s+=i;} return s; }"),
    ("branching", "function g(uint x) external pure returns (uint) { if(x%2==0){return x;} else {return x+1;} }"),
]

HEADER = """// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
contract GasProfile { $BODY }
"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=str(OUT), help="Artifacts out directory")
    args = ap.parse_args()
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    gas_manifest = out / "gas_manifest.csv"
    with gas_manifest.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["id","pattern","file"])
        w.writeheader()
        for name, body in TEMPLATES:
            src = HEADER.replace("$BODY", body)
            sol = out / f"Gas_{name}.sol"
            sol.write_text(src)
            w.writerow({"id": name, "pattern": name, "file": str(sol.name)})
    print(f"wrote {gas_manifest}")

if __name__ == "__main__":
    main()
