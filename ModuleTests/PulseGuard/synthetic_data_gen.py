import os
import time
import random
import math
from dataclasses import dataclass, asdict
from typing import Dict, Iterator, Optional

random.seed(0)

@dataclass
class Telemetry:
    ts: float
    block_height: int
    block_latency_ms: float
    build_time_ms: float
    mempool_size: int
    mempool_gas_pressure: float
    tx_volume_tps: float
    unique_senders: int
    unique_receivers: int
    avg_tx_value: float
    avg_gas_price: float

    def to_dict(self) -> Dict:
        return asdict(self)

class SyntheticDataGen:
    def __init__(self, seed: Optional[int] = None):
        self.rng = random.Random(seed or int(time.time()))
        self.block = 1
        self._t0 = time.time()
        # Correlated noise state for smoother yet dynamic movement
        self._noise = 0.0

    def _normal_op(self) -> Telemetry:
        self.block += 1
        now = time.time() - self._t0
        # Slow sinusoidal cycles to create visible movement over time
        cyc = math.sin(now / 15.0)
        cyc_fast = math.sin(now / 3.0)
        # Correlated noise (random walk) for jitter
        self._noise += self.rng.uniform(-0.2, 0.2)
        self._noise = max(-2.0, min(2.0, self._noise))
        # Occasional random spikes for latency / gas pressure
        spike = 1.0 + (self.rng.random() < 0.06) * self.rng.uniform(0.6, 2.2)

        base_latency = 620 + 55 * cyc + 18 * cyc_fast + 20 * self._noise
        block_latency_ms = max(50.0, self.rng.gauss(base_latency, 35) * spike)

        build_time_ms = max(50.0, self.rng.gauss(160 + 12 * cyc + 6 * self._noise, 18))

        mem_base = 520 + 95 * cyc + 25 * cyc_fast + 10 * self._noise
        mempool_size = max(0, int(self.rng.gauss(mem_base, 40)))

        gas_pressure = max(0.05, self.rng.gauss(0.62 + 0.09 * cyc + 0.02 * self._noise, 0.09) * (1.0 + 0.35 * (spike - 1.0)))

        tx_volume_tps = max(0.0, self.rng.gauss(26 + 5 * cyc + 1.5 * self._noise, 5))

        unique_senders = max(1, int(self.rng.gauss(210 + 24 * cyc + 6 * self._noise, 28)))
        unique_receivers = max(1, int(self.rng.gauss(190 + 20 * cyc + 5 * self._noise, 25)))

        avg_tx_value = max(0.0, self.rng.gauss(2.6 + 0.35 * cyc + 0.05 * self._noise, 0.45))

        avg_gas_price = max(1.0, self.rng.gauss(1020 + 130 * cyc + 35 * cyc_fast + 8 * self._noise, 95))

        return Telemetry(
            ts=time.time(),
            block_height=self.block,
            block_latency_ms=block_latency_ms,
            build_time_ms=build_time_ms,
            mempool_size=mempool_size,
            mempool_gas_pressure=gas_pressure,
            tx_volume_tps=tx_volume_tps,
            unique_senders=unique_senders,
            unique_receivers=unique_receivers,
            avg_tx_value=avg_tx_value,
            avg_gas_price=avg_gas_price,
        )

    def stream(self, rate_per_sec: float = 5.0) -> Iterator[Telemetry]:
        interval = 1.0 / max(0.1, rate_per_sec)
        while True:
            yield self._normal_op()
            time.sleep(interval)
