"""Finalized blocks RPC poller with checkpointing."""
import asyncio
import json
import logging
import time
from pathlib import Path
from typing import Dict, Any, List, Optional
import aiohttp
from prometheus_client import Counter, Gauge, Histogram

logger = logging.getLogger(__name__)

# Metrics
blocks_processed_total = Counter('pg_blocks_processed_total', 'Total blocks processed')
block_gap = Gauge('pg_block_gap', 'Gap between latest and processed block')
block_processing_latency = Histogram('pg_block_processing_latency_seconds', 'Block processing latency')
rpc_errors_total = Counter('pg_rpc_errors_total', 'RPC request errors')


class BlocksRPCPoller:
    """JSON-RPC poller for finalized blocks with checkpointing."""
    
    def __init__(self, rpc_url: str, confirmations: int = 12, checkpoint_file: str = ".blocks_checkpoint"):
        self.rpc_url = rpc_url
        self.confirmations = confirmations
        self.checkpoint_file = Path(checkpoint_file)
        self.running = False
        self.last_processed_block = 0
        self.session = None
        
    async def start(self):
        """Start the blocks poller."""
        self.running = True
        self._load_checkpoint()
        
        self.session = aiohttp.ClientSession()
        
        try:
            while self.running:
                await self._poll_blocks()
                await asyncio.sleep(5)  # Poll every 5 seconds
        finally:
            if self.session:
                await self.session.close()
                
    async def _poll_blocks(self):
        """Poll for new finalized blocks."""
        try:
            start_time = time.time()
            
            # Get latest block number
            latest_block = await self._get_latest_block_number()
            if latest_block is None:
                return
                
            # Calculate finalized block (latest - confirmations)
            finalized_block = latest_block - self.confirmations
            
            # Update gap metric
            block_gap.set(latest_block - self.last_processed_block)
            
            # Process new blocks
            for block_num in range(self.last_processed_block + 1, finalized_block + 1):
                if not self.running:
                    break
                    
                block_data = await self._get_block_by_number(block_num)
                if block_data:
                    await self._process_block(block_data)
                    self.last_processed_block = block_num
                    self._save_checkpoint()
                    
            # Record processing latency
            latency = time.time() - start_time
            block_processing_latency.observe(latency)
            
        except Exception as e:
            logger.error(f"Error polling blocks: {e}")
            rpc_errors_total.inc()
            
    async def _get_latest_block_number(self) -> Optional[int]:
        """Get the latest block number."""
        try:
            payload = {
                "jsonrpc": "2.0",
                "method": "eth_blockNumber",
                "params": [],
                "id": 1
            }
            
            async with self.session.post(self.rpc_url, json=payload) as response:
                if response.status == 200:
                    data = await response.json()
                    if "result" in data:
                        return int(data["result"], 16)
                        
        except Exception as e:
            logger.error(f"Error getting latest block number: {e}")
            rpc_errors_total.inc()
            
        return None
        
    async def _get_block_by_number(self, block_num: int) -> Optional[Dict[str, Any]]:
        """Get block by number with transactions and receipts."""
        try:
            # Get block with transactions
            block_payload = {
                "jsonrpc": "2.0",
                "method": "eth_getBlockByNumber",
                "params": [hex(block_num), True],
                "id": 1
            }
            
            async with self.session.post(self.rpc_url, json=block_payload) as response:
                if response.status == 200:
                    data = await response.json()
                    if "result" in data and data["result"]:
                        block = data["result"]
                        
                        # Get receipts for all transactions
                        receipts = []
                        for tx in block.get("transactions", []):
                            receipt = await self._get_transaction_receipt(tx["hash"])
                            if receipt:
                                receipts.append(receipt)
                                
                        block["receipts"] = receipts
                        return block
                        
        except Exception as e:
            logger.error(f"Error getting block {block_num}: {e}")
            rpc_errors_total.inc()
            
        return None
        
    async def _get_transaction_receipt(self, tx_hash: str) -> Optional[Dict[str, Any]]:
        """Get transaction receipt."""
        try:
            payload = {
                "jsonrpc": "2.0",
                "method": "eth_getTransactionReceipt",
                "params": [tx_hash],
                "id": 1
            }
            
            async with self.session.post(self.rpc_url, json=payload) as response:
                if response.status == 200:
                    data = await response.json()
                    return data.get("result")
                    
        except Exception as e:
            logger.error(f"Error getting receipt for {tx_hash}: {e}")
            
        return None
        
    async def _process_block(self, block_data: Dict[str, Any]):
        """Process a finalized block."""
        try:
            block_number = int(block_data["number"], 16)
            logger.debug(f"Processing block {block_number}")
            
            # Extract key metrics
            transactions = block_data.get("transactions", [])
            receipts = block_data.get("receipts", [])
            
            # TODO: Build/update address-contract DAG here
            # TODO: Extract events and logs for domain detectors
            
            blocks_processed_total.inc()
            
        except Exception as e:
            logger.error(f"Error processing block: {e}")
            
    def _load_checkpoint(self):
        """Load the last processed block from checkpoint file."""
        try:
            if self.checkpoint_file.exists():
                with open(self.checkpoint_file, 'r') as f:
                    data = json.load(f)
                    self.last_processed_block = data.get("last_processed_block", 0)
                    logger.info(f"Loaded checkpoint: block {self.last_processed_block}")
        except Exception as e:
            logger.warning(f"Could not load checkpoint: {e}")
            self.last_processed_block = 0
            
    def _save_checkpoint(self):
        """Save the current checkpoint."""
        try:
            data = {
                "last_processed_block": self.last_processed_block,
                "timestamp": int(time.time())
            }
            with open(self.checkpoint_file, 'w') as f:
                json.dump(data, f)
        except Exception as e:
            logger.error(f"Could not save checkpoint: {e}")
            
    async def stop(self):
        """Stop the blocks poller."""
        self.running = False
        if self.session:
            await self.session.close()


async def start_blocks_poller(rpc_url: str, confirmations: int = 12) -> Optional[BlocksRPCPoller]:
    """Start blocks poller and return instance."""
    if not rpc_url:
        logger.warning("No RPC URL configured, skipping blocks poller")
        return None
        
    poller = BlocksRPCPoller(rpc_url, confirmations)
    asyncio.create_task(poller.start())
    return poller