# Network Sentinel - Anomaly Detection Module

## Overview
The Network Sentinel module detects fraud, bots, and network anomalies using Isolation Forest and Autoencoder models. It provides real-time anomaly scoring and classification for blockchain network security.

## Architecture
- **Primary Model**: Isolation Forest for outlier detection
- **Secondary Model**: Autoencoder for reconstruction-based anomaly detection
- **Framework**: L = ||X - X̂||², ROC-AUC, PR Curve evaluation
- **Training**: 10-50 epochs for autoencoder, isolation forest uses unsupervised learning

## Features
- Real-time anomaly detection
- Multi-model ensemble approach
- Configurable sensitivity thresholds
- Network transaction pattern analysis
- Bot behavior identification
- Fraud detection capabilities

## Input Format
```json
{
  "transaction_features": {
    "amount": float,
    "gas_price": float,
    "frequency": int,
    "wallet_age": int,
    "interaction_count": int,
    "time_patterns": [float],
    "network_features": [float]
  }
}
```

## Output Format
```json
{
  "anomaly_score": float,
  "classification": "normal|suspicious|anomalous",
  "confidence": float,
  "risk_factors": [string],
  "recommended_actions": [string]
}
```

## Usage
```python
from sentinel.train import SentinelModel

# Initialize and train
model = SentinelModel()
model.train(data_path="data/network_data.csv")

# Detect anomalies
result = model.predict(transaction_features)
```

## Training
- Run `python train.py` to train the models
- Training data is automatically generated if not available
- Models are saved in the `models/` directory
- Training metrics are logged to `metrics.json`

## Configuration
See `config.json` for model parameters, thresholds, and feature engineering settings.

## Dependencies
See `requirements.txt` for required packages.