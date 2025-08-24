---
title: PulseScan Fraud & Anomaly Monitor
---

# PulseScan Fraud & Anomaly Monitor

Advanced fraud detection and anomaly monitoring system for the Dytallix blockchain ecosystem.

## Overview

PulseScan is a comprehensive fraud detection system that combines machine learning inference, graph analysis, and post-quantum cryptographic security to identify suspicious activities in real-time.

### Key Features

- **Real-time Monitoring**: Sub-100ms transaction analysis and risk scoring
- **Multi-layered Detection**: Velocity, pattern, graph, and behavioral analysis
- **Post-Quantum Security**: Dilithium3 signature verification for attestations
- **Explainable AI**: Detailed reasoning for all anomaly findings
- **Blockchain Integration**: On-chain attestation via CosmWasm contracts

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Blockchain    │    │  Inference      │    │   API Gateway   │
│   Monitor       │───▶│  Engine         │───▶│   (TypeScript)  │
│                 │    │  (Rust)         │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   CosmWasm      │    │   PostgreSQL    │    │   Redis Cache   │
│   Contract      │    │   Database      │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Components

### 1. CosmWasm Contract (`contracts/pulsescan`)

Attestation sink contract for on-chain fraud findings storage.

**Key Functions:**
- `SubmitFinding`: Store anomaly findings with PQ signatures
- `QueryFindings`: Retrieve findings with pagination
- `GetStats`: Access aggregated statistics

### 2. Inference Engine (`services/pulsescan-infer`)

Rust-based ML inference service for real-time anomaly detection.

**Features:**
- Feature extraction from blockchain transactions
- Ensemble ML models for anomaly scoring
- Graph analysis and behavioral profiling
- PQ signature generation for attestations

### 3. API Gateway (`services/pulsescan-api`)

TypeScript read-only API for accessing findings and statistics.

**Endpoints:**
- `GET /api/v1/findings` - List findings with filters
- `GET /api/v1/stats` - System statistics
- `GET /api/v1/contract` - Contract state queries

## Getting Started

### Prerequisites

- Node.js 18+
- Rust 1.70+
- PostgreSQL 14+
- Redis 6+

### Installation

1. **Deploy Contract**:
```bash
cd contracts/pulsescan
cargo wasm
dytallix-cli contract deploy target/wasm32-unknown-unknown/release/pulsescan.wasm
```

2. **Setup Database**:
```bash
psql -U postgres -c "CREATE DATABASE pulsescan;"
psql -U postgres -d pulsescan -f migrations/pulsescan/001_initial_schema.sql
```

3. **Start Inference Service**:
```bash
cd services/pulsescan-infer
cargo run -- --config config.toml
```

4. **Start API Gateway**:
```bash
cd services/pulsescan-api
npm install
npm run build
npm start
```

### Configuration

#### Inference Service (`config.toml`)
```toml
database_url = "postgresql://user:pass@localhost/pulsescan"
redis_url = "redis://localhost:6379"
blockchain_rpc_url = "http://localhost:26657"
contract_address = "dytallix1..."
min_anomaly_score = 0.7
auto_submit_findings = true

[inference]
model_type = "ensemble"
batch_size = 32
confidence_threshold = 0.8

[features]
enable_graph_features = true
enable_temporal_features = true
enable_behavioral_features = true
```

#### API Gateway (`.env`)
```bash
PORT=3001
DB_HOST=localhost
DB_NAME=pulsescan
REDIS_URL=redis://localhost:6379
CONTRACT_ADDRESS=dytallix1...
API_KEY=your-secure-api-key
```

## Usage Examples

### Query Recent Findings

```bash
curl "http://localhost:3001/api/v1/findings?limit=10&severity=high"
```

### Get Address Risk Profile

```bash
curl "http://localhost:3001/api/v1/findings/address/dytallix1abc123..."
```

### System Statistics

```bash
curl "http://localhost:3001/api/v1/stats"
```

## ML Models

### Feature Engineering

PulseScan extracts 20+ features across multiple dimensions:

- **Velocity Features**: Transaction frequency patterns
- **Amount Features**: Statistical distribution analysis  
- **Temporal Features**: Time-based behavioral patterns
- **Graph Features**: Network centrality and connectivity
- **Behavioral Features**: Gas usage and interaction patterns

### Anomaly Detection

Multiple detection algorithms working in ensemble:

1. **Isolation Forest**: Unsupervised anomaly detection
2. **One-Class SVM**: Boundary-based anomaly detection  
3. **Autoencoder**: Neural network reconstruction error
4. **Statistical Tests**: Z-score and percentile-based detection

### Model Performance

Current model metrics (v1.0.0):
- **Accuracy**: 87.5%
- **Precision**: 82.3%
- **Recall**: 78.9%
- **F1-Score**: 80.6%
- **AUC-ROC**: 91.2%

## Security

### Post-Quantum Cryptography

All findings are signed using Dilithium3 post-quantum signatures:

```rust
// Generate finding signature
let finding_data = serialize_finding(&finding);
let signature = dilithium_sign(&private_key, &finding_data);
```

### Data Protection

- Database encryption at rest
- TLS 1.3 for all network communication
- API key authentication with rate limiting
- Audit logging for all operations

## Monitoring & Observability

### Metrics

PulseScan exposes Prometheus metrics:
- `pulsescan_findings_total` - Total findings by severity
- `pulsescan_inference_duration` - Inference latency
- `pulsescan_model_accuracy` - Real-time accuracy tracking

### Alerting

Configure alerts for:
- High-severity findings (score > 0.9)
- Model performance degradation
- System health issues

## Development

### Running Tests

```bash
# Contract tests
cd contracts/pulsescan
cargo test

# Inference service tests  
cd services/pulsescan-infer
cargo test

# API tests
cd services/pulsescan-api
npm test
```

### Adding New Anomaly Patterns

1. Define pattern in database:
```sql
INSERT INTO anomaly_patterns (pattern_name, description, feature_indicators, severity)
VALUES ('new_pattern', 'Description', '{"feature": 0.8}', 'high');
```

2. Implement detection logic in inference engine
3. Add tests and documentation

## Troubleshooting

### Common Issues

**High False Positive Rate**
- Adjust `min_anomaly_score` threshold
- Retrain models with more recent data
- Fine-tune feature weights

**Performance Issues**
- Scale inference service horizontally
- Optimize database indexes
- Implement Redis caching

**Contract Errors**
- Verify PQ signature format
- Check minimum score thresholds
- Validate address formats

## Support

- Documentation: `/docs/modules/pulsescan`
- Issues: GitHub repository
- Contact: dev@dytallix.com