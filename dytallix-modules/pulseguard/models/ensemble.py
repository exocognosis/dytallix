"""Ensemble model combining IsolationForest and LightGBM."""
import logging
from typing import List, Dict, Any, Tuple, Optional
import numpy as np
import pandas as pd
from .isolation_forest import IsolationForestModel
from .gbdt import GBDTModel

logger = logging.getLogger(__name__)


class EnsembleModel:
    """Hybrid ensemble combining unsupervised and supervised models."""
    
    def __init__(self, 
                 isolation_forest_weight: float = 0.4,
                 gbdt_weight: float = 0.6,
                 iforest_params: Optional[Dict] = None,
                 gbdt_params: Optional[Dict] = None):
        
        self.if_weight = isolation_forest_weight
        self.gbdt_weight = gbdt_weight
        
        # Normalize weights
        total_weight = self.if_weight + self.gbdt_weight
        if total_weight > 0:
            self.if_weight /= total_weight
            self.gbdt_weight /= total_weight
            
        # Initialize models
        iforest_params = iforest_params or {}
        gbdt_params = gbdt_params or {}
        
        self.isolation_forest = IsolationForestModel(**iforest_params)
        self.gbdt = GBDTModel(**gbdt_params)
        
        self.is_trained = False
        
    def train(self, 
              features: pd.DataFrame, 
              labels: Optional[np.ndarray] = None) -> Dict[str, Any]:
        """Train both models in the ensemble."""
        try:
            if features.empty:
                raise ValueError("No training data provided")
                
            metrics = {}
            
            # Train Isolation Forest (unsupervised)
            logger.info("Training Isolation Forest...")
            if_metrics = self.isolation_forest.train(features)
            metrics["isolation_forest"] = if_metrics
            
            # Train GBDT (supervised) if labels provided
            if labels is not None:
                logger.info("Training LightGBM...")
                gbdt_metrics = self.gbdt.train(features, labels)
                metrics["gbdt"] = gbdt_metrics
            else:
                logger.warning("No labels provided, skipping GBDT training")
                metrics["gbdt"] = {"status": "skipped"}
                
            self.is_trained = True
            
            # Overall metrics
            metrics["ensemble"] = {
                "if_weight": self.if_weight,
                "gbdt_weight": self.gbdt_weight,
                "n_samples": len(features),
                "n_features": len(features.columns)
            }
            
            logger.info("Ensemble training completed")
            return metrics
            
        except Exception as e:
            logger.error(f"Error training ensemble: {e}")
            raise
            
    def predict_scores(self, features: pd.DataFrame) -> Tuple[np.ndarray, Dict[str, Any]]:
        """Get ensemble anomaly scores and explanation."""
        try:
            if not self.is_trained:
                raise ValueError("Ensemble not trained")
                
            if features.empty:
                return np.array([]), {}
                
            # Get Isolation Forest scores
            if_scores = self.isolation_forest.predict_scores(features)
            
            # Get GBDT scores
            try:
                gbdt_scores = self.gbdt.predict_proba(features)
            except Exception as e:
                logger.warning(f"GBDT prediction failed: {e}")
                gbdt_scores = np.zeros(len(features))
                
            # Ensure same length
            min_length = min(len(if_scores), len(gbdt_scores))
            if min_length == 0:
                return np.array([]), {}
                
            if_scores = if_scores[:min_length]
            gbdt_scores = gbdt_scores[:min_length]
            
            # Combine scores
            ensemble_scores = (self.if_weight * if_scores + 
                             self.gbdt_weight * gbdt_scores)
            
            # Generate explanations
            explanations = self._generate_explanations(if_scores, gbdt_scores, features)
            
            return ensemble_scores, explanations
            
        except Exception as e:
            logger.error(f"Error predicting ensemble scores: {e}")
            return np.array([]), {}
            
    def _generate_explanations(self, 
                              if_scores: np.ndarray, 
                              gbdt_scores: np.ndarray,
                              features: pd.DataFrame) -> Dict[str, Any]:
        """Generate explanation metadata."""
        try:
            explanations = {
                "sub_scores": {
                    "isolation_forest": if_scores.tolist() if len(if_scores) > 0 else [],
                    "gbdt": gbdt_scores.tolist() if len(gbdt_scores) > 0 else []
                },
                "weights": {
                    "isolation_forest": self.if_weight,
                    "gbdt": self.gbdt_weight
                },
                "feature_importance": {},
                "model_versions": {
                    "isolation_forest": "v1.0",
                    "gbdt": "v1.0"
                }
            }
            
            # Get feature importance from GBDT if available
            try:
                explanations["feature_importance"] = self.gbdt.get_feature_importance(top_k=10)
            except Exception:
                pass
                
            return explanations
            
        except Exception as e:
            logger.error(f"Error generating explanations: {e}")
            return {}
            
    def get_reason_codes(self, 
                        scores: np.ndarray, 
                        features: pd.DataFrame,
                        threshold: float = 0.7) -> List[List[str]]:
        """Generate reason codes for high-scoring samples."""
        try:
            reason_codes = []
            
            for i, score in enumerate(scores):
                codes = []
                
                if score >= threshold:
                    # Check which model contributed most
                    if_scores = self.isolation_forest.predict_scores(features.iloc[[i]])
                    gbdt_scores = self.gbdt.predict_proba(features.iloc[[i]])
                    
                    if len(if_scores) > 0 and if_scores[0] >= 0.6:
                        codes.append("PG.MODEL.IF.HIGH")
                        
                    if len(gbdt_scores) > 0 and gbdt_scores[0] >= 0.6:
                        codes.append("PG.MODEL.GBDT.HIGH")
                        
                    # Add feature-based codes
                    if i < len(features):
                        row = features.iloc[i]
                        
                        # Check for suspicious patterns
                        if row.get("burstiness", 0) > 0.8:
                            codes.append("PG.TEMPORAL.BURST.K1")
                            
                        if row.get("in_cycle", 0) > 0:
                            codes.append("PG.GRAPH.CYCLE.K1")
                            
                        if row.get("k1_neighbors", 0) > 10:
                            codes.append("PG.GRAPH.HIGHCONN.K1")
                            
                reason_codes.append(codes)
                
            return reason_codes
            
        except Exception as e:
            logger.error(f"Error generating reason codes: {e}")
            return []
            
    def save(self, base_filepath: str):
        """Save the ensemble models."""
        try:
            if not self.is_trained:
                raise ValueError("Ensemble not trained")
                
            # Save individual models
            if_path = f"{base_filepath}_isolation_forest"
            gbdt_path = f"{base_filepath}_gbdt"
            
            self.isolation_forest.save(if_path)
            self.gbdt.save(gbdt_path)
            
            # Save ensemble metadata
            import json
            metadata = {
                "if_weight": self.if_weight,
                "gbdt_weight": self.gbdt_weight,
                "if_model_path": if_path,
                "gbdt_model_path": gbdt_path
            }
            
            with open(f"{base_filepath}_ensemble.json", 'w') as f:
                json.dump(metadata, f, indent=2)
                
            logger.info(f"Saved ensemble models to {base_filepath}")
            
        except Exception as e:
            logger.error(f"Error saving ensemble: {e}")
            raise
            
    def load(self, base_filepath: str):
        """Load the ensemble models."""
        try:
            import json
            
            # Load ensemble metadata
            with open(f"{base_filepath}_ensemble.json", 'r') as f:
                metadata = json.load(f)
                
            self.if_weight = metadata["if_weight"]
            self.gbdt_weight = metadata["gbdt_weight"]
            
            # Load individual models
            self.isolation_forest.load(metadata["if_model_path"])
            self.gbdt.load(metadata["gbdt_model_path"])
            
            self.is_trained = True
            
            logger.info(f"Loaded ensemble models from {base_filepath}")
            
        except Exception as e:
            logger.error(f"Error loading ensemble: {e}")
            raise
            
    @classmethod
    def load_from_file(cls, base_filepath: str) -> 'EnsembleModel':
        """Load ensemble from file and return instance."""
        ensemble = cls()
        ensemble.load(base_filepath)
        return ensemble


