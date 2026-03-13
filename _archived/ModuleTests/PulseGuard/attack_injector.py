import random
from dataclasses import dataclass
from typing import Dict

from synthetic_data_gen import Telemetry

@dataclass
class AttackConfig:
    prob: float = 0.1
    severity: float = 0.5  # 0..1

class AttackInjector:
    def __init__(self, seed: int | None = None, config: AttackConfig | None = None):
        self.rng = random.Random(seed)
        self.cfg = config or AttackConfig()

    def maybe_corrupt(self, t: Telemetry) -> tuple[Telemetry, str | None]:
        if self.rng.random() > self.cfg.prob:
            return t, None
        kind = self.rng.choice([
            "delayed_blocks",
            "double_spend_pattern",
            "laundering_flow",
            "flash_loan_exploit",
            "metadata_corruption",
            "gas_spike",
            "mempool_congestion",
            "exchange_outage",
        ])
        s = max(0.0, min(1.0, self.cfg.severity))
        if kind == "delayed_blocks":
            t.block_latency_ms *= 1.0 + 2.0 * s
        elif kind == "double_spend_pattern":
            t.unique_senders = max(1, int(t.unique_senders * (1.0 - 0.4 * s)))
            t.unique_receivers = max(1, int(t.unique_receivers * (1.0 - 0.4 * s)))
        elif kind == "laundering_flow":
            t.avg_tx_value *= 0.2
            t.tx_volume_tps *= 2.0 * (1.0 + s)
        elif kind == "flash_loan_exploit":
            t.avg_tx_value *= (5.0 + 10.0 * s)
            t.mempool_gas_pressure *= (1.5 + s)
        elif kind == "metadata_corruption":
            t.avg_gas_price *= (0.1 if s > 0.7 else 10.0)
        elif kind == "gas_spike":
            t.avg_gas_price *= (2.0 + 6.0 * s)
            t.mempool_gas_pressure *= (1.2 + 1.5 * s)
        elif kind == "mempool_congestion":
            t.mempool_size = int(t.mempool_size * (1.5 + 3.0 * s))
            t.block_latency_ms *= (1.0 + 0.8 * s)
        elif kind == "exchange_outage":
            t.tx_volume_tps *= (0.2 + 0.5 * (1.0 - s))
            t.avg_tx_value *= (0.6 + 0.2 * s)
        return t, kind

    def tag_gan_anomaly(self, t: Telemetry, enabled: bool, adversarial: bool) -> tuple[Telemetry, str | None]:
        """Optionally tag telemetry as a GAN-driven anomaly.
        If enabled and adversarial, returns (t, "gan"), else (t, None).
        Provided for integration clarity; pipeline may set this tag directly.
        """
        if enabled and adversarial:
            return t, "gan"
        return t, None
