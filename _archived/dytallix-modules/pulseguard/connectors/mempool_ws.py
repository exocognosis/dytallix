"""Mempool websocket subscriber with exponential backoff."""
import asyncio
import json
import logging
import time
from typing import Dict, Any, Optional
import websockets
from prometheus_client import Counter, Histogram, Gauge

logger = logging.getLogger(__name__)

# Metrics
mempool_messages_total = Counter('pg_mempool_messages_total', 'Total mempool messages received')
mempool_queue_lag = Gauge('pg_mempool_queue_lag', 'Mempool queue lag')
mempool_connection_errors = Counter('pg_mempool_connection_errors_total', 'Connection errors')
mempool_message_latency = Histogram('pg_mempool_message_latency_seconds', 'Message processing latency')


class MempoolSubscriber:
    """Asyncio websocket subscriber for mempool transactions."""
    
    def __init__(self, ws_url: str, queue: asyncio.Queue, max_retries: int = 10):
        self.ws_url = ws_url
        self.queue = queue
        self.max_retries = max_retries
        self.running = False
        self._websocket = None
        
    async def start(self):
        """Start the mempool subscriber with exponential backoff."""
        self.running = True
        retry_count = 0
        
        while self.running and retry_count < self.max_retries:
            try:
                logger.info(f"Connecting to mempool websocket: {self.ws_url}")
                async with websockets.connect(self.ws_url) as websocket:
                    self._websocket = websocket
                    retry_count = 0  # Reset on successful connection
                    
                    # Subscribe to pending transactions
                    subscribe_msg = {
                        "id": 1,
                        "method": "eth_subscribe",
                        "params": ["newPendingTransactions", True]
                    }
                    await websocket.send(json.dumps(subscribe_msg))
                    
                    logger.info("Successfully subscribed to mempool")
                    
                    async for message in websocket:
                        if not self.running:
                            break
                            
                        await self._process_message(message)
                        
            except Exception as e:
                retry_count += 1
                mempool_connection_errors.inc()
                backoff = min(60, 2 ** retry_count)
                logger.error(f"Mempool connection failed (retry {retry_count}): {e}")
                logger.info(f"Retrying in {backoff} seconds...")
                await asyncio.sleep(backoff)
                
        if retry_count >= self.max_retries:
            logger.error(f"Max retries ({self.max_retries}) exceeded for mempool connection")
            
    async def _process_message(self, message: str):
        """Process incoming mempool message."""
        try:
            start_time = time.time()
            data = json.loads(message)
            
            # Extract transaction from subscription result
            if "params" in data and "result" in data["params"]:
                tx_data = data["params"]["result"]
                
                # Parse transaction envelope
                parsed_tx = {
                    "hash": tx_data.get("hash"),
                    "from": tx_data.get("from"),
                    "to": tx_data.get("to"),
                    "value": int(tx_data.get("value", "0x0"), 16) / 1e18,  # Convert wei to ETH
                    "gas": int(tx_data.get("gas", "0x0"), 16),
                    "gasPrice": int(tx_data.get("gasPrice", "0x0"), 16),
                    "data": tx_data.get("input", "0x"),
                    "timestamp": int(time.time())
                }
                
                # Enqueue for processing
                await self.queue.put(parsed_tx)
                mempool_messages_total.inc()
                mempool_queue_lag.set(self.queue.qsize())
                
                # Record latency
                latency = time.time() - start_time
                mempool_message_latency.observe(latency)
                
        except Exception as e:
            logger.error(f"Error processing mempool message: {e}")
            
    async def stop(self):
        """Stop the mempool subscriber."""
        self.running = False
        if self._websocket:
            await self._websocket.close()


async def start_mempool_subscriber(ws_url: str, queue: asyncio.Queue) -> MempoolSubscriber:
    """Start mempool subscriber and return instance."""
    if not ws_url:
        logger.warning("No mempool websocket URL configured, skipping mempool subscriber")
        return None
        
    subscriber = MempoolSubscriber(ws_url, queue)
    asyncio.create_task(subscriber.start())
    return subscriber