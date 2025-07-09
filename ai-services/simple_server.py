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

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
