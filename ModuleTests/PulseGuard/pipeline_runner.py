import argparse
import csv
import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

import httpx
from rich.console import Console
from rich.table import Table
import traceback
import random
import uuid

from synthetic_data_gen import SyntheticDataGen
from attack_injector import AttackInjector, AttackConfig
from pathlib import Path

# Optional GAN mode support
try:
    from generator.gan_mode import TimeSeriesGAN  # type: ignore
    from generator.dataset import FEATURES as GAN_FEATURES  # type: ignore
    from generator.dataset import DatasetConfig, build_and_save  # type: ignore
    from generator.utils import FeatureScaler  # type: ignore
    _GAN_OK = True
except Exception:  # pragma: no cover
    _GAN_OK = False

# --- New: optional resource sampling support
try:
    import psutil  # type: ignore
except Exception:  # pragma: no cover - optional dep
    psutil = None  # type: ignore

ART_DIR = Path(__file__).parent / "artifacts"
LOG_DIR = Path(__file__).parent / "logs"
ART_DIR.mkdir(parents=True, exist_ok=True)
LOG_DIR.mkdir(parents=True, exist_ok=True)

console = Console()


def tsdir() -> Path:
    return ART_DIR / datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")


def log_path(ts: Path) -> Path:
    return (LOG_DIR / f"run_{ts.name}.log")


