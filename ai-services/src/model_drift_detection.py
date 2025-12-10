"""
AI Model Drift Detection and Versioning System

Monitors model performance degradation and manages model versioning
with automatic rollback capabilities for production stability.
"""

import asyncio
import json
import logging
import numpy as np
import time
from typing import Dict, List, Optional, Any, Tuple, Union
from dataclasses import dataclass, asdict
from datetime import datetime, timezone, timedelta
import pandas as pd
from pathlib import Path
from enum import Enum
import hashlib
import pickle
from collections import deque

logger = logging.getLogger(__name__)

class DriftDetectionMethod(Enum):
    """Drift detection algorithms available"""
    KOLMOGOROV_SMIRNOV = "ks_test"
    POPULATION_STABILITY_INDEX = "psi"
    JENSEN_SHANNON_DIVERGENCE = "js_divergence"
    ADVERSARIAL_VALIDATION = "adversarial"

class ModelStatus(Enum):
    """Model deployment status"""
    ACTIVE = "active"
    DEPRECATED = "deprecated"
    ROLLBACK = "rollback"
    TESTING = "testing"
    FAILED = "failed"

@dataclass
class ModelVersion:
    """Model version metadata"""
    version_id: str
    model_hash: str
    deployment_timestamp: datetime
    performance_baseline: Dict[str, float]
    training_data_hash: str
    status: ModelStatus
    rollback_threshold: float
    accuracy_sla: float
    latency_sla_ms: float

@dataclass
class DriftMetrics:
    """Drift detection metrics"""
    timestamp: datetime
    drift_score: float
    detection_method: DriftDetectionMethod
    p_value: Optional[float]
    threshold: float
    drift_detected: bool
    feature_drifts: Dict[str, float]
    recommendation: str

@dataclass
class PerformanceMetrics:
    """Model performance tracking"""
    timestamp: datetime
    accuracy: float
    precision: float
    recall: float
    f1_score: float
    latency_ms: float
    throughput_rps: float
    error_rate: float
    confidence_score: float

