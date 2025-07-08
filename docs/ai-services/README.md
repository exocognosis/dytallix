# AI Services Layer

Off-chain AI processing services for Dytallix blockchain with secure oracle integration.

## Features

- Fraud pattern detection
- Smart contract NLP-to-code generation
- Transaction risk scoring
- Behavioral analysis
- Secure oracle bridge to blockchain

## Architecture

```
ai-services/
├── src/
│   ├── fraud_detection/    # Fraud pattern detection models
│   ├── contract_nlp/       # NLP to smart contract code
│   ├── risk_scoring/       # Transaction risk assessment
│   ├── oracle/            # Blockchain oracle interface
│   └── main.py           # AI service API server
├── models/                # Pre-trained ML models
├── data/                 # Training data and datasets
└── requirements.txt      # Python dependencies
```

## Services

### Fraud Detection
- Real-time transaction pattern analysis
- Anomaly detection using ML models
- Address behavior profiling

### Smart Contract NLP
- Natural language to Solidity/Rust conversion
- Contract template generation
- Code analysis and security suggestions

### Risk Scoring
- Transaction risk assessment (0.0 - 1.0 scale)
- Address reputation scoring
- Network analysis

## API Endpoints

- `POST /analyze/fraud` - Fraud detection analysis
- `POST /analyze/risk` - Risk score calculation
- `POST /generate/contract` - NLP to contract code
- `GET /health` - Service health check

## Building

```bash
pip install -r requirements.txt
python src/main.py
```

## Testing

```bash
pytest tests/
```

## Optimization Reports

Generate a simple PDF report with a convergence chart:

```bash
python src/optimization_report.py
```

This produces `optimization_report.pdf` in the current directory.
