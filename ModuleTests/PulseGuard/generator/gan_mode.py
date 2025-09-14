from __future__ import annotations

import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import List, Literal, Optional, Tuple

import numpy as np

from .utils import FeatureScaler, ensure_dir, save_json, set_global_seed, to_device
from .dataset import FEATURES


Mode = Literal["adversarial", "near_normal"]


@dataclass
class TrainConfig:
    epochs: int = 20
    batch_size: int = 64
    lr: float = 1e-3
    window: int = 64
    device: str = "cpu"
    seed: int = 42
    out_dir: Path = Path(__file__).resolve().parents[1] / "artifacts" / "gan"


class _FallbackGAN:
    """CPU-friendly fallback when torch is unavailable. Not a true GAN but preserves API.
    - near_normal: sample from fitted Gaussian on feature deltas and integrate over time.
    - adversarial: inject structured bursts and velocity shifts while keeping marginals plausible.
    """

    def __init__(self, scaler: FeatureScaler, window: int = 64, seed: Optional[int] = None) -> None:
        self.scaler = scaler
        self.window = window
        self.seed = set_global_seed(seed)
        self.rng = np.random.RandomState(self.seed)
        # Empirical ranges for clipping after inverse-transform (keeps plausibility)
        self._mins = np.array([50, 50, 0, 0.05, 0.0, 1, 1, 0.0, 1.0], dtype=np.float32)
        self._maxs = np.array([5000, 2000, 100000, 5.0, 2000.0, 100000, 100000, 1e6, 1e6], dtype=np.float32)

    def train(self, X_train: np.ndarray, X_val: np.ndarray, cfg: TrainConfig) -> DictMetrics:
        # Fallback does not train; just record statistics
        metrics = {
            "mode": "fallback",
            "epochs": 0,
            "notes": "torch unavailable; using statistical sampler",
            "seed": self.seed,
        }
        return metrics  # type: ignore[return-value]

    def save(self, path: Path) -> None:
        ensure_dir(path.parent)
        with open(path, "w") as fh:
            json.dump({"fallback": True, "window": self.window, "seed": self.seed}, fh)

    @staticmethod
    def load(path: Path, scaler: FeatureScaler) -> "_FallbackGAN":
        data = json.loads(Path(path).read_text())
        return _FallbackGAN(scaler, window=int(data.get("window", 64)), seed=int(data.get("seed", 42)))

    def generate_sequences(self, n: int, mode: Mode = "adversarial", seed: Optional[int] = None) -> List[np.ndarray]:
        if seed is not None:
            self.rng = np.random.RandomState(seed)
        out: List[np.ndarray] = []
        F = len(FEATURES)
        for _ in range(n):
            # Generate normalized deltas and accumulate to create smooth sequence
            deltas = self.rng.normal(loc=0.0, scale=0.08, size=(self.window, F)).astype(np.float32)
            base = self.rng.normal(loc=0.0, scale=0.2, size=(F,)).astype(np.float32)
            seq_n = np.cumsum(deltas, axis=0) + base
            if mode == "adversarial":
                # Structured burst: select a subset of features and add a transient shift
                idx = self.rng.choice(F, size=max(2, F // 3), replace=False)
                pos = self.rng.randint(low=self.window // 4, high=(3 * self.window) // 4)
                width = max(3, int(self.window * 0.15))
                amp = self.rng.uniform(0.8, 1.6)
                for w in range(width):
                    if pos + w < self.window:
                        # gentle ramp up/down
                        g = (1.0 - abs(w - width / 2) / (width / 2 + 1e-6))
                        seq_n[pos + w, idx] += amp * g
                # velocity anomaly: small drift across window
                drift = (self.rng.uniform(-0.05, 0.15, size=(F,))).astype(np.float32)
                for t in range(self.window):
                    seq_n[t] += drift * (t / self.window)
            seq = self.scaler.inverse_transform(seq_n)
            seq = np.clip(seq, self._mins, self._maxs)
            out.append(seq)
        return out


try:
    import torch  # type: ignore
    import torch.nn as nn  # type: ignore
    import torch.optim as optim  # type: ignore

    class _Gen(nn.Module):
        def __init__(self, window: int, feat: int, latent: int = 32):
            super().__init__()
            self.latent = latent
            self.window = window
            self.feat = feat
            self.net = nn.Sequential(
                nn.Linear(latent, 128), nn.ReLU(),
                nn.Linear(128, window * feat)
            )

        def forward(self, z: torch.Tensor) -> torch.Tensor:  # [B, latent] -> [B, W, F]
            x = self.net(z)
            return x.view(-1, self.window, self.feat)

    class _Disc(nn.Module):
        def __init__(self, window: int, feat: int):
            super().__init__()
            self.net = nn.Sequential(
                nn.Flatten(),
                nn.Linear(window * feat, 128), nn.LeakyReLU(0.2),
                nn.Linear(128, 1), nn.Sigmoid(),
            )

        def forward(self, x: torch.Tensor) -> torch.Tensor:
            return self.net(x)

    class TorchGAN:
        def __init__(self, scaler: FeatureScaler, window: int = 64, device: str = "cpu", seed: Optional[int] = None) -> None:
            self.scaler = scaler
            self.window = window
            self.device = device
            self.seed = set_global_seed(seed)
            self.feat = len(FEATURES)
            self.G = _Gen(window, self.feat).to(self.device)
            self.D = _Disc(window, self.feat).to(self.device)

        def train(self, X_train: np.ndarray, X_val: np.ndarray, cfg: TrainConfig) -> DictMetrics:
            torch.manual_seed(self.seed)
            B = cfg.batch_size
            lr = cfg.lr
            epochs = cfg.epochs
            optim_G = optim.Adam(self.G.parameters(), lr=lr)
            optim_D = optim.Adam(self.D.parameters(), lr=lr)
            bce = nn.BCELoss()

            def _batch_iter(X: np.ndarray):
                n = X.shape[0]
                idx = np.arange(n)
                np.random.shuffle(idx)
                for i in range(0, n, B):
                    j = idx[i : i + B]
                    yield torch.tensor(X[j], dtype=torch.float32, device=self.device)

            best_val = float("inf")
            history = []
            for ep in range(epochs):
                self.G.train()
                self.D.train()
                g_loss_ep = 0.0
                d_loss_ep = 0.0
                iters = 0
                for real in _batch_iter(X_train):
                    iters += 1
                    # Train D
                    z = torch.randn(real.size(0), 32, device=self.device)
                    fake = self.G(z).detach()
                    pred_real = self.D(real)
                    pred_fake = self.D(fake)
                    loss_d = bce(pred_real, torch.ones_like(pred_real)) + bce(pred_fake, torch.zeros_like(pred_fake))
                    optim_D.zero_grad()
                    loss_d.backward()
                    optim_D.step()

                    # Train G
                    z = torch.randn(real.size(0), 32, device=self.device)
                    gen = self.G(z)
                    pred = self.D(gen)
                    loss_g = bce(pred, torch.ones_like(pred))
                    optim_G.zero_grad()
                    loss_g.backward()
                    optim_G.step()
                    g_loss_ep += float(loss_g.detach().cpu().item())
                    d_loss_ep += float(loss_d.detach().cpu().item())

                # Simple validation: discriminator loss on val real vs fake
                with torch.no_grad():
                    self.G.eval()
                    self.D.eval()
                    val_real = torch.tensor(X_val[: min(256, len(X_val))], dtype=torch.float32, device=self.device)
                    z = torch.randn(val_real.size(0), 32, device=self.device)
                    fake = self.G(z)
                    pred_real = self.D(val_real)
                    pred_fake = self.D(fake)
                    val_loss = float(
                        bce(pred_real, torch.ones_like(pred_real)).cpu().item()
                        + bce(pred_fake, torch.zeros_like(pred_fake)).cpu().item()
                    )
                history.append({"epoch": ep + 1, "g_loss": g_loss_ep / max(1, iters), "d_loss": d_loss_ep / max(1, iters), "val_loss": val_loss})
                # Early stopping patience 3 with min-delta
                if val_loss + 1e-3 < best_val:
                    best_val = val_loss
                    # best in memory
                    best_state = {
                        "G": self.G.state_dict(),
                        "D": self.D.state_dict(),
                        "epoch": ep + 1,
                    }
                elif ep > 6 and len(history) > 3 and all(history[-k]["val_loss"] >= best_val for k in (1, 2, 3)):
                    break

            self._best_state = best_state  # type: ignore[attr-defined]
            return {"epochs": len(history), "best_val": best_val, "history": history, "seed": self.seed}  # type: ignore[return-value]

        def save(self, path: Path) -> None:
            ensure_dir(path.parent)
            state = getattr(self, "_best_state", None)
            if state is None:
                state = {"G": self.G.state_dict(), "D": self.D.state_dict(), "epoch": 0}
            torch.save(state, path)

        @staticmethod
        def load(path: Path, scaler: FeatureScaler, window: int = 64, device: str = "cpu") -> "TorchGAN":
            model = TorchGAN(scaler, window=window, device=device)
            state = torch.load(path, map_location=device)
            model.G.load_state_dict(state.get("G", {}))
            model.D.load_state_dict(state.get("D", {}))
            return model

        def generate_sequences(self, n: int, mode: Mode = "adversarial", seed: Optional[int] = None) -> List[np.ndarray]:
            if seed is not None:
                torch.manual_seed(seed)
            self.G.eval()
            out: List[np.ndarray] = []
            with torch.no_grad():
                for _ in range(n):
                    z = torch.randn(1, 32, device=self.device)
                    seq_n = self.G(z).cpu().numpy()[0]
                    # Shape [W, F] is normalized; invert scaling
                    seq = self.scaler.inverse_transform(seq_n)
                    if mode == "adversarial":
                        # Apply subtle structured timing perturbations to resemble near-normal with shifts
                        W, F = seq.shape
                        pos = np.random.randint(low=W // 4, high=(3 * W) // 4)
                        width = max(3, int(W * 0.12))
                        idx = np.random.choice(F, size=max(2, F // 3), replace=False)
                        amp = np.random.uniform(0.9, 1.4)
                        for w in range(width):
                            if pos + w < W:
                                g = (1.0 - abs(w - width / 2) / (width / 2 + 1e-6))
                                seq[pos + w, idx] *= (1.0 + (amp - 1.0) * g)
                    out.append(seq.astype(np.float32))
            return out

    _TORCH_OK = True
except Exception:  # pragma: no cover - path when torch is not available
    TorchGAN = None  # type: ignore[assignment]
    _TORCH_OK = False


DictMetrics = dict


class TimeSeriesGAN:
    """Public API for GAN mode. Uses torch when available, else a statistical fallback.
    - train(X_train, X_val, cfg) -> metrics and best checkpoint
    - generate_sequences(n, mode, seed) -> list of [W, F] arrays in original feature space
    """

    def __init__(self, scaler: FeatureScaler, window: int = 64, device: str = "cpu", prefer_torch: bool = True, seed: Optional[int] = None) -> None:
        self.scaler = scaler
        self.window = window
        self.device = to_device(device)
        self.seed = set_global_seed(seed)
        self._use_torch = prefer_torch and _TORCH_OK
        if self._use_torch:
            self._impl = TorchGAN(scaler, window=window, device=self.device, seed=self.seed)  # type: ignore[name-defined]
        else:
            self._impl = _FallbackGAN(scaler, window=window, seed=self.seed)

    def train(self, X_train: np.ndarray, X_val: np.ndarray, cfg: Optional[TrainConfig] = None) -> Tuple[DictMetrics, Path]:
        cfg = cfg or TrainConfig(window=self.window, device=self.device, seed=self.seed)
        ensure_dir(cfg.out_dir)
        metrics = self._impl.train(X_train, X_val, cfg)
        # Save metrics
        save_json(cfg.out_dir / "train_metrics.json", metrics)
        # Save checkpoint
        ckpt_dir = cfg.out_dir / "model_checkpoint"
        ensure_dir(ckpt_dir)
        ckpt = ckpt_dir / ("best.ckpt" if self._use_torch else "best.json")
        self._impl.save(ckpt)
        return metrics, ckpt

    @staticmethod
    def load_from_artifacts(art_dir: Path, window: int = 64, device: str = "cpu") -> "TimeSeriesGAN":
        scaler_path = art_dir / "scaler.pkl"
        if not scaler_path.exists():
            raise FileNotFoundError(f"Scaler not found at {scaler_path}")
        scaler = FeatureScaler.load(scaler_path)
        prefer_torch = _TORCH_OK
        gan = TimeSeriesGAN(scaler, window=window, device=device, prefer_torch=prefer_torch)
        # Load checkpoint into underlying impl if possible
        ckpt_t = art_dir / "model_checkpoint" / "best.ckpt"
        ckpt_f = art_dir / "model_checkpoint" / "best.json"
        if prefer_torch and ckpt_t.exists():
            gan._impl = TorchGAN.load(ckpt_t, scaler, window=window, device=device)  # type: ignore[name-defined]
        elif ckpt_f.exists():
            gan._impl = _FallbackGAN.load(ckpt_f, scaler)
        else:
            # If nothing found, keep current impl (may be fallback) and proceed
            pass
        return gan

    def generate_sequences(self, n: int, mode: Mode = "adversarial", seed: Optional[int] = None) -> List[np.ndarray]:
        return self._impl.generate_sequences(n, mode=mode, seed=seed)

