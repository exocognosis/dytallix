import os
from pathlib import Path
import subprocess
import sys

THIS = Path(__file__).resolve().parents[1]


def test_smoke_pipeline(tmp_path):
    env = os.environ.copy()
    env["PULSEGUARD_API"] = env.get("PULSEGUARD_API", "http://localhost:8090")
    cmd = [sys.executable, str(THIS / "pipeline_runner.py"), "--duration", "2", "--rate", "2", "--seed", "1", "--ci"]
    res = subprocess.run(cmd, cwd=str(THIS), env=env)
    assert res.returncode == 0
