"""ERC20 mint/burn detection and volume monitoring."""
import logging
from typing import Dict, List, Any, Optional, Set
from collections import defaultdict, deque
import time
import re

logger = logging.getLogger(__name__)


class MintBurnDetector:
    """Detects unusual mint/burn activity in ERC20 tokens."""
    
    def __init__(self, 
                 spike_threshold: float = 3.0,  # Std deviations above mean
                 time_window: int = 600,        # 10 minutes
                 min_baseline_samples: int = 10):
        
        self.spike_threshold = spike_threshold
        self.time_window = time_window
        self.min_baseline_samples = min_baseline_samples
        
        # Track mint/burn events per token
        self.mint_history = defaultdict(deque)  # token -> [(timestamp, amount)]
        self.burn_history = defaultdict(deque)  # token -> [(timestamp, amount)]
        self.transfer_events = deque()  # All transfer events
        
        # Common addresses
        self.zero_address = "0x0000000000000000000000000000000000000000"
        
    def add_transaction(self, tx: Dict[str, Any]):
        """Add a transaction and extract mint/burn events."""
        try:
            timestamp = tx.get("timestamp", int(time.time()))
            
            # Store transaction for event extraction
            self.transfer_events.append((timestamp, tx))
            
            # Extract mint/burn events from logs/receipts
            self._extract_mint_burn_events(tx)
            
            # Cleanup old data
            self._cleanup_old_data()
            
        except Exception as e:
            logger.error(f"Error adding transaction to mint/burn detector: {e}")
            
    def _extract_mint_burn_events(self, tx: Dict[str, Any]):
        """Extract mint/burn events from transaction."""
        try:
            timestamp = tx.get("timestamp", int(time.time()))
            
            # Method 1: Check transfer to/from zero address
            from_addr = tx.get("from", "").lower()
            to_addr = tx.get("to", "").lower()
            value = tx.get("value", 0)
            
            # Mint: from zero address
            if from_addr == self.zero_address and value > 0:
                self.mint_history[to_addr].append((timestamp, value))
                
            # Burn: to zero address  
            if to_addr == self.zero_address and value > 0:
                self.burn_history[from_addr].append((timestamp, value))
                
            # Method 2: Parse transaction logs for Transfer events
            logs = tx.get("logs", [])
            for log in logs:
                self._parse_transfer_log(log, timestamp)
                
        except Exception as e:
            logger.error(f"Error extracting mint/burn events: {e}")
            
    def _parse_transfer_log(self, log: Dict[str, Any], timestamp: int):
        """Parse Transfer event log for mint/burn detection."""
        try:
            # ERC20 Transfer event signature
            transfer_topic = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
            
            topics = log.get("topics", [])
            if not topics or topics[0] != transfer_topic:
                return
                
            if len(topics) < 3:
                return
                
            # Decode from and to addresses
            from_addr = "0x" + topics[1][-40:].lower()
            to_addr = "0x" + topics[2][-40:].lower()
            
            # Decode value from data
            data = log.get("data", "0x")
            if len(data) >= 66:  # 0x + 64 hex chars
                try:
                    value_hex = data[2:66]  # First 32 bytes
                    value = int(value_hex, 16) / 1e18  # Convert to token units (assuming 18 decimals)
                except:
                    value = 0
            else:
                value = 0
                
            if value <= 0:
                return
                
            token_address = log.get("address", "").lower()
            
            # Mint: from zero address
            if from_addr == self.zero_address:
                self.mint_history[token_address].append((timestamp, value))
                
            # Burn: to zero address
            if to_addr == self.zero_address:
                self.burn_history[token_address].append((timestamp, value))
                
        except Exception as e:
            logger.error(f"Error parsing transfer log: {e}")
            
    def _cleanup_old_data(self):
        """Remove data older than the time window."""
        try:
            current_time = int(time.time())
            cutoff_time = current_time - self.time_window
            
            # Clean transfer events
            while self.transfer_events and self.transfer_events[0][0] < cutoff_time:
                self.transfer_events.popleft()
                
            # Clean mint history
            for token in list(self.mint_history.keys()):
                events = self.mint_history[token]
                while events and events[0][0] < cutoff_time:
                    events.popleft()
                if not events:
                    del self.mint_history[token]
                    
            # Clean burn history
            for token in list(self.burn_history.keys()):
                events = self.burn_history[token]
                while events and events[0][0] < cutoff_time:
                    events.popleft()
                if not events:
                    del self.burn_history[token]
                    
        except Exception as e:
            logger.error(f"Error cleaning mint/burn detector data: {e}")
            
    def detect_mint_burn_anomalies(self, tx: Dict[str, Any]) -> List[str]:
        """Detect unusual mint/burn patterns."""
        try:
            reason_codes = []
            
            # Extract relevant addresses/tokens from transaction
            tokens_to_check = set()
            
            # Add transaction target as potential token
            to_addr = tx.get("to")
            if to_addr:
                tokens_to_check.add(to_addr.lower())
                
            # Add any tokens mentioned in logs
            logs = tx.get("logs", [])
            for log in logs:
                addr = log.get("address")
                if addr:
                    tokens_to_check.add(addr.lower())
                    
            # Check each token for anomalies
            for token in tokens_to_check:
                # Check mint spikes
                mint_spike = self._check_mint_spike(token)
                if mint_spike:
                    reason_codes.append("PG.MINT.SPIKE.K1")
                    
                # Check burn spikes
                burn_spike = self._check_burn_spike(token)
                if burn_spike:
                    reason_codes.append("PG.BURN.SPIKE.K1")
                    
                # Check unusual mint/burn ratio
                ratio_anomaly = self._check_mint_burn_ratio(token)
                if ratio_anomaly:
                    reason_codes.append("PG.MINT.RATIO.K1")
                    
            # Check for coordinated mint/burn across multiple tokens
            coordinated = self._check_coordinated_activity()
            if coordinated:
                reason_codes.append("PG.MINT.COORDINATED.K1")
                
            return reason_codes
            
        except Exception as e:
            logger.error(f"Error detecting mint/burn anomalies: {e}")
            return []
            
    def _check_mint_spike(self, token: str) -> bool:
        """Check for mint volume spike above baseline."""
        try:
            if token not in self.mint_history:
                return False
                
            mint_events = list(self.mint_history[token])
            if len(mint_events) < self.min_baseline_samples:
                return False
                
            # Calculate recent vs baseline volumes
            current_time = int(time.time())
            recent_cutoff = current_time - 300  # Last 5 minutes
            
            recent_volume = sum(amount for ts, amount in mint_events if ts >= recent_cutoff)
            baseline_volumes = [amount for ts, amount in mint_events if ts < recent_cutoff]
            
            if not baseline_volumes:
                return False
                
            # Statistical spike detection
            import numpy as np
            baseline_mean = np.mean(baseline_volumes)
            baseline_std = np.std(baseline_volumes)
            
            if baseline_std == 0:
                return recent_volume > 0
                
            z_score = (recent_volume - baseline_mean) / baseline_std
            return z_score > self.spike_threshold
            
        except Exception as e:
            logger.error(f"Error checking mint spike: {e}")
            return False
            
    def _check_burn_spike(self, token: str) -> bool:
        """Check for burn volume spike above baseline."""
        try:
            if token not in self.burn_history:
                return False
                
            burn_events = list(self.burn_history[token])
            if len(burn_events) < self.min_baseline_samples:
                return False
                
            # Calculate recent vs baseline volumes
            current_time = int(time.time())
            recent_cutoff = current_time - 300  # Last 5 minutes
            
            recent_volume = sum(amount for ts, amount in burn_events if ts >= recent_cutoff)
            baseline_volumes = [amount for ts, amount in burn_events if ts < recent_cutoff]
            
            if not baseline_volumes:
                return False
                
            # Statistical spike detection
            import numpy as np
            baseline_mean = np.mean(baseline_volumes)
            baseline_std = np.std(baseline_volumes)
            
            if baseline_std == 0:
                return recent_volume > 0
                
            z_score = (recent_volume - baseline_mean) / baseline_std
            return z_score > self.spike_threshold
            
        except Exception as e:
            logger.error(f"Error checking burn spike: {e}")
            return False
            
    def _check_mint_burn_ratio(self, token: str) -> bool:
        """Check for unusual mint/burn ratio."""
        try:
            mint_events = list(self.mint_history.get(token, []))
            burn_events = list(self.burn_history.get(token, []))
            
            if not mint_events and not burn_events:
                return False
                
            recent_cutoff = int(time.time()) - 300  # Last 5 minutes
            
            recent_mints = sum(amount for ts, amount in mint_events if ts >= recent_cutoff)
            recent_burns = sum(amount for ts, amount in burn_events if ts >= recent_cutoff)
            
            # Check for extreme ratios
            if recent_mints > 0 and recent_burns == 0:
                return recent_mints > 1000  # Large mint with no burn
            elif recent_burns > 0 and recent_mints == 0:
                return recent_burns > 1000  # Large burn with no mint
            elif recent_mints > 0 and recent_burns > 0:
                ratio = recent_mints / recent_burns
                return ratio > 10 or ratio < 0.1  # Extreme ratio
                
            return False
            
        except Exception as e:
            logger.error(f"Error checking mint/burn ratio: {e}")
            return False
            
    def _check_coordinated_activity(self) -> bool:
        """Check for coordinated mint/burn across multiple tokens."""
        try:
            current_time = int(time.time())
            recent_cutoff = current_time - 300  # Last 5 minutes
            
            # Count tokens with recent mint/burn activity
            active_tokens = set()
            
            for token, events in self.mint_history.items():
                for ts, amount in events:
                    if ts >= recent_cutoff and amount > 100:  # Significant amount
                        active_tokens.add(token)
                        
            for token, events in self.burn_history.items():
                for ts, amount in events:
                    if ts >= recent_cutoff and amount > 100:  # Significant amount
                        active_tokens.add(token)
                        
            # Coordinated if multiple tokens active simultaneously
            return len(active_tokens) >= 3
            
        except Exception as e:
            logger.error(f"Error checking coordinated activity: {e}")
            return False
            
    def get_detector_stats(self) -> Dict[str, Any]:
        """Get detector statistics."""
        try:
            return {
                "tracked_tokens_mint": len(self.mint_history),
                "tracked_tokens_burn": len(self.burn_history),
                "total_transfer_events": len(self.transfer_events),
                "time_window": self.time_window,
                "spike_threshold": self.spike_threshold
            }
        except Exception as e:
            logger.error(f"Error getting detector stats: {e}")
            return {}


# Global detector instance
mint_burn_detector = MintBurnDetector()


def detect_mint_burn_patterns(transactions: List[Dict[str, Any]]) -> List[List[str]]:
    """Detect mint/burn patterns for a batch of transactions."""
    try:
        results = []
        
        for tx in transactions:
            # Add to detector
            mint_burn_detector.add_transaction(tx)
            
            # Detect patterns
            patterns = mint_burn_detector.detect_mint_burn_anomalies(tx)
            results.append(patterns)
            
        return results
        
    except Exception as e:
        logger.error(f"Error detecting mint/burn patterns: {e}")
        return []