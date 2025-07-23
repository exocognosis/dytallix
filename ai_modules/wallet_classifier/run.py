#!/usr/bin/env python3
"""
Wallet Classifier - User Behavior Classification
Simplified implementation using basic Python
"""

import json
import math
import random
import os
from datetime import datetime
from typing import Dict, List, Tuple, Any


class SimpleWalletClassifier:
    """Simplified wallet classifier using basic heuristics"""
    
    def __init__(self, config_path: str = "config.json"):
        self.config = self._load_config(config_path)
        self.trained = False
        self.wallet_profiles = {}
        self.feature_stats = {}
        
        # Wallet type mappings
        self.wallet_types = [
            "individual", "business", "exchange", 
            "defi", "bot", "mixer", "suspicious"
        ]
        
    def _load_config(self, config_path: str) -> Dict[str, Any]:
        """Load configuration"""
        try:
            with open(config_path, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            return self._default_config()
    
    def _default_config(self) -> Dict[str, Any]:
        """Default configuration"""
        return {
            "data_config": {
                "wallet_types": {
                    "individual": {"samples": 1000},
                    "business": {"samples": 500},
                    "exchange": {"samples": 200},
                    "defi": {"samples": 300},
                    "bot": {"samples": 200},
                    "mixer": {"samples": 100},
                    "suspicious": {"samples": 50}
                }
            },
            "classification_config": {
                "confidence_thresholds": {"high": 0.8, "medium": 0.6}
            }
        }
    
    def generate_synthetic_data(self) -> Tuple[List[Dict[str, Any]], List[str]]:
        """Generate synthetic wallet behavior data"""
        print("Generating synthetic wallet data...")
        
        data = []
        labels = []
        
        wallet_configs = self.config["data_config"]["wallet_types"]
        
        for wallet_type, config in wallet_configs.items():
            samples = config["samples"]
            
            for _ in range(samples):
                features = self._generate_wallet_features(wallet_type)
                data.append(features)
                labels.append(wallet_type)
        
        # Shuffle data
        combined = list(zip(data, labels))
        random.shuffle(combined)
        data, labels = zip(*combined)
        
        print(f"Generated {len(data)} wallet samples across {len(wallet_configs)} types")
        return list(data), list(labels)
    
    def _generate_wallet_features(self, wallet_type: str) -> Dict[str, Any]:
        """Generate features for a specific wallet type"""
        
        if wallet_type == "individual":
            return {
                "transaction_count": random.randint(10, 100),
                "total_volume": random.uniform(0.1, 10),
                "avg_transaction_value": random.uniform(0.01, 1),
                "unique_counterparties": random.randint(5, 30),
                "contract_interactions": random.randint(0, 10),
                "gas_usage_avg": random.uniform(21000, 100000),
                "activity_regularity": random.uniform(0.3, 0.7),
                "time_spread": random.uniform(0.5, 1.0),
                "burst_frequency": random.uniform(0.1, 0.3),
                "centrality_score": random.uniform(0.1, 0.4),
                "balance_volatility": random.uniform(0.2, 0.6),
                "holdings_diversity": random.uniform(0.1, 0.5)
            }
        
        elif wallet_type == "business":
            return {
                "transaction_count": random.randint(100, 1000),
                "total_volume": random.uniform(10, 1000),
                "avg_transaction_value": random.uniform(1, 50),
                "unique_counterparties": random.randint(50, 200),
                "contract_interactions": random.randint(10, 100),
                "gas_usage_avg": random.uniform(50000, 200000),
                "activity_regularity": random.uniform(0.6, 0.9),
                "time_spread": random.uniform(0.7, 1.0),
                "burst_frequency": random.uniform(0.2, 0.5),
                "centrality_score": random.uniform(0.3, 0.7),
                "balance_volatility": random.uniform(0.1, 0.4),
                "holdings_diversity": random.uniform(0.3, 0.8)
            }
        
        elif wallet_type == "exchange":
            return {
                "transaction_count": random.randint(5000, 50000),
                "total_volume": random.uniform(1000, 100000),
                "avg_transaction_value": random.uniform(10, 500),
                "unique_counterparties": random.randint(1000, 10000),
                "contract_interactions": random.randint(100, 1000),
                "gas_usage_avg": random.uniform(21000, 500000),
                "activity_regularity": random.uniform(0.8, 1.0),
                "time_spread": random.uniform(0.9, 1.0),
                "burst_frequency": random.uniform(0.7, 1.0),
                "centrality_score": random.uniform(0.8, 1.0),
                "balance_volatility": random.uniform(0.3, 0.8),
                "holdings_diversity": random.uniform(0.8, 1.0)
            }
        
        elif wallet_type == "defi":
            return {
                "transaction_count": random.randint(50, 500),
                "total_volume": random.uniform(1, 100),
                "avg_transaction_value": random.uniform(0.1, 10),
                "unique_counterparties": random.randint(10, 50),
                "contract_interactions": random.randint(50, 500),
                "gas_usage_avg": random.uniform(100000, 1000000),
                "activity_regularity": random.uniform(0.4, 0.8),
                "time_spread": random.uniform(0.5, 0.9),
                "burst_frequency": random.uniform(0.3, 0.7),
                "centrality_score": random.uniform(0.2, 0.6),
                "balance_volatility": random.uniform(0.4, 0.9),
                "holdings_diversity": random.uniform(0.6, 1.0)
            }
        
        elif wallet_type == "bot":
            return {
                "transaction_count": random.randint(1000, 10000),
                "total_volume": random.uniform(10, 1000),
                "avg_transaction_value": random.uniform(0.01, 5),
                "unique_counterparties": random.randint(5, 50),
                "contract_interactions": random.randint(500, 5000),
                "gas_usage_avg": random.uniform(21000, 200000),
                "activity_regularity": random.uniform(0.9, 1.0),
                "time_spread": random.uniform(0.3, 0.7),
                "burst_frequency": random.uniform(0.8, 1.0),
                "centrality_score": random.uniform(0.1, 0.4),
                "balance_volatility": random.uniform(0.2, 0.5),
                "holdings_diversity": random.uniform(0.1, 0.3)
            }
        
        elif wallet_type == "mixer":
            return {
                "transaction_count": random.randint(20, 200),
                "total_volume": random.uniform(1, 100),
                "avg_transaction_value": random.uniform(0.1, 10),
                "unique_counterparties": random.randint(20, 100),
                "contract_interactions": random.randint(0, 20),
                "gas_usage_avg": random.uniform(21000, 100000),
                "activity_regularity": random.uniform(0.1, 0.4),
                "time_spread": random.uniform(0.2, 0.6),
                "burst_frequency": random.uniform(0.6, 1.0),
                "centrality_score": random.uniform(0.3, 0.8),
                "balance_volatility": random.uniform(0.5, 1.0),
                "holdings_diversity": random.uniform(0.2, 0.6)
            }
        
        else:  # suspicious
            return {
                "transaction_count": random.randint(10, 1000),
                "total_volume": random.uniform(0.1, 1000),
                "avg_transaction_value": random.uniform(0.01, 100),
                "unique_counterparties": random.randint(1, 100),
                "contract_interactions": random.randint(0, 100),
                "gas_usage_avg": random.uniform(21000, 500000),
                "activity_regularity": random.uniform(0.1, 0.8),
                "time_spread": random.uniform(0.1, 1.0),
                "burst_frequency": random.uniform(0.2, 1.0),
                "centrality_score": random.uniform(0.1, 1.0),
                "balance_volatility": random.uniform(0.3, 1.0),
                "holdings_diversity": random.uniform(0.1, 1.0)
            }
    
    def train(self) -> Dict[str, float]:
        """Train the wallet classifier"""
        print("Training wallet classifier...")
        
        # Generate synthetic data
        data, labels = self.generate_synthetic_data()
        
        # Create wallet profiles (average features per type)
        self.wallet_profiles = {}
        
        for wallet_type in self.wallet_types:
            type_data = [d for d, l in zip(data, labels) if l == wallet_type]
            
            if type_data:
                profile = {}
                feature_keys = type_data[0].keys()
                
                for feature in feature_keys:
                    values = [d[feature] for d in type_data]
                    profile[feature] = {
                        "mean": sum(values) / len(values),
                        "std": math.sqrt(sum((v - sum(values)/len(values))**2 for v in values) / len(values))
                    }
                
                self.wallet_profiles[wallet_type] = profile
        
        # Calculate overall feature statistics
        all_features = data[0].keys()
        self.feature_stats = {}
        
        for feature in all_features:
            values = [d[feature] for d in data]
            self.feature_stats[feature] = {
                "min": min(values),
                "max": max(values),
                "mean": sum(values) / len(values),
                "std": math.sqrt(sum((v - sum(values)/len(values))**2 for v in values) / len(values))
            }
        
        self.trained = True
        
        # Evaluate performance
        accuracy = self._evaluate_model(data, labels)
        
        metrics = {
            "accuracy": accuracy,
            "total_samples": len(data),
            "wallet_types": len(self.wallet_types),
            "features": len(all_features)
        }
        
        self._save_metrics(metrics)
        
        print(f"Training completed. Accuracy: {accuracy:.2f}")
        return metrics
    
    def _evaluate_model(self, data: List[Dict[str, Any]], labels: List[str]) -> float:
        """Evaluate model accuracy"""
        correct = 0
        total = len(data)
        
        for features, true_label in zip(data, labels):
            prediction = self.predict({"wallet_features": features})
            predicted_label = prediction["classification"]["primary_type"]
            
            if predicted_label == true_label:
                correct += 1
        
        return correct / total if total > 0 else 0.0
    
    def predict(self, wallet_data: Dict[str, Any]) -> Dict[str, Any]:
        """Classify a wallet based on features"""
        if not self.trained:
            raise ValueError("Model not trained")
        
        features = wallet_data["wallet_features"]
        
        # Calculate similarity scores for each wallet type
        scores = {}
        
        for wallet_type, profile in self.wallet_profiles.items():
            score = self._calculate_similarity(features, profile)
            scores[wallet_type] = score
        
        # Convert scores to probabilities
        total_score = sum(scores.values())
        probabilities = {k: v/total_score for k, v in scores.items()} if total_score > 0 else scores
        
        # Determine primary classification
        primary_type = max(probabilities, key=probabilities.get)
        confidence = probabilities[primary_type]
        
        # Risk assessment
        risk_level = self._assess_risk(primary_type, features)
        risk_factors = self._identify_risk_factors(features, primary_type)
        
        # Behavioral insights
        behavioral_insights = self._analyze_behavior(features)
        
        return {
            "classification": {
                "primary_type": primary_type,
                "confidence": confidence,
                "probabilities": probabilities
            },
            "risk_assessment": {
                "risk_level": risk_level,
                "risk_factors": risk_factors,
                "compliance_score": 1.0 - (len(risk_factors) * 0.2)
            },
            "behavioral_insights": behavioral_insights
        }
    
    def _calculate_similarity(self, features: Dict[str, Any], profile: Dict[str, Any]) -> float:
        """Calculate similarity between features and profile"""
        similarity = 0.0
        feature_count = 0
        
        for feature, value in features.items():
            if feature in profile:
                mean = profile[feature]["mean"]
                std = profile[feature]["std"]
                
                # Calculate normalized distance
                if std > 0:
                    z_score = abs(value - mean) / std
                    similarity += math.exp(-z_score)  # Gaussian-like similarity
                else:
                    similarity += 1.0 if value == mean else 0.0
                
                feature_count += 1
        
        return similarity / feature_count if feature_count > 0 else 0.0
    
    def _assess_risk(self, wallet_type: str, features: Dict[str, Any]) -> str:
        """Assess risk level based on wallet type and features"""
        base_risk = {
            "individual": "low",
            "business": "low", 
            "exchange": "medium",
            "defi": "medium",
            "bot": "medium",
            "mixer": "high",
            "suspicious": "critical"
        }.get(wallet_type, "medium")
        
        # Adjust based on specific features
        if features.get("burst_frequency", 0) > 0.8:
            if base_risk == "low": base_risk = "medium"
            elif base_risk == "medium": base_risk = "high"
        
        if features.get("balance_volatility", 0) > 0.8:
            if base_risk == "low": base_risk = "medium"
        
        return base_risk
    
    def _identify_risk_factors(self, features: Dict[str, Any], wallet_type: str) -> List[str]:
        """Identify specific risk factors"""
        risk_factors = []
        
        if features.get("burst_frequency", 0) > 0.8:
            risk_factors.append("High burst transaction frequency")
        
        if features.get("balance_volatility", 0) > 0.8:
            risk_factors.append("High balance volatility")
        
        if features.get("unique_counterparties", 0) < 5 and features.get("transaction_count", 0) > 100:
            risk_factors.append("Low counterparty diversity")
        
        if wallet_type in ["mixer", "suspicious"]:
            risk_factors.append(f"Classified as {wallet_type}")
        
        return risk_factors
    
    def _analyze_behavior(self, features: Dict[str, Any]) -> Dict[str, str]:
        """Analyze behavioral patterns"""
        regularity = features.get("activity_regularity", 0)
        burst_freq = features.get("burst_frequency", 0)
        contract_ratio = features.get("contract_interactions", 0) / max(1, features.get("transaction_count", 1))
        
        # Activity pattern
        if regularity > 0.8:
            activity_pattern = "regular"
        elif burst_freq > 0.7:
            activity_pattern = "burst"
        elif regularity < 0.3:
            activity_pattern = "irregular"
        else:
            activity_pattern = "moderate"
        
        # Sophistication level
        if contract_ratio > 0.5 and features.get("holdings_diversity", 0) > 0.7:
            sophistication = "expert"
        elif contract_ratio > 0.2 or features.get("holdings_diversity", 0) > 0.5:
            sophistication = "advanced"
        elif contract_ratio > 0.1:
            sophistication = "intermediate"
        else:
            sophistication = "basic"
        
        # Interaction preference
        if contract_ratio > 0.5:
            interaction_pref = "contracts"
        elif features.get("centrality_score", 0) > 0.7:
            interaction_pref = "exchanges"
        elif features.get("unique_counterparties", 0) > 50:
            interaction_pref = "mixed"
        else:
            interaction_pref = "peer_to_peer"
        
        return {
            "activity_pattern": activity_pattern,
            "sophistication_level": sophistication,
            "interaction_preference": interaction_pref
        }
    
    def _save_metrics(self, metrics: Dict[str, float]):
        """Save training metrics"""
        metrics_data = {
            "timestamp": datetime.now().isoformat(),
            "model_type": "wallet_classifier",
            "metrics": metrics,
            "wallet_types": self.wallet_types
        }
        
        try:
            with open("metrics.json", "w") as f:
                json.dump(metrics_data, f, indent=2)
            print("Metrics saved to metrics.json")
        except Exception as e:
            print(f"Warning: Could not save metrics: {e}")


def main():
    """Main function"""
    print("Wallet Classifier - User Behavior Classification")
    print("=" * 50)
    
    model = SimpleWalletClassifier()
    
    # Train
    metrics = model.train()
    
    # Test prediction
    print("\nTesting classification...")
    test_wallet = {
        "wallet_features": {
            "transaction_count": 150,
            "total_volume": 25.0,
            "avg_transaction_value": 0.5,
            "unique_counterparties": 45,
            "contract_interactions": 30,
            "gas_usage_avg": 75000,
            "activity_regularity": 0.7,
            "time_spread": 0.8,
            "burst_frequency": 0.3,
            "centrality_score": 0.4,
            "balance_volatility": 0.4,
            "holdings_diversity": 0.6
        }
    }
    
    result = model.predict(test_wallet)
    print(f"Classification result:")
    print(f"  Primary type: {result['classification']['primary_type']}")
    print(f"  Confidence: {result['classification']['confidence']:.2f}")
    print(f"  Risk level: {result['risk_assessment']['risk_level']}")
    print(f"  Activity pattern: {result['behavioral_insights']['activity_pattern']}")
    print(f"  Sophistication: {result['behavioral_insights']['sophistication_level']}")
    
    print("\nTraining completed successfully!")


if __name__ == "__main__":
    main()