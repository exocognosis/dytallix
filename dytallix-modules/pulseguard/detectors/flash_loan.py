"""Flash loan detection heuristics and reason codes."""
import logging
from typing import Dict, List, Any, Optional, Set
from collections import defaultdict, deque
import time

logger = logging.getLogger(__name__)


class FlashLoanDetector:
    """Detects flash loan patterns using burst and repay heuristics."""
    
    def __init__(self, 
                 burst_threshold: float = 5.0,  # Multiple of normal volume
                 time_window: int = 30,         # Seconds for burst detection
                 min_value_threshold: float = 100.0):  # Minimum ETH value
        
        self.burst_threshold = burst_threshold
        self.time_window = time_window
        self.min_value_threshold = min_value_threshold
        self.transaction_history = deque()  # (timestamp, tx) pairs
        self.address_volumes = defaultdict(list)  # address -> [(timestamp, volume)]
        
    def add_transaction(self, tx: Dict[str, Any]):
        """Add a transaction to the detector's history."""
        try:
            timestamp = tx.get("timestamp", int(time.time()))
            tx_with_time = (timestamp, tx)
            
            self.transaction_history.append(tx_with_time)
            
            # Track volume per address
            from_addr = tx.get("from")
            to_addr = tx.get("to")
            value = tx.get("value", 0)
            
            if from_addr and value > 0:
                self.address_volumes[from_addr].append((timestamp, value))
                
            if to_addr and value > 0:
                self.address_volumes[to_addr].append((timestamp, value))
                
            # Cleanup old data
            self._cleanup_old_data()
            
        except Exception as e:
            logger.error(f"Error adding transaction to flash loan detector: {e}")
            
    def _cleanup_old_data(self):
        """Remove data older than the time window."""
        try:
            current_time = int(time.time())
            cutoff_time = current_time - self.time_window
            
            # Clean transaction history
            while self.transaction_history and self.transaction_history[0][0] < cutoff_time:
                self.transaction_history.popleft()
                
            # Clean address volumes
            for addr in list(self.address_volumes.keys()):
                volumes = self.address_volumes[addr]
                self.address_volumes[addr] = [
                    (ts, vol) for ts, vol in volumes if ts >= cutoff_time
                ]
                if not self.address_volumes[addr]:
                    del self.address_volumes[addr]
                    
        except Exception as e:
            logger.error(f"Error cleaning flash loan detector data: {e}")
            
    def detect_flash_loan(self, tx: Dict[str, Any]) -> List[str]:
        """Detect flash loan patterns for a transaction."""
        try:
            reason_codes = []
            
            from_addr = tx.get("from")
            to_addr = tx.get("to")
            value = tx.get("value", 0)
            timestamp = tx.get("timestamp", int(time.time()))
            block_number = tx.get("blockNumber")
            
            # Only check high-value transactions
            if value < self.min_value_threshold:
                return reason_codes
                
            # Check for single-block burst pattern
            block_burst = self._check_block_burst(from_addr, to_addr, block_number)
            if block_burst:
                reason_codes.append("PG.FLASH.CHAINBURST.K1")
                
            # Check for volume spike pattern
            volume_spike = self._check_volume_spike(from_addr, to_addr, value, timestamp)
            if volume_spike:
                reason_codes.append("PG.FLASH.VOLSPIKE.K1")
                
            # Check for rapid repay pattern
            repay_pattern = self._check_repay_pattern(from_addr, to_addr, value, timestamp)
            if repay_pattern:
                reason_codes.append("PG.FLASH.REPAY.K1")
                
            # Check for same-origin burst
            same_origin = self._check_same_origin_burst(from_addr, timestamp)
            if same_origin:
                reason_codes.append("PG.FLASH.SAMEORIGIN.K1")
                
            return reason_codes
            
        except Exception as e:
            logger.error(f"Error detecting flash loan: {e}")
            return []
            
    def _check_block_burst(self, from_addr: str, to_addr: str, block_number: Optional[int]) -> bool:
        """Check for high in/out activity in a single block."""
        try:
            if not block_number:
                return False
                
            # Count transactions in the same block
            block_txs = []
            for timestamp, tx in self.transaction_history:
                if tx.get("blockNumber") == block_number:
                    block_txs.append(tx)
                    
            # Check for high activity involving the same addresses
            in_count = 0
            out_count = 0
            
            for tx in block_txs:
                if tx.get("to") == from_addr or tx.get("to") == to_addr:
                    in_count += 1
                if tx.get("from") == from_addr or tx.get("from") == to_addr:
                    out_count += 1
                    
            # Flash loan pattern: high in/out activity in same block
            return in_count >= 3 and out_count >= 3
            
        except Exception as e:
            logger.error(f"Error checking block burst: {e}")
            return False
            
    def _check_volume_spike(self, 
                           from_addr: str, 
                           to_addr: str, 
                           value: float, 
                           timestamp: int) -> bool:
        """Check for volume spike compared to historical baseline."""
        try:
            # Get historical volumes for the addresses
            for addr in [from_addr, to_addr]:
                if not addr or addr not in self.address_volumes:
                    continue
                    
                volumes = self.address_volumes[addr]
                if len(volumes) < 3:  # Need some history
                    continue
                    
                # Calculate baseline volume (excluding current time window)
                baseline_volumes = [vol for ts, vol in volumes 
                                  if ts < timestamp - self.time_window//2]
                                  
                if not baseline_volumes:
                    continue
                    
                avg_baseline = sum(baseline_volumes) / len(baseline_volumes)
                
                # Check if current value is a significant spike
                if value > self.burst_threshold * avg_baseline:
                    return True
                    
            return False
            
        except Exception as e:
            logger.error(f"Error checking volume spike: {e}")
            return False
            
    def _check_repay_pattern(self, 
                            from_addr: str, 
                            to_addr: str, 
                            value: float, 
                            timestamp: int) -> bool:
        """Check for rapid repay pattern (reverse flow)."""
        try:
            # Look for recent opposite transactions with similar value
            tolerance = 0.1  # 10% tolerance
            time_tolerance = 300  # 5 minutes
            
            for ts, tx in self.transaction_history:
                if abs(ts - timestamp) > time_tolerance:
                    continue
                    
                tx_from = tx.get("from")
                tx_to = tx.get("to")
                tx_value = tx.get("value", 0)
                
                # Check for reverse flow with similar value
                if (tx_from == to_addr and tx_to == from_addr and
                    abs(tx_value - value) / max(value, 1) < tolerance):
                    return True
                    
            return False
            
        except Exception as e:
            logger.error(f"Error checking repay pattern: {e}")
            return False
            
    def _check_same_origin_burst(self, from_addr: str, timestamp: int) -> bool:
        """Check for multiple high-value transactions from same origin."""
        try:
            if not from_addr:
                return False
                
            # Count high-value transactions from same address in time window
            high_value_count = 0
            recent_cutoff = timestamp - 60  # Last minute
            
            for ts, tx in self.transaction_history:
                if ts < recent_cutoff:
                    continue
                    
                if (tx.get("from") == from_addr and 
                    tx.get("value", 0) >= self.min_value_threshold):
                    high_value_count += 1
                    
            # Burst pattern: multiple high-value transactions in short time
            return high_value_count >= 3
            
        except Exception as e:
            logger.error(f"Error checking same origin burst: {e}")
            return False
            
    def get_detector_stats(self) -> Dict[str, Any]:
        """Get detector statistics."""
        try:
            return {
                "transaction_count": len(self.transaction_history),
                "tracked_addresses": len(self.address_volumes),
                "time_window": self.time_window,
                "burst_threshold": self.burst_threshold,
                "min_value_threshold": self.min_value_threshold
            }
        except Exception as e:
            logger.error(f"Error getting detector stats: {e}")
            return {}


# Global detector instance
flash_loan_detector = FlashLoanDetector()


def detect_flash_loan_patterns(transactions: List[Dict[str, Any]]) -> List[List[str]]:
    """Detect flash loan patterns for a batch of transactions."""
    try:
        results = []
        
        for tx in transactions:
            # Add to detector
            flash_loan_detector.add_transaction(tx)
            
            # Detect patterns
            patterns = flash_loan_detector.detect_flash_loan(tx)
            results.append(patterns)
            
        return results
        
    except Exception as e:
        logger.error(f"Error detecting flash loan patterns: {e}")
        return []