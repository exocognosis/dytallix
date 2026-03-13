from __future__ import annotations

import argparse
import json
import os
import subprocess
import time
from pathlib import Path
from typing import Dict, Tuple

import numpy as np
import pandas as pd


ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "artifacts"
GAN_ART = ART / "gan"


def _latest_run() -> Path:
    runs = sorted([p for p in ART.glob("*") if p.is_dir()], reverse=True)
    if not runs:
        raise RuntimeError("No PulseGuard artifacts found")
    return runs[0]


def _run_pipeline(duration: int, rate: int, gan_mode: str, gan_mix: float, seed: int) -> Path:
    env = os.environ.copy()
    env.setdefault("PULSEGUARD_API", "http://localhost:8090")
    cmd = [
        "python", "pipeline_runner.py",
        "--duration", str(duration),
        "--rate", str(rate),
        "--seed", str(seed),
        "--ci",
        "--gan-mode", gan_mode,
        "--gan-mix-ratio", str(gan_mix),
        "--gan-samples", str(max(10, int(rate * max(1, duration)))),
        "--gan-seed", str(seed),
    ]
    subprocess.run(cmd, cwd=str(ROOT), check=True)
    return _latest_run()


def _eval_run(csv_path: Path) -> Dict:
    df = pd.read_csv(csv_path)
    out: Dict[str, float | int | None] = {}
    # Basic
    total = len(df)
    out["total"] = int(total)

    # Latency metrics
    if "api_latency_ms" in df.columns:
        lat = pd.to_numeric(df["api_latency_ms"], errors="coerce").dropna().astype(float).values
        out["p95_latency_ms"] = float(np.percentile(lat, 95)) if lat.size > 0 else None
    else:
        out["p95_latency_ms"] = None

    # Detection metrics using label/alert and attack_type
    if set(["alert", "attack_type"]).issubset(df.columns):
        ar = df[df["attack_type"] != "none"]
        nr = df[df["attack_type"] == "none"]
        tpr = float((ar["alert"] == 1).mean()) if len(ar) > 0 else 0.0
        fpr = float((nr["alert"] == 1).mean()) if len(nr) > 0 else 0.0
    else:
        tpr = 0.0
        fpr = 0.0
    out["tpr"] = tpr
    out["fpr"] = fpr

    # Score-based snapshot
    if set(["anomaly_score", "attack_type"]).issubset(df.columns):
        s = pd.to_numeric(df["anomaly_score"], errors="coerce").fillna(0.0).astype(float)
        y = (df["attack_type"] != "none").astype(int)
        try:
            from sklearn.metrics import average_precision_score, roc_auc_score  # type: ignore

            out["pr_auc"] = float(average_precision_score(y, s))
            out["roc_auc"] = float(roc_auc_score(y, s))
        except Exception:
            out["pr_auc"] = None
            out["roc_auc"] = None
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--quick", action="store_true", help="Quick mode for CI: tiny runs, no training")
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--rate", type=int, default=5)
    ap.add_argument("--duration", type=int, default=20)
    ap.add_argument("--mix", type=float, default=0.3)
    args = ap.parse_args()

    duration = 5 if args.quick else args.duration
    rate = 2 if args.quick else args.rate

    # Adversarial run
    run_adv = _run_pipeline(duration, rate, "adversarial", args.mix, args.seed)
    adv_metrics = _eval_run(run_adv / "results.csv")
    # Near-normal run
    run_norm = _run_pipeline(duration, rate, "near_normal", args.mix, args.seed)
    norm_metrics = _eval_run(run_norm / "results.csv")

    # Targets
    target_tpr = float(os.getenv("GAN_TARGET_TPR", "0.80"))
    target_fpr = float(os.getenv("GAN_TARGET_FPR", "0.10"))
    target_p95 = float(os.getenv("GAN_TARGET_P95_MS", "100"))

    report = [
        f"# GAN Mode Evaluation\n",
        f"- seed: {args.seed}\n",
        f"- rate: {rate}/s\n",
        f"- duration: {duration}s\n",
        f"\n## Adversarial Run ({run_adv.name})\n",
        f"- tpr: {adv_metrics.get('tpr')} (target \u2265 {target_tpr})\n",
        f"- p95_latency_ms: {adv_metrics.get('p95_latency_ms')} (target \u2264 {target_p95})\n",
        f"\n## Near-Normal Run ({run_norm.name})\n",
        f"- fpr: {norm_metrics.get('fpr')} (target \u2264 {target_fpr})\n",
    ]

    GAN_ART.mkdir(parents=True, exist_ok=True)
    (GAN_ART / "eval_report.md").write_text("".join(report))
    eval_json = {
        "seed": args.seed,
        "rate": rate,
        "duration": duration,
        "targets": {"tpr": target_tpr, "fpr": target_fpr, "p95_ms": target_p95},
        "adversarial": adv_metrics,
        "near_normal": norm_metrics,
        "passed": bool(
            (adv_metrics.get("tpr", 0.0) is not None and float(adv_metrics.get("tpr", 0.0)) >= target_tpr)
            and (norm_metrics.get("fpr", 1.0) is not None and float(norm_metrics.get("fpr", 1.0)) <= target_fpr)
            and (
                adv_metrics.get("p95_latency_ms") is None
                or float(adv_metrics.get("p95_latency_ms")) <= target_p95
            )
        ),
    }
    (GAN_ART / "eval_metrics.json").write_text(json.dumps(eval_json, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