class ModelDriftDetector:
    """Production-grade model drift detection system"""
    
    def __init__(self, config_path: str = "config/drift_detection.json"):
        self.config = self._load_config(config_path)
        self.models: Dict[str, ModelVersion] = {}
        self.drift_history: deque = deque(maxlen=1000)
        self.performance_history: deque = deque(maxlen=10000)
        self.reference_data: Optional[np.ndarray] = None
        self.current_model_id: Optional[str] = None
        
        # Initialize drift detection parameters
        self.drift_threshold = self.config.get('drift_threshold', 0.1)
        self.performance_window = self.config.get('performance_window', 100)
        self.rollback_threshold = self.config.get('rollback_threshold', 0.05)
        
        # SLA thresholds
        self.latency_sla_ms = self.config.get('latency_sla_ms', 1000)
        self.accuracy_sla = self.config.get('accuracy_sla', 0.95)
        
        logger.info(f"Drift detector initialized with SLA: latency<{self.latency_sla_ms}ms, accuracy>{self.accuracy_sla}")

    def _load_config(self, config_path: str) -> Dict[str, Any]:
        """Load drift detection configuration"""
        try:
            with open(config_path, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            logger.warning(f"Config file not found: {config_path}. Using defaults.")
            return {
                'drift_threshold': 0.1,
                'performance_window': 100,
                'rollback_threshold': 0.05,
                'latency_sla_ms': 1000,
                'accuracy_sla': 0.95,
                'detection_methods': ['ks_test', 'psi'],
                'monitoring_interval': 300  # 5 minutes
            }

    def register_model(self, model_id: str, model_path: str, 
                      training_data: np.ndarray, baseline_performance: Dict[str, float]) -> ModelVersion:
        """Register a new model version for drift monitoring"""
        
        # Calculate model hash for integrity checking
        model_hash = self._calculate_model_hash(model_path)
        training_hash = self._calculate_data_hash(training_data)
        
        model_version = ModelVersion(
            version_id=model_id,
            model_hash=model_hash,
            deployment_timestamp=datetime.now(timezone.utc),
            performance_baseline=baseline_performance,
            training_data_hash=training_hash,
            status=ModelStatus.TESTING,
            rollback_threshold=self.rollback_threshold,
            accuracy_sla=self.accuracy_sla,
            latency_sla_ms=self.latency_sla_ms
        )
        
        self.models[model_id] = model_version
        
        # Set reference data for drift detection
        if self.reference_data is None:
            self.reference_data = training_data
            
        logger.info(f"Registered model {model_id} with hash {model_hash[:8]}...")
        return model_version

    def activate_model(self, model_id: str) -> bool:
        """Activate a model version for production use"""
        if model_id not in self.models:
            logger.error(f"Model {model_id} not found")
            return False
            
        # Deactivate current model
        if self.current_model_id:
            self.models[self.current_model_id].status = ModelStatus.DEPRECATED
            
        # Activate new model
        self.models[model_id].status = ModelStatus.ACTIVE
        self.current_model_id = model_id
        
        logger.info(f"Activated model {model_id}")
        return True

    def detect_drift(self, current_data: np.ndarray, 
                    method: DriftDetectionMethod = DriftDetectionMethod.KOLMOGOROV_SMIRNOV) -> DriftMetrics:
        """Detect data drift using specified method"""
        
        if self.reference_data is None:
            raise ValueError("No reference data available for drift detection")
            
        drift_score, p_value, feature_drifts = self._calculate_drift(
            self.reference_data, current_data, method
        )
        
        drift_detected = drift_score > self.drift_threshold
        
        # Generate recommendation
        recommendation = self._generate_drift_recommendation(drift_score, feature_drifts, drift_detected)
        
        drift_metrics = DriftMetrics(
            timestamp=datetime.now(timezone.utc),
            drift_score=drift_score,
            detection_method=method,
            p_value=p_value,
            threshold=self.drift_threshold,
            drift_detected=drift_detected,
            feature_drifts=feature_drifts,
            recommendation=recommendation
        )
        
        self.drift_history.append(drift_metrics)
        
        if drift_detected:
            logger.warning(f"Drift detected! Score: {drift_score:.4f}, Method: {method.value}")
            
        return drift_metrics

    def _calculate_drift(self, reference_data: np.ndarray, current_data: np.ndarray,
                        method: DriftDetectionMethod) -> Tuple[float, Optional[float], Dict[str, float]]:
        """Calculate drift score using specified method"""
        
        if method == DriftDetectionMethod.KOLMOGOROV_SMIRNOV:
            return self._ks_drift(reference_data, current_data)
        elif method == DriftDetectionMethod.POPULATION_STABILITY_INDEX:
            return self._psi_drift(reference_data, current_data)
        elif method == DriftDetectionMethod.JENSEN_SHANNON_DIVERGENCE:
            return self._js_drift(reference_data, current_data)
        else:
            raise ValueError(f"Unsupported drift detection method: {method}")

    def _ks_drift(self, reference: np.ndarray, current: np.ndarray) -> Tuple[float, float, Dict[str, float]]:
        """Kolmogorov-Smirnov drift detection"""
        from scipy import stats
        
        feature_drifts = {}
        p_values = []
        
        for i in range(reference.shape[1]):
            ks_stat, p_val = stats.ks_2samp(reference[:, i], current[:, i])
            feature_drifts[f'feature_{i}'] = ks_stat
            p_values.append(p_val)
        
        # Overall drift score (max KS statistic)
        drift_score = max(feature_drifts.values())
        p_value = min(p_values)  # Most significant p-value
        
        return drift_score, p_value, feature_drifts

    def _psi_drift(self, reference: np.ndarray, current: np.ndarray) -> Tuple[float, None, Dict[str, float]]:
        """Population Stability Index drift detection"""
        feature_drifts = {}
        
        for i in range(reference.shape[1]):
            ref_feature = reference[:, i]
            cur_feature = current[:, i]
            
            # Create bins based on reference data quantiles
            bins = np.quantile(ref_feature, np.linspace(0, 1, 11))
            bins = np.unique(bins)  # Remove duplicates
            
            if len(bins) < 2:
                feature_drifts[f'feature_{i}'] = 0.0
                continue
                
            ref_counts, _ = np.histogram(ref_feature, bins=bins)
            cur_counts, _ = np.histogram(cur_feature, bins=bins)
            
            # Normalize to probabilities
            ref_probs = ref_counts / np.sum(ref_counts)
            cur_probs = cur_counts / np.sum(cur_counts)
            
            # Add small epsilon to avoid log(0)
            epsilon = 1e-6
            ref_probs = ref_probs + epsilon
            cur_probs = cur_probs + epsilon
            
            # Calculate PSI
            psi = np.sum((cur_probs - ref_probs) * np.log(cur_probs / ref_probs))
            feature_drifts[f'feature_{i}'] = psi
        
        drift_score = max(feature_drifts.values()) if feature_drifts else 0.0
        
        return drift_score, None, feature_drifts

    def _js_drift(self, reference: np.ndarray, current: np.ndarray) -> Tuple[float, None, Dict[str, float]]:
        """Jensen-Shannon divergence drift detection"""
        from scipy.spatial.distance import jensenshannon
        
        feature_drifts = {}
        
        for i in range(reference.shape[1]):
            ref_feature = reference[:, i]
            cur_feature = current[:, i]
            
            # Create histograms
            combined_range = (min(ref_feature.min(), cur_feature.min()),
                            max(ref_feature.max(), cur_feature.max()))
            
            ref_hist, _ = np.histogram(ref_feature, bins=20, range=combined_range, density=True)
            cur_hist, _ = np.histogram(cur_feature, bins=20, range=combined_range, density=True)
            
            # Normalize
            ref_hist = ref_hist / np.sum(ref_hist)
            cur_hist = cur_hist / np.sum(cur_hist)
            
            # Calculate JS divergence
            js_dist = jensenshannon(ref_hist, cur_hist)
            feature_drifts[f'feature_{i}'] = js_dist
            
        drift_score = max(feature_drifts.values()) if feature_drifts else 0.0
        
        return drift_score, None, feature_drifts

    def _generate_drift_recommendation(self, drift_score: float, feature_drifts: Dict[str, float], 
                                     drift_detected: bool) -> str:
        """Generate actionable recommendations based on drift detection"""
        
        if not drift_detected:
            return "No significant drift detected. Continue monitoring."
            
        # Find most drifted features
        sorted_drifts = sorted(feature_drifts.items(), key=lambda x: x[1], reverse=True)
        top_drift_features = sorted_drifts[:3]
        
        recommendations = []
        
        if drift_score > 0.3:
            recommendations.append("HIGH DRIFT: Consider model retraining immediately")
        elif drift_score > 0.15:
            recommendations.append("MODERATE DRIFT: Schedule model retraining within 7 days")
        else:
            recommendations.append("LOW DRIFT: Increase monitoring frequency")
            
        if top_drift_features:
            feature_names = [f[0] for f in top_drift_features]
            recommendations.append(f"Most affected features: {', '.join(feature_names)}")
            
        return ". ".join(recommendations)

    def track_performance(self, metrics: PerformanceMetrics) -> bool:
        """Track model performance and detect SLA violations"""
        self.performance_history.append(metrics)
        
        # Check SLA violations
        sla_violations = []
        
        if metrics.accuracy < self.accuracy_sla:
            sla_violations.append(f"accuracy {metrics.accuracy:.3f} < {self.accuracy_sla}")
            
        if metrics.latency_ms > self.latency_sla_ms:
            sla_violations.append(f"latency {metrics.latency_ms:.1f}ms > {self.latency_sla_ms}ms")
            
        if sla_violations:
            logger.warning(f"SLA violations: {', '.join(sla_violations)}")
            
            # Check if rollback threshold is exceeded
            recent_metrics = list(self.performance_history)[-self.performance_window:]
            if len(recent_metrics) >= 10:  # Minimum data points for rollback decision
                avg_accuracy = np.mean([m.accuracy for m in recent_metrics])
                avg_latency = np.mean([m.latency_ms for m in recent_metrics])
                
                if (avg_accuracy < self.accuracy_sla - self.rollback_threshold or 
                    avg_latency > self.latency_sla_ms * (1 + self.rollback_threshold)):
                    logger.critical("Rollback threshold exceeded. Initiating model rollback.")
                    return self._initiate_rollback()
        
        return True

    def _initiate_rollback(self) -> bool:
        """Initiate automatic model rollback to previous stable version"""
        if not self.current_model_id:
            logger.error("No current model to rollback from")
            return False
            
        # Find the most recent stable model
        stable_models = [
            (model_id, model) for model_id, model in self.models.items()
            if model.status == ModelStatus.DEPRECATED and model_id != self.current_model_id
        ]
        
        if not stable_models:
            logger.error("No stable model available for rollback")
            return False
            
        # Sort by deployment timestamp and get the most recent
        stable_models.sort(key=lambda x: x[1].deployment_timestamp, reverse=True)
        rollback_model_id, rollback_model = stable_models[0]
        
        # Mark current model as failed
        self.models[self.current_model_id].status = ModelStatus.FAILED
        
        # Activate rollback model
        rollback_model.status = ModelStatus.ROLLBACK
        self.current_model_id = rollback_model_id
        
        logger.critical(f"Rolled back to model {rollback_model_id}")
        
        # Generate rollback report
        self._generate_rollback_report(rollback_model_id)
        
        return True

    def _generate_rollback_report(self, rollback_model_id: str):
        """Generate rollback incident report"""
        report = {
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'rollback_model_id': rollback_model_id,
            'failed_model_id': [m for m, model in self.models.items() if model.status == ModelStatus.FAILED][-1],
            'performance_metrics': [asdict(m) for m in list(self.performance_history)[-50:]],
            'drift_metrics': [asdict(m) for m in list(self.drift_history)[-10:]],
            'sla_violations': self._calculate_sla_violations()
        }
        
        # Save rollback report  
        report_path = Path("launch-evidence/ai/rollback_reports")
        report_path.mkdir(parents=True, exist_ok=True)
        
        filename = f"rollback_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(report_path / filename, 'w') as f:
            json.dump(report, f, indent=2, default=str)
            
        logger.info(f"Rollback report saved to {report_path / filename}")

    def _calculate_sla_violations(self) -> Dict[str, Any]:
        """Calculate SLA violation statistics"""
        recent_metrics = list(self.performance_history)[-self.performance_window:]
        
        if not recent_metrics:
            return {}
            
        accuracy_violations = [m for m in recent_metrics if m.accuracy < self.accuracy_sla]
        latency_violations = [m for m in recent_metrics if m.latency_ms > self.latency_sla_ms]
        
        return {
            'accuracy_violation_rate': len(accuracy_violations) / len(recent_metrics),
            'latency_violation_rate': len(latency_violations) / len(recent_metrics),
            'avg_accuracy': np.mean([m.accuracy for m in recent_metrics]),
            'avg_latency_ms': np.mean([m.latency_ms for m in recent_metrics]),
            'total_violations': len(set(accuracy_violations + latency_violations))
        }

    def _calculate_model_hash(self, model_path: str) -> str:
        """Calculate SHA-256 hash of model file for integrity checking"""
        sha256_hash = hashlib.sha256()
        with open(model_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                sha256_hash.update(chunk)
        return sha256_hash.hexdigest()

    def _calculate_data_hash(self, data: np.ndarray) -> str:
        """Calculate hash of training data for drift reference"""
        return hashlib.sha256(data.tobytes()).hexdigest()

    def get_drift_summary(self) -> Dict[str, Any]:
        """Get summary of recent drift detection results"""
        recent_drifts = list(self.drift_history)[-10:]
        
        if not recent_drifts:
            return {"status": "no_data"}
            
        return {
            'latest_drift_score': recent_drifts[-1].drift_score,
            'drift_trend': self._calculate_drift_trend(recent_drifts),
            'detection_rate': sum(1 for d in recent_drifts if d.drift_detected) / len(recent_drifts),
            'avg_drift_score': np.mean([d.drift_score for d in recent_drifts]),
            'recommendations': [d.recommendation for d in recent_drifts if d.drift_detected]
        }

    def _calculate_drift_trend(self, drifts: List[DriftMetrics]) -> str:
        """Calculate drift trend direction"""
        if len(drifts) < 2:
            return "insufficient_data"
            
        scores = [d.drift_score for d in drifts]
        recent_avg = np.mean(scores[-3:])
        earlier_avg = np.mean(scores[:-3]) if len(scores) > 3 else scores[0]
        
        if recent_avg > earlier_avg * 1.1:
            return "increasing"
        elif recent_avg < earlier_avg * 0.9:
            return "decreasing"
        else:
            return "stable"

    def get_model_status(self) -> Dict[str, Any]:
        """Get current model deployment status"""
        return {
            'current_model': self.current_model_id,
            'model_status': self.models[self.current_model_id].status.value if self.current_model_id else None,
            'total_models': len(self.models),
            'active_models': len([m for m in self.models.values() if m.status == ModelStatus.ACTIVE]),
            'failed_models': len([m for m in self.models.values() if m.status == ModelStatus.FAILED]),
            'sla_compliance': self._calculate_sla_violations()
        }