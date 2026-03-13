#!/usr/bin/env python3
"""
Network Sentinel - Anomaly Detection Training Script
Implements Isolation Forest and Autoencoder for network anomaly detection
"""

import os
import json
import logging
import numpy as np
import pandas as pd
from datetime import datetime
from typing import Dict, List, Tuple, Any
import warnings
warnings.filterwarnings('ignore')

# Try importing ML libraries with fallback
try:
    from sklearn.ensemble import IsolationForest
    from sklearn.preprocessing import StandardScaler
    from sklearn.model_selection import train_test_split, cross_val_score
    from sklearn.metrics import roc_auc_score, precision_recall_curve, auc
    import joblib
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False
    print("Warning: scikit-learn not available. Using mock implementation.")

try:
    import torch
    import torch.nn as nn
    import torch.optim as optim
    from torch.utils.data import DataLoader, TensorDataset
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False
    print("Warning: PyTorch not available. Using mock implementation.")

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MockModel:
    """Mock model for when dependencies are not available"""
    def __init__(self, *args, **kwargs):
        self.trained = False
    
    def fit(self, X, y=None):
        self.trained = True
        return self
    
    def predict(self, X):
        return np.random.choice([-1, 1], size=len(X))
    
    def decision_function(self, X):
        return np.random.uniform(-1, 1, size=len(X))

