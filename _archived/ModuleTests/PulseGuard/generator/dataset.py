from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Tuple

import numpy as np

try:
    from ..synthetic_data_gen import SyntheticDataGen, Telemetry  # type: ignore
except Exception:
    # Fallback when imported with ModuleTests/PulseGuard on sys.path
    from synthetic_data_gen import SyntheticDataGen, Telemetry  # type: ignore
from .utils import FeatureScaler, ensure_dir, save_pickle


FEATURES = [
    "block_latency_ms",
    "build_time_ms",
    "mempool_size",
    "mempool_gas_pressure",
    "tx_volume_tps",
    "unique_senders",
    "unique_receivers",
    "avg_tx_value",
    "avg_gas_price",
]


@dataclass
class DatasetConfig:
    total_steps: int = 4096
    window: int = 64
    stride: int = 8
    seed: int = 42
    out_dir: Path = Path(__file__).resolve().parents[1] / "artifacts" / "gan"


def synth_sequence(cfg: DatasetConfig) -> List[Telemetry]:
    gen = SyntheticDataGen(seed=cfg.seed)
    out: List[Telemetry] = []
    for _ in range(cfg.total_steps):
        out.append(gen._normal_op())
    return out


def to_matrix(seq: List[Telemetry]) -> np.ndarray:
    """Convert a telemetry sequence to a 2D array [T, F]."""
    mat = np.zeros((len(seq), len(FEATURES)), dtype=np.float32)
    for i, t in enumerate(seq):
        vals = [getattr(t, k) for k in FEATURES]
        mat[i, :] = np.asarray(vals, dtype=np.float32)
    return mat


def windowify(arr: np.ndarray, window: int, stride: int) -> np.ndarray:
    """Return windows [N, window, F] using a sliding stride."""
    T = arr.shape[0]
    if T < window:
        return np.empty((0, window, arr.shape[1]), dtype=arr.dtype)
    starts = list(range(0, T - window + 1, max(1, stride)))
    out = np.stack([arr[s : s + window] for s in starts], axis=0)
    return out


def build_dataset(cfg: DatasetConfig) -> Tuple[np.ndarray, np.ndarray, np.ndarray, FeatureScaler]:
    """Build train/val/test as 3D arrays [N, window, F] and return scaler used.
    Scaler is fit on the entire stream (feature-wise) before windowing to preserve temporal structure.
    """
    seq = synth_sequence(cfg)
    mat = to_matrix(seq)
    scaler = FeatureScaler()
    scaler.fit(mat)
    mat_n = scaler.transform(mat)

    # Windowed dataset
    X = windowify(mat_n, cfg.window, cfg.stride)

    # Split 70/15/15
    n = X.shape[0]
    n_train = int(0.7 * n)
    n_val = int(0.15 * n)
    X_train = X[:n_train]
    X_val = X[n_train : n_train + n_val]
    X_test = X[n_train + n_val :]
    return X_train, X_val, X_test, scaler


def save_scaler(scaler: FeatureScaler, out_dir: Path | None = None) -> Path:
    out_dir = out_dir or (Path(__file__).resolve().parents[1] / "artifacts" / "gan")
    ensure_dir(out_dir)
    p = out_dir / "scaler.pkl"
    scaler.save(p)
    return p


def build_and_save(cfg: DatasetConfig) -> Dict[str, str]:
    X_train, X_val, X_test, scaler = build_dataset(cfg)
    out = cfg.out_dir
    ensure_dir(out)
    # Save as numpy compressed
    np.savez_compressed(out / "dataset.npz", X_train=X_train, X_val=X_val, X_test=X_test)
    spath = save_scaler(scaler, out)
    return {
        "dataset": str((out / "dataset.npz").relative_to(Path(__file__).resolve().parents[2])),
        "scaler": str(spath.relative_to(Path(__file__).resolve().parents[2])),
    }
