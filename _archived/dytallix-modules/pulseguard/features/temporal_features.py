"""Temporal features for rolling aggregates and burst detection."""
import time
import logging
from collections import deque
from typing import Dict, List, Any, Optional
import numpy as np

logger = logging.getLogger(__name__)


class TemporalFeatureEngine:
    """Engine for computing rolling temporal features."""
    
    def __init__(self, window_seconds: int = 300):
        self.window_seconds = window_seconds
        self.transaction_buffer = deque()
        self.address_buffers = {}  # address -> deque of transactions
        
    def add_transaction(self, tx: Dict[str, Any]):
        """Add a transaction to the temporal buffers."""
        try:
            timestamp = tx.get("timestamp", int(time.time()))
            tx["timestamp"] = timestamp
            
            # Add to global buffer
            self.transaction_buffer.append(tx)
            
            # Add to address-specific buffers
            from_addr = tx.get("from")
            to_addr = tx.get("to")
            
            for addr in [from_addr, to_addr]:
                if addr:
                    if addr not in self.address_buffers:
                        self.address_buffers[addr] = deque()
                    self.address_buffers[addr].append(tx)
                    
            # Clean old data
            self._cleanup_old_data()
            
        except Exception as e:
            logger.error(f"Error adding transaction to temporal engine: {e}")
            
    def _cleanup_old_data(self):
        """Remove data older than the window."""
        try:
            current_time = int(time.time())
            cutoff_time = current_time - self.window_seconds
            
            # Clean global buffer
            while self.transaction_buffer and self.transaction_buffer[0]["timestamp"] < cutoff_time:
                self.transaction_buffer.popleft()
                
            # Clean address buffers
            for addr in list(self.address_buffers.keys()):
                buffer = self.address_buffers[addr]
                while buffer and buffer[0]["timestamp"] < cutoff_time:
                    buffer.popleft()
                    
                # Remove empty buffers
                if not buffer:
                    del self.address_buffers[addr]
                    
        except Exception as e:
            logger.error(f"Error cleaning temporal data: {e}")
            
    def compute_global_features(self) -> Dict[str, float]:
        """Compute global temporal features."""
        try:
            if not self.transaction_buffer:
                return {
                    "tx_count": 0.0,
                    "avg_value": 0.0,
                    "avg_gas": 0.0,
                    "unique_addresses": 0.0,
                    "tx_rate": 0.0,
                    "value_rate": 0.0,
                    "gas_rate": 0.0,
                    "burstiness": 0.0
                }
                
            txs = list(self.transaction_buffer)
            
            # Basic aggregates
            tx_count = len(txs)
            values = [tx.get("value", 0) for tx in txs]
            gas_amounts = [tx.get("gas", 0) for tx in txs]
            
            avg_value = np.mean(values) if values else 0.0
            avg_gas = np.mean(gas_amounts) if gas_amounts else 0.0
            
            # Unique addresses
            addresses = set()
            for tx in txs:
                if tx.get("from"):
                    addresses.add(tx["from"])
                if tx.get("to"):
                    addresses.add(tx["to"])
            unique_addresses = len(addresses)
            
            # Rates (per second)
            time_span = self.window_seconds
            tx_rate = tx_count / time_span if time_span > 0 else 0.0
            value_rate = sum(values) / time_span if time_span > 0 else 0.0
            gas_rate = sum(gas_amounts) / time_span if time_span > 0 else 0.0
            
            # Burstiness (coefficient of variation in inter-arrival times)
            burstiness = self._compute_burstiness(txs)
            
            return {
                "tx_count": float(tx_count),
                "avg_value": float(avg_value),
                "avg_gas": float(avg_gas),
                "unique_addresses": float(unique_addresses),
                "tx_rate": float(tx_rate),
                "value_rate": float(value_rate),
                "gas_rate": float(gas_rate),
                "burstiness": float(burstiness)
            }
            
        except Exception as e:
            logger.error(f"Error computing global temporal features: {e}")
            return {}
            
    def _compute_burstiness(self, transactions: List[Dict[str, Any]]) -> float:
        """Compute burstiness score from inter-arrival times."""
        try:
            if len(transactions) < 2:
                return 0.0
                
            # Sort by timestamp
            sorted_txs = sorted(transactions, key=lambda x: x["timestamp"])
            
            # Compute inter-arrival times
            inter_arrivals = []
            for i in range(1, len(sorted_txs)):
                dt = sorted_txs[i]["timestamp"] - sorted_txs[i-1]["timestamp"]
                inter_arrivals.append(max(1, dt))  # Avoid zero
                
            if not inter_arrivals:
                return 0.0
                
            # Coefficient of variation
            mean_dt = np.mean(inter_arrivals)
            std_dt = np.std(inter_arrivals)
            
            if mean_dt > 0:
                cv = std_dt / mean_dt
                # Scale to [0, 1] range
                return min(1.0, cv / 2.0)
            else:
                return 0.0
                
        except Exception as e:
            logger.error(f"Error computing burstiness: {e}")
            return 0.0
            
    def compute_address_features(self, address: str) -> Dict[str, float]:
        """Compute temporal features for a specific address."""
        try:
            if address not in self.address_buffers:
                return {
                    "addr_tx_count": 0.0,
                    "addr_avg_value": 0.0,
                    "addr_avg_gas": 0.0,
                    "addr_tx_rate": 0.0,
                    "addr_value_rate": 0.0,
                    "addr_recency": 1.0,  # No recent activity
                    "addr_burstiness": 0.0
                }
                
            txs = list(self.address_buffers[address])
            
            if not txs:
                return {}
                
            # Filter to transactions involving this address
            relevant_txs = [tx for tx in txs 
                          if tx.get("from") == address or tx.get("to") == address]
                          
            if not relevant_txs:
                return {}
                
            # Basic aggregates
            tx_count = len(relevant_txs)
            values = [tx.get("value", 0) for tx in relevant_txs]
            gas_amounts = [tx.get("gas", 0) for tx in relevant_txs]
            
            avg_value = np.mean(values) if values else 0.0
            avg_gas = np.mean(gas_amounts) if gas_amounts else 0.0
            
            # Rates
            time_span = self.window_seconds
            tx_rate = tx_count / time_span if time_span > 0 else 0.0
            value_rate = sum(values) / time_span if time_span > 0 else 0.0
            
            # Recency (time since last transaction, normalized)
            current_time = int(time.time())
            last_tx_time = max(tx["timestamp"] for tx in relevant_txs)
            recency = min(1.0, (current_time - last_tx_time) / self.window_seconds)
            
            # Burstiness
            burstiness = self._compute_burstiness(relevant_txs)
            
            return {
                "addr_tx_count": float(tx_count),
                "addr_avg_value": float(avg_value),
                "addr_avg_gas": float(avg_gas),
                "addr_tx_rate": float(tx_rate),
                "addr_value_rate": float(value_rate),
                "addr_recency": float(recency),
                "addr_burstiness": float(burstiness)
            }
            
        except Exception as e:
            logger.error(f"Error computing address features for {address}: {e}")
            return {}
            
    def compute_transaction_features(self, tx: Dict[str, Any]) -> Dict[str, float]:
        """Compute temporal features for a transaction."""
        try:
            features = {}
            
            # Add global features
            global_features = self.compute_global_features()
            features.update(global_features)
            
            # Add address-specific features
            from_addr = tx.get("from")
            if from_addr:
                from_features = self.compute_address_features(from_addr)
                for key, value in from_features.items():
                    features[f"from_{key}"] = value
                    
            to_addr = tx.get("to")
            if to_addr:
                to_features = self.compute_address_features(to_addr)
                for key, value in to_features.items():
                    features[f"to_{key}"] = value
                    
            return features
            
        except Exception as e:
            logger.error(f"Error computing transaction temporal features: {e}")
            return {}


# Global temporal engine
temporal_engine = TemporalFeatureEngine()


def compute_temporal_features(transactions: List[Dict[str, Any]]) -> List[Dict[str, float]]:
    """Compute temporal features for a batch of transactions."""
    try:
        # Add transactions to the engine
        for tx in transactions:
            temporal_engine.add_transaction(tx)
            
        # Compute features for each transaction
        features_list = []
        for tx in transactions:
            features = temporal_engine.compute_transaction_features(tx)
            features_list.append(features)
            
        return features_list
        
    except Exception as e:
        logger.error(f"Error computing temporal features: {e}")
        return []