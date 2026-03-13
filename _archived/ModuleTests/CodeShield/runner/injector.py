#!/usr/bin/env python3
import csv
from pathlib import Path
import argparse
import os

MOCK = os.getenv("CODESHIELD_MOCK", "0") in ("1", "true", "True")

if not MOCK:
    import httpx  # type: ignore

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "artifacts"
ERR = ART / "errors.csv"

CASES = (
    ("truncate", lambda b: b[: max(0, len(b)//2)]),
    ("rename_src", lambda b: b),
    ("bad_metadata", lambda b: b + b"\n//@meta:$$$$"),
)

API = os.getenv("CODESHIELD_API", "http://localhost:7081")
TIMEOUT = int(os.getenv("CODESHIELD_TIMEOUT_S", "30"))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--file", required=False, help="Input contract to corrupt")
    args = ap.parse_args()

    targets = []
    if args.file:
        targets = [Path(args.file)]
    else:
        fx = ROOT / "fixtures" / "contracts"
        targets = list((fx / "safe").glob("*.sol"))[:1]

    ART.mkdir(parents=True, exist_ok=True)
    client = None if MOCK else httpx.Client(base_url=API, timeout=TIMEOUT)

    with ERR.open("w", newline="") as fe:
        w = csv.DictWriter(fe, fieldnames=["file","attack","expected","observed","status"]) 
        w.writeheader()
        for p in targets:
            orig = p.read_bytes()
            for name, fn in CASES:
                bad = fn(orig)
                filename = p.name if name != "rename_src" else ("X_" + p.name)
                try:
                    if MOCK:
                        observed = "400"
                        ok = True
                    else:
                        assert client is not None
                        r = client.post("/scan", files={filename: (filename, bad)})
                        observed = str(r.status_code)
                        ok = 400 <= r.status_code < 500
                    expected = "4xx"
                    status = "ok" if ok else "bad"
                except Exception as e:
                    observed = f"exc:{e.__class__.__name__}"
                    expected = "4xx"
                    status = "bad"
                w.writerow({"file": str(p), "attack": name, "expected": expected, "observed": observed, "status": status})
    if client is not None:
        client.close()
    print(f"wrote {ERR}")

if __name__ == "__main__":
    main()
