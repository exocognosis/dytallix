# Dytallix AI Risk Assessment Service

A minimal FastAPI service that provides deterministic transaction risk scoring for evidence purposes. This service demonstrates AI risk assessment capability with transparent, reproducible heuristics.

## Features

- **Deterministic Risk Scoring**: Same input always produces same output
- **RESTful API**: FastAPI-based service with automatic documentation
- **Transparent Logic**: Clear, auditable risk assessment methodology
- **Categorical Risk Levels**: LOW, MEDIUM, HIGH based on score thresholds
- **Detailed Rationale**: Explanation of risk factors for each assessment

## Risk Scoring Methodology

The service uses a deterministic algorithm that combines multiple factors:

1. **Base Hash Score**: SHA256 hash of transaction ID + amount → numeric value (0-100)
2. **Amount Analysis**: Risk adjustments based on transaction amount
   - Large amounts (>10,000): +15 risk points
   - Medium amounts (1,000-10,000): +8 risk points  
   - Micro amounts (<1): +5 risk points
3. **Gas Usage Analysis**: Risk adjustments based on gas limit
   - High gas (>100,000): +10 risk points
   - Low gas (<21,000): +3 risk points
4. **Self-Transaction Detection**: Same from/to address: +20 risk points

### Risk Level Thresholds

- **LOW**: 0-33.33
- **MEDIUM**: 33.34-66.66  
- **HIGH**: 66.67-100.0

## Installation

```bash
# Install dependencies
pip install -r requirements.txt

# Run the service
python service_stub.py

# Or with uvicorn directly
uvicorn service_stub:app --host 127.0.0.1 --port 8000 --reload
```

## API Usage

### Start the Service

```bash
python service_stub.py
```

The service will start on `http://127.0.0.1:8000`

### API Documentation

- **Swagger UI**: http://127.0.0.1:8000/docs
- **ReDoc**: http://127.0.0.1:8000/redoc

### Example API Calls

#### Basic Risk Assessment

```bash
curl -s -X POST http://127.0.0.1:8000/risk \
  -H 'Content-Type: application/json' \
  -d '{
    "id": "tx123",
    "amount": 42.5,
    "from": "dyt1sender123", 
    "to": "dyt1receiver456",
    "gas_limit": 75000
  }' | jq .
```

#### High-Risk Transaction (Large Amount)

```bash
curl -s -X POST http://127.0.0.1:8000/risk \
  -H 'Content-Type: application/json' \
  -d '{
    "id": "tx999", 
    "amount": 15000.0,
    "from": "dyt1whale",
    "to": "dyt1exchange"
  }' | jq .
```

#### Self-Transaction (Higher Risk)

```bash
curl -s -X POST http://127.0.0.1:8000/risk \
  -H 'Content-Type: application/json' \
  -d '{
    "id": "self_tx_001",
    "amount": 100.0,
    "from": "dyt1selfaddr",
    "to": "dyt1selfaddr"
  }' | jq .
```

### Deterministic Testing

To verify deterministic behavior, run the same transaction multiple times:

```bash
# This will always return the same risk score
curl -s -X POST http://127.0.0.1:8000/risk \
  -H 'Content-Type: application/json' \
  -d '{
    "id": "test_tx_001",
    "amount": 100.0,
    "from": "addr_a",
    "to": "addr_b"
  }' | jq '.risk_score'
```

Expected output: `71` (always the same)

## API Endpoints

### POST /risk

Assess transaction risk.

**Request Body:**
```json
{
  "id": "string",           // Required: Transaction ID
  "amount": 0.0,           // Required: Transaction amount (>0)
  "from": "string",        // Required: Source address  
  "to": "string",          // Required: Destination address
  "gas_limit": 0,          // Optional: Gas limit
  "timestamp": "string"    // Optional: Transaction timestamp
}
```

**Response:**
```json
{
  "risk_score": 0.0,                    // Risk score 0-100
  "risk_level": "LOW|MEDIUM|HIGH",      // Categorical level
  "assessment_timestamp": "string",      // When assessed
  "rationale": {                        // Detailed explanation
    "base_hash_score": 0,
    "amount_analysis": {...},
    "transaction_type": {...},
    "scoring_methodology": "string"
  },
  "model_version": "deterministic-v1.0"
}
```

### GET /health

Health check endpoint.

### GET /model/info

Get model information and configuration.

## Dashboard Screenshot

To generate the dashboard screenshot referenced in `dashboard_screenshot.png`:

1. Start the service: `python service_stub.py`
2. Open http://127.0.0.1:8000/docs in browser
3. Test a few transactions using the interactive API documentation
4. Take a screenshot of the Swagger UI showing successful risk assessments
5. Replace the placeholder `dashboard_screenshot.png` with your screenshot

## Future Enhancements

The service is designed for easy extension:

```python
# TODO: Integration points for future ML models
# TODO: External risk feed integration  
# TODO: Real-time transaction monitoring
# TODO: Batch risk assessment capabilities
# TODO: Risk model versioning and A/B testing
```

## Testing

```bash
# Test deterministic behavior
python -c "
import requests
import json

# Test same transaction multiple times
tx = {'id': 'test', 'amount': 100, 'from': 'a', 'to': 'b'}
results = []
for i in range(5):
    resp = requests.post('http://127.0.0.1:8000/risk', json=tx)
    results.append(resp.json()['risk_score'])

print('Scores:', results)
print('All same?', len(set(results)) == 1)
"
```

## Security Note

This service is for evidence and demonstration purposes. In production:
- Add authentication and authorization
- Implement rate limiting
- Add input validation and sanitization
- Use HTTPS in production
- Add comprehensive logging and monitoring