def combine_scores(anomaly_scores: List[float], 
                  clf_scores: List[float], 
                  graph_score: float,
                  weights: Optional[Dict[str, float]] = None) -> Tuple[float, List[str]]:
    """Combine different types of scores into final ensemble score."""
    try:
        if weights is None:
            weights = {"anomaly": 0.4, "classifier": 0.4, "graph": 0.2}
            
        # Average anomaly scores
        avg_anomaly = np.mean(anomaly_scores) if anomaly_scores else 0.0
        
        # Average classifier scores
        avg_classifier = np.mean(clf_scores) if clf_scores else 0.0
        
        # Combine with weights
        final_score = (weights.get("anomaly", 0.4) * avg_anomaly +
                      weights.get("classifier", 0.4) * avg_classifier +
                      weights.get("graph", 0.2) * graph_score)
                      
        # Generate ensemble reasons
        reasons = []
        if avg_anomaly > 0.7:
            reasons.append("PG.ENSEMBLE.ANOMALY.HIGH")
        if avg_classifier > 0.7:
            reasons.append("PG.ENSEMBLE.CLASSIFIER.HIGH")
        if graph_score > 0.7:
            reasons.append("PG.ENSEMBLE.GRAPH.HIGH")
            
        return float(final_score), reasons
        
    except Exception as e:
        logger.error(f"Error combining scores: {e}")
        return 0.0, []