class Autoencoder(nn.Module if TORCH_AVAILABLE else object):
    """Autoencoder neural network for anomaly detection"""
    
    def __init__(self, input_dim: int, hidden_dims: List[int], dropout_rate: float = 0.1):
        if TORCH_AVAILABLE:
            super().__init__()
            
            # Encoder
            encoder_layers = []
            prev_dim = input_dim
            for dim in hidden_dims[:len(hidden_dims)//2 + 1]:
                encoder_layers.extend([
                    nn.Linear(prev_dim, dim),
                    nn.ReLU(),
                    nn.Dropout(dropout_rate)
                ])
                prev_dim = dim
            
            # Decoder
            decoder_layers = []
            for dim in hidden_dims[len(hidden_dims)//2 + 1:]:
                decoder_layers.extend([
                    nn.Linear(prev_dim, dim),
                    nn.ReLU(),
                    nn.Dropout(dropout_rate)
                ])
                prev_dim = dim
            
            decoder_layers.append(nn.Linear(prev_dim, input_dim))
            
            self.encoder = nn.Sequential(*encoder_layers)
            self.decoder = nn.Sequential(*decoder_layers)
        else:
            self.input_dim = input_dim
            self.trained = False
    
    def forward(self, x):
        if TORCH_AVAILABLE:
            encoded = self.encoder(x)
            decoded = self.decoder(encoded)
            return decoded
        else:
            return x
    
    def predict(self, X):
        if not TORCH_AVAILABLE:
            return np.random.uniform(0, 1, size=len(X))
        
        self.eval()
        with torch.no_grad():
            X_tensor = torch.FloatTensor(X)
            reconstructed = self.forward(X_tensor)
            mse = torch.mean((X_tensor - reconstructed) ** 2, dim=1)
            return mse.numpy()

class SentinelModel:
    """Network Sentinel anomaly detection model"""
    
    def __init__(self, config_path: str = "config.json"):
        """Initialize the model with configuration"""
        self.config = self._load_config(config_path)
        self.scaler = StandardScaler() if SKLEARN_AVAILABLE else None
        self.isolation_forest = None
        self.autoencoder = None
        self.trained = False
        
    def _load_config(self, config_path: str) -> Dict[str, Any]:
        """Load configuration from JSON file"""
        try:
            with open(config_path, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            logger.warning(f"Config file {config_path} not found. Using defaults.")
            return self._default_config()
    
    def _default_config(self) -> Dict[str, Any]:
        """Default configuration"""
        return {
            "model_config": {
                "isolation_forest": {"contamination": 0.1, "n_estimators": 100},
                "autoencoder": {"input_dim": 20, "hidden_dims": [16, 8, 4, 8, 16], "epochs": 30}
            },
            "data_config": {"synthetic_data": {"normal_samples": 8000, "anomalous_samples": 1000}},
            "detection_config": {"ensemble_weights": {"isolation_forest": 0.6, "autoencoder": 0.4}}
        }
    
    def generate_synthetic_data(self) -> Tuple[np.ndarray, np.ndarray]:
        """Generate synthetic transaction data for training"""
        logger.info("Generating synthetic transaction data...")
        
        config = self.config["data_config"]["synthetic_data"]
        n_normal = config["normal_samples"]
        n_anomalous = config["anomalous_samples"]
        n_features = self.config["model_config"]["autoencoder"]["input_dim"]
        
        # Generate normal transactions
        normal_data = np.random.multivariate_normal(
            mean=np.zeros(n_features),
            cov=np.eye(n_features),
            size=n_normal
        )
        
        # Add realistic transaction patterns
        normal_data[:, 0] = np.abs(np.random.lognormal(5, 2, n_normal))  # transaction_amount
        normal_data[:, 1] = np.abs(np.random.normal(20, 5, n_normal))   # gas_price
        normal_data[:, 2] = np.random.poisson(10, n_normal)             # frequency
        normal_data[:, 3] = np.random.exponential(365, n_normal)        # wallet_age
        
        # Generate anomalous transactions
        anomalous_data = np.random.multivariate_normal(
            mean=np.ones(n_features) * 3,  # Shifted mean
            cov=np.eye(n_features) * 4,    # Higher variance
            size=n_anomalous
        )
        
        # Add anomalous patterns
        anomalous_data[:, 0] = np.abs(np.random.lognormal(10, 3, n_anomalous))  # High amounts
        anomalous_data[:, 1] = np.abs(np.random.normal(100, 20, n_anomalous))  # High gas
        anomalous_data[:, 2] = np.random.poisson(100, n_anomalous)             # High frequency
        
        # Combine data
        X = np.vstack([normal_data, anomalous_data])
        y = np.hstack([np.ones(n_normal), -np.ones(n_anomalous)])  # 1 = normal, -1 = anomaly
        
        # Shuffle
        indices = np.random.permutation(len(X))
        X, y = X[indices], y[indices]
        
        logger.info(f"Generated {len(X)} samples ({n_normal} normal, {n_anomalous} anomalous)")
        return X, y
    
    def train(self, data_path: str = None) -> Dict[str, float]:
        """Train the anomaly detection models"""
        logger.info("Starting training...")
        
        # Load or generate data
        if data_path and os.path.exists(data_path):
            logger.info(f"Loading data from {data_path}")
            data = pd.read_csv(data_path)
            X = data.drop(['label'], axis=1).values if 'label' in data.columns else data.values
            y = data['label'].values if 'label' in data.columns else None
        else:
            X, y = self.generate_synthetic_data()
        
        # Normalize features
        if self.scaler:
            X_scaled = self.scaler.fit_transform(X)
        else:
            X_scaled = X
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X_scaled, y, test_size=0.2, random_state=42, stratify=y if y is not None else None
        )
        
        # Train Isolation Forest
        logger.info("Training Isolation Forest...")
        if SKLEARN_AVAILABLE:
            if_config = self.config["model_config"]["isolation_forest"]
            self.isolation_forest = IsolationForest(**if_config)
            self.isolation_forest.fit(X_train)
        else:
            self.isolation_forest = MockModel()
            self.isolation_forest.fit(X_train)
        
        # Train Autoencoder
        logger.info("Training Autoencoder...")
        ae_config = self.config["model_config"]["autoencoder"]
        
        if TORCH_AVAILABLE:
            self.autoencoder = Autoencoder(
                input_dim=ae_config["input_dim"],
                hidden_dims=ae_config["hidden_dims"],
                dropout_rate=ae_config.get("dropout_rate", 0.1)
            )
            
            criterion = nn.MSELoss()
            optimizer = optim.Adam(self.autoencoder.parameters(), lr=ae_config.get("learning_rate", 0.001))
            
            # Convert to tensors
            X_train_tensor = torch.FloatTensor(X_train)
            train_dataset = TensorDataset(X_train_tensor, X_train_tensor)
            train_loader = DataLoader(train_dataset, batch_size=ae_config.get("batch_size", 32), shuffle=True)
            
            # Training loop
            for epoch in range(ae_config["epochs"]):
                epoch_loss = 0
                for batch_X, _ in train_loader:
                    optimizer.zero_grad()
                    reconstructed = self.autoencoder(batch_X)
                    loss = criterion(reconstructed, batch_X)
                    loss.backward()
                    optimizer.step()
                    epoch_loss += loss.item()
                
                if epoch % 10 == 0:
                    logger.info(f"Epoch {epoch}, Loss: {epoch_loss/len(train_loader):.4f}")
        else:
            self.autoencoder = MockModel()
            self.autoencoder.fit(X_train)
        
        # Evaluate models
        metrics = self._evaluate_models(X_test, y_test)
        
        # Save models
        self._save_models()
        
        # Save metrics
        self._save_metrics(metrics)
        
        self.trained = True
        logger.info("Training completed successfully!")
        return metrics
    
    def _evaluate_models(self, X_test: np.ndarray, y_test: np.ndarray) -> Dict[str, float]:
        """Evaluate model performance"""
        metrics = {}
        
        try:
            # Isolation Forest evaluation
            if_predictions = self.isolation_forest.decision_function(X_test)
            if y_test is not None and SKLEARN_AVAILABLE:
                if_auc = roc_auc_score(y_test == 1, if_predictions)
                metrics["isolation_forest_auc"] = if_auc
                
                precision, recall, _ = precision_recall_curve(y_test == -1, -if_predictions)
                pr_auc = auc(recall, precision)
                metrics["isolation_forest_pr_auc"] = pr_auc
            
            # Autoencoder evaluation
            ae_scores = self.autoencoder.predict(X_test)
            if y_test is not None and SKLEARN_AVAILABLE:
                ae_auc = roc_auc_score(y_test == -1, ae_scores)
                metrics["autoencoder_auc"] = ae_auc
            
            logger.info(f"Evaluation metrics: {metrics}")
        except Exception as e:
            logger.warning(f"Evaluation failed: {e}")
            metrics = {"status": "evaluation_failed"}
        
        return metrics
    
    def predict(self, features: Dict[str, Any]) -> Dict[str, Any]:
        """Predict anomaly for new transaction"""
        if not self.trained:
            raise ValueError("Model not trained yet. Call train() first.")
        
        # Convert features to array
        if isinstance(features, dict):
            feature_vector = self._dict_to_vector(features)
        else:
            feature_vector = np.array(features).reshape(1, -1)
        
        # Normalize
        if self.scaler:
            feature_vector = self.scaler.transform(feature_vector)
        
        # Get predictions from both models
        if_score = self.isolation_forest.decision_function(feature_vector)[0]
        ae_score = self.autoencoder.predict(feature_vector)[0]
        
        # Ensemble prediction
        weights = self.config["detection_config"]["ensemble_weights"]
        ensemble_score = weights["isolation_forest"] * (-if_score) + weights["autoencoder"] * ae_score
        
        # Classify
        thresholds = self.config["detection_config"]["thresholds"]
        if ensemble_score > thresholds["high_risk"]:
            classification = "anomalous"
            risk_factors = ["High ensemble score", "Multiple model agreement"]
        elif ensemble_score > thresholds["medium_risk"]:
            classification = "suspicious"
            risk_factors = ["Moderate anomaly signals"]
        else:
            classification = "normal"
            risk_factors = []
        
        return {
            "anomaly_score": float(ensemble_score),
            "classification": classification,
            "confidence": min(1.0, abs(ensemble_score)),
            "risk_factors": risk_factors,
            "model_scores": {
                "isolation_forest": float(-if_score),
                "autoencoder": float(ae_score)
            },
            "recommended_actions": self._get_recommendations(classification, ensemble_score)
        }
    
    def _dict_to_vector(self, features: Dict[str, Any]) -> np.ndarray:
        """Convert feature dictionary to vector"""
        feature_names = self.config["data_config"]["features"]
        vector = []
        
        for feature_name in feature_names:
            if feature_name in features:
                vector.append(features[feature_name])
            else:
                vector.append(0.0)  # Default value for missing features
        
        return np.array(vector).reshape(1, -1)
    
    def _get_recommendations(self, classification: str, score: float) -> List[str]:
        """Get recommended actions based on classification"""
        if classification == "anomalous":
            return [
                "Flag for manual review",
                "Implement additional verification",
                "Monitor associated wallets",
                "Consider temporary restrictions"
            ]
        elif classification == "suspicious":
            return [
                "Enhanced monitoring",
                "Log for pattern analysis",
                "Verify with additional signals"
            ]
        else:
            return ["Normal processing"]
    
    def _save_models(self):
        """Save trained models"""
        models_dir = self.config.get("training_config", {}).get("save_model_path", "models/")
        os.makedirs(models_dir, exist_ok=True)
        
        try:
            if SKLEARN_AVAILABLE and self.isolation_forest:
                joblib.dump(self.isolation_forest, os.path.join(models_dir, "isolation_forest.pkl"))
                joblib.dump(self.scaler, os.path.join(models_dir, "scaler.pkl"))
            
            if TORCH_AVAILABLE and self.autoencoder:
                torch.save(self.autoencoder.state_dict(), os.path.join(models_dir, "autoencoder.pth"))
            
            logger.info(f"Models saved to {models_dir}")
        except Exception as e:
            logger.warning(f"Failed to save models: {e}")
    
    def _save_metrics(self, metrics: Dict[str, float]):
        """Save training metrics"""
        metrics_path = self.config.get("training_config", {}).get("metrics_path", "metrics.json")
        
        metrics_data = {
            "timestamp": datetime.now().isoformat(),
            "model_type": "network_sentinel",
            "metrics": metrics,
            "config": self.config
        }
        
        try:
            with open(metrics_path, 'w') as f:
                json.dump(metrics_data, f, indent=2)
            logger.info(f"Metrics saved to {metrics_path}")
        except Exception as e:
            logger.warning(f"Failed to save metrics: {e}")

def main():
    """Main training function"""
    print("Network Sentinel - Anomaly Detection Training")
    print("=" * 50)
    
    # Initialize model
    model = SentinelModel()
    
    # Train model
    metrics = model.train()
    
    # Test prediction
    print("\nTesting prediction...")
    test_features = {
        "transaction_amount": 10000.0,
        "gas_price": 50.0,
        "transaction_frequency": 5,
        "wallet_age_days": 100,
        "unique_interactions": 15
    }
    
    result = model.predict(test_features)
    print(f"Test prediction: {result}")
    
    print("\nTraining completed successfully!")

if __name__ == "__main__":
    main()