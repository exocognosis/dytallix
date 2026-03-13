"""
Risk Scoring Module

Advanced risk assessment algorithms for transaction and address evaluation
using statistical analysis, machine learning, and network science techniques.
"""

import asyncio
import logging
import numpy as np
from typing import Dict, List, Optional, Any, Tuple, Set
from datetime import datetime, timedelta
from collections import defaultdict, deque
import math
import statistics
from dataclasses import dataclass
import hashlib

# Statistical and ML libraries
try:
    from scipy import stats
    from scipy.stats import zscore, chi2_contingency
    SCIPY_AVAILABLE = True
except ImportError:
    SCIPY_AVAILABLE = False

try:
    from sklearn.preprocessing import MinMaxScaler
    from sklearn.cluster import KMeans
    from sklearn.ensemble import IsolationForest
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False

logger = logging.getLogger(__name__)

@dataclass
class RiskMetrics:
    """Container for comprehensive risk metrics"""
    score: float
    level: str
    confidence: float
    factors: List[str]
    components: Dict[str, float]
    statistical_analysis: Dict[str, Any]
    behavioral_profile: Dict[str, Any]
    network_analysis: Dict[str, Any]

@dataclass
class AddressProfile:
    """Behavioral profile for an address"""
    total_transactions: int = 0
    total_volume: float = 0.0
    average_amount: float = 0.0
    amount_variance: float = 0.0
    typical_hours: Set[int] = None
    counterparties: Set[str] = None
    velocity_profile: List[float] = None
    first_seen: Optional[datetime] = None
    last_seen: Optional[datetime] = None
    
    def __post_init__(self):
        if self.typical_hours is None:
            self.typical_hours = set()
        if self.counterparties is None:
            self.counterparties = set()
        if self.velocity_profile is None:
            self.velocity_profile = []