def run_pipeline(
    duration: int,
    rate: int,
    seed: Optional[int],
    ci: bool = False,
    gan_mode: str = "off",
    gan_samples: int = 0,
    gan_seed: Optional[int] = None,
    gan_mix_ratio: float = 0.3,
) -> int:
    api = os.getenv("PULSEGUARD_API", "http://localhost:8090")
    ts = tsdir()
    ts.mkdir(parents=True, exist_ok=True)
    csv_path = ts / "results.csv"
    manifest_path = ts / "manifest.json"

    gen = SyntheticDataGen(seed)
    inj = AttackInjector(seed, AttackConfig(
        prob=float(os.getenv("ATTACK_DEFAULT_PROB", "0.1")),
        severity=float(os.getenv("ATTACK_DEFAULT_SEVERITY", "0.5")),
    ))
    # Deterministic RNG for tx address variety
    rng = random.Random(seed or int(time.time()))
    hexchars = "0123456789abcdef"
    addr_pool = [
        "0x" + "".join(rng.choice(hexchars) for _ in range(40)) for _ in range(80)
    ]

    headers = {"Content-Type": "application/json"}

    sent = 0
    errors: List[str] = []
    end_time: Optional[float] = None if duration <= 0 else (time.time() + duration)

    model_version = os.getenv("PULSEGUARD_MODEL_VERSION", "dev")
    run_id = str(uuid.uuid4())

    # New: initialize resource sampler (optional)
    proc = None
    cpu_prime_done = False
    if psutil is not None:
        try:
            proc = psutil.Process(os.getpid())
            # prime cpu_percent so the next call returns a recent sample
            proc.cpu_percent(None)
            cpu_prime_done = True
        except Exception:
            proc = None

    # Prepare GAN generator if requested
    gan_gen = None
    gan_info = None
    is_gan_enabled = (gan_mode in ("near_normal", "adversarial")) and _GAN_OK
    gan_art = (ART_DIR / "gan")
    if gan_mode in ("near_normal", "adversarial"):
        if not _GAN_OK:
            console.print("[yellow]GAN mode requested but generator not available; proceeding without.")
        else:
            # Ensure scaler exists; if not, build minimal dataset/scaler
            scaler_path = gan_art / "scaler.pkl"
            if not scaler_path.exists():
                build_and_save(DatasetConfig(total_steps=max(512, rate * max(1, duration)), window=64, stride=8))
            # Load GAN
            try:
                gan_gen = TimeSeriesGAN.load_from_artifacts(gan_art, window=64, device=os.getenv("GAN_DEVICE", "cpu"))
                gan_info = {"mode": gan_mode, "samples": gan_samples, "seed": gan_seed}
            except Exception as e:
                console.print(f"[yellow]Failed to load GAN artifacts: {e}; disabling GAN mode.")
                gan_gen = None
                gan_info = None
                is_gan_enabled = False

    with open(csv_path, "w", newline="") as fcsv, open(log_path(ts), "w") as flog:
        writer = csv.DictWriter(fcsv, fieldnames=[
            "request_id","run_id","model_version",
            "ts","block_height","anomaly_score","label","alert","attack_type",
            "block_latency_ms","build_time_ms","mempool_size","mempool_gas_pressure",
            "tx_volume_tps","unique_senders","unique_receivers","avg_tx_value","avg_gas_price",
            "pg_score","pg_reasons","api_latency_ms","status_code","error",
            # New columns for resource usage (if available)
            "cpu_pct","rss_mb",
            # GAN integration
            "is_gan","gan_mode","detector_score",
        ])
        writer.writeheader()

        client = httpx.Client(timeout=2.0)
        try:
            while True:
                if end_time is not None and time.time() >= end_time:
                    break
                use_gan = False
                g_attack: Optional[str] = None
                # Mix GAN sequences according to ratio
                if is_gan_enabled and (rng.random() < gan_mix_ratio):
                    use_gan = True
                if use_gan and gan_gen is not None:
                    seqs = gan_gen.generate_sequences(1, mode=gan_mode, seed=gan_seed)
                    seq = seqs[0]
                    # Map first step of seq to telemetry; optional: cycle through seq across iterations is omitted for simplicity
                    vals = seq[0]
                    # Build Telemetry-like object
                    from synthetic_data_gen import Telemetry  # local import to avoid circular
                    t = Telemetry(
                        ts=time.time(),
                        block_height=gen.block + 1,
                        block_latency_ms=float(vals[GAN_FEATURES.index("block_latency_ms")]),
                        build_time_ms=float(vals[GAN_FEATURES.index("build_time_ms")]),
                        mempool_size=int(vals[GAN_FEATURES.index("mempool_size")]),
                        mempool_gas_pressure=float(vals[GAN_FEATURES.index("mempool_gas_pressure")]),
                        tx_volume_tps=float(vals[GAN_FEATURES.index("tx_volume_tps")]),
                        unique_senders=int(vals[GAN_FEATURES.index("unique_senders")]),
                        unique_receivers=int(vals[GAN_FEATURES.index("unique_receivers")]),
                        avg_tx_value=float(vals[GAN_FEATURES.index("avg_tx_value")]),
                        avg_gas_price=float(vals[GAN_FEATURES.index("avg_gas_price")]),
                    )
                    # Set attack tag for adversarial
                    if gan_mode == "adversarial":
                        g_attack = "gan"
                else:
                    t = gen._normal_op()
                    t, attack = inj.maybe_corrupt(t)
                    g_attack = attack

                # Randomize tx participants; ~10% contract creation (to=None)
                from_addr = rng.choice(addr_pool)
                is_contract_creation = rng.random() < 0.1
                to_addr = None if is_contract_creation else rng.choice([a for a in addr_pool if a != from_addr])

                payload_tx = {
                    "value": float(t.avg_tx_value),
                    "gas": int(t.avg_gas_price),
                    "from": from_addr,
                }
                if to_addr is not None:
                    payload_tx["to"] = to_addr

                payload = {"tx": payload_tx}
                tb = ""
                out = None
                api_latency_ms = None
                status_code: Optional[int] = None
                req_id = str(uuid.uuid4())
                err_flag = 0

                # Optional resource sampling (per-iteration)
                cpu_pct = ""
                rss_mb = ""
                if proc is not None:
                    try:
                        # process CPU percent over last interval; single-shot is fine for trend
                        cpu_pct_val = proc.cpu_percent(None)
                        mem = proc.memory_info()
                        cpu_pct = f"{cpu_pct_val:.2f}"
                        rss_mb = f"{mem.rss/1024/1024:.2f}"
                    except Exception:
                        pass

                try:
                    t0 = time.time()
                    r = client.post(f"{api}/score", headers=headers, json=payload)
                    status_code = r.status_code
                    r.raise_for_status()
                    api_latency_ms = (time.time() - t0) * 1000.0
                    out = r.json()
                    score = float(out.get("score", 0.0))
                    reasons = ",".join(out.get("reasons", []))
                    label = out.get("label", "normal")
                except Exception as e:
                    score = 0.0
                    reasons = f"error:{e}"
                    label = "error"
                    tb = traceback.format_exc()
                    errors.append(tb)
                    err_flag = 1

                writer.writerow({
                    "request_id": req_id,
                    "run_id": run_id,
                    "model_version": model_version,
                    "ts": t.ts,
                    "block_height": t.block_height,
                    "anomaly_score": score,
                    "label": label,
                    "alert": 1 if label == "alert" else 0,
                    "attack_type": (g_attack or "none"),
                    "block_latency_ms": t.block_latency_ms,
                    "build_time_ms": t.build_time_ms,
                    "mempool_size": t.mempool_size,
                    "mempool_gas_pressure": t.mempool_gas_pressure,
                    "tx_volume_tps": t.tx_volume_tps,
                    "unique_senders": t.unique_senders,
                    "unique_receivers": t.unique_receivers,
                    "avg_tx_value": t.avg_tx_value,
                    "avg_gas_price": t.avg_gas_price,
                    "pg_score": score,
                    "pg_reasons": reasons,
                    "api_latency_ms": api_latency_ms if api_latency_ms is not None else "",
                    "status_code": status_code if status_code is not None else "",
                    "error": err_flag,
                    "cpu_pct": cpu_pct,
                    "rss_mb": rss_mb,
                    "is_gan": 1 if (use_gan and gan_gen is not None) else 0,
                    "gan_mode": gan_mode if (use_gan and gan_gen is not None) else "off",
                    "detector_score": score,
                })
                # Make results visible to dashboard quickly
                fcsv.flush()
                try:
                    os.fsync(fcsv.fileno())
                except Exception:
                    pass

                flog.write(json.dumps({"input": payload, "output": out})+"\n")
                if label == "error":
                    flog.write(tb + "\n")
                flog.flush()
                sent += 1
                time.sleep(max(0.0, 1.0/rate))
        except KeyboardInterrupt:
            # graceful shutdown on Ctrl-C in continuous mode
            pass
        finally:
            client.close()

    # manifest for reproducibility
    manifest = {
        "version": 2,
        "generated_at": datetime.utcnow().isoformat()+"Z",
        "duration": duration,
        "rate": rate,
        "seed": seed,
        "sent": sent,
        "run_id": run_id,
        "model_version": model_version,
        "env": {k: v for k, v in os.environ.items() if k.startswith("PULSEGUARD_") or k.startswith("ATTACK_")},
        "artifacts": {
            "csv": str(csv_path.relative_to(ART_DIR.parent)),
            "log": str(log_path(ts).relative_to(ART_DIR.parent)),
        },
        "errors": errors,
    }
    with open(manifest_path, "w") as fm:
        json.dump(manifest, fm, indent=2)

    # generate summary report
    gen_report(ts, csv_path, errors)

    # console table
    if not ci:
        table = Table(title="PulseGuard Test Summary")
        table.add_column("Artifact Dir")
        table.add_column("Sent")
        table.add_column("Errors")
        table.add_row(ts.name, str(sent), str(len(errors)))
        console.print(table)
    return 0


