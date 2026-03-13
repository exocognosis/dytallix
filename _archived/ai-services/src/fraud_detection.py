"""
Fraud Detection Module

Uses machine learning to detect fraudulent transaction patterns
and anomalous behavior in the Dytallix network.
"""

import asyncio
import logging
import numpy as np
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
import os
import sys
import hashlib
from collections import defaultdict, deque
import math

# Add models directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'models'))

try:
    from models.fraud_model import AdvancedFraudDetector
    PYTORCH_AVAILABLE = True
except ImportError:
    PYTORCH_AVAILABLE = False
    # Enhanced sklearn imports for real anomaly detection
    import joblib
    from sklearn.ensemble import IsolationForest, RandomForestClassifier
    from sklearn.preprocessing import StandardScaler, RobustScaler
    from sklearn.cluster import DBSCAN
    from sklearn.decomposition import PCA
    from sklearn.metrics.pairwise import cosine_similarity

logger = logging.getLogger(__name__)

class FraudDetector:
    def __init__(self):
        self.model_version = "3.0.0"
        self.last_update = datetime.now()
        self.is_model_loaded = False
        
        # Enhanced anomaly detection components
        self.models = {}
        self.scalers = {}
        self.feature_history = deque(maxlen=10000)  # Store recent feature vectors
        self.transaction_graph = defaultdict(list)  # Address relationship graph
        self.velocity_trackers = defaultdict(lambda: deque(maxlen=100))  # Transaction velocity per address
        
        # Behavioral baselines
        self.address_profiles = defaultdict(lambda: {
            'avg_amount': 0.0,
            'tx_count': 0,
            'typical_hours': set(),
            'counterparties': set(),
            'amount_variance': 0.0
        })
        
        # Try to use advanced PyTorch model, fallback to sklearn
        if PYTORCH_AVAILABLE:
            self._initialize_advanced_model()
        else:
            self._initialize_enhanced_sklearn_model()
    
    def _initialize_advanced_model(self):
        """Initialize advanced PyTorch-based fraud detection model"""
        try:
            logger.info("Initializing advanced PyTorch fraud detection model...")
            self.detector = AdvancedFraudDetector()
            self.is_model_loaded = self.detector.is_loaded
            logger.info("Advanced fraud detection model initialized")
            
        except Exception as e:
            logger.error(f"Failed to initialize advanced model: {e}")
            self._initialize_enhanced_sklearn_model()
    
    def _initialize_enhanced_sklearn_model(self):
        """Initialize enhanced sklearn-based ensemble model"""
        try:
            logger.info("Initializing enhanced sklearn fraud detection ensemble...")
            
            # Multiple models for different aspects of fraud detection
            self.models = {
                # Isolation Forest for general anomaly detection
                'isolation_forest': IsolationForest(
                    contamination=0.05,
                    random_state=42,
                    n_estimators=200,
                    max_samples=0.8,
                    max_features=0.8
                ),
                
                # DBSCAN for clustering analysis
                'dbscan': DBSCAN(
                    eps=0.5,
                    min_samples=5,
                    metric='euclidean'
                ),
                
                # Random Forest for pattern classification
                'random_forest': RandomForestClassifier(
                    n_estimators=100,
                    max_depth=10,
                    random_state=42
                )
            }
            
            # Enhanced scalers
            self.scalers = {
                'robust': RobustScaler(),  # Robust to outliers
                'standard': StandardScaler()  # Standard normalization
            }
            
            self.detector = None
            self.is_model_loaded = True
            logger.info("Enhanced fraud detection ensemble initialized")
            
        except Exception as e:
            logger.error(f"Failed to initialize enhanced fraud detection: {e}")
            self.is_model_loaded = False
    
    def is_ready(self) -> bool:
        """Check if the fraud detector is ready"""
        return self.is_model_loaded and bool(self.models)
    
    def get_model_version(self) -> str:
        """Get current model version"""
        return self.model_version
    
    def get_last_update_time(self) -> str:
        """Get last model update time"""
        return self.last_update.isoformat()
    
    async def analyze_transaction(
        self, 
        transaction: Dict[str, Any], 
        historical_data: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Enhanced fraud analysis using multiple detection algorithms
        
        Args:
            transaction: Current transaction data
            historical_data: Historical transaction data for context
            
        Returns:
            Comprehensive analysis result with fraud probability and detailed risk assessment
        """
        try:
            # Use advanced model if available
            if self.detector and hasattr(self.detector, 'analyze_transaction'):
                return await self.detector.analyze_transaction(transaction, historical_data)
            
            # Enhanced multi-model analysis
            return await self._enhanced_fraud_analysis(transaction, historical_data)
            
        except Exception as e:
            logger.error(f"Fraud analysis failed: {e}")
            return {
                "is_fraudulent": False,
                "confidence": 0.0,
                "fraud_score": 0.0,
                "risk_factors": ["Analysis failed"],
                "anomaly_scores": {},
                "behavioral_flags": [],
                "network_flags": [],
                "recommended_action": "manual_review",
                "error": str(e)
            }
    
    async def _enhanced_fraud_analysis(
        self,
        transaction: Dict[str, Any],
        historical_data: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Enhanced multi-layered fraud analysis"""
        
        # 1. Extract comprehensive features
        features, feature_metadata = self._extract_enhanced_features(transaction, historical_data)
        
        # 2. Update behavioral profiles
        self._update_behavioral_profiles(transaction)
        
        # 3. Multi-model anomaly detection
        anomaly_scores = self._calculate_multi_model_scores(features)
        
        # 4. Behavioral analysis
        behavioral_flags = self._analyze_behavioral_patterns(transaction, historical_data)
        
        # 5. Network analysis
        network_flags = self._analyze_network_patterns(transaction, historical_data)
        
        # 6. Calculate composite fraud score
        fraud_score = self._calculate_composite_score(
            anomaly_scores, behavioral_flags, network_flags, feature_metadata
        )
        
        # 7. Identify specific risk factors
        risk_factors = self._identify_enhanced_risk_factors(
            transaction, features, fraud_score, behavioral_flags, network_flags
        )
        
        # 8. Generate recommendation
        recommendation = self._generate_enhanced_recommendation(fraud_score, risk_factors)
        
        result = {
            "is_fraudulent": fraud_score > 0.7,
            "confidence": float(fraud_score),
            "fraud_score": float(fraud_score),
            "risk_factors": risk_factors,
            "anomaly_scores": {k: float(v) for k, v in anomaly_scores.items()},
            "behavioral_flags": behavioral_flags,
            "network_flags": network_flags,
            "recommended_action": recommendation,
            "analysis_timestamp": datetime.now().isoformat(),
            "model_version": self.model_version,
            "feature_metadata": feature_metadata
        }
        
        logger.info(f"Enhanced fraud analysis completed: fraud_score={fraud_score:.3f}")
        return result
    
    def _extract_enhanced_features(
        self, 
        transaction: Dict, 
        historical_data: List[Dict]
    ) -> Tuple[np.ndarray, Dict]:
        """Extract comprehensive feature vector with metadata"""
        features = []
        metadata = {}
        
        # Basic transaction features
        amount = float(transaction.get("amount", 0))
        timestamp = transaction.get("timestamp", 0)
        from_addr = transaction.get("from_address", "")
        to_addr = transaction.get("to_address", "")
        
        # 1. Amount-based features
        log_amount = np.log1p(amount)
        features.extend([
            log_amount,
            amount,
            int(amount > 100000),  # Large transaction flag
            int(amount < 0.01),    # Dust transaction flag
        ])
        metadata["amount_features"] = ["log_amount", "raw_amount", "large_tx_flag", "dust_tx_flag"]
        
        # 2. Temporal features
        dt = datetime.fromtimestamp(timestamp) if timestamp > 0 else datetime.now()
        hour = dt.hour
        day_of_week = dt.weekday()
        is_weekend = int(day_of_week >= 5)
        is_night = int(hour < 6 or hour > 22)
        
        features.extend([
            hour / 24.0,           # Normalized hour
            day_of_week / 7.0,     # Normalized day
            is_weekend,
            is_night,
            math.sin(2 * math.pi * hour / 24),  # Cyclical hour encoding
            math.cos(2 * math.pi * hour / 24),
        ])
        metadata["temporal_features"] = ["norm_hour", "norm_day", "weekend_flag", "night_flag", "hour_sin", "hour_cos"]
        
        # 3. Address-based features
        from_addr_hash = hashlib.sha256(from_addr.encode()).hexdigest()[:16]
        to_addr_hash = hashlib.sha256(to_addr.encode()).hexdigest()[:16]
        
        features.extend([
            len(from_addr),
            len(to_addr),
            len(set(from_addr.lower())),     # Character diversity
            len(set(to_addr.lower())),
            int(from_addr == to_addr),       # Self-transaction
            int(from_addr_hash == to_addr_hash[:16]),  # Address similarity
        ])
        metadata["address_features"] = ["from_len", "to_len", "from_diversity", "to_diversity", "self_tx", "addr_similarity"]
        
        # 4. Historical context features
        if historical_data:
            recent_txs = [tx for tx in historical_data 
                         if tx.get("timestamp", 0) > timestamp - 3600]  # Last hour
            
            from_addr_history = [tx for tx in historical_data 
                               if tx.get("from_address") == from_addr]
            
            to_addr_history = [tx for tx in historical_data 
                             if tx.get("to_address") == to_addr]
            
            # Transaction frequency features
            features.extend([
                len(recent_txs),
                len(from_addr_history),
                len(to_addr_history),
            ])
            
            # Amount pattern features
            if from_addr_history:
                amounts = [float(tx.get("amount", 0)) for tx in from_addr_history]
                avg_amount = np.mean(amounts)
                std_amount = np.std(amounts) if len(amounts) > 1 else 0
                amount_z_score = abs((amount - avg_amount) / (std_amount + 1e-6))
                
                features.extend([
                    np.log1p(avg_amount),
                    amount_z_score,
                    int(amount > avg_amount * 10),  # 10x larger than usual
                ])
            else:
                features.extend([0.0, 0.0, 0])
            
            # Velocity features
            if len(from_addr_history) > 1:
                time_diffs = []
                for i in range(1, len(from_addr_history)):
                    time_diff = from_addr_history[i].get("timestamp", 0) - from_addr_history[i-1].get("timestamp", 0)
                    time_diffs.append(time_diff)
                
                avg_velocity = np.mean(time_diffs) if time_diffs else 3600
                current_velocity = timestamp - from_addr_history[-1].get("timestamp", timestamp)
                velocity_ratio = current_velocity / (avg_velocity + 1)
                
                features.extend([
                    np.log1p(avg_velocity),
                    np.log1p(current_velocity),
                    velocity_ratio,
                ])
            else:
                features.extend([0.0, 0.0, 1.0])
                
        else:
            # No historical data
            features.extend([0.0] * 9)  # Pad with zeros
        
        metadata["historical_features"] = ["recent_count", "from_history_count", "to_history_count", 
                                         "avg_amount_log", "amount_z_score", "large_amount_flag",
                                         "avg_velocity_log", "current_velocity_log", "velocity_ratio"]
        
        # 5. Graph-based features
        graph_features = self._extract_graph_features(from_addr, to_addr, historical_data)
        features.extend(graph_features)
        metadata["graph_features"] = ["centrality_from", "centrality_to", "common_neighbors", "clustering_coeff"]
        
        # 6. Behavioral deviation features
        behavioral_features = self._extract_behavioral_features(transaction, from_addr)
        features.extend(behavioral_features)
        metadata["behavioral_features"] = ["hour_deviation", "amount_deviation", "counterparty_novelty"]
        
        return np.array(features).reshape(1, -1), metadata
    
    def _extract_graph_features(self, from_addr: str, to_addr: str, historical_data: List[Dict]) -> List[float]:
        """Extract graph-based network features"""
        features = []
        
        # Build transaction graph if needed
        if historical_data:
            for tx in historical_data[-1000:]:  # Use recent transactions
                f_addr = tx.get("from_address", "")
                t_addr = tx.get("to_address", "")
                if f_addr and t_addr:
                    self.transaction_graph[f_addr].append(t_addr)
        
        # Calculate centrality measures (simplified)
        from_centrality = len(set(self.transaction_graph.get(from_addr, [])))
        to_centrality = len([addr for addr, connections in self.transaction_graph.items() 
                           if to_addr in connections])
        
        # Common neighbors
        from_neighbors = set(self.transaction_graph.get(from_addr, []))
        to_neighbors = set([addr for addr, connections in self.transaction_graph.items() 
                          if to_addr in connections])
        common_neighbors = len(from_neighbors.intersection(to_neighbors))
        
        # Clustering coefficient (simplified)
        clustering_coeff = 0.0
        if from_neighbors:
            neighbor_connections = 0
            for neighbor in from_neighbors:
                neighbor_connections += len(set(self.transaction_graph.get(neighbor, [])).intersection(from_neighbors))
            clustering_coeff = neighbor_connections / (len(from_neighbors) * (len(from_neighbors) - 1) + 1)
        
        features.extend([
            np.log1p(from_centrality),
            np.log1p(to_centrality),
            np.log1p(common_neighbors),
            clustering_coeff
        ])
        
        return features
    
    def _extract_behavioral_features(self, transaction: Dict, from_addr: str) -> List[float]:
        """Extract behavioral deviation features"""
        features = []
        
        profile = self.address_profiles[from_addr]
        timestamp = transaction.get("timestamp", 0)
        amount = float(transaction.get("amount", 0))
        hour = datetime.fromtimestamp(timestamp).hour if timestamp > 0 else 12
        
        # Hour deviation from typical behavior
        typical_hours = profile.get('typical_hours', set())
        hour_deviation = 0.0 if hour in typical_hours else 1.0
        
        # Amount deviation from typical behavior
        avg_amount = profile.get('avg_amount', amount)
        amount_deviation = abs(amount - avg_amount) / (avg_amount + 1) if avg_amount > 0 else 0
        
        # Counterparty novelty
        to_addr = transaction.get("to_address", "")
        known_counterparties = profile.get('counterparties', set())
        counterparty_novelty = 0.0 if to_addr in known_counterparties else 1.0
        
        features.extend([hour_deviation, amount_deviation, counterparty_novelty])
        return features
    
    def _calculate_multi_model_scores(self, features: np.ndarray) -> Dict[str, float]:
        """Calculate anomaly scores using multiple models"""
        scores = {}
        
        try:
            if not self.is_ready():
                return {"isolation_forest": 0.5, "clustering": 0.5, "statistical": 0.5}
            
            # Scale features
            features_robust = self.scalers['robust'].fit_transform(features)
            features_standard = self.scalers['standard'].fit_transform(features)
            
            # 1. Isolation Forest Score
            if 'isolation_forest' in self.models:
                # Fit on recent feature history if available
                if len(self.feature_history) > 100:
                    recent_features = np.array(list(self.feature_history))
                    self.models['isolation_forest'].fit(recent_features)
                    
                anomaly_score = self.models['isolation_forest'].decision_function(features_robust)[0]
                scores['isolation_forest'] = max(0.0, min(1.0, (1 - anomaly_score) / 2))
            
            # 2. Statistical anomaly score (Mahalanobis-like distance)
            if len(self.feature_history) > 10:
                historical_features = np.array(list(self.feature_history))
                mean_features = np.mean(historical_features, axis=0)
                cov_matrix = np.cov(historical_features.T)
                
                try:
                    inv_cov = np.linalg.pinv(cov_matrix)
                    diff = features_standard[0] - mean_features
                    mahal_dist = np.sqrt(diff.T @ inv_cov @ diff)
                    scores['statistical'] = min(1.0, mahal_dist / 10.0)  # Normalize
                except:
                    scores['statistical'] = 0.5
            else:
                scores['statistical'] = 0.5
            
            # 3. Clustering-based anomaly score
            if len(self.feature_history) > 50:
                try:
                    historical_features = np.array(list(self.feature_history))
                    clusters = self.models['dbscan'].fit_predict(historical_features)
                    
                    # Check if current transaction would be an outlier
                    combined_features = np.vstack([historical_features, features_standard])
                    new_clusters = self.models['dbscan'].fit_predict(combined_features)
                    
                    if new_clusters[-1] == -1:  # Outlier
                        scores['clustering'] = 0.8
                    else:
                        scores['clustering'] = 0.2
                except:
                    scores['clustering'] = 0.5
            else:
                scores['clustering'] = 0.5
            
            # Store features for future analysis
            self.feature_history.append(features[0])
            
        except Exception as e:
            logger.error(f"Multi-model scoring failed: {e}")
            scores = {"isolation_forest": 0.5, "clustering": 0.5, "statistical": 0.5}
        
        return scores
    
    def _analyze_behavioral_patterns(self, transaction: Dict, historical_data: List[Dict]) -> List[str]:
        """Analyze behavioral anomalies"""
        flags = []
        
        from_addr = transaction.get("from_address", "")
        amount = float(transaction.get("amount", 0))
        timestamp = transaction.get("timestamp", 0)
        
        if not from_addr:
            return flags
        
        # Get address profile
        profile = self.address_profiles[from_addr]
        
        # Check for unusual amount patterns
        if profile['tx_count'] > 10:
            avg_amount = profile['avg_amount']
            if amount > avg_amount * 20:  # 20x larger than average
                flags.append("unusual_large_amount")
            elif amount < avg_amount / 20:  # 20x smaller than average
                flags.append("unusual_small_amount")
        
        # Check for unusual timing
        if timestamp > 0:
            hour = datetime.fromtimestamp(timestamp).hour
            if profile['typical_hours'] and hour not in profile['typical_hours']:
                flags.append("unusual_timing")
        
        # Check transaction velocity
        if from_addr in self.velocity_trackers:
            recent_timestamps = [tx.get("timestamp", 0) for tx in self.velocity_trackers[from_addr]]
            if len(recent_timestamps) > 1:
                avg_interval = np.mean(np.diff(sorted(recent_timestamps)))
                last_tx_time = max(recent_timestamps) if recent_timestamps else 0
                current_interval = timestamp - last_tx_time
                
                if current_interval < avg_interval / 10:  # Much faster than usual
                    flags.append("high_velocity")
                elif current_interval > avg_interval * 100:  # Much slower than usual
                    flags.append("dormant_reactivation")
        
        return flags
    
    def _analyze_network_patterns(self, transaction: Dict, historical_data: List[Dict]) -> List[str]:
        """Analyze network-based anomalies"""
        flags = []
        
        from_addr = transaction.get("from_address", "")
        to_addr = transaction.get("to_address", "")
        amount = float(transaction.get("amount", 0))
        timestamp = transaction.get("timestamp", 0)
        
        # Check for potential money laundering patterns
        round_trip_score = self._calculate_round_trip_score(transaction, historical_data)
        if round_trip_score > 0.5:
            flags.append("potential_round_trip")
        
        # Check for structuring (amounts just under reporting thresholds)
        structuring_thresholds = [10000, 50000, 100000]
        for threshold in structuring_thresholds:
            if threshold * 0.9 <= amount < threshold:
                flags.append("potential_structuring")
                break
        
        # Check for fan-out patterns (one-to-many rapid transactions)
        if historical_data:
            recent_txs = [tx for tx in historical_data 
                         if tx.get("from_address") == from_addr and 
                         tx.get("timestamp", 0) > timestamp - 300]  # Last 5 minutes
            
            unique_recipients = len(set(tx.get("to_address") for tx in recent_txs))
            if len(recent_txs) > 10 and unique_recipients > 5:
                flags.append("fan_out_pattern")
        
        # Check for mixing service patterns
        if self._is_potential_mixer(to_addr, historical_data):
            flags.append("potential_mixer_usage")
        
        return flags
    
    def _is_potential_mixer(self, address: str, historical_data: List[Dict]) -> bool:
        """Detect potential cryptocurrency mixing services"""
        if not historical_data:
            return False
        
        # Count unique senders and receivers for this address
        senders = set()
        receivers = set()
        
        for tx in historical_data:
            if tx.get("to_address") == address:
                senders.add(tx.get("from_address"))
            elif tx.get("from_address") == address:
                receivers.add(tx.get("to_address"))
        
        # High ratio of unique counterparties suggests mixing
        total_counterparties = len(senders) + len(receivers)
        return total_counterparties > 50  # Threshold for mixer detection
    
    def _calculate_composite_score(
        self, 
        anomaly_scores: Dict[str, float], 
        behavioral_flags: List[str], 
        network_flags: List[str],
        feature_metadata: Dict
    ) -> float:
        """Calculate composite fraud score from multiple signals"""
        
        # Base anomaly score (weighted average)
        weights = {
            'isolation_forest': 0.4,
            'statistical': 0.3,
            'clustering': 0.3
        }
        
        base_score = sum(anomaly_scores.get(model, 0.5) * weight 
                        for model, weight in weights.items())
        
        # Behavioral penalty
        behavioral_penalty = len(behavioral_flags) * 0.1
        
        # Network penalty
        network_penalty = len(network_flags) * 0.15
        
        # Special high-risk patterns
        high_risk_bonus = 0.0
        critical_flags = ['potential_round_trip', 'potential_structuring', 
                         'fan_out_pattern', 'potential_mixer_usage']
        
        for flag in network_flags:
            if flag in critical_flags:
                high_risk_bonus += 0.2
        
        # Combine scores
        composite_score = base_score + behavioral_penalty + network_penalty + high_risk_bonus
        
        # Cap at 1.0
        return min(1.0, composite_score)
    
    def _update_behavioral_profiles(self, transaction: Dict):
        """Update behavioral profiles for addresses"""
        from_addr = transaction.get("from_address", "")
        to_addr = transaction.get("to_address", "")
        amount = float(transaction.get("amount", 0))
        timestamp = transaction.get("timestamp", 0)
        
        if not from_addr:
            return
        
        profile = self.address_profiles[from_addr]
        
        # Update transaction count and average amount
        profile['tx_count'] += 1
        old_avg = profile['avg_amount']
        profile['avg_amount'] = (old_avg * (profile['tx_count'] - 1) + amount) / profile['tx_count']
        
        # Update amount variance
        if profile['tx_count'] > 1:
            old_variance = profile['amount_variance']
            new_variance = ((profile['tx_count'] - 2) * old_variance + 
                          (amount - old_avg) * (amount - profile['avg_amount'])) / (profile['tx_count'] - 1)
            profile['amount_variance'] = max(0, new_variance)
        
        # Update typical hours
        if timestamp > 0:
            hour = datetime.fromtimestamp(timestamp).hour
            profile['typical_hours'].add(hour)
        
        # Update counterparties
        if to_addr:
            profile['counterparties'].add(to_addr)
            
        # Update velocity tracker
        self.velocity_trackers[from_addr].append(transaction)
    
    def _identify_enhanced_risk_factors(
        self, 
        transaction: Dict, 
        features: np.ndarray, 
        fraud_score: float,
        behavioral_flags: List[str],
        network_flags: List[str]
    ) -> List[str]:
        """Identify comprehensive risk factors"""
        risk_factors = []
        
        amount = float(transaction.get("amount", 0))
        timestamp = transaction.get("timestamp", 0)
        from_addr = transaction.get("from_address", "")
        to_addr = transaction.get("to_address", "")
        
        # Score-based risk factors
        if fraud_score > 0.9:
            risk_factors.append("very_high_fraud_score")
        elif fraud_score > 0.7:
            risk_factors.append("high_fraud_score")
        elif fraud_score > 0.5:
            risk_factors.append("medium_fraud_score")
        
        # Amount-based risk factors
        if amount > 1000000:  # Very large transaction
            risk_factors.append("very_large_amount")
        elif amount > 100000:  # Large transaction
            risk_factors.append("large_amount")
        elif amount < 0.001:  # Dust transaction
            risk_factors.append("dust_transaction")
        
        # Timing risk factors
        if timestamp > 0:
            hour = datetime.fromtimestamp(timestamp).hour
            if hour < 6 or hour > 22:
                risk_factors.append("unusual_timing")
            
            # Weekend transactions might be more suspicious for business addresses
            day_of_week = datetime.fromtimestamp(timestamp).weekday()
            if day_of_week >= 5:  # Weekend
                risk_factors.append("weekend_transaction")
        
        # Address risk factors
        if len(from_addr) < 20 or len(to_addr) < 20:
            risk_factors.append("suspicious_address_format")
        
        if from_addr == to_addr:
            risk_factors.append("self_transaction")
        
        # Add behavioral flags
        risk_factors.extend([f"behavioral_{flag}" for flag in behavioral_flags])
        
        # Add network flags
        risk_factors.extend([f"network_{flag}" for flag in network_flags])
        
        # Historical pattern risks
        profile = self.address_profiles.get(from_addr, {})
        if profile.get('tx_count', 0) == 1:
            risk_factors.append("new_address")
        elif profile.get('tx_count', 0) > 1000:
            risk_factors.append("high_activity_address")
        
        return risk_factors
    
    def _generate_enhanced_recommendation(
        self, 
        fraud_score: float, 
        risk_factors: List[str]
    ) -> str:
        """Generate enhanced recommended action"""
        
        # Critical risk patterns
        critical_patterns = [
            "very_high_fraud_score", 
            "network_potential_round_trip",
            "network_potential_mixer_usage",
            "network_fan_out_pattern"
        ]
        
        high_risk_patterns = [
            "high_fraud_score",
            "very_large_amount", 
            "network_potential_structuring",
            "behavioral_unusual_large_amount"
        ]
        
        # Check for critical patterns
        if any(pattern in risk_factors for pattern in critical_patterns):
            return "block_transaction"
        
        # Check fraud score thresholds
        if fraud_score > 0.9:
            return "block_transaction"
        elif fraud_score > 0.8:
            return "require_enhanced_verification"
        elif fraud_score > 0.7:
            return "require_additional_verification"
        
        # Check for high risk patterns
        if any(pattern in risk_factors for pattern in high_risk_patterns):
            return "require_additional_verification"
        
        # Check risk factor count
        if len(risk_factors) > 5:
            return "flag_for_monitoring"
        elif len(risk_factors) > 3:
            return "manual_review"
        elif fraud_score > 0.5:
            return "flag_for_monitoring"
        else:
            return "approve"
    def _calculate_round_trip_score(
        self, 
        transaction: Dict, 
        historical_data: List[Dict]
    ) -> float:
        """Enhanced round-trip detection with multiple patterns"""
        if not historical_data:
            return 0.0
        
        from_addr = transaction.get("from_address", "")
        to_addr = transaction.get("to_address", "")
        amount = float(transaction.get("amount", 0))
        timestamp = transaction.get("timestamp", 0)
        
        max_score = 0.0
        
        # Look for various round-trip patterns
        for tx in historical_data:
            tx_from = tx.get("from_address", "")
            tx_to = tx.get("to_address", "")
            tx_amount = float(tx.get("amount", 0))
            tx_timestamp = tx.get("timestamp", 0)
            
            # Direct reverse transaction
            if (tx_from == to_addr and tx_to == from_addr):
                amount_similarity = 1 - abs(tx_amount - amount) / max(amount, tx_amount)
                time_factor = max(0, 1 - abs(tx_timestamp - timestamp) / 7200)  # 2 hour window
                
                score = amount_similarity * time_factor
                max_score = max(max_score, score)
            
            # Chain patterns (A->B->C->A)
            elif tx_from == from_addr and tx_to != to_addr:
                # Look for continuation of chain
                for tx2 in historical_data:
                    if (tx2.get("from_address") == tx_to and 
                        tx2.get("to_address") == to_addr and
                        abs(tx2.get("timestamp", 0) - tx_timestamp) < 1800):  # 30 min chain
                        
                        chain_score = 0.7  # Lower score for chain patterns
                        max_score = max(max_score, chain_score)
        
        return max_score
    
    async def update_model(self, training_data: List[Dict], feedback_data: List[Dict] = None) -> bool:
        """Enhanced model update with incremental learning"""
        try:
            logger.info("Updating enhanced fraud detection models...")
            
            if not training_data:
                logger.warning("No training data provided for model update")
                return False
            
            # Extract features from training data
            feature_vectors = []
            labels = []
            
            for data_point in training_data:
                transaction = data_point.get('transaction', {})
                is_fraud = data_point.get('is_fraud', False)
                historical = data_point.get('historical_data', [])
                
                features, _ = self._extract_enhanced_features(transaction, historical)
                feature_vectors.append(features[0])
                labels.append(1 if is_fraud else 0)
            
            if not feature_vectors:
                logger.warning("No valid features extracted from training data")
                return False
            
            feature_matrix = np.array(feature_vectors)
            label_array = np.array(labels)
            
            # Update scalers
            self.scalers['robust'].fit(feature_matrix)
            self.scalers['standard'].fit(feature_matrix)
            
            # Update models
            if 'random_forest' in self.models and len(set(labels)) > 1:
                # Only train classifier if we have both fraud and non-fraud examples
                self.models['random_forest'].fit(feature_matrix, label_array)
                logger.info("Random Forest classifier updated")
            
            # Update isolation forest with new data
            if 'isolation_forest' in self.models:
                # Combine with existing feature history
                if len(self.feature_history) > 0:
                    combined_features = np.vstack([
                        np.array(list(self.feature_history)),
                        feature_matrix
                    ])
                else:
                    combined_features = feature_matrix
                
                self.models['isolation_forest'].fit(combined_features)
                logger.info("Isolation Forest updated")
            
            # Process feedback data for model improvement
            if feedback_data:
                self._process_feedback(feedback_data)
            
            # Update feature history
            for features in feature_vectors:
                self.feature_history.append(features)
            
            self.last_update = datetime.now()
            logger.info(f"Model update completed with {len(training_data)} samples")
            return True
            
        except Exception as e:
            logger.error(f"Enhanced model update failed: {e}")
            return False
    
    def _process_feedback(self, feedback_data: List[Dict]):
        """Process human feedback to improve model performance"""
        for feedback in feedback_data:
            transaction_id = feedback.get('transaction_id')
            human_label = feedback.get('human_label')  # 'fraud' or 'legitimate'
            model_prediction = feedback.get('model_prediction', {})
            
            # Log feedback for analysis
            logger.info(f"Feedback received for {transaction_id}: "
                       f"Human={human_label}, Model={model_prediction.get('is_fraudulent')}")
            
            # In a production system, this would:
            # 1. Update model weights based on feedback
            # 2. Adjust decision thresholds
            # 3. Retrain specific components
            # 4. Update feature importance scores
    
    def get_model_statistics(self) -> Dict[str, Any]:
        """Get comprehensive model statistics and health metrics"""
        stats = {
            "model_version": self.model_version,
            "last_update": self.last_update.isoformat(),
            "is_ready": self.is_ready(),
            "feature_history_size": len(self.feature_history),
            "address_profiles_count": len(self.address_profiles),
            "transaction_graph_nodes": len(self.transaction_graph),
            "available_models": list(self.models.keys()) if self.models else [],
            "available_scalers": list(self.scalers.keys()) if self.scalers else []
        }
        
        # Add model-specific statistics
        if self.models:
            if 'isolation_forest' in self.models:
                stats['isolation_forest_estimators'] = getattr(
                    self.models['isolation_forest'], 'n_estimators', 0
                )
            
            if 'random_forest' in self.models and hasattr(self.models['random_forest'], 'feature_importances_'):
                stats['feature_importances'] = self.models['random_forest'].feature_importances_.tolist()
        
        return stats
    
    def reset_profiles(self):
        """Reset behavioral profiles and caches (for testing or maintenance)"""
        logger.info("Resetting fraud detector profiles and caches")
        self.address_profiles.clear()
        self.transaction_graph.clear()
        self.velocity_trackers.clear()
        self.feature_history.clear()

# Example usage and testing functionality
async def test_fraud_detector():
    """Test the enhanced fraud detector with sample data"""
    detector = FraudDetector()
    
    # Sample transaction
    transaction = {
        "amount": 50000,
        "timestamp": datetime.now().timestamp(),
        "from_address": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
        "to_address": "3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy",
        "transaction_id": "test_tx_001"
    }
    
    # Sample historical data
    historical_data = [
        {
            "amount": 1000,
            "timestamp": datetime.now().timestamp() - 3600,
            "from_address": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
            "to_address": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"
        }
    ]
    
    # Analyze transaction
    result = await detector.analyze_transaction(transaction, historical_data)
    
    logger.info(f"Fraud analysis result: {result}")
    return result

if __name__ == "__main__":
    # Run test
    asyncio.run(test_fraud_detector())
