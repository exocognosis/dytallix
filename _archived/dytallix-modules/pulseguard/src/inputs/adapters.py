from __future__ import annotations

"""
Input adapters for PulseGuard.

RPC Poller (conceptual):
- Periodically fetch latest blocks/txs from RPC_URL and submit for scoring.
- In v0.1.0, this is a placeholder; production deploys should run a sidecar or job.

Webhook:
- The server supports registering alert sinks via POST /stream/webhook.

File Batch:
- Clients can POST /score with a batch array of tx objects.
"""

import asyncio
from typing import AsyncIterator, Dict, List


async def rpc_poller(rpc_url: str, interval_sec: float = 1.0) -> AsyncIterator[List[Dict]]:
    """Poll latest block transactions from an RPC endpoint (skeleton).
    Yields batches of tx-like dicts. In v0.1.0, this is a placeholder.
    """
    try:
        import httpx
    except Exception:
        while True:
            await asyncio.sleep(interval_sec)
            yield []
    async with httpx.AsyncClient(timeout=2.0) as client:
        while True:
            try:
                # Placeholder: real implementation would call eth_getBlockByNumber with full txs
                await asyncio.sleep(interval_sec)
                yield []
            except Exception:
                await asyncio.sleep(interval_sec)
                yield []


def enrich_with_metadata(txs: List[Dict]) -> List[Dict]:
    """Attach external metadata (entity tags, behavior flags) if available.
    v0.1.0: returns txs unchanged.
    """
    return txs