def gen_report(ts: Path, csv_path: Path, errors: List[str]) -> None:
    import pandas as pd
    import numpy as _np
    from sklearn.metrics import precision_recall_curve, average_precision_score, roc_auc_score, roc_curve
    df = pd.read_csv(csv_path)
    # Convert to numeric
    if "api_latency_ms" in df.columns:
        df["api_latency_ms"] = pd.to_numeric(df["api_latency_ms"], errors="coerce")
    if "status_code" in df.columns:
        df["status_code"] = pd.to_numeric(df["status_code"], errors="coerce")
    if "cpu_pct" in df.columns:
        df["cpu_pct"] = pd.to_numeric(df["cpu_pct"], errors="coerce")
    if "rss_mb" in df.columns:
        df["rss_mb"] = pd.to_numeric(df["rss_mb"], errors="coerce")

    # Precompute helpers using numpy arrays to satisfy static analysis
    if "anomaly_score" in df.columns:
        _arr_scores = _np.array(pd.to_numeric(df["anomaly_score"], errors="coerce"), dtype=float)
        _avg_score = float(_np.nanmean(_arr_scores))
    else:
        _avg_score = float("nan")

    # Summary
    summary = {
        "count": int(len(df)),
        "alerts": int(df["alert"].sum()) if "alert" in df.columns else 0,
        "avg_score": _avg_score,
        "p95_api_latency_ms": float(df["api_latency_ms"].dropna().quantile(0.95)) if "api_latency_ms" in df.columns and df["api_latency_ms"].notna().any() else None,
        "p99_api_latency_ms": float(df["api_latency_ms"].dropna().quantile(0.99)) if "api_latency_ms" in df.columns and df["api_latency_ms"].notna().any() else None,
        "attack_rows": int(((df["attack_type"] != "none")).sum()) if "attack_type" in df.columns else 0,
        "normal_rows": int(((df["attack_type"] == "none")).sum()) if "attack_type" in df.columns else 0,
        "error_rows": int(df["error"].sum()) if "error" in df.columns else 0,
        "error_rate": float(df["error"].mean()) if "error" in df.columns else 0.0,
        "avg_cpu_pct": float(df["cpu_pct"].dropna().mean()) if "cpu_pct" in df.columns else None,
        "max_rss_mb": float(df["rss_mb"].dropna().max()) if "rss_mb" in df.columns else None,
    }
    # Detection metrics
    if summary["attack_rows"] > 0 and "alert" in df.columns and "attack_type" in df.columns:
        tpr = float(((df["attack_type"] != "none") & (df["alert"] == 1)).mean())
    else:
        tpr = 0.0
    if summary["normal_rows"] > 0 and "alert" in df.columns and "attack_type" in df.columns:
        fpr = float(((df["attack_type"] == "none") & (df["alert"] == 1)).mean())
    else:
        fpr = 0.0
    precision = 0.0
    if "alert" in df.columns and "attack_type" in df.columns and df["alert"].sum() > 0:
        tp = int(((df["attack_type"] != "none") & (df["alert"] == 1)).sum())
        precision = float(tp / max(1, int(df["alert"].sum())))

    # AUC metrics if scores available
    pr_auc = roc_auc = None
    if "anomaly_score" in df.columns and "attack_type" in df.columns:
        y_true_np = _np.array((df["attack_type"] != "none").astype(int), dtype=int)
        y_score_np = _np.nan_to_num(_arr_scores, nan=0.0) if '"_arr_scores"' in locals() else _np.nan_to_num(_np.array(pd.to_numeric(df["anomaly_score"], errors="coerce"), dtype=float), nan=0.0)
        try:
            pr_auc = float(average_precision_score(y_true_np, y_score_np))
            roc_auc = float(roc_auc_score(y_true_np, y_score_np))
        except Exception:
            pass

    # Per-attack coverage
    per_attack: List[Dict[str, Any]] = []
    if "attack_type" in df.columns and "alert" in df.columns:
        g = df[df["attack_type"] != "none"].groupby("attack_type")
        for atype, sub in g:
            cnt = int(len(sub))
            det_rate = float((sub["alert"] == 1).mean()) if cnt > 0 else 0.0
            per_attack.append({"attack_type": atype, "count": cnt, "detect_rate": det_rate})

    # Pass/Fail evaluation (baseline thresholds, override via env)
    min_tpr = float(os.getenv("PULSEGUARD_PASS_MIN_TPR", "0.7"))
    max_fpr = float(os.getenv("PULSEGUARD_PASS_MAX_FPR", "0.1"))
    min_precision = float(os.getenv("PULSEGUARD_PASS_MIN_PRECISION", "0.6"))
    max_p99_latency = float(os.getenv("PULSEGUARD_PASS_MAX_P99_MS", "250"))
    pass_flags = {
        "tpr_ok": (tpr >= min_tpr),
        "fpr_ok": (fpr <= max_fpr),
        "precision_ok": (precision >= min_precision),
        "p99_latency_ok": (summary["p99_api_latency_ms"] is None) or (summary["p99_api_latency_ms"] <= max_p99_latency),
    }
    overall_pass = all(pass_flags.values())

    rep_path = ts / "summary_report.md"
    with open(rep_path, "w") as fh:
        fh.write("# PulseGuard Test Summary\n\n")
        for k, v in summary.items():
            fh.write(f"- {k}: {v}\n")
        fh.write(f"- true_positive_rate: {tpr}\n")
        fh.write(f"- false_positive_rate: {fpr}\n")
        fh.write(f"- precision: {precision}\n")
        fh.write(f"- pr_auc: {pr_auc}\n")
        fh.write(f"- roc_auc: {roc_auc}\n")
        fh.write("\n## Per-Attack Coverage\n")
        if per_attack:
            for row in per_attack:
                fh.write(f"- {row['attack_type']}: count={row['count']}, detect_rate={row['detect_rate']:.3f}\n")
        else:
            fh.write("- none\n")
        fh.write("\n## Pass/Fail\n")
        fh.write(f"- overall_pass: {overall_pass}\n")
        for k, v in pass_flags.items():
            fh.write(f"- {k}: {v}\n")
        fh.write("\n## Thresholds\n")
        fh.write(f"- min_tpr: {min_tpr}\n- max_fpr: {max_fpr}\n- min_precision: {min_precision}\n- max_p99_latency_ms: {max_p99_latency}\n")
        if errors:
            fh.write("\n## Errors\n")
            for e in errors:
                fh.write(f"- {e}\n")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--duration", type=int, default=30, help="Seconds to run; use 0 or negative to run until interrupted")
    ap.add_argument("--rate", type=int, default=5)
    ap.add_argument("--seed", type=int, default=None)
    ap.add_argument("--ci", action="store_true")
    # GAN flags
    ap.add_argument("--gan-mode", choices=["off", "near_normal", "adversarial"], default="off")
    ap.add_argument("--gan-samples", type=int, default=0)
    ap.add_argument("--gan-seed", type=int, default=None)
    ap.add_argument("--gan-mix-ratio", type=float, default=0.3)
    args = ap.parse_args()
    return run_pipeline(
        args.duration,
        args.rate,
        args.seed,
        args.ci,
        gan_mode=args.gan_mode,
        gan_samples=args.gan_samples,
        gan_seed=args.gan_seed,
        gan_mix_ratio=args.gan_mix_ratio,
    )

if __name__ == "__main__":
    sys.exit(main())
