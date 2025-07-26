"""
AI-Enhanced Bridge Optimization Engine

Implements machine learning models for analyzing bridge performance metrics
and providing optimization recommendations for batching, concurrency, and
interval tuning based on network conditions.
"""

import asyncio
import json
import logging
import numpy as np
import time
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
import pandas as pd
from pathlib import Path

# TensorFlow for ML models
try:
    import tensorflow as tf
    from tensorflow import keras
    TENSORFLOW_AVAILABLE = True
except ImportError:
    TENSORFLOW_AVAILABLE = False
    print("Warning: TensorFlow not available. Using simplified optimization algorithms.")

logger = logging.getLogger(__name__)

@dataclass
class NetworkCondition:
    """Current network condition metrics"""
    rpc_latency_ms: float
    block_time_ms: float
    network_congestion: float  # 0.0 to 1.0
    error_rate: float
    timestamp: float

@dataclass
class OptimizationRecommendation:
    """AI optimization recommendation"""
    batch_size: int
    concurrent_connections: int
    polling_interval_ms: int
    retry_strategy: Dict[str, Any]
    confidence_score: float
    reasoning: str
    expected_improvement: float

@dataclass
class PerformanceData:
    """Historical performance data point"""
    batch_size: int
    concurrent_connections: int
    polling_interval_ms: int
    throughput_tph: float  # transactions per hour
    average_latency_ms: float
    error_rate: float
    network_condition: NetworkCondition
    timestamp: float

