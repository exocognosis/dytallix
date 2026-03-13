#!/usr/bin/env python3
import json
import sys
from pathlib import Path
from jsonschema import validate

# Minimal SARIF schema pointer; for full validation, embed or fetch schema
SARIF_VERSION = "2.1.0"

SCHEMA = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "object",
    "properties": {
        "version": {"type": "string"},
        "runs": {"type": "array"}
    },
    "required": ["version", "runs"]
}


def main(paths):
    ok = 0
    for p in paths:
        data = json.loads(Path(p).read_text())
        validate(instance=data, schema=SCHEMA)
        if data.get("version") != SARIF_VERSION:
            print(f"warn: {p} has version {data.get('version')} not {SARIF_VERSION}")
        ok += 1
    print(f"validated {ok} SARIF files")

if __name__ == "__main__":
    main(sys.argv[1:])
