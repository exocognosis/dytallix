#!/usr/bin/env python3
"""
Simple AI services mock server for Dytallix frontend development
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI(title="Dytallix AI Services", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    """Health check endpoint"""
    return {
        "success": True,
        "data": {
            "status": "healthy",
            "services": {
                "fraud_detection": "online",
                "risk_scoring": "online",
                "signature_verification": "online"
            },
            "timestamp": "2025-07-09T16:25:00Z"
        },
        "error": None
    }

@app.get("/ai/statistics")
async def ai_statistics():
    """AI service statistics"""
    return {
        "success": True,
        "data": {
            "fraud_detection_accuracy": 94.2,
            "risk_scores_processed": 15847,
            "signatures_verified": 8293,
            "active_models": 5,
            "last_update": "2025-07-09T16:20:00Z"
        },
        "error": None
    }

@app.get("/ai/alerts")
async def ai_alerts():
    """Current AI alerts"""
    return {
        "success": True,
        "data": [
            {
                "id": "alert_001",
                "type": "high_risk_transaction",
                "severity": "high",
                "message": "Suspicious transaction pattern detected",
                "timestamp": "2025-07-09T16:15:00Z"
            },
            {
                "id": "alert_002", 
                "type": "fraud_detection",
                "severity": "medium",
                "message": "Anomalous behavior in wallet address dytal1x...",
                "timestamp": "2025-07-09T16:10:00Z"
            }
        ],
        "error": None
    }

@app.post("/risk-scoring")
async def risk_scoring():
    """Risk scoring AI service"""
    return {
        "success": True,
        "data": {
            "risk_score": 0.25,
            "risk_level": "low",
            "confidence": 0.94,
            "factors": [
                "Transaction amount within normal range",
                "Sender has good reputation",
                "Network conditions stable"
            ],
            "recommendation": "approve",
            "timestamp": "2025-07-13T10:30:00Z"
        },
        "error": None
    }

@app.post("/fraud-detection")
async def fraud_detection():
    """Fraud detection AI service"""
    return {
        "success": True,
        "data": {
            "fraud_probability": 0.05,
            "classification": "legitimate",
            "confidence": 0.98,
            "alerts": [],
            "analysis": {
                "behavioral_score": 0.92,
                "pattern_match": "normal_user",
                "risk_indicators": []
            },
            "timestamp": "2025-07-13T10:30:00Z"
        },
        "error": None
    }

@app.post("/contract-generation")
async def contract_generation():
    """Smart contract generation AI service"""
    return {
        "success": True,
        "data": {
            "contract_code": "// AI-generated smart contract\ncontract AIContract {\n    // Contract logic here\n}",
            "optimization_level": "high",
            "gas_estimate": 150000,
            "security_score": 0.95,
            "recommendations": [
                "Consider adding reentrancy protection",
                "Add input validation for all functions"
            ],
            "timestamp": "2025-07-13T10:30:00Z"
        },
        "error": None
    }

@app.get("/oracle/status")
async def oracle_status():
    """AI Oracle status endpoint"""
    return {
        "success": True,
        "data": {
            "status": "operational",
            "oracles": [
                {
                    "id": "oracle_001",
                    "type": "risk_scoring",
                    "status": "active",
                    "last_update": "2025-07-13T10:29:00Z"
                },
                {
                    "id": "oracle_002", 
                    "type": "fraud_detection",
                    "status": "active",
                    "last_update": "2025-07-13T10:29:00Z"
                }
            ],
            "total_requests": 45621,
            "success_rate": 0.999,
            "timestamp": "2025-07-13T10:30:00Z"
        },
        "error": None
    }

# Health check endpoints for individual services
@app.get("/risk-scoring/health")
async def risk_scoring_health():
    return {"status": "healthy", "service": "risk-scoring"}

@app.get("/fraud-detection/health")
async def fraud_detection_health():
    return {"status": "healthy", "service": "fraud-detection"}

@app.get("/contract-generation/health")
async def contract_generation_health():
    return {"status": "healthy", "service": "contract-generation"}

# Test endpoints for individual services
@app.post("/risk-scoring/test")
async def risk_scoring_test():
    return {"status": "test_passed", "service": "risk-scoring"}

@app.post("/fraud-detection/test")
async def fraud_detection_test():
    return {"status": "test_passed", "service": "fraud-detection"}

@app.post("/contract-generation/test")
async def contract_generation_test():
    return {"status": "test_passed", "service": "contract-generation"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
