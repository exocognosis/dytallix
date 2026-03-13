# Wallet Classifier - User Behavior Classification Module

## Overview
The Wallet Classifier analyzes and classifies user wallets based on transaction patterns, behavior, and interaction history. It uses XGBoost and Multi-Layer Perceptron (MLP) models to identify different wallet types and user behaviors.

## Architecture
- **Primary Model**: XGBoost for feature-based classification
- **Secondary Model**: Multi-Layer Perceptron (MLP) for deep pattern recognition
- **Framework**: L = -Σ yi log(ŷi) (Cross-entropy loss)
- **Training**: 20-100 epochs for neural network, gradient boosting for XGBoost

## Features
- Multi-class wallet classification
- Behavioral pattern analysis
- Risk profiling
- Activity clustering
- Temporal behavior tracking
- Ensemble predictions

## Wallet Categories
- **Individual User**: Personal wallet usage patterns
- **Business Account**: Commercial transaction patterns
- **Exchange Wallet**: High-volume trading activity
- **DeFi Protocol**: Smart contract interactions
- **Bot/Automated**: Algorithmic trading patterns
- **Mixer/Privacy**: Privacy-focused transactions
- **Suspicious**: Potentially fraudulent activity

## Input Format
```json
{
  "wallet_features": {
    "transaction_count": int,
    "total_volume": float,
    "avg_transaction_value": float,
    "unique_counterparties": int,
    "contract_interactions": int,
    "gas_usage_patterns": [float],
    "time_patterns": {
      "activity_hours": [int],
      "regularity_score": float,
      "burst_transactions": int
    },
    "network_features": {
      "centrality_score": float,
      "cluster_coefficient": float,
      "path_length": float
    },
    "financial_features": {
      "balance_history": [float],
      "holdings_diversity": float,
      "leverage_usage": float
    }
  }
}
```

## Output Format
```json
{
  "classification": {
    "primary_type": "individual|business|exchange|defi|bot|mixer|suspicious",
    "confidence": float,
    "probabilities": {
      "individual": float,
      "business": float,
      "exchange": float,
      "defi": float,
      "bot": float,
      "mixer": float,
      "suspicious": float
    }
  },
  "risk_assessment": {
    "risk_level": "low|medium|high|critical",
    "risk_factors": [string],
    "compliance_score": float
  },
  "behavioral_insights": {
    "activity_pattern": "regular|irregular|burst|dormant",
    "sophistication_level": "basic|intermediate|advanced|expert",
    "interaction_preference": "peer_to_peer|contracts|exchanges|mixed"
  }
}
```

## Usage
```python
from wallet_classifier.train import WalletClassifierModel

# Initialize and train
model = WalletClassifierModel()
model.train(data_path="data/wallet_data.csv")

# Classify wallet
result = model.predict(wallet_features)
```

## Training
- Run `python train.py` to train both XGBoost and MLP models
- Wallet behavior data is synthesized based on real patterns
- Models are saved in the `models/` directory
- Training metrics and feature importance are logged to `metrics.json`

## Configuration
See `config.json` for model architectures, feature engineering, classification thresholds, and ensemble weights.

## Dependencies
See `requirements.txt` for required packages including XGBoost and scikit-learn.