#!/usr/bin/env python3
"""
Network Sentinel - Simplified Training Script (No External Dependencies)
"""

import json
import math
import random
import os
from datetime import datetime
from typing import Dict, List, Tuple, Any


class SimpleSentinel:
    """Simplified Network Sentinel using built-in Python only"""
    
    def __init__(self, config_path: str = "config.json"):
        self.config = self._load_config(config_path)
        self.trained = False
        self.model_parameters = {}
        
    def _load_config(self, config_path: str) -> Dict[str, Any]:
        """Load configuration from JSON file"""
        try:
            with open(config_path, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            return self._default_config()
    
    def _default_config(self) -> Dict[str, Any]:
        """Default configuration"""
        return {
            "model_config": {
                "contamination": 0.1,
                "threshold": 0.5
            },
            "data_config": {
                "normal_samples": 1000,
                "anomalous_samples": 100
            }
        }
    
    def generate_synthetic_data(self) -> Tuple[List[List[float]], List[int]]:
        """Generate synthetic transaction data"""
        print("Generating synthetic data...")
        
        normal_samples = self.config["data_config"].get("normal_samples", 
                                                        self.config["data_config"]["synthetic_data"]["normal_samples"])
        anomalous_samples = self.config["data_config"].get("anomalous_samples",
                                                          self.config["data_config"]["synthetic_data"]["anomalous_samples"])
        
        X = []
        y = []
        
        # Generate normal transactions
        for _ in range(normal_samples):
            transaction = [
                random.lognormvariate(5, 1),     # transaction_amount
                random.gauss(20, 5),             # gas_price
                random.randint(1, 20),           # frequency
                random.expovariate(1/365),       # wallet_age
                random.randint(1, 50),           # interactions
            ]
            X.append(transaction)
            y.append(1)  # normal
        
        # Generate anomalous transactions
        for _ in range(anomalous_samples):
            transaction = [
                random.lognormvariate(8, 2),     # high transaction_amount
                random.gauss(100, 20),           # high gas_price
                random.randint(50, 200),         # high frequency
                random.expovariate(1/10),        # young wallet
                random.randint(1, 5),            # few interactions
            ]
            X.append(transaction)
            y.append(-1)  # anomaly
        
        # Shuffle data
        combined = list(zip(X, y))
        random.shuffle(combined)
        X, y = zip(*combined)
        
        print(f"Generated {len(X)} samples")
        return list(X), list(y)
    
    def train(self) -> Dict[str, float]:
        """Train the model with simple statistics"""
        print("Training model...")
        
        X, y = self.generate_synthetic_data()
        
        # Separate normal and anomalous data
        normal_data = [x for x, label in zip(X, y) if label == 1]
        anomalous_data = [x for x, label in zip(X, y) if label == -1]
        
        # Calculate statistics for normal data
        n_features = len(normal_data[0])
        means = []
        stds = []
        
        for i in range(n_features):
            feature_values = [row[i] for row in normal_data]
            mean = sum(feature_values) / len(feature_values)
            variance = sum((x - mean) ** 2 for x in feature_values) / len(feature_values)
            std = math.sqrt(variance)
            
            means.append(mean)
            stds.append(std)
        
        self.model_parameters = {
            "means": means,
            "stds": stds,
            "threshold": self.config["model_config"].get("threshold", 0.5)
        }
        
        self.trained = True  # Set trained flag before evaluation
        
        # Simple evaluation
        correct_predictions = 0
        total_predictions = len(X)
        
        for features, true_label in zip(X, y):
            prediction = self.predict_simple(features)
            predicted_label = 1 if prediction["classification"] == "normal" else -1
            if predicted_label == true_label:
                correct_predictions += 1
        
        accuracy = correct_predictions / total_predictions
        
        metrics = {
            "accuracy": accuracy,
            "training_samples": len(X),
            "normal_samples": len(normal_data),
            "anomalous_samples": len(anomalous_data)
        }
        
        # Save metrics
        self._save_metrics(metrics)
        
        print(f"Training completed. Accuracy: {accuracy:.2f}")
        return metrics
    
    def predict_simple(self, features: List[float]) -> Dict[str, Any]:
        """Simple prediction using z-score"""
        if not self.trained:
            raise ValueError("Model not trained")
        
        # Calculate z-scores
        z_scores = []
        for i, (feature, mean, std) in enumerate(zip(features, 
                                                   self.model_parameters["means"],
                                                   self.model_parameters["stds"])):
            if std > 0:
                z_score = abs(feature - mean) / std
            else:
                z_score = 0
            z_scores.append(z_score)
        
        # Anomaly score is max z-score
        anomaly_score = max(z_scores)
        
        # Classification
        threshold = self.model_parameters["threshold"]
        if anomaly_score > 2.5:
            classification = "anomalous"
        elif anomaly_score > 1.5:
            classification = "suspicious"
        else:
            classification = "normal"
        
        return {
            "anomaly_score": anomaly_score,
            "classification": classification,
            "confidence": min(1.0, anomaly_score / 3.0),
            "z_scores": z_scores
        }
    
    def predict(self, features: Dict[str, Any]) -> Dict[str, Any]:
        """Predict with dictionary input"""
        # Convert dict to list
        feature_list = [
            features.get("transaction_amount", 0),
            features.get("gas_price", 0),
            features.get("transaction_frequency", 0),
            features.get("wallet_age_days", 0),
            features.get("unique_interactions", 0)
        ]
        
        result = self.predict_simple(feature_list)
        
        # Add recommendations
        result["recommended_actions"] = self._get_recommendations(result["classification"])
        
        return result
    
    def _get_recommendations(self, classification: str) -> List[str]:
        """Get recommendations"""
        if classification == "anomalous":
            return ["Flag for review", "Enhanced monitoring", "Manual verification"]
        elif classification == "suspicious":
            return ["Increased monitoring", "Pattern analysis"]
        else:
            return ["Normal processing"]
    
    def _save_metrics(self, metrics: Dict[str, float]):
        """Save metrics to file"""
        metrics_data = {
            "timestamp": datetime.now().isoformat(),
            "model_type": "simple_sentinel",
            "metrics": metrics
        }
        
        try:
            with open("metrics.json", "w") as f:
                json.dump(metrics_data, f, indent=2)
            print("Metrics saved to metrics.json")
        except Exception as e:
            print(f"Warning: Could not save metrics: {e}")


def main():
    """Main function"""
    print("Network Sentinel - Simple Training")
    print("=" * 40)
    
    model = SimpleSentinel()
    
    # Train
    metrics = model.train()
    
    # Test prediction
    print("\nTesting prediction...")
    test_features = {
        "transaction_amount": 1000.0,
        "gas_price": 25.0,
        "transaction_frequency": 5,
        "wallet_age_days": 100,
        "unique_interactions": 15
    }
    
    result = model.predict(test_features)
    print(f"Prediction result: {result}")
    
    print("\nTraining completed successfully!")


if __name__ == "__main__":
    main()