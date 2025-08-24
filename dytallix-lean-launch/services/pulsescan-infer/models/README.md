# PulseScan Model Artifacts

This directory contains ML model artifacts for the PulseScan fraud detection system.

## Files

### model_info.json
Complete model metadata including:
- Ensemble component details and weights
- Feature specifications and normalization parameters  
- Performance metrics and evaluation results
- Training configuration and hyperparameters

### Model Binaries (Production)
In production, this directory would contain:
- `isolation_forest.pkl` - Isolation Forest model
- `one_class_svm.pkl` - One-Class SVM model  
- `autoencoder.onnx` - Neural network autoencoder in ONNX format
- `feature_scaler.pkl` - Feature normalization parameters
- `thresholds.json` - Detection thresholds per severity level

## Model Versioning

Models are versioned using semantic versioning (MAJOR.MINOR.PATCH):
- **MAJOR**: Incompatible feature schema changes
- **MINOR**: New features or model improvements  
- **PATCH**: Bug fixes and minor tweaks

## Model Performance

Current production model (v1.0.0):
- **Accuracy**: 87.5%
- **Precision**: 82.3% 
- **Recall**: 78.9%
- **F1-Score**: 80.6%
- **AUC-ROC**: 91.2%

## Feature Engineering

The model uses 20 engineered features across multiple categories:

### Velocity Features (3)
- Transaction frequency over 1h, 24h, 7d windows
- Captures burst patterns and sustained high activity

### Amount Features (3)  
- Statistical z-score relative to address history
- Percentile ranking within recent transactions
- Round number detection (common in money laundering)

### Temporal Features (4)
- Hour of day and day of week (normalized)
- Weekend indicator for behavioral profiling
- Time since last transaction

### Graph Features (5)
- In/out degree in transaction graph
- Clustering coefficient (local connectivity)
- Betweenness centrality (hub detection)
- PageRank score (global importance)

### Behavioral Features (5)
- Gas price/limit z-scores (automated behavior)
- Transaction frequency patterns
- Address age and unique counterparties

## Anomaly Detection Approach

The ensemble combines multiple detection methods:

1. **Isolation Forest (30% weight)**: Unsupervised outlier detection
2. **One-Class SVM (25% weight)**: Boundary-based anomaly detection
3. **Autoencoder (25% weight)**: Reconstruction error-based detection
4. **Statistical Tests (20% weight)**: Z-score and percentile thresholds

## Model Deployment

Models are deployed as:
1. Rust binary with embedded weights (for performance)
2. ONNX format for cross-platform compatibility
3. Fallback to statistical rules if models unavailable

## Retraining Schedule

- **Daily**: Update statistical thresholds and feature scalers
- **Weekly**: Retrain ensemble with new labeled data
- **Monthly**: Full model evaluation and potential architecture updates
- **Quarterly**: Complete feature engineering review

## Security

- Models are cryptographically signed for integrity verification
- Feature extraction code is deterministic and reproducible  
- All model predictions include confidence scores and explainability