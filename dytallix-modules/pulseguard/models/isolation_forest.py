"""Isolation Forest for unsupervised anomaly detection."""
import logging
import pickle
from pathlib import Path
from typing import List, Dict, Any, Optional
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

logger = logging.getLogger(__name__)


class IsolationForestModel:
    """Isolation Forest wrapper for anomaly detection."""
    
    def __init__(self, n_estimators: int = 200, contamination: float = 0.1):
        self.n_estimators = n_estimators
        self.contamination = contamination
        self.model = None
        self.scaler = StandardScaler()
        self.feature_names = []
        
    def train(self, features: pd.DataFrame) -> Dict[str, Any]:
        """Train the Isolation Forest model."""
        try:
            if features.empty:
                raise ValueError("No training data provided")
                
            # Store feature names
            self.feature_names = list(features.columns)
            
            # Handle missing values
            features_clean = features.fillna(0)
            
            # Scale features
            X_scaled = self.scaler.fit_transform(features_clean)
            
            # Train model
            self.model = IsolationForest(
                n_estimators=self.n_estimators,
                contamination=self.contamination,
                random_state=42,
                n_jobs=-1
            )
            
            self.model.fit(X_scaled)
            
            # Compute training metrics
            train_scores = self.model.decision_function(X_scaled)
            train_labels = self.model.predict(X_scaled)
            
            metrics = {
                "n_samples": len(features),
                "n_features": len(features.columns),
                "n_anomalies": int(np.sum(train_labels == -1)),
                "anomaly_rate": float(np.mean(train_labels == -1)),
                "mean_score": float(np.mean(train_scores)),
                "std_score": float(np.std(train_scores))
            }
            
            logger.info(f"Trained IsolationForest: {metrics}")
            return metrics
            
        except Exception as e:
            logger.error(f"Error training IsolationForest: {e}")
            raise
            
    def predict_scores(self, features: pd.DataFrame) -> np.ndarray:
        """Get anomaly scores (higher = more anomalous)."""
        try:
            if self.model is None:
                raise ValueError("Model not trained")
                
            if features.empty:
                return np.array([])
                
            # Align features with training features
            features_aligned = self._align_features(features)
            
            # Handle missing values
            features_clean = features_aligned.fillna(0)
            
            # Scale features
            X_scaled = self.scaler.transform(features_clean)
            
            # Get decision function scores (higher = more normal)
            decision_scores = self.model.decision_function(X_scaled)
            
            # Convert to anomaly scores (higher = more anomalous)
            anomaly_scores = -decision_scores
            
            # Normalize to [0, 1] range
            min_score = np.min(anomaly_scores)
            max_score = np.max(anomaly_scores)
            
            if max_score > min_score:
                normalized_scores = (anomaly_scores - min_score) / (max_score - min_score)
            else:
                normalized_scores = np.zeros_like(anomaly_scores)
                
            return normalized_scores
            
        except Exception as e:
            logger.error(f"Error predicting scores with IsolationForest: {e}")
            return np.array([])
            
    def predict_labels(self, features: pd.DataFrame) -> np.ndarray:
        """Get binary anomaly labels (-1 = anomaly, 1 = normal)."""
        try:
            if self.model is None:
                raise ValueError("Model not trained")
                
            if features.empty:
                return np.array([])
                
            # Align features with training features
            features_aligned = self._align_features(features)
            
            # Handle missing values
            features_clean = features_aligned.fillna(0)
            
            # Scale features
            X_scaled = self.scaler.transform(features_clean)
            
            # Get predictions
            return self.model.predict(X_scaled)
            
        except Exception as e:
            logger.error(f"Error predicting labels with IsolationForest: {e}")
            return np.array([])
            
    def _align_features(self, features: pd.DataFrame) -> pd.DataFrame:
        """Align features with training feature names."""
        try:
            # Add missing columns with zeros
            for col in self.feature_names:
                if col not in features.columns:
                    features[col] = 0
                    
            # Select only training columns in correct order
            return features[self.feature_names]
            
        except Exception as e:
            logger.error(f"Error aligning features: {e}")
            return features
            
    def save(self, filepath: str):
        """Save the trained model."""
        try:
            if self.model is None:
                raise ValueError("No model to save")
                
            model_data = {
                "model": self.model,
                "scaler": self.scaler,
                "feature_names": self.feature_names,
                "n_estimators": self.n_estimators,
                "contamination": self.contamination
            }
            
            Path(filepath).parent.mkdir(parents=True, exist_ok=True)
            
            with open(filepath, 'wb') as f:
                pickle.dump(model_data, f)
                
            logger.info(f"Saved IsolationForest model to {filepath}")
            
        except Exception as e:
            logger.error(f"Error saving model: {e}")
            raise
            
    def load(self, filepath: str):
        """Load a trained model."""
        try:
            with open(filepath, 'rb') as f:
                model_data = pickle.load(f)
                
            self.model = model_data["model"]
            self.scaler = model_data["scaler"]
            self.feature_names = model_data["feature_names"]
            self.n_estimators = model_data["n_estimators"]
            self.contamination = model_data["contamination"]
            
            logger.info(f"Loaded IsolationForest model from {filepath}")
            
        except Exception as e:
            logger.error(f"Error loading model: {e}")
            raise
            
    @classmethod
    def load_from_file(cls, filepath: str) -> 'IsolationForestModel':
        """Load model from file and return instance."""
        model = cls()
        model.load(filepath)
        return model