class AdvancedRiskScorer:
    def __init__(self):
        self.model_version = "3.0.0"
        self.last_update = datetime.now()
        self.is_model_loaded = True
        
        # Enhanced risk scoring weights with fine-tuned coefficients
        self.risk_weights = {
            "statistical_anomaly": 0.20,
            "behavioral_deviation": 0.18,
            "network_centrality": 0.15,
            "velocity_analysis": 0.12,
            "amount_clustering": 0.10,
            "temporal_patterns": 0.08,
            "counterparty_risk": 0.10,
            "structural_patterns": 0.07
        }
        
        # Advanced scoring components
        self.address_profiles = defaultdict(AddressProfile)
        self.transaction_graph = defaultdict(set)
        self.amount_clusters = None
        self.velocity_baselines = defaultdict(list)
        self.risk_history = deque(maxlen=10000)
        
        # Statistical thresholds
        self.thresholds = {
            "high_risk": 0.75,
            "medium_risk": 0.45,
            "statistical_significance": 0.05,
            "outlier_z_score": 2.5,
            "velocity_multiplier": 5.0,
            "network_centrality_threshold": 0.8
        }
        
        # Initialize ML models if available
        if SKLEARN_AVAILABLE:
            self._initialize_ml_models()
        
        logger.info("Advanced risk scorer initialized")
    
    def _initialize_ml_models(self):
        """Initialize machine learning models for advanced analysis"""
        try:
            self.amount_clusterer = KMeans(n_clusters=5, random_state=42)
            self.anomaly_detector = IsolationForest(contamination=0.1, random_state=42)
            self.scaler = MinMaxScaler()
            logger.info("ML models initialized successfully")
        except Exception as e:
            logger.warning(f"ML models initialization failed: {e}")
            SKLEARN_AVAILABLE = False
    def is_ready(self) -> bool:
        """Check if the risk scorer is ready"""
        return self.is_model_loaded
    
    def get_model_version(self) -> str:
        """Get current model version"""
        return self.model_version
    
    def get_last_update_time(self) -> str:
        """Get last model update time"""
        return self.last_update.isoformat()
    
    async def calculate_comprehensive_risk(
        self,
        transaction: Dict[str, Any],
        address_history: List[Dict[str, Any]],
        network_context: List[Dict[str, Any]] = None
    ) -> RiskMetrics:
        """
        Calculate comprehensive risk score using advanced algorithms
        
        Args:
            transaction: Current transaction data
            address_history: Historical transactions for involved addresses
            network_context: Broader network transaction data for context
            
        Returns:
            Comprehensive risk metrics with detailed analysis
        """
        try:
            # Update address profiles
            self._update_address_profiles(transaction, address_history)
            
            # Extract comprehensive features
            features = self._extract_advanced_features(transaction, address_history, network_context)
            
            # Perform multi-layered risk analysis
            risk_components = await self._analyze_risk_components(transaction, features, address_history)
            
            # Calculate composite risk score
            overall_risk = self._calculate_composite_risk(risk_components)
            
            # Determine risk level and confidence
            risk_level, confidence = self._determine_risk_level_with_confidence(overall_risk, risk_components)
            
            # Identify contributing factors
            risk_factors = self._identify_comprehensive_risk_factors(transaction, risk_components, features)
            
            # Perform statistical analysis
            statistical_analysis = self._perform_statistical_analysis(transaction, features, address_history)
            
            # Analyze behavioral patterns
            behavioral_profile = self._analyze_behavioral_patterns(transaction, address_history)
            
            # Network analysis
            network_analysis = self._analyze_network_risk(transaction, address_history, network_context)
            
            result = RiskMetrics(
                score=float(overall_risk),
                level=risk_level,
                confidence=float(confidence),
                factors=risk_factors,
                components={k: float(v) for k, v in risk_components.items()},
                statistical_analysis=statistical_analysis,
                behavioral_profile=behavioral_profile,
                network_analysis=network_analysis
            )
            
            # Store for future analysis
            self.risk_history.append({
                'timestamp': datetime.now(),
                'score': overall_risk,
                'transaction_id': transaction.get('transaction_id', 'unknown')
            })
            
            logger.info(f"Comprehensive risk calculated: {overall_risk:.3f} ({risk_level}, confidence: {confidence:.2f})")
            return result
            
        except Exception as e:
            logger.error(f"Risk calculation failed: {e}")
            return RiskMetrics(
                score=0.5,
                level="medium",
                confidence=0.0,
                factors=["calculation_error"],
                components={},
                statistical_analysis={"error": str(e)},
                behavioral_profile={},
                network_analysis={}
            )
    
    def _update_address_profiles(self, transaction: Dict, address_history: List[Dict]):
        """Update behavioral profiles for addresses"""
        from_addr = transaction.get("from_address", "")
        to_addr = transaction.get("to_address", "")
        amount = float(transaction.get("amount", 0))
        timestamp = transaction.get("timestamp", 0)
        
        if from_addr:
            profile = self.address_profiles[from_addr]
            profile.total_transactions += 1
            profile.total_volume += amount
            profile.average_amount = profile.total_volume / profile.total_transactions
            
            # Update variance incrementally
            if profile.total_transactions > 1:
                old_variance = profile.amount_variance
                diff = amount - profile.average_amount
                profile.amount_variance = ((profile.total_transactions - 2) * old_variance + 
                                        diff * diff) / (profile.total_transactions - 1)
            
            # Update temporal patterns
            if timestamp > 0:
                dt = datetime.fromtimestamp(timestamp)
                profile.typical_hours.add(dt.hour)
                
                if profile.first_seen is None:
                    profile.first_seen = dt
                profile.last_seen = dt
            
            # Update counterparties
            if to_addr:
                profile.counterparties.add(to_addr)
                
            # Update velocity profile
            if len(address_history) > 0:
                recent_timestamps = [tx.get("timestamp", 0) for tx in address_history[-10:]]
                if len(recent_timestamps) > 1:
                    intervals = [recent_timestamps[i] - recent_timestamps[i-1] 
                               for i in range(1, len(recent_timestamps))]
                    profile.velocity_profile = intervals[-5:]  # Keep last 5 intervals
    
    def _extract_advanced_features(
        self, 
        transaction: Dict, 
        address_history: List[Dict], 
        network_context: List[Dict] = None
    ) -> Dict[str, Any]:
        """Extract comprehensive feature set for advanced analysis"""
        features = {}
        
        amount = float(transaction.get("amount", 0))
        timestamp = transaction.get("timestamp", 0)
        from_addr = transaction.get("from_address", "")
        to_addr = transaction.get("to_address", "")
        
        # Basic transaction features
        features.update({
            "amount": amount,
            "log_amount": np.log1p(amount),
            "timestamp": timestamp,
            "from_address": from_addr,
            "to_address": to_addr,
            "is_self_transaction": from_addr == to_addr
        })
        
        # Address profile features
        from_profile = self.address_profiles.get(from_addr, AddressProfile())
        to_profile = self.address_profiles.get(to_addr, AddressProfile())
        
        features.update({
            "from_tx_count": from_profile.total_transactions,
            "from_avg_amount": from_profile.average_amount,
            "from_amount_variance": from_profile.amount_variance,
            "from_counterparty_count": len(from_profile.counterparties),
            "to_tx_count": to_profile.total_transactions,
            "to_counterparty_count": len(to_profile.counterparties)
        })
        
        # Temporal features
        if timestamp > 0:
            dt = datetime.fromtimestamp(timestamp)
            features.update({
                "hour": dt.hour,
                "day_of_week": dt.weekday(),
                "is_weekend": dt.weekday() >= 5,
                "is_night": dt.hour < 6 or dt.hour > 22
            })
        
        # Historical context features
        if address_history:
            from_history = [tx for tx in address_history if tx.get("from_address") == from_addr]
            amounts = [float(tx.get("amount", 0)) for tx in from_history]
            
            if amounts:
                features.update({
                    "historical_mean": np.mean(amounts),
                    "historical_std": np.std(amounts),
                    "amount_z_score": abs(amount - np.mean(amounts)) / (np.std(amounts) + 1e-6),
                    "amount_percentile": stats.percentileofscore(amounts, amount) / 100 if SCIPY_AVAILABLE else 0.5
                })
        
        # Network features
        if network_context:
            # Build transaction graph
            for tx in network_context:
                tx_from = tx.get("from_address", "")
                tx_to = tx.get("to_address", "")
                if tx_from and tx_to:
                    self.transaction_graph[tx_from].add(tx_to)
                    self.transaction_graph[tx_to].add(tx_from)
            
            features.update({
                "from_degree": len(self.transaction_graph.get(from_addr, set())),
                "to_degree": len(self.transaction_graph.get(to_addr, set())),
                "common_neighbors": len(
                    self.transaction_graph.get(from_addr, set()).intersection(
                        self.transaction_graph.get(to_addr, set())
                    )
                )
            })
        
        return features
    
    async def _analyze_risk_components(
        self, 
        transaction: Dict, 
        features: Dict[str, Any], 
        address_history: List[Dict]
    ) -> Dict[str, float]:
        """Analyze multiple risk components using advanced algorithms"""
        components = {}
        
        # 1. Statistical anomaly analysis
        components["statistical_anomaly"] = self._calculate_statistical_anomaly(features, address_history)
        
        # 2. Behavioral deviation analysis
        components["behavioral_deviation"] = self._calculate_behavioral_deviation(transaction, features)
        
        # 3. Network centrality risk
        components["network_centrality"] = self._calculate_network_centrality_risk(features)
        
        # 4. Velocity analysis
        components["velocity_analysis"] = self._calculate_velocity_risk(transaction, features)
        
        # 5. Amount clustering analysis
        components["amount_clustering"] = self._calculate_amount_clustering_risk(features, address_history)
        
        # 6. Temporal pattern analysis
        components["temporal_patterns"] = self._calculate_temporal_risk(features)
        
        # 7. Counterparty risk assessment
        components["counterparty_risk"] = self._calculate_counterparty_risk(transaction, features)
        
        # 8. Structural pattern analysis
        components["structural_patterns"] = self._calculate_structural_risk(transaction, address_history)
        
        return components
    
    def _calculate_statistical_anomaly(self, features: Dict, address_history: List[Dict]) -> float:
        """Calculate statistical anomaly score using multiple methods"""
        try:
            amount = features.get("amount", 0)
            
            if not address_history:
                # Use absolute thresholds for new addresses
                if amount > 500000:
                    return 0.9
                elif amount > 100000:
                    return 0.7
                elif amount > 10000:
                    return 0.4
                else:
                    return 0.1
            
            # Extract historical amounts for statistical analysis
            historical_amounts = [float(tx.get("amount", 0)) for tx in address_history]
            
            if len(historical_amounts) < 3:
                return 0.3  # Insufficient data for statistical analysis
            
            # Z-score analysis
            mean_amount = np.mean(historical_amounts)
            std_amount = np.std(historical_amounts)
            
            if std_amount > 0:
                z_score = abs(amount - mean_amount) / std_amount
                z_risk = min(1.0, z_score / self.thresholds["outlier_z_score"])
            else:
                z_risk = 0.0 if amount == mean_amount else 0.8
            
            # Percentile analysis
            percentile = np.percentile(historical_amounts, [5, 25, 75, 95])
            if amount < percentile[0] or amount > percentile[3]:
                percentile_risk = 0.8
            elif amount < percentile[1] or amount > percentile[2]:
                percentile_risk = 0.5
            else:
                percentile_risk = 0.1
            
            # Grubbs' test for outliers (simplified)
            if len(historical_amounts) > 5:
                sorted_amounts = sorted(historical_amounts + [amount])
                n = len(sorted_amounts)
                mean_with_new = np.mean(sorted_amounts)
                std_with_new = np.std(sorted_amounts)
                
                if std_with_new > 0:
                    grubbs_stat = abs(amount - mean_with_new) / std_with_new
                    grubbs_risk = min(1.0, grubbs_stat / 2.5)
                else:
                    grubbs_risk = 0.0
            else:
                grubbs_risk = 0.0
            
            # Combine statistical measures
            return np.mean([z_risk, percentile_risk, grubbs_risk])
            
        except Exception as e:
            logger.error(f"Statistical anomaly calculation failed: {e}")
            return 0.5
    
    def _calculate_behavioral_deviation(self, transaction: Dict, features: Dict) -> float:
        """Calculate behavioral deviation from established patterns"""
        try:
            deviations = []
            
            from_addr = transaction.get("from_address", "")
            profile = self.address_profiles.get(from_addr, AddressProfile())
            
            # Amount deviation
            if profile.total_transactions > 10:
                amount = features.get("amount", 0)
                expected_amount = profile.average_amount
                
                if expected_amount > 0:
                    amount_deviation = abs(amount - expected_amount) / expected_amount
                    deviations.append(min(1.0, amount_deviation))
            
            # Temporal deviation
            hour = features.get("hour", 12)
            if profile.typical_hours:
                if hour not in profile.typical_hours:
                    deviations.append(0.7)  # Outside typical hours
                else:
                    deviations.append(0.1)  # Within typical hours
            
            # Counterparty novelty
            to_addr = transaction.get("to_address", "")
            if profile.counterparties:
                if to_addr not in profile.counterparties:
                    novelty = min(1.0, 1.0 / (len(profile.counterparties) + 1))
                    deviations.append(novelty)
                else:
                    deviations.append(0.1)
            
            # Velocity deviation
            if profile.velocity_profile and len(profile.velocity_profile) > 2:
                avg_interval = np.mean(profile.velocity_profile)
                current_time = datetime.now().timestamp()
                last_tx_time = profile.last_seen.timestamp() if profile.last_seen else current_time
                current_interval = current_time - last_tx_time
                
                if avg_interval > 0:
                    velocity_ratio = current_interval / avg_interval
                    if velocity_ratio < 0.1:  # Much faster than usual
                        deviations.append(0.8)
                    elif velocity_ratio > 10:  # Much slower than usual
                        deviations.append(0.6)
                    else:
                        deviations.append(0.2)
            
            return np.mean(deviations) if deviations else 0.3
            
        except Exception as e:
            logger.error(f"Behavioral deviation calculation failed: {e}")
            return 0.5
    
    def _calculate_network_centrality_risk(self, features: Dict) -> float:
        """Calculate risk based on network position and centrality"""
        try:
            from_degree = features.get("from_degree", 0)
            to_degree = features.get("to_degree", 0)
            common_neighbors = features.get("common_neighbors", 0)
            
            # High degree nodes might be mixers or exchanges
            degree_risk = 0.0
            if from_degree > 100:
                degree_risk = max(degree_risk, 0.8)
            elif from_degree > 50:
                degree_risk = max(degree_risk, 0.6)
            elif from_degree > 20:
                degree_risk = max(degree_risk, 0.4)
            
            if to_degree > 100:
                degree_risk = max(degree_risk, 0.8)
            elif to_degree > 50:
                degree_risk = max(degree_risk, 0.6)
            
            # Many common neighbors might indicate clustering or coordination
            neighbor_risk = 0.0
            if common_neighbors > 10:
                neighbor_risk = 0.7
            elif common_neighbors > 5:
                neighbor_risk = 0.4
            
            return max(degree_risk, neighbor_risk)
            
        except Exception as e:
            logger.error(f"Network centrality calculation failed: {e}")
            return 0.3
    
    def _calculate_velocity_risk(self, transaction: Dict, features: Dict) -> float:
        """Calculate risk based on transaction velocity patterns"""
        try:
            from_addr = transaction.get("from_address", "")
            profile = self.address_profiles.get(from_addr, AddressProfile())
            
            if not profile.velocity_profile or len(profile.velocity_profile) < 2:
                return 0.2  # Insufficient data
            
            # Calculate current velocity
            current_time = datetime.now().timestamp()
            last_tx_time = profile.last_seen.timestamp() if profile.last_seen else current_time
            current_interval = current_time - last_tx_time
            
            # Compare with historical velocity
            avg_interval = np.mean(profile.velocity_profile)
            std_interval = np.std(profile.velocity_profile)
            
            if avg_interval <= 0:
                return 0.5
            
            velocity_ratio = current_interval / avg_interval
            
            # Very fast transactions are suspicious
            if velocity_ratio < 0.1:  # 10x faster than usual
                return 0.9
            elif velocity_ratio < 0.2:  # 5x faster than usual
                return 0.7
            elif velocity_ratio < 0.5:  # 2x faster than usual
                return 0.5
            
            # Very slow transactions after period of activity might indicate account compromise
            elif velocity_ratio > 100:  # 100x slower than usual
                return 0.6
            elif velocity_ratio > 50:  # 50x slower than usual
                return 0.4
            
            return 0.2  # Normal velocity
            
        except Exception as e:
            logger.error(f"Velocity risk calculation failed: {e}")
            return 0.3
    
    def _calculate_amount_clustering_risk(self, features: Dict, address_history: List[Dict]) -> float:
        """Calculate risk based on amount clustering patterns using ML"""
        try:
            if not SKLEARN_AVAILABLE or not address_history:
                return self._calculate_amount_risk_fallback(features, address_history)
            
            amount = features.get("amount", 0)
            historical_amounts = [float(tx.get("amount", 0)) for tx in address_history]
            
            if len(historical_amounts) < 10:
                return self._calculate_amount_risk_fallback(features, address_history)
            
            # Prepare data for clustering
            amounts_array = np.array(historical_amounts + [amount]).reshape(-1, 1)
            
            # Apply log transformation to handle wide range of amounts
            log_amounts = np.log1p(amounts_array)
            
            # Perform clustering
            n_clusters = min(5, len(set(historical_amounts)))
            if n_clusters < 2:
                return 0.1
            
            kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
            clusters = kmeans.fit_predict(log_amounts)
            
            # Analyze current transaction's cluster
            current_cluster = clusters[-1]
            cluster_sizes = np.bincount(clusters)
            current_cluster_size = cluster_sizes[current_cluster]
            
            # Risk increases if transaction is in a very small cluster (outlier)
            outlier_threshold = max(1, len(historical_amounts) * 0.05)  # 5% threshold
            
            if current_cluster_size <= outlier_threshold:
                # Calculate distance to nearest cluster center
                current_amount_log = np.log1p(amount)
                distances = [abs(current_amount_log - center[0]) for center in kmeans.cluster_centers_]
                min_distance = min(distances)
                
                # Normalize distance-based risk
                risk = min(1.0, min_distance / 2.0)
                return max(0.6, risk)  # Minimum risk for outlier clusters
            
            # Check for suspicious round number clustering
            round_numbers = [amt for amt in historical_amounts + [amount] 
                           if amt % 1000 == 0 or amt % 500 == 0]
            if len(round_numbers) > len(historical_amounts) * 0.7:
                return 0.5  # High percentage of round numbers
            
            return 0.2  # Normal clustering behavior
            
        except Exception as e:
            logger.error(f"Amount clustering analysis failed: {e}")
            return self._calculate_amount_risk_fallback(features, address_history)
    
    def _calculate_amount_risk_fallback(self, features: Dict, address_history: List[Dict]) -> float:
        """Fallback amount risk calculation without ML libraries"""
        amount = features.get("amount", 0)
        
        if not address_history:
            # Use absolute thresholds for new addresses
            if amount > 500000:
                return 0.9
            elif amount > 100000:
                return 0.7
            elif amount > 10000:
                return 0.4
            else:
                return 0.1
        
        # Calculate statistics from history
        historical_amounts = [float(tx.get("amount", 0)) for tx in address_history]
        
        if not historical_amounts:
            return 0.5
        
        mean_amount = np.mean(historical_amounts)
        std_amount = np.std(historical_amounts)
        
        # Z-score based risk (how many standard deviations from mean)
        if std_amount > 0:
            z_score = abs(amount - mean_amount) / std_amount
            # Convert z-score to risk (cap at 3 standard deviations)
            amount_risk = min(1.0, z_score / 3.0)
        else:
            # All historical amounts are the same
            amount_risk = 0.0 if amount == mean_amount else 0.8
        
        return amount_risk
    
    def _calculate_temporal_risk(self, features: Dict) -> float:
        """Enhanced temporal risk calculation with advanced pattern detection"""
        try:
            hour = features.get("hour", 12)
            day_of_week = features.get("day_of_week", 0)
            is_weekend = features.get("is_weekend", False)
            is_night = features.get("is_night", False)
            
            risk_factors = []
            
            # Time of day risk with more granular analysis
            if 2 <= hour <= 5:  # Deep night (2-5 AM)
                risk_factors.append(0.8)
            elif is_night:  # Night time (10 PM - 6 AM)
                risk_factors.append(0.5)
            elif 6 <= hour <= 8 or 17 <= hour <= 19:  # Rush hours
                risk_factors.append(0.1)  # Lower risk during normal business activity
            
            # Weekend risk
            if is_weekend:
                if is_night:
                    risk_factors.append(0.6)  # Weekend night transactions
                else:
                    risk_factors.append(0.3)  # Weekend day transactions
            
            # Business hours analysis
            if 9 <= hour <= 17 and not is_weekend:
                risk_factors.append(0.1)  # Business hours are low risk
            
            return max(risk_factors) if risk_factors else 0.2
            
        except Exception as e:
            logger.error(f"Temporal risk calculation failed: {e}")
            return 0.3
    
    def _calculate_counterparty_risk(self, transaction: Dict, features: Dict) -> float:
        """Calculate risk based on counterparty analysis and reputation"""
        try:
            from_addr = transaction.get("from_address", "")
            to_addr = transaction.get("to_address", "")
            
            # Get profiles for both addresses
            from_profile = self.address_profiles.get(from_addr, AddressProfile())
            to_profile = self.address_profiles.get(to_addr, AddressProfile())
            
            risk_factors = []
            
            # Self-transaction risk
            if from_addr == to_addr:
                risk_factors.append(0.9)
            
            # New counterparty risk
            if to_addr not in from_profile.counterparties and len(from_profile.counterparties) > 5:
                # Risk increases if sender usually deals with known parties
                novelty_risk = 0.6
                risk_factors.append(novelty_risk)
            
            # High-activity counterparty risk (potential exchange/mixer)
            if to_profile.total_transactions > 1000:
                risk_factors.append(0.7)
            elif to_profile.total_transactions > 500:
                risk_factors.append(0.5)
            
            # Counterparty with many unique partners (potential mixer)
            if len(to_profile.counterparties) > 100:
                risk_factors.append(0.8)
            elif len(to_profile.counterparties) > 50:
                risk_factors.append(0.6)
            
            # Bidirectional transaction patterns (potential coordination)
            if (from_addr in to_profile.counterparties and 
                to_addr in from_profile.counterparties):
                # Check for potential round-trip transactions
                risk_factors.append(0.4)
            
            # Address similarity analysis (potential related addresses)
            addr_similarity = self._calculate_address_similarity(from_addr, to_addr)
            if addr_similarity > 0.8:
                risk_factors.append(0.7)  # Highly similar addresses
            
            return max(risk_factors) if risk_factors else 0.1
            
        except Exception as e:
            logger.error(f"Counterparty risk calculation failed: {e}")
            return 0.3
    
    def _calculate_structural_risk(self, transaction: Dict, address_history: List[Dict]) -> float:
        """Calculate risk based on structural transaction patterns"""
        try:
            from_addr = transaction.get("from_address", "")
            amount = float(transaction.get("amount", 0))
            
            if not address_history:
                return 0.2
            
            # Filter transactions from the same address
            from_txs = [tx for tx in address_history if tx.get("from_address") == from_addr]
            
            if len(from_txs) < 5:
                return 0.2  # Insufficient data
            
            risk_factors = []
            
            # 1. Layering pattern detection (rapid sequential transactions)
            timestamps = [tx.get("timestamp", 0) for tx in from_txs[-10:]]  # Last 10 transactions
            if len(timestamps) > 3:
                intervals = [timestamps[i] - timestamps[i-1] for i in range(1, len(timestamps))]
                avg_interval = np.mean(intervals)
                
                # Check for burst activity (very short intervals)
                short_intervals = [interval for interval in intervals if interval < 300]  # 5 minutes
                if len(short_intervals) > len(intervals) * 0.5:
                    risk_factors.append(0.7)  # Rapid sequential transactions
            
            # 2. Amount splitting detection
            recent_amounts = [float(tx.get("amount", 0)) for tx in from_txs[-20:]]
            if len(recent_amounts) > 5:
                # Check for many similar amounts (potential splitting)
                amount_groups = defaultdict(int)
                for amt in recent_amounts:
                    # Group by order of magnitude
                    magnitude = int(math.log10(max(amt, 1)))
                    amount_groups[magnitude] += 1
                
                max_group_size = max(amount_groups.values())
                if max_group_size > len(recent_amounts) * 0.6:
                    risk_factors.append(0.6)  # Many similar amounts
            
            # 3. Round number patterns (common in structuring)
            round_amounts = [amt for amt in recent_amounts 
                           if amt % 1000 == 0 or amt % 500 == 0 or amt % 100 == 0]
            if len(round_amounts) > len(recent_amounts) * 0.7:
                risk_factors.append(0.5)  # Too many round numbers
            
            # 4. Threshold avoidance detection
            threshold_amounts = [9000, 9500, 9900, 9999, 10000]  # Common reporting thresholds
            near_threshold = any(abs(amount - threshold) < threshold * 0.05 for threshold in threshold_amounts)
            if near_threshold:
                risk_factors.append(0.8)  # Potential threshold avoidance
            
            # 5. Pattern consistency analysis
            if len(recent_amounts) > 10:
                # Check for overly consistent patterns
                std_amounts = np.std(recent_amounts)
                mean_amounts = np.mean(recent_amounts)
                coefficient_of_variation = std_amounts / mean_amounts if mean_amounts > 0 else 0
                
                if coefficient_of_variation < 0.1:  # Very low variation
                    risk_factors.append(0.4)  # Suspiciously consistent amounts
            
            return max(risk_factors) if risk_factors else 0.2
            
        except Exception as e:
            logger.error(f"Structural risk calculation failed: {e}")
            return 0.3
    
    def _calculate_address_similarity(self, addr1: str, addr2: str) -> float:
        """Calculate similarity between two addresses"""
        if not addr1 or not addr2 or len(addr1) != len(addr2):
            return 0.0
        
        # Simple character-level similarity
        matching_chars = sum(1 for c1, c2 in zip(addr1, addr2) if c1 == c2)
        similarity = matching_chars / len(addr1)
        
        return similarity
    
    def _calculate_composite_risk(self, risk_components: Dict[str, float]) -> float:
        """Calculate weighted composite risk score from components"""
        try:
            total_risk = 0.0
            total_weight = 0.0
            
            for component, risk_value in risk_components.items():
                weight = self.risk_weights.get(component, 0.0)
                total_risk += risk_value * weight
                total_weight += weight
            
            # Normalize by total weight
            if total_weight > 0:
                composite_score = total_risk / total_weight
            else:
                composite_score = 0.5  # Default if no weights
            
            # Apply non-linear transformation for more sensitive detection
            # This amplifies higher risk scores while preserving lower ones
            if composite_score > 0.5:
                composite_score = 0.5 + 0.5 * ((composite_score - 0.5) / 0.5) ** 0.7
            
            return min(1.0, max(0.0, composite_score))
            
        except Exception as e:
            logger.error(f"Composite risk calculation failed: {e}")
            return 0.5
    
    def _determine_risk_level_with_confidence(self, risk_score: float, components: Dict[str, float]) -> Tuple[str, float]:
        """Determine risk level and confidence based on score and component analysis"""
        try:
            # Base risk level determination
            if risk_score >= self.thresholds["high_risk"]:
                base_level = "high"
            elif risk_score >= self.thresholds["medium_risk"]:
                base_level = "medium"
            else:
                base_level = "low"
            
            # Calculate confidence based on component agreement
            component_values = list(components.values())
            if not component_values:
                return base_level, 0.5
            
            # Measure component consensus
            mean_component = np.mean(component_values)
            std_component = np.std(component_values)
            
            # High confidence when components agree
            if std_component < 0.2:  # Low variance = high agreement
                confidence = 0.9
            elif std_component < 0.3:
                confidence = 0.7
            else:
                confidence = 0.5
            
            # Adjust confidence based on number of active components
            active_components = sum(1 for val in component_values if val > 0.1)
            confidence_multiplier = min(1.0, active_components / 6.0)  # Expect 6+ components
            confidence *= confidence_multiplier
            
            return base_level, min(1.0, max(0.1, confidence))
            
        except Exception as e:
            logger.error(f"Risk level determination failed: {e}")
            return "medium", 0.5
    
    def _identify_comprehensive_risk_factors(
        self, 
        transaction: Dict, 
        risk_components: Dict[str, float], 
        features: Dict[str, Any]
    ) -> List[str]:
        """Identify specific risk factors with detailed explanations"""
        factors = []
        threshold = 0.4  # Component threshold for inclusion
        
        # Map components to human-readable factors
        component_factors = {
            "statistical_anomaly": "unusual_transaction_amount",
            "behavioral_deviation": "deviation_from_normal_patterns",
            "network_centrality": "high_network_connectivity",
            "velocity_analysis": "unusual_transaction_timing",
            "amount_clustering": "suspicious_amount_patterns",
            "temporal_patterns": "unusual_time_of_transaction",
            "counterparty_risk": "risky_counterparty",
            "structural_patterns": "potential_structuring_behavior"
        }
        
        for component, risk_value in risk_components.items():
            if risk_value > threshold:
                factor = component_factors.get(component, component)
                factors.append(factor)
        
        # Add specific contextual factors
        amount = features.get("amount", 0)
        if amount > 100000:
            factors.append("large_transaction_amount")
        
        if features.get("is_self_transaction", False):
            factors.append("self_transaction")
        
        if features.get("is_night", False):
            factors.append("night_time_transaction")
        
        if features.get("is_weekend", False):
            factors.append("weekend_transaction")
        
        return factors if factors else ["no_significant_risk_factors"]
    
    def _perform_statistical_analysis(
        self, 
        transaction: Dict, 
        features: Dict[str, Any], 
        address_history: List[Dict]
    ) -> Dict[str, Any]:
        """Perform comprehensive statistical analysis"""
        try:
            analysis = {}
            amount = features.get("amount", 0)
            
            if address_history:
                historical_amounts = [float(tx.get("amount", 0)) for tx in address_history]
                
                if historical_amounts:
                    analysis.update({
                        "historical_mean": float(np.mean(historical_amounts)),
                        "historical_median": float(np.median(historical_amounts)),
                        "historical_std": float(np.std(historical_amounts)),
                        "amount_z_score": float(features.get("amount_z_score", 0)),
                        "amount_percentile": float(features.get("amount_percentile", 0.5)),
                        "total_historical_transactions": len(historical_amounts)
                    })
                    
                    # Additional statistical tests if scipy is available
                    if SCIPY_AVAILABLE and len(historical_amounts) > 10:
                        # Normality test
                        _, normality_p = stats.normaltest(historical_amounts)
                        analysis["normality_p_value"] = float(normality_p)
                        analysis["is_normal_distribution"] = normality_p > 0.05
            
            analysis["calculation_timestamp"] = datetime.now().isoformat()
            return analysis
            
        except Exception as e:
            logger.error(f"Statistical analysis failed: {e}")
            return {"error": str(e)}
    
    def _analyze_behavioral_patterns(self, transaction: Dict, address_history: List[Dict]) -> Dict[str, Any]:
        """Analyze behavioral patterns for the address"""
        try:
            from_addr = transaction.get("from_address", "")
            profile = self.address_profiles.get(from_addr, AddressProfile())
            
            patterns = {
                "total_transactions": profile.total_transactions,
                "average_amount": profile.average_amount,
                "amount_variance": profile.amount_variance,
                "unique_counterparties": len(profile.counterparties),
                "typical_hours": list(profile.typical_hours),
                "account_age_days": 0
            }
            
            if profile.first_seen and profile.last_seen:
                age = (profile.last_seen - profile.first_seen).days
                patterns["account_age_days"] = age
                
                if age > 0:
                    patterns["transactions_per_day"] = profile.total_transactions / age
            
            # Velocity analysis
            if profile.velocity_profile:
                patterns.update({
                    "average_velocity_seconds": float(np.mean(profile.velocity_profile)),
                    "velocity_variance": float(np.var(profile.velocity_profile))
                })
            
            return patterns
            
        except Exception as e:
            logger.error(f"Behavioral analysis failed: {e}")
            return {"error": str(e)}
    
    def _analyze_network_risk(
        self, 
        transaction: Dict, 
        address_history: List[Dict], 
        network_context: List[Dict] = None
    ) -> Dict[str, Any]:
        """Perform network analysis for risk assessment"""
        try:
            analysis = {}
            from_addr = transaction.get("from_address", "")
            to_addr = transaction.get("to_address", "")
            
            # Basic network metrics from transaction graph
            from_degree = len(self.transaction_graph.get(from_addr, set()))
            to_degree = len(self.transaction_graph.get(to_addr, set()))
            
            analysis.update({
                "from_address_degree": from_degree,
                "to_address_degree": to_degree,
                "common_neighbors": len(
                    self.transaction_graph.get(from_addr, set()).intersection(
                        self.transaction_graph.get(to_addr, set())
                    )
                )
            })
            
            # Check for suspicious patterns
            analysis["potential_mixer"] = from_degree > 50 or to_degree > 50
            analysis["high_connectivity"] = from_degree > 20 or to_degree > 20
            
            # Circular transaction detection
            circular_risk = self._detect_circular_patterns(
                from_addr, to_addr, self.transaction_graph
            )
            analysis["circular_pattern_detected"] = circular_risk > 0.5
            analysis["circular_pattern_risk"] = circular_risk
            
            return analysis
            
        except Exception as e:
            logger.error(f"Network analysis failed: {e}")
            return {"error": str(e)}
    
    def _detect_circular_patterns(
        self, 
        start_addr: str, 
        target_addr: str, 
        connections: Dict, 
        max_depth: int = 3
    ) -> float:
        """Detect circular transaction patterns that might indicate laundering"""
        
        def dfs_circular(current: str, target: str, visited: set, depth: int) -> bool:
            if depth >= max_depth:
                return False
            
            if current == target and depth > 0:
                return True
            
            if current in visited:
                return False
            
            visited.add(current)
            
            for neighbor in connections.get(current, set()):
                if dfs_circular(neighbor, target, visited.copy(), depth + 1):
                    return True
            
            return False
        
        # Check if there's a path from target back to start
        has_circular = dfs_circular(target_addr, start_addr, set(), 0)
        
        return 0.8 if has_circular else 0.0
    def get_statistics(self) -> Dict[str, Any]:
        """Get model performance statistics"""
        if not self.risk_history:
            return {"message": "No risk assessment history available"}
        
        scores = [entry['score'] for entry in self.risk_history]
        
        return {
            "total_assessments": len(self.risk_history),
            "average_risk_score": float(np.mean(scores)),
            "risk_score_std": float(np.std(scores)),
            "high_risk_percentage": float(sum(1 for score in scores if score > 0.75) / len(scores) * 100),
            "medium_risk_percentage": float(sum(1 for score in scores if 0.45 <= score <= 0.75) / len(scores) * 100),
            "low_risk_percentage": float(sum(1 for score in scores if score < 0.45) / len(scores) * 100),
            "model_version": self.model_version,
            "last_update": self.last_update.isoformat()
        }
    
    # Legacy method for backward compatibility
    async def calculate_risk(
        self, 
        transaction: Dict[str, Any], 
        address_history: List[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Legacy method for backward compatibility.
        Delegates to the comprehensive risk calculation.
        """
        if address_history is None:
            address_history = []
        
        result = await self.calculate_comprehensive_risk(transaction, address_history)
        
        # Convert to legacy format
        return {
            "risk_score": result.score,
            "risk_level": result.level,
            "confidence": result.confidence,
            "risk_factors": result.factors
        }
