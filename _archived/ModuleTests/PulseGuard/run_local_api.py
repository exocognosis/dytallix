import os
import subprocess
import sys
from pathlib import Path

# Helper to run PulseGuard's FastAPI locally if module exists
MOD_ROOT = Path(__file__).resolve().parents[2] / "dytallix-modules" / "pulseguard" / "src"
SERVER = MOD_ROOT / "server.py"

if not SERVER.exists():
    print("PulseGuard server.py not found at", SERVER)
    sys.exit(0)

env = os.environ.copy()
# Ensure the parent of `src` is on PYTHONPATH so we can import `src.server`
parent = str(MOD_ROOT.parent)
existing = env.get("PYTHONPATH", "")
env["PYTHONPATH"] = f"{parent}:{existing}" if existing else parent

# Lower the alert threshold by default for test visibility (can be overridden)
env.setdefault("ALERT_THRESHOLD", "0.6")

port = os.getenv("PG_PORT", os.getenv("PORT", "8090"))
cmd = [sys.executable, "-m", "uvicorn", "src.server:app", "--host", "0.0.0.0", "--port", str(port)]
subprocess.run(cmd, cwd=str(MOD_ROOT.parent), env=env)
