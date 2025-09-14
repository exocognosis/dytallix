import json
import os
import random
from dataclasses import asdict, is_dataclass
from pathlib import Path
from typing import Any, Dict, Optional

import numpy as np


def set_global_seed(seed: Optional[int] = None) -> int:
    """Seed Python, NumPy, and optionally torch if available. Returns the seed used.
    If seed is None, derive a deterministic seed from env or a default.
    """
    if seed is None:
        # Allow CI to fix via env; else use a fixed default for reproducibility
        seed = int(os.getenv("GAN_DEFAULT_SEED", "42"))
    random.seed(seed)
    np.random.seed(seed)
    try:
        import torch  # type: ignore

        torch.manual_seed(seed)
        if torch.cuda.is_available():  # pragma: no cover - optional path
            torch.cuda.manual_seed_all(seed)
    except Exception:
        pass
    return seed


def ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def save_json(path: Path, obj: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w") as fh:
        json.dump(obj, fh, indent=2)


def dataclass_to_dict(x: Any) -> Dict[str, Any]:
    if is_dataclass(x):
        return asdict(x)
    if isinstance(x, dict):
        return x
    raise TypeError("Expected dataclass or dict")


def save_pickle(path: Path, obj: Any) -> None:
    import pickle

    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "wb") as fh:
        pickle.dump(obj, fh)


def load_pickle(path: Path) -> Any:
    import pickle

    with open(path, "rb") as fh:
        return pickle.load(fh)


class FeatureScaler:
    """Wraps StandardScaler with persistence. Avoids importing sklearn globally where not needed."""

    def __init__(self):
        from sklearn.preprocessing import StandardScaler  # type: ignore

        self._scaler = StandardScaler()

    def fit(self, x: np.ndarray) -> None:
        self._scaler.fit(x)

    def transform(self, x: np.ndarray) -> np.ndarray:
        return self._scaler.transform(x)

    def inverse_transform(self, x: np.ndarray) -> np.ndarray:
        return self._scaler.inverse_transform(x)

    def save(self, path: Path) -> None:
        save_pickle(path, self._scaler)

    @staticmethod
    def load(path: Path) -> "FeatureScaler":
        obj = FeatureScaler()
        obj._scaler = load_pickle(path)
        return obj


def to_device(device_preference: str = "cpu") -> str:
    """Return device string based on preference and availability.
    - device_preference: "cpu", "cuda", or "auto". Defaults to "cpu".
    """
    if device_preference == "cpu":
        return "cpu"
    if device_preference == "cuda":  # pragma: no cover - optional path
        try:
            import torch  # type: ignore

            return "cuda" if torch.cuda.is_available() else "cpu"
        except Exception:
            return "cpu"
    if device_preference == "auto":  # pragma: no cover - optional path
        try:
            import torch  # type: ignore

            return "cuda" if torch.cuda.is_available() else "cpu"
        except Exception:
            return "cpu"
    return "cpu"

