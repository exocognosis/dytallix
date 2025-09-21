"""Bridge sequence detection for cross-chain transfers."""
import logging
from typing import Dict, List, Any, Optional, Set, Tuple
from collections import defaultdict, deque
import time
import re

logger = logging.getLogger(__name__)


class BridgeSequenceDetector:
    """Detects bridge transfer sequence patterns."""
    
    def __init__(self, 
                 sequence_window: int = 1800,  # 30 minutes
                 min_bridge_value: float = 1.0):  # Minimum ETH value
        
        self.sequence_window = sequence_window
        self.min_bridge_value = min_bridge_value
        
        # Transaction tracking
        self.transaction_history = deque()  # (timestamp, tx) pairs
        self.address_sequences = defaultdict(list)  # address -> sequence of txs
        
        # Known bridge contracts (heuristic patterns)
        self.bridge_patterns = [
            # Common bridge contract patterns
            r".*bridge.*",
            r".*portal.*", 
            r".*gateway.*",
            r".*router.*",
            r".*relay.*"
        ]
        
        # Known bridge addresses (can be expanded)
        self.known_bridges = {
            "0xa0b86a33e6c1fa072fe894cede0c52d5e97b7ed0",  # Example bridge
            "0x3154cf16ccdb4c6d922629664174b904d80f2c35",  # Example bridge
        }
        
    def add_transaction(self, tx: Dict[str, Any]):
        """Add a transaction to the detector."""
        try:
            timestamp = tx.get("timestamp", int(time.time()))
            tx_with_time = (timestamp, tx)
            
            self.transaction_history.append(tx_with_time)
            
            # Track sequences by address
            from_addr = tx.get("from")
            to_addr = tx.get("to")
            
            if from_addr:
                self.address_sequences[from_addr].append(tx_with_time)
                
            if to_addr:
                self.address_sequences[to_addr].append(tx_with_time)
                
            # Cleanup old data
            self._cleanup_old_data()
            
        except Exception as e:
            logger.error(f"Error adding transaction to bridge detector: {e}")
            
    def _cleanup_old_data(self):
        """Remove data older than the sequence window."""
        try:
            current_time = int(time.time())
            cutoff_time = current_time - self.sequence_window
            
            # Clean transaction history
            while self.transaction_history and self.transaction_history[0][0] < cutoff_time:
                self.transaction_history.popleft()
                
            # Clean address sequences
            for addr in list(self.address_sequences.keys()):
                sequences = self.address_sequences[addr]
                self.address_sequences[addr] = [
                    (ts, tx) for ts, tx in sequences if ts >= cutoff_time
                ]
                if not self.address_sequences[addr]:
                    del self.address_sequences[addr]
                    
        except Exception as e:
            logger.error(f"Error cleaning bridge detector data: {e}")
            
    def detect_bridge_sequences(self, tx: Dict[str, Any]) -> List[str]:
        """Detect bridge sequence patterns."""
        try:
            reason_codes = []
            
            from_addr = tx.get("from")
            to_addr = tx.get("to")
            value = tx.get("value", 0)
            timestamp = tx.get("timestamp", int(time.time()))
            
            # Only check transactions with meaningful value
            if value < self.min_bridge_value:
                return reason_codes
                
            # Check if transaction involves a bridge contract
            bridge_involved = self._is_bridge_transaction(tx)
            
            if bridge_involved:
                # Check for bridge sequence patterns
                sequence_pattern = self._check_bridge_sequence_pattern(from_addr, to_addr, timestamp)
                if sequence_pattern:
                    reason_codes.append("PG.BRIDGE.SEQ.K2")
                    
                # Check for rapid bridge hops
                rapid_hops = self._check_rapid_bridge_hops(from_addr, timestamp)
                if rapid_hops:
                    reason_codes.append("PG.BRIDGE.HOPS.K1")
                    
                # Check for high-value bridge transfer
                high_value = self._check_high_value_bridge(value)
                if high_value:
                    reason_codes.append("PG.BRIDGE.HIGHVAL.K1")
                    
            # Check for cross-chain preparation patterns
            prep_pattern = self._check_cross_chain_prep(from_addr, to_addr, timestamp)
            if prep_pattern:
                reason_codes.append("PG.BRIDGE.PREP.K1")
                
            return reason_codes
            
        except Exception as e:
            logger.error(f"Error detecting bridge sequences: {e}")
            return []
            
    def _is_bridge_transaction(self, tx: Dict[str, Any]) -> bool:
        """Check if transaction involves a bridge contract."""
        try:
            to_addr = tx.get("to", "").lower()
            
            # Check against known bridge addresses
            if to_addr in self.known_bridges:
                return True
                
            # Check against bridge patterns
            for pattern in self.bridge_patterns:
                if re.search(pattern, to_addr, re.IGNORECASE):
                    return True
                    
            # Check transaction data for bridge function signatures
            data = tx.get("data", "0x")
            if len(data) >= 10:  # Has function selector
                # Common bridge function selectors (first 4 bytes)
                bridge_selectors = [
                    "0x1114cd2a",  # bridgeERC20
                    "0x838b2520",  # deposit
                    "0x8340f549",  # withdraw
                    "0xd0e30db0",  # deposit()
                    "0x2e1a7d4d",  # withdraw(uint256)
                ]
                
                selector = data[:10].lower()
                if selector in bridge_selectors:
                    return True
                    
            return False
            
        except Exception as e:
            logger.error(f"Error checking bridge transaction: {e}")
            return False
            
    def _check_bridge_sequence_pattern(self, 
                                     from_addr: str, 
                                     to_addr: str, 
                                     timestamp: int) -> bool:
        """Check for bridge sequence pattern within time window."""
        try:
            # Look for sequence: user -> bridge -> destination
            if not from_addr:
                return False
                
            # Get recent transactions for the from_addr
            recent_txs = []
            for addr in [from_addr]:
                if addr in self.address_sequences:
                    recent_txs.extend(self.address_sequences[addr])
                    
            # Sort by timestamp
            recent_txs.sort(key=lambda x: x[0])
            
            # Look for bridge sequence pattern
            bridge_steps = 0
            last_bridge_time = 0
            
            for ts, tx in recent_txs:
                if ts >= timestamp - self.sequence_window:
                    if self._is_bridge_transaction(tx):
                        bridge_steps += 1
                        last_bridge_time = ts
                        
            # Bridge sequence: multiple bridge transactions in window
            if bridge_steps >= 2:
                return True
                
            # Alternative: check for preparation -> bridge -> completion pattern
            return self._check_three_step_pattern(recent_txs, timestamp)
            
        except Exception as e:
            logger.error(f"Error checking bridge sequence pattern: {e}")
            return False
            
    def _check_three_step_pattern(self, transactions: List[Tuple[int, Dict]], current_time: int) -> bool:
        """Check for three-step bridge pattern."""
        try:
            if len(transactions) < 3:
                return False
                
            # Look for pattern in recent transactions
            recent_window = current_time - 1800  # 30 minutes
            recent_txs = [(ts, tx) for ts, tx in transactions if ts >= recent_window]
            
            if len(recent_txs) < 3:
                return False
                
            # Pattern: normal tx -> bridge tx -> completion tx
            bridge_found = False
            pre_bridge = False
            post_bridge = False
            
            for i, (ts, tx) in enumerate(recent_txs):
                is_bridge = self._is_bridge_transaction(tx)
                
                if is_bridge:
                    bridge_found = True
                    # Check for activity before and after
                    if i > 0:
                        pre_bridge = True
                    if i < len(recent_txs) - 1:
                        post_bridge = True
                        
            return bridge_found and pre_bridge and post_bridge
            
        except Exception as e:
            logger.error(f"Error checking three-step pattern: {e}")
            return False
            
    def _check_rapid_bridge_hops(self, from_addr: str, timestamp: int) -> bool:
        """Check for rapid bridge hops across multiple chains."""
        try:
            if not from_addr or from_addr not in self.address_sequences:
                return False
                
            recent_cutoff = timestamp - 600  # Last 10 minutes
            bridge_count = 0
            
            for ts, tx in self.address_sequences[from_addr]:
                if ts >= recent_cutoff and self._is_bridge_transaction(tx):
                    bridge_count += 1
                    
            # Rapid hops: multiple bridge transactions in short time
            return bridge_count >= 3
            
        except Exception as e:
            logger.error(f"Error checking rapid bridge hops: {e}")
            return False
            
    def _check_high_value_bridge(self, value: float) -> bool:
        """Check for high-value bridge transfer."""
        try:
            # Calculate dynamic threshold based on recent bridge activity
            recent_values = []
            current_time = int(time.time())
            recent_cutoff = current_time - 3600  # Last hour
            
            for ts, tx in self.transaction_history:
                if ts >= recent_cutoff and self._is_bridge_transaction(tx):
                    recent_values.append(tx.get("value", 0))
                    
            if not recent_values:
                # No recent activity, use static threshold
                return value > 100.0  # 100 ETH
                
            # Dynamic threshold: significantly above recent average
            import numpy as np
            avg_value = np.mean(recent_values)
            std_value = np.std(recent_values)
            
            threshold = avg_value + 3 * std_value
            return value > max(threshold, 50.0)  # At least 50 ETH
            
        except Exception as e:
            logger.error(f"Error checking high value bridge: {e}")
            return False
            
    def _check_cross_chain_prep(self, from_addr: str, to_addr: str, timestamp: int) -> bool:
        """Check for cross-chain preparation patterns."""
        try:
            # Look for patterns that suggest preparation for cross-chain transfer
            # E.g., token approvals, wrapping, aggregating funds
            
            if not from_addr:
                return False
                
            recent_cutoff = timestamp - 1800  # Last 30 minutes
            prep_indicators = 0
            
            # Check recent transactions from the same address
            if from_addr in self.address_sequences:
                for ts, tx in self.address_sequences[from_addr]:
                    if ts >= recent_cutoff:
                        # Look for preparation indicators
                        data = tx.get("data", "0x")
                        
                        # Token approval transactions
                        if data.startswith("0x095ea7b3"):  # approve(address,uint256)
                            prep_indicators += 1
                            
                        # WETH wrapping
                        if data.startswith("0xd0e30db0"):  # deposit()
                            prep_indicators += 1
                            
                        # High gas transactions (complex operations)
                        if tx.get("gas", 0) > 200000:
                            prep_indicators += 1
                            
            # Cross-chain prep: multiple preparation steps
            return prep_indicators >= 2
            
        except Exception as e:
            logger.error(f"Error checking cross-chain prep: {e}")
            return False
            
    def get_detector_stats(self) -> Dict[str, Any]:
        """Get detector statistics."""
        try:
            bridge_tx_count = sum(1 for ts, tx in self.transaction_history 
                                if self._is_bridge_transaction(tx))
                                
            return {
                "total_transactions": len(self.transaction_history),
                "bridge_transactions": bridge_tx_count,
                "tracked_addresses": len(self.address_sequences),
                "sequence_window": self.sequence_window,
                "known_bridges": len(self.known_bridges)
            }
        except Exception as e:
            logger.error(f"Error getting detector stats: {e}")
            return {}


# Global detector instance
bridge_detector = BridgeSequenceDetector()


def detect_bridge_patterns(transactions: List[Dict[str, Any]]) -> List[List[str]]:
    """Detect bridge patterns for a batch of transactions."""
    try:
        results = []
        
        for tx in transactions:
            # Add to detector
            bridge_detector.add_transaction(tx)
            
            # Detect patterns
            patterns = bridge_detector.detect_bridge_sequences(tx)
            results.append(patterns)
            
        return results
        
    except Exception as e:
        logger.error(f"Error detecting bridge patterns: {e}")
        return []