class AIOptimizationEngine:
    """AI-powered optimization engine for bridge performance"""
    
    def __init__(self, model_cache_dir: str = "/tmp/dytallix_ai_models"):
        self.model_cache_dir = Path(model_cache_dir)
        self.model_cache_dir.mkdir(exist_ok=True)
        
        self.performance_history: List[PerformanceData] = []
        self.batch_size_model = None
        self.concurrency_model = None
        self.interval_model = None
        
        # Initialize models
        self._initialize_models()
        
        # Current optimization state
        self.current_config = {
            'batch_size': 20,
            'concurrent_connections': 10,
            'polling_interval_ms': 2000,
        }
        
        # Performance tracking
        self.optimization_history: List[OptimizationRecommendation] = []
        
    def _initialize_models(self):
        """Initialize or load AI models"""
        try:
            # Try to load existing models
            self._load_models()
        except Exception as e:
            logger.info(f"No existing models found, creating new ones: {e}")
            self._create_models()
    
    def _create_models(self):
        """Create new AI models for optimization"""
        if not TENSORFLOW_AVAILABLE:
            logger.warning("TensorFlow not available, using rule-based optimization")
            return
            
        try:
            # Batch size optimization model (Neural Network)
            self.batch_size_model = keras.Sequential([
                keras.layers.Dense(32, activation='relu', input_shape=(6,)),
                keras.layers.Dropout(0.2),
                keras.layers.Dense(16, activation='relu'),
                keras.layers.Dense(1, activation='linear')
            ])
            self.batch_size_model.compile(
                optimizer='adam',
                loss='mse',
                metrics=['mae']
            )
            
            # Concurrency optimization model (Neural Network)
            self.concurrency_model = keras.Sequential([
                keras.layers.Dense(24, activation='relu', input_shape=(6,)),
                keras.layers.Dropout(0.15),
                keras.layers.Dense(12, activation='relu'),
                keras.layers.Dense(1, activation='linear')
            ])
            self.concurrency_model.compile(
                optimizer='adam',
                loss='mse',
                metrics=['mae']
            )
            
            # Polling interval optimization model (Neural Network)
            self.interval_model = keras.Sequential([
                keras.layers.Dense(20, activation='relu', input_shape=(6,)),
                keras.layers.Dropout(0.1),
                keras.layers.Dense(10, activation='relu'),
                keras.layers.Dense(1, activation='linear')
            ])
            self.interval_model.compile(
                optimizer='adam',
                loss='mse',
                metrics=['mae']
            )
            
            logger.info("AI models created successfully")
            
        except Exception as e:
            logger.error(f"Failed to create AI models: {e}")
            self.batch_size_model = None
            self.concurrency_model = None
            self.interval_model = None
    
    def _load_models(self):
        """Load pre-trained models from disk"""
        if not TENSORFLOW_AVAILABLE:
            return
            
        batch_path = self.model_cache_dir / "batch_size_model.h5"
        concurrency_path = self.model_cache_dir / "concurrency_model.h5"
        interval_path = self.model_cache_dir / "interval_model.h5"
        
        if batch_path.exists():
            self.batch_size_model = keras.models.load_model(str(batch_path))
            logger.info("Loaded batch size optimization model")
            
        if concurrency_path.exists():
            self.concurrency_model = keras.models.load_model(str(concurrency_path))
            logger.info("Loaded concurrency optimization model")
            
        if interval_path.exists():
            self.interval_model = keras.models.load_model(str(interval_path))
            logger.info("Loaded interval optimization model")
    
    def _save_models(self):
        """Save trained models to disk"""
        if not TENSORFLOW_AVAILABLE:
            return
            
        try:
            if self.batch_size_model:
                batch_path = self.model_cache_dir / "batch_size_model.h5"
                self.batch_size_model.save(str(batch_path))
                
            if self.concurrency_model:
                concurrency_path = self.model_cache_dir / "concurrency_model.h5"
                self.concurrency_model.save(str(concurrency_path))
                
            if self.interval_model:
                interval_path = self.model_cache_dir / "interval_model.h5"
                self.interval_model.save(str(interval_path))
                
            logger.info("AI models saved successfully")
            
        except Exception as e:
            logger.error(f"Failed to save AI models: {e}")
    
    def add_performance_data(self, data: PerformanceData):
        """Add performance data point for training"""
        self.performance_history.append(data)
        
        # Keep only last 10,000 data points for memory efficiency
        if len(self.performance_history) > 10000:
            self.performance_history = self.performance_history[-10000:]
        
        # Retrain models periodically
        if len(self.performance_history) % 100 == 0:
            asyncio.create_task(self._retrain_models())
    
    async def _retrain_models(self):
        """Retrain AI models with new performance data"""
        if not TENSORFLOW_AVAILABLE or len(self.performance_history) < 50:
            return
            
        try:
            logger.info(f"Retraining AI models with {len(self.performance_history)} data points")
            
            # Prepare training data
            X, y_batch, y_concurrency, y_interval = self._prepare_training_data()
            
            if len(X) < 10:
                logger.warning("Not enough training data for model retraining")
                return
            
            # Train models
            if self.batch_size_model:
                self.batch_size_model.fit(X, y_batch, epochs=10, verbose=0, validation_split=0.2)
                
            if self.concurrency_model:
                self.concurrency_model.fit(X, y_concurrency, epochs=10, verbose=0, validation_split=0.2)
                
            if self.interval_model:
                self.interval_model.fit(X, y_interval, epochs=10, verbose=0, validation_split=0.2)
            
            # Save updated models
            self._save_models()
            
            logger.info("AI models retrained successfully")
            
        except Exception as e:
            logger.error(f"Failed to retrain AI models: {e}")
    
    def _prepare_training_data(self) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
        """Prepare training data from performance history"""
        if len(self.performance_history) < 10:
            return np.array([]), np.array([]), np.array([]), np.array([])
        
        # Feature engineering
        features = []
        batch_targets = []
        concurrency_targets = []
        interval_targets = []
        
        for data in self.performance_history[-1000:]:  # Use last 1000 points
            # Features: network conditions + current config
            feature_vector = [
                data.network_condition.rpc_latency_ms,
                data.network_condition.block_time_ms,
                data.network_condition.network_congestion,
                data.network_condition.error_rate,
                data.throughput_tph,
                data.error_rate
            ]
            
            features.append(feature_vector)
            
            # Targets: optimal configuration parameters
            # Use performance as proxy for optimality
            performance_score = self._calculate_performance_score(data)
            
            # Weight better performing configurations higher
            if performance_score > 0.7:  # Good performance
                batch_targets.append(data.batch_size)
                concurrency_targets.append(data.concurrent_connections)
                interval_targets.append(data.polling_interval_ms)
            else:  # Poor performance - suggest different values
                batch_targets.append(max(5, data.batch_size - 5))
                concurrency_targets.append(max(3, data.concurrent_connections - 2))
                interval_targets.append(min(10000, data.polling_interval_ms + 1000))
        
        return (
            np.array(features),
            np.array(batch_targets),
            np.array(concurrency_targets),
            np.array(interval_targets)
        )
    
    def _calculate_performance_score(self, data: PerformanceData) -> float:
        """Calculate normalized performance score (0-1)"""
        # Target metrics
        target_throughput = 500.0  # transactions per hour
        target_latency = 30000.0   # milliseconds
        target_error_rate = 0.01   # 1%
        
        # Calculate component scores
        throughput_score = min(1.0, data.throughput_tph / target_throughput)
        latency_score = max(0.0, 1.0 - (data.average_latency_ms / (target_latency * 2)))
        error_score = max(0.0, 1.0 - (data.error_rate / (target_error_rate * 2)))
        
        # Weighted average
        return (throughput_score * 0.4 + latency_score * 0.4 + error_score * 0.2)
    
    def get_optimization_recommendation(self, network_condition: NetworkCondition) -> OptimizationRecommendation:
        """Get AI-powered optimization recommendation"""
        
        if TENSORFLOW_AVAILABLE and self._models_ready():
            return self._get_ai_recommendation(network_condition)
        else:
            return self._get_rule_based_recommendation(network_condition)
    
    def _models_ready(self) -> bool:
        """Check if AI models are ready for inference"""
        return (self.batch_size_model is not None and 
                self.concurrency_model is not None and 
                self.interval_model is not None)
    
    def _get_ai_recommendation(self, network_condition: NetworkCondition) -> OptimizationRecommendation:
        """Get AI-powered recommendation using trained models"""
        try:
            # Prepare input features
            features = np.array([[
                network_condition.rpc_latency_ms,
                network_condition.block_time_ms,
                network_condition.network_congestion,
                network_condition.error_rate,
                self.get_current_throughput(),
                self.get_current_error_rate()
            ]])
            
            # Get predictions
            batch_size = int(self.batch_size_model.predict(features, verbose=0)[0][0])
            concurrent_connections = int(self.concurrency_model.predict(features, verbose=0)[0][0])
            polling_interval_ms = int(self.interval_model.predict(features, verbose=0)[0][0])
            
            # Apply bounds
            batch_size = max(1, min(50, batch_size))
            concurrent_connections = max(1, min(20, concurrent_connections))
            polling_interval_ms = max(1000, min(30000, polling_interval_ms))
            
            # Calculate confidence based on model uncertainty
            confidence_score = self._calculate_prediction_confidence(features)
            
            # Estimate expected improvement
            expected_improvement = self._estimate_improvement(
                batch_size, concurrent_connections, polling_interval_ms, network_condition
            )
            
            return OptimizationRecommendation(
                batch_size=batch_size,
                concurrent_connections=concurrent_connections,
                polling_interval_ms=polling_interval_ms,
                retry_strategy=self._get_retry_strategy(network_condition),
                confidence_score=confidence_score,
                reasoning=f"AI-powered optimization based on network latency {network_condition.rpc_latency_ms:.1f}ms, "
                         f"congestion {network_condition.network_congestion:.2f}, error rate {network_condition.error_rate:.3f}",
                expected_improvement=expected_improvement
            )
            
        except Exception as e:
            logger.error(f"AI recommendation failed, falling back to rule-based: {e}")
            return self._get_rule_based_recommendation(network_condition)
    
    def _get_rule_based_recommendation(self, network_condition: NetworkCondition) -> OptimizationRecommendation:
        """Get rule-based optimization recommendation as fallback"""
        
        # Rule-based optimization logic
        if network_condition.rpc_latency_ms > 5000:  # High latency
            batch_size = 15  # Smaller batches for faster processing
            concurrent_connections = 6  # Fewer connections to avoid congestion
            polling_interval_ms = 4000  # Longer intervals to reduce load
            reasoning = "High network latency detected - reducing batch size and connections"
            
        elif network_condition.network_congestion > 0.7:  # High congestion
            batch_size = 10
            concurrent_connections = 5
            polling_interval_ms = 3000
            reasoning = "High network congestion - conservative configuration"
            
        elif network_condition.error_rate > 0.05:  # High error rate
            batch_size = 8
            concurrent_connections = 4
            polling_interval_ms = 5000
            reasoning = "High error rate detected - reducing load and increasing intervals"
            
        else:  # Normal conditions
            batch_size = 25
            concurrent_connections = 12
            polling_interval_ms = 2000
            reasoning = "Normal network conditions - optimal performance configuration"
        
        expected_improvement = self._estimate_improvement(
            batch_size, concurrent_connections, polling_interval_ms, network_condition
        )
        
        return OptimizationRecommendation(
            batch_size=batch_size,
            concurrent_connections=concurrent_connections,
            polling_interval_ms=polling_interval_ms,
            retry_strategy=self._get_retry_strategy(network_condition),
            confidence_score=0.75,  # Rule-based confidence
            reasoning=reasoning,
            expected_improvement=expected_improvement
        )
    
    def _calculate_prediction_confidence(self, features: np.ndarray) -> float:
        """Calculate confidence score for AI predictions"""
        try:
            # Simple confidence calculation based on feature normality
            # In production, this could use ensemble methods or uncertainty quantification
            confidence = 0.85  # Base confidence
            
            # Adjust based on how similar current conditions are to training data
            if len(self.performance_history) > 100:
                historical_features = [
                    [d.network_condition.rpc_latency_ms, d.network_condition.block_time_ms,
                     d.network_condition.network_congestion, d.network_condition.error_rate,
                     d.throughput_tph, d.error_rate]
                    for d in self.performance_history[-100:]
                ]
                
                # Calculate similarity to historical data (simplified)
                mean_features = np.mean(historical_features, axis=0)
                similarity = 1.0 - np.mean(np.abs(features[0] - mean_features) / (mean_features + 1e-6))
                confidence *= max(0.5, similarity)
            
            return min(0.95, max(0.5, confidence))
            
        except Exception:
            return 0.75  # Default confidence
    
    def _estimate_improvement(self, batch_size: int, concurrent_connections: int, 
                            polling_interval_ms: int, network_condition: NetworkCondition) -> float:
        """Estimate expected performance improvement percentage"""
        
        current_batch = self.current_config['batch_size']
        current_connections = self.current_config['concurrent_connections']
        current_interval = self.current_config['polling_interval_ms']
        
        # Simplified improvement estimation
        batch_improvement = 0.0
        if batch_size > current_batch:
            batch_improvement = min(0.2, (batch_size - current_batch) * 0.01)
        elif batch_size < current_batch and network_condition.rpc_latency_ms > 3000:
            batch_improvement = min(0.15, (current_batch - batch_size) * 0.008)
        
        connection_improvement = 0.0
        if concurrent_connections > current_connections:
            connection_improvement = min(0.25, (concurrent_connections - current_connections) * 0.02)
        elif concurrent_connections < current_connections and network_condition.network_congestion > 0.6:
            connection_improvement = min(0.15, (current_connections - concurrent_connections) * 0.015)
        
        interval_improvement = 0.0
        if polling_interval_ms < current_interval and network_condition.rpc_latency_ms < 2000:
            interval_improvement = min(0.1, (current_interval - polling_interval_ms) * 0.00001)
        
        total_improvement = batch_improvement + connection_improvement + interval_improvement
        return min(0.5, total_improvement)  # Cap at 50% estimated improvement
    
    def _get_retry_strategy(self, network_condition: NetworkCondition) -> Dict[str, Any]:
        """Get adaptive retry strategy based on network conditions"""
        
        if network_condition.error_rate > 0.1:  # High error rate
            return {
                'max_attempts': 7,
                'base_delay_ms': 2000,
                'multiplier': 2.0,
                'max_delay_ms': 30000,
                'jitter': True
            }
        elif network_condition.rpc_latency_ms > 3000:  # High latency
            return {
                'max_attempts': 5,
                'base_delay_ms': 1500,
                'multiplier': 1.8,
                'max_delay_ms': 20000,
                'jitter': True
            }
        else:  # Normal conditions
            return {
                'max_attempts': 3,
                'base_delay_ms': 1000,
                'multiplier': 1.5,
                'max_delay_ms': 10000,
                'jitter': False
            }
    
    def get_current_throughput(self) -> float:
        """Get current throughput estimate"""
        if len(self.performance_history) > 0:
            recent_data = self.performance_history[-10:]
            return np.mean([d.throughput_tph for d in recent_data])
        return 200.0  # Default estimate
    
    def get_current_error_rate(self) -> float:
        """Get current error rate estimate"""
        if len(self.performance_history) > 0:
            recent_data = self.performance_history[-10:]
            return np.mean([d.error_rate for d in recent_data])
        return 0.02  # Default estimate
    
    def update_current_config(self, recommendation: OptimizationRecommendation):
        """Update current configuration with recommendation"""
        self.current_config = {
            'batch_size': recommendation.batch_size,
            'concurrent_connections': recommendation.concurrent_connections,
            'polling_interval_ms': recommendation.polling_interval_ms,
        }
        
        self.optimization_history.append(recommendation)
        
        # Keep only last 100 recommendations
        if len(self.optimization_history) > 100:
            self.optimization_history = self.optimization_history[-100:]
    
    def get_optimization_statistics(self) -> Dict[str, Any]:
        """Get statistics about optimization performance"""
        if not self.optimization_history:
            return {}
        
        recent_recommendations = self.optimization_history[-20:]
        
        return {
            'total_recommendations': len(self.optimization_history),
            'average_confidence': np.mean([r.confidence_score for r in recent_recommendations]),
            'average_expected_improvement': np.mean([r.expected_improvement for r in recent_recommendations]),
            'ai_vs_rule_based_ratio': sum(1 for r in recent_recommendations if 'AI-powered' in r.reasoning) / len(recent_recommendations),
            'most_common_batch_size': max(set([r.batch_size for r in recent_recommendations]), 
                                        key=[r.batch_size for r in recent_recommendations].count),
            'performance_data_points': len(self.performance_history),
            'models_available': TENSORFLOW_AVAILABLE and self._models_ready(),
        }

async def main():
    """Example usage of the AI optimization engine"""
    
    # Initialize the optimization engine
    optimizer = AIOptimizationEngine()
    
    # Simulate some network conditions
    network_conditions = [
        NetworkCondition(rpc_latency_ms=1500, block_time_ms=6000, network_congestion=0.3, error_rate=0.01, timestamp=time.time()),
        NetworkCondition(rpc_latency_ms=4000, block_time_ms=8000, network_congestion=0.7, error_rate=0.05, timestamp=time.time()),
        NetworkCondition(rpc_latency_ms=800, block_time_ms=5000, network_congestion=0.1, error_rate=0.005, timestamp=time.time()),
    ]
    
    # Get optimization recommendations
    for i, condition in enumerate(network_conditions):
        print(f"\n--- Network Condition {i+1} ---")
        print(f"RPC Latency: {condition.rpc_latency_ms}ms")
        print(f"Network Congestion: {condition.network_congestion:.2f}")
        print(f"Error Rate: {condition.error_rate:.3f}")
        
        recommendation = optimizer.get_optimization_recommendation(condition)
        
        print(f"\nOptimization Recommendation:")
        print(f"Batch Size: {recommendation.batch_size}")
        print(f"Concurrent Connections: {recommendation.concurrent_connections}")
        print(f"Polling Interval: {recommendation.polling_interval_ms}ms")
        print(f"Confidence: {recommendation.confidence_score:.2f}")
        print(f"Expected Improvement: {recommendation.expected_improvement:.1%}")
        print(f"Reasoning: {recommendation.reasoning}")
        
        # Update configuration
        optimizer.update_current_config(recommendation)
        
        # Simulate adding performance data
        perf_data = PerformanceData(
            batch_size=recommendation.batch_size,
            concurrent_connections=recommendation.concurrent_connections,
            polling_interval_ms=recommendation.polling_interval_ms,
            throughput_tph=300 + recommendation.expected_improvement * 200,
            average_latency_ms=35000 - recommendation.expected_improvement * 10000,
            error_rate=0.02 - recommendation.expected_improvement * 0.01,
            network_condition=condition,
            timestamp=time.time()
        )
        optimizer.add_performance_data(perf_data)
    
    # Show optimization statistics
    stats = optimizer.get_optimization_statistics()
    print(f"\n--- Optimization Statistics ---")
    for key, value in stats.items():
        print(f"{key}: {value}")

if __name__ == "__main__":
    asyncio.run(main())