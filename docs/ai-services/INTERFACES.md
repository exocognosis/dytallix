# Dytallix AI Service Interfaces

## Python Abstract Base Classes

```python
from abc import ABC, abstractmethod

class FraudDetectionService(ABC):
    @abstractmethod
    def analyze_transaction(self, transaction: dict) -> dict:
        pass

class ContractAuditService(ABC):
    @abstractmethod
    def audit_contract(self, contract_code: str, contract_type: str) -> dict:
        pass

class RiskScoringService(ABC):
    @abstractmethod
    def score_address(self, address: str, history: list) -> dict:
        pass
```

## REST API Endpoint Stubs (Python/FastAPI)
```python
from fastapi import FastAPI, Request

app = FastAPI()

@app.post("/analyze/fraud")
async def analyze_fraud(request: Request):
    """Analyze a transaction for fraud risk."""
    # Parse request, call FraudDetectionService, return result
    pass

@app.post("/analyze/contract")
async def analyze_contract(request: Request):
    """Audit a smart contract for vulnerabilities."""
    # Parse request, call ContractAuditService, return result
    pass

@app.post("/analyze/risk")
async def analyze_risk(request: Request):
    """Score an address or transaction for risk."""
    # Parse request, call RiskScoringService, return result
    pass
```

## Oracle Bridge Protocol (JSON Schema Example)
```json
{
  "request_id": "string",
  "request_type": "fraud_analysis | contract_audit | risk_scoring",
  "input_data": {"...": "..."},
  "timestamp": "int",
  "signature": "string"
}
```

```json
{
  "request_id": "string",
  "success": true,
  "result": {"...": "..."},
  "confidence": 0.0,
  "processing_time_ms": 0,
  "ai_model_version": "string",
  "signature": "string",
  "timestamp": "int"
}
```
