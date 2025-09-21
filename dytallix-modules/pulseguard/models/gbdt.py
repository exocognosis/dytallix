"""LightGBM gradient boosting for supervised classification."""
import logging
import json
import pickle
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
import numpy as np
import pandas as pd

try:
    import lightgbm as lgb
    LIGHTGBM_AVAILABLE = True
except ImportError:
    LIGHTGBM_AVAILABLE = False
    lgb = None

logger = logging.getLogger(__name__)


class GBDTModel:
    """LightGBM gradient boosting wrapper."""
    
    def __init__(self, 
                 objective: str = "binary",
                 num_leaves: int = 31,
                 learning_rate: float = 0.1,
                 n_estimators: int = 100):
        
        if not LIGHTGBM_AVAILABLE:
            raise ImportError("LightGBM not available. Install with: pip install lightgbm")
            
        self.objective = objective
        self.num_leaves = num_leaves
        self.learning_rate = learning_rate
        self.n_estimators = n_estimators
        self.model = None
        self.feature_names = []
        self.feature_importance = {}
        
    def train(self, 
              features: pd.DataFrame, 
              labels: np.ndarray, 
              validation_split: float = 0.2) -> Dict[str, Any]:
        """Train the LightGBM model."""
        try:
            if features.empty:
                raise ValueError("No training data provided")
                
            if len(features) != len(labels):
                raise ValueError("Features and labels length mismatch")
                
            # Store feature names
            self.feature_names = list(features.columns)
            
            # Handle missing values
            features_clean = features.fillna(0)
            
            # Split data
            n_samples = len(features_clean)
            n_val = int(n_samples * validation_split)
            
            if n_val > 0:
                val_idx = np.random.choice(n_samples, n_val, replace=False)
                train_idx = np.setdiff1d(np.arange(n_samples), val_idx)
                
                X_train, X_val = features_clean.iloc[train_idx], features_clean.iloc[val_idx]
                y_train, y_val = labels[train_idx], labels[val_idx]
            else:
                X_train, X_val = features_clean, None
                y_train, y_val = labels, None
                
            # Create datasets
            train_data = lgb.Dataset(X_train, label=y_train)
            valid_data = lgb.Dataset(X_val, label=y_val) if X_val is not None else None
            
            # Training parameters
            params = {
                'objective': self.objective,
                'num_leaves': self.num_leaves,
                'learning_rate': self.learning_rate,
                'metric': 'binary_logloss' if self.objective == 'binary' else 'rmse',
                'verbosity': -1,
                'seed': 42
            }
            
            # Train model
            self.model = lgb.train(
                params,
                train_data,
                num_boost_round=self.n_estimators,
                valid_sets=[valid_data] if valid_data else None,
                callbacks=[lgb.early_stopping(10)] if valid_data else None
            )
            
            # Store feature importance
            self.feature_importance = dict(zip(
                self.feature_names, 
                self.model.feature_importance(importance_type='gain')
            ))
            
            # Compute training metrics
            train_pred = self.model.predict(X_train)
            if self.objective == 'binary':
                train_pred_binary = (train_pred > 0.5).astype(int)
                accuracy = np.mean(train_pred_binary == y_train)
                
                metrics = {
                    "n_samples": len(features),
                    "n_features": len(features.columns),
                    "train_accuracy": float(accuracy),
                    "n_estimators_used": self.model.num_trees(),
                    "feature_importance_top5": dict(sorted(
                        self.feature_importance.items(), 
                        key=lambda x: x[1], reverse=True
                    )[:5])
                }
            else:
                mse = np.mean((train_pred - y_train) ** 2)
                metrics = {
                    "n_samples": len(features),
                    "n_features": len(features.columns),
                    "train_mse": float(mse),
                    "n_estimators_used": self.model.num_trees()
                }
                
            logger.info(f"Trained LightGBM: {metrics}")
            return metrics
            
        except Exception as e:
            logger.error(f"Error training LightGBM: {e}")
            raise
            
    def predict_proba(self, features: pd.DataFrame) -> np.ndarray:
        """Get prediction probabilities."""
        try:
            if self.model is None:
                raise ValueError("Model not trained")
                
            if features.empty:
                return np.array([])
                
            # Align features with training features
            features_aligned = self._align_features(features)
            
            # Handle missing values
            features_clean = features_aligned.fillna(0)
            
            # Get predictions
            predictions = self.model.predict(features_clean)
            
            # For binary classification, return probabilities
            if self.objective == 'binary':
                return predictions
            else:
                # For regression, return as-is
                return predictions
                
        except Exception as e:
            logger.error(f"Error predicting with LightGBM: {e}")
            return np.array([])
            
    def predict(self, features: pd.DataFrame) -> np.ndarray:
        """Get binary predictions."""
        try:
            proba = self.predict_proba(features)
            if len(proba) == 0:
                return np.array([])
                
            if self.objective == 'binary':
                return (proba > 0.5).astype(int)
            else:
                return proba
                
        except Exception as e:
            logger.error(f"Error predicting labels with LightGBM: {e}")
            return np.array([])
            
    def get_feature_importance(self, top_k: int = 10) -> Dict[str, float]:
        """Get top-k feature importance."""
        try:
            if not self.feature_importance:
                return {}
                
            sorted_features = sorted(
                self.feature_importance.items(), 
                key=lambda x: x[1], 
                reverse=True
            )
            
            return dict(sorted_features[:top_k])
            
        except Exception as e:
            logger.error(f"Error getting feature importance: {e}")
            return {}
            
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
                
            Path(filepath).parent.mkdir(parents=True, exist_ok=True)
            
            # Save LightGBM model
            model_file = str(Path(filepath).with_suffix('.lgb'))
            self.model.save_model(model_file)
            
            # Save metadata
            metadata = {
                "feature_names": self.feature_names,
                "feature_importance": self.feature_importance,
                "objective": self.objective,
                "num_leaves": self.num_leaves,
                "learning_rate": self.learning_rate,
                "n_estimators": self.n_estimators
            }
            
            metadata_file = str(Path(filepath).with_suffix('.json'))
            with open(metadata_file, 'w') as f:
                json.dump(metadata, f, indent=2)
                
            logger.info(f"Saved LightGBM model to {filepath}")
            
        except Exception as e:
            logger.error(f"Error saving model: {e}")
            raise
            
    def load(self, filepath: str):
        """Load a trained model."""
        try:
            # Load LightGBM model
            model_file = str(Path(filepath).with_suffix('.lgb'))
            self.model = lgb.Booster(model_file=model_file)
            
            # Load metadata
            metadata_file = str(Path(filepath).with_suffix('.json'))
            with open(metadata_file, 'r') as f:
                metadata = json.load(f)
                
            self.feature_names = metadata["feature_names"]
            self.feature_importance = metadata["feature_importance"]
            self.objective = metadata["objective"]
            self.num_leaves = metadata["num_leaves"]
            self.learning_rate = metadata["learning_rate"]
            self.n_estimators = metadata["n_estimators"]
            
            logger.info(f"Loaded LightGBM model from {filepath}")
            
        except Exception as e:
            logger.error(f"Error loading model: {e}")
            raise
            
    @classmethod
    def load_from_file(cls, filepath: str) -> 'GBDTModel':
        """Load model from file and return instance."""
        model = cls()
        model.load(filepath)
        return model