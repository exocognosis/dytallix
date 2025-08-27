#!/usr/bin/env python3
"""
Dytallix AI Risk Assessment Service Stub

A minimal FastAPI service that provides deterministic transaction risk scoring
for evidence purposes. This service uses transparent, reproducible heuristics
to assess transaction risk based on transaction properties.

Author: Dytallix AI Risk Team
License: MIT
"""

import hashlib
import json
from typing import Dict, Any, Optional
from datetime import datetime

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
import uvicorn


# Pydantic models for request/response validation
class TransactionPayload(BaseModel):
    """Transaction data for risk assessment"""
    id: str = Field(..., description="Unique transaction identifier")
    amount: float = Field(..., gt=0, description="Transaction amount")
    from_addr: str = Field(..., alias="from", description="Source address")
    to_addr: str = Field(..., alias="to", description="Destination address")
    gas_limit: Optional[int] = Field(None, description="Gas limit for transaction")
    timestamp: Optional[str] = Field(None, description="Transaction timestamp")
    
    class Config:
        populate_by_name = True


class RiskAssessment(BaseModel):
    """Risk assessment response"""
    risk_score: float = Field(..., ge=0, le=100, description="Risk score 0-100")
    risk_level: str = Field(..., description="Categorical risk level")
    assessment_timestamp: str = Field(..., description="When assessment was performed")
    rationale: Dict[str, Any] = Field(..., description="Explanation of risk factors")
    model_version: str = Field(default="deterministic-v1.0", description="Assessment model version")
    
    class Config:
        protected_namespaces = ()


# FastAPI application
app = FastAPI(
    title="Dytallix AI Risk Assessment Service",
    description="Deterministic transaction risk scoring service for evidence purposes",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)


class RiskScorer:
    """Deterministic risk scoring engine"""
    
    def __init__(self):
        self.version = "deterministic-v1.0"
        # Risk level thresholds
        self.thresholds = {
            "LOW": 33.33,
            "MEDIUM": 66.66,
            "HIGH": 100.0
        }
    
    def calculate_deterministic_score(self, tx: TransactionPayload) -> float:
        """
        Calculate deterministic risk score using transaction hash and amount.
        This ensures identical inputs always produce identical outputs.
        
        Methodology:
        1. Create deterministic hash from tx.id + amount
        2. Convert hash to numeric value
        3. Apply modulo 100 for 0-100 range
        4. Apply amount-based adjustments for realistic scoring
        """
        # Create deterministic hash
        hash_input = f"{tx.id}:{tx.amount}"
        hash_obj = hashlib.sha256(hash_input.encode('utf-8'))
        hash_hex = hash_obj.hexdigest()
        
        # Convert first 8 hex characters to integer for base score
        base_score = int(hash_hex[:8], 16) % 100
        
        # Apply amount-based risk adjustments (deterministic)
        amount_factor = 0
        if tx.amount > 10000:
            amount_factor += 15  # Large amounts increase risk
        elif tx.amount > 1000:
            amount_factor += 8
        elif tx.amount < 1:
            amount_factor += 5   # Micro transactions can be suspicious
        
        # Gas limit factor (if provided)
        gas_factor = 0
        if tx.gas_limit:
            if tx.gas_limit > 100000:
                gas_factor += 10  # High gas usage increases risk
            elif tx.gas_limit < 21000:
                gas_factor += 3   # Very low gas can indicate simple transfers
        
        # Self-transaction check
        self_tx_factor = 0
        if tx.from_addr == tx.to_addr:
            self_tx_factor += 20  # Self-transactions are higher risk
        
        # Calculate final score with cap at 100
        final_score = min(base_score + amount_factor + gas_factor + self_tx_factor, 100)
        
        return float(final_score)
    
    def get_risk_level(self, score: float) -> str:
        """Convert numeric score to categorical risk level"""
        if score <= self.thresholds["LOW"]:
            return "LOW"
        elif score <= self.thresholds["MEDIUM"]:
            return "MEDIUM"
        else:
            return "HIGH"
    
    def generate_rationale(self, tx: TransactionPayload, score: float) -> Dict[str, Any]:
        """Generate explanation of risk factors"""
        factors = {
            "base_hash_score": int(hashlib.sha256(f"{tx.id}:{tx.amount}".encode()).hexdigest()[:8], 16) % 100,
            "amount_analysis": {
                "amount": tx.amount,
                "category": "large" if tx.amount > 10000 else "medium" if tx.amount > 1000 else "small" if tx.amount >= 1 else "micro"
            },
            "transaction_type": {
                "is_self_transaction": tx.from_addr == tx.to_addr,
                "addresses_involved": 1 if tx.from_addr == tx.to_addr else 2
            }
        }
        
        if tx.gas_limit:
            factors["gas_analysis"] = {
                "gas_limit": tx.gas_limit,
                "category": "high" if tx.gas_limit > 100000 else "normal" if tx.gas_limit >= 21000 else "low"
            }
        
        factors["scoring_methodology"] = "Deterministic hash-based scoring with amount and gas adjustments"
        
        return factors


# Initialize risk scorer
risk_scorer = RiskScorer()


@app.get("/")
async def root():
    """Root endpoint with service information"""
    return {
        "service": "Dytallix AI Risk Assessment Service",
        "version": "1.0.0",
        "status": "operational",
        "model_version": risk_scorer.version,
        "endpoints": {
            "risk_assessment": "/risk",
            "health_check": "/health",
            "documentation": "/docs"
        }
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "model_version": risk_scorer.version
    }


@app.post("/risk", response_model=RiskAssessment)
async def assess_transaction_risk(transaction: TransactionPayload):
    """
    Assess risk for a given transaction using deterministic heuristics.
    
    This endpoint provides reproducible risk scoring based on:
    - Transaction ID and amount hash
    - Amount-based risk factors 
    - Gas usage patterns
    - Self-transaction detection
    
    Returns risk score (0-100) with categorical level and detailed rationale.
    """
    try:
        # Calculate risk score
        risk_score = risk_scorer.calculate_deterministic_score(transaction)
        
        # Determine risk level
        risk_level = risk_scorer.get_risk_level(risk_score)
        
        # Generate rationale
        rationale = risk_scorer.generate_rationale(transaction, risk_score)
        
        # Create assessment response
        assessment = RiskAssessment(
            risk_score=risk_score,
            risk_level=risk_level,
            assessment_timestamp=datetime.utcnow().isoformat(),
            rationale=rationale,
            model_version=risk_scorer.version
        )
        
        return assessment
        
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Risk assessment failed: {str(e)}"
        )


@app.get("/model/info")
async def get_model_info():
    """Get information about the risk assessment model"""
    return {
        "model_version": risk_scorer.version,
        "model_type": "deterministic_heuristic",
        "scoring_range": "0-100",
        "risk_levels": list(risk_scorer.thresholds.keys()),
        "thresholds": risk_scorer.thresholds,
        "features": [
            "transaction_hash_score",
            "amount_analysis", 
            "gas_usage_analysis",
            "self_transaction_detection"
        ],
        "deterministic": True,
        "description": "Hash-based deterministic scoring with amount and gas adjustments"
    }


if __name__ == "__main__":
    # Run the service with uvicorn
    uvicorn.run(
        "service_stub:app",
        host="127.0.0.1", 
        port=8000,
        reload=True,
        log_level="info"
    )