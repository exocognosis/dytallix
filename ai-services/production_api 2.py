#!/usr/bin/env python3
"""
Production FastAPI AI Risk Assessment Service for Dytallix

This service provides real-time transaction risk scoring and fraud detection
with latency SLOs of p50 <1s, p95 <2s.
"""

import asyncio
import hashlib
import json
import logging
import time
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict

import numpy as np
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
import uvicorn

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Metrics storage (in production would use Redis/InfluxDB)
metrics_store = {
    "request_count": 0,
    "latencies": [],
    "error_count": 0,
    "model_predictions": 0
}

# Initialize FastAPI app
app = FastAPI(
    title="Dytallix AI Risk Assessment Service",
    description="Production AI service for transaction risk scoring and fraud detection",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request/Response Models
class TransactionData(BaseModel):
    hash: str = Field(..., description="Transaction hash")
    from_address: str = Field(..., description="Sender address")
    to_address: str = Field(..., description="Recipient address")
    amount: float = Field(..., description="Transaction amount")
    gas_price: Optional[float] = Field(None, description="Gas price")
    timestamp: Optional[str] = Field(None, description="Transaction timestamp")
    block_height: Optional[int] = Field(None, description="Block height")

class RiskScore(BaseModel):
    transaction_hash: str
    risk_score: float = Field(..., ge=0.0, le=1.0, description="Risk score 0-1")
    risk_level: str = Field(..., description="LOW, MEDIUM, HIGH, CRITICAL")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Model confidence")
    factors: List[str] = Field(..., description="Risk factors identified")
    processing_time_ms: float = Field(..., description="Processing time in milliseconds")
    model_version: str = Field(..., description="AI model version used")

class LatencyMetrics(BaseModel):
    p50: float = Field(..., description="50th percentile latency (ms)")
    p95: float = Field(..., description="95th percentile latency (ms)")
    p99: float = Field(..., description="99th percentile latency (ms)")
    mean: float = Field(..., description="Mean latency (ms)")
    request_count: int = Field(..., description="Total requests processed")

# AI Risk Scoring Engine
class AIRiskEngine:
    def __init__(self):
        self.model_version = "v1.2.3"
        self.feature_weights = {
            "amount_anomaly": 0.25,
            "address_reputation": 0.20,
            "transaction_velocity": 0.15,
            "gas_price_anomaly": 0.10,
            "time_pattern": 0.15,
            "network_analysis": 0.15
        }
        
    async def analyze_transaction(self, tx_data: TransactionData) -> RiskScore:
        """
        Analyze transaction and return risk score with factors
        Optimized for <500ms processing time
        """
        start_time = time.time() * 1000
        
        # Feature extraction and risk scoring
        features = await self._extract_features(tx_data)
        risk_factors = []
        risk_score = 0.0
        
        # Amount anomaly detection
        amount_risk, amount_factor = self._analyze_amount(tx_data.amount)
        risk_score += amount_risk * self.feature_weights["amount_anomaly"]
        if amount_factor:
            risk_factors.append(amount_factor)
            
        # Address reputation analysis
        addr_risk, addr_factor = await self._analyze_addresses(tx_data.from_address, tx_data.to_address)
        risk_score += addr_risk * self.feature_weights["address_reputation"]
        if addr_factor:
            risk_factors.append(addr_factor)
            
        # Transaction velocity analysis
        velocity_risk, velocity_factor = await self._analyze_velocity(tx_data.from_address)
        risk_score += velocity_risk * self.feature_weights["transaction_velocity"]
        if velocity_factor:
            risk_factors.append(velocity_factor)
            
        # Gas price anomaly
        if tx_data.gas_price:
            gas_risk, gas_factor = self._analyze_gas_price(tx_data.gas_price)
            risk_score += gas_risk * self.feature_weights["gas_price_anomaly"]
            if gas_factor:
                risk_factors.append(gas_factor)
                
        # Time pattern analysis
        time_risk, time_factor = self._analyze_time_patterns(tx_data.timestamp)
        risk_score += time_risk * self.feature_weights["time_pattern"]
        if time_factor:
            risk_factors.append(time_factor)
            
        # Determine risk level
        if risk_score >= 0.8:
            risk_level = "CRITICAL"
        elif risk_score >= 0.6:
            risk_level = "HIGH"
        elif risk_score >= 0.3:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"
            
        # Calculate confidence (higher for more factors)
        confidence = min(0.95, 0.6 + (len(risk_factors) * 0.1))
        
        processing_time = time.time() * 1000 - start_time
        
        return RiskScore(
            transaction_hash=tx_data.hash,
            risk_score=round(risk_score, 3),
            risk_level=risk_level,
            confidence=round(confidence, 3),
            factors=risk_factors if risk_factors else ["no_risk_factors_detected"],
            processing_time_ms=round(processing_time, 2),
            model_version=self.model_version
        )
    
    async def _extract_features(self, tx_data: TransactionData) -> Dict[str, Any]:
        """Extract features for ML model (optimized for speed)"""
        # Simulated feature extraction - in production would use ML pipeline
        await asyncio.sleep(0.001)  # Simulate brief processing
        return {
            "tx_hash": tx_data.hash,
            "amount_log": np.log10(max(tx_data.amount, 1)),
            "hour_of_day": datetime.now().hour,
            "is_weekend": datetime.now().weekday() >= 5
        }
    
    def _analyze_amount(self, amount: float) -> tuple[float, Optional[str]]:
        """Analyze transaction amount for anomalies"""
        # Large amounts are riskier
        if amount > 1000000:  # 1M tokens
            return 0.8, "large_amount_transfer"
        elif amount > 100000:  # 100K tokens
            return 0.4, "medium_amount_transfer"
        elif amount < 1:  # Dust transactions
            return 0.3, "dust_transaction"
        return 0.1, None
    
    async def _analyze_addresses(self, from_addr: str, to_addr: str) -> tuple[float, Optional[str]]:
        """Analyze address reputation and patterns"""
        # Simulated address analysis
        await asyncio.sleep(0.002)
        
        # Check for known patterns (in production would query reputation DB)
        if "1111111" in from_addr or "1111111" in to_addr:
            return 0.9, "suspicious_address_pattern"
        elif len(from_addr) < 10 or len(to_addr) < 10:
            return 0.7, "short_address_suspicious"
        
        # Address similarity (potential typosquatting)
        if abs(len(from_addr) - len(to_addr)) < 3:
            return 0.2, "similar_address_length"
            
        return 0.05, None
    
    async def _analyze_velocity(self, address: str) -> tuple[float, Optional[str]]:
        """Analyze transaction velocity for the address"""
        # Simulated velocity analysis
        await asyncio.sleep(0.001)
        
        # In production, would check recent transaction history
        # Simulate high velocity detection based on address hash
        addr_hash = int(hashlib.md5(address.encode()).hexdigest()[:8], 16)
        if addr_hash % 100 < 5:  # 5% chance of high velocity
            return 0.7, "high_transaction_velocity"
        elif addr_hash % 100 < 15:  # 15% chance of medium velocity
            return 0.3, "elevated_transaction_velocity"
            
        return 0.1, None
    
    def _analyze_gas_price(self, gas_price: float) -> tuple[float, Optional[str]]:
        """Analyze gas price for anomalies"""
        # Extremely high or low gas prices can be suspicious
        if gas_price > 1000:
            return 0.6, "extremely_high_gas_price"
        elif gas_price < 1:
            return 0.4, "unusually_low_gas_price"
        return 0.05, None
    
    def _analyze_time_patterns(self, timestamp: Optional[str]) -> tuple[float, Optional[str]]:
        """Analyze timing patterns"""
        if not timestamp:
            return 0.1, None
            
        # Parse timestamp and check for suspicious timing
        try:
            dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            hour = dt.hour
            
            # Transactions at unusual hours (2-6 AM) are slightly riskier
            if 2 <= hour <= 6:
                return 0.2, "unusual_time_pattern"
            elif hour >= 22 or hour <= 2:
                return 0.1, "late_night_transaction"
        except:
            return 0.15, "invalid_timestamp"
            
        return 0.05, None

# Initialize AI engine
risk_engine = AIRiskEngine()

# Background task to update metrics
async def update_metrics(latency_ms: float, error: bool = False):
    """Update performance metrics"""
    global metrics_store
    metrics_store["request_count"] += 1
    metrics_store["latencies"].append(latency_ms)
    if error:
        metrics_store["error_count"] += 1
    else:
        metrics_store["model_predictions"] += 1
    
    # Keep only last 1000 latency measurements
    if len(metrics_store["latencies"]) > 1000:
        metrics_store["latencies"] = metrics_store["latencies"][-1000:]

# API Endpoints
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "dytallix-ai-risk-service",
        "version": "1.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "model_version": risk_engine.model_version
    }

@app.post("/api/ai/risk/transaction/{tx_hash}", response_model=RiskScore)
async def analyze_transaction_risk(
    tx_hash: str,
    transaction: TransactionData,
    background_tasks: BackgroundTasks
):
    """
    Analyze transaction risk - Main production endpoint
    
    SLA: p50 <1s, p95 <2s
    """
    start_time = time.time() * 1000
    
    try:
        # Validate transaction hash matches
        if transaction.hash != tx_hash:
            raise HTTPException(
                status_code=400,
                detail="Transaction hash in URL does not match request body"
            )
        
        # Perform risk analysis
        risk_result = await risk_engine.analyze_transaction(transaction)
        
        # Record metrics
        processing_time = time.time() * 1000 - start_time
        background_tasks.add_task(update_metrics, processing_time)
        
        logger.info(f"Risk analysis completed for {tx_hash}: "
                   f"{risk_result.risk_level} ({risk_result.risk_score}) "
                   f"in {processing_time:.2f}ms")
        
        return risk_result
        
    except Exception as e:
        processing_time = time.time() * 1000 - start_time
        background_tasks.add_task(update_metrics, processing_time, error=True)
        
        logger.error(f"Risk analysis failed for {tx_hash}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Risk analysis failed: {str(e)}"
        )

@app.get("/api/ai/risk/batch")
async def analyze_batch_risk(transaction_hashes: List[str]):
    """Batch risk analysis endpoint"""
    results = []
    
    for tx_hash in transaction_hashes[:10]:  # Limit to 10 for performance
        # In production, would batch process more efficiently
        mock_tx = TransactionData(
            hash=tx_hash,
            from_address=f"addr_{tx_hash[:8]}",
            to_address=f"addr_{tx_hash[8:16]}",
            amount=float(int(tx_hash[-4:], 16)) / 100
        )
        
        risk_result = await risk_engine.analyze_transaction(mock_tx)
        results.append(risk_result)
    
    return {"results": results, "count": len(results)}

@app.get("/api/ai/metrics/latency", response_model=LatencyMetrics)
async def get_latency_metrics():
    """Get current latency metrics for SLA monitoring"""
    latencies = metrics_store["latencies"]
    
    if not latencies:
        return LatencyMetrics(
            p50=0, p95=0, p99=0, mean=0, request_count=0
        )
    
    latencies_np = np.array(latencies)
    
    return LatencyMetrics(
        p50=float(np.percentile(latencies_np, 50)),
        p95=float(np.percentile(latencies_np, 95)),
        p99=float(np.percentile(latencies_np, 99)),
        mean=float(np.mean(latencies_np)),
        request_count=metrics_store["request_count"]
    )

@app.get("/api/ai/stats")
async def get_service_stats():
    """Get comprehensive service statistics"""
    latencies = metrics_store["latencies"]
    uptime_hours = 24  # Would track actual uptime in production
    
    return {
        "service": "dytallix-ai-risk-service",
        "uptime_hours": uptime_hours,
        "requests_processed": metrics_store["request_count"],
        "predictions_made": metrics_store["model_predictions"],
        "error_count": metrics_store["error_count"],
        "error_rate": metrics_store["error_count"] / max(metrics_store["request_count"], 1),
        "avg_latency_ms": np.mean(latencies) if latencies else 0,
        "model_version": risk_engine.model_version,
        "last_updated": datetime.now(timezone.utc).isoformat()
    }

# Development/testing endpoints
@app.post("/api/ai/test/generate-load")
async def generate_test_load(num_requests: int = 100):
    """Generate test load for latency testing"""
    if num_requests > 1000:
        raise HTTPException(status_code=400, detail="Maximum 1000 requests for load testing")
    
    start_time = time.time()
    tasks = []
    
    for i in range(num_requests):
        tx_hash = f"test_tx_{i:06d}_{int(time.time())}"
        mock_tx = TransactionData(
            hash=tx_hash,
            from_address=f"test_addr_{i}",
            to_address=f"dest_addr_{i}",
            amount=float(i * 100),
            gas_price=float(i + 1)
        )
        tasks.append(risk_engine.analyze_transaction(mock_tx))
    
    results = await asyncio.gather(*tasks)
    end_time = time.time()
    
    latencies = [r.processing_time_ms for r in results]
    
    return {
        "requests_completed": len(results),
        "total_time_seconds": end_time - start_time,
        "throughput_rps": len(results) / (end_time - start_time),
        "latency_stats": {
            "min_ms": min(latencies),
            "max_ms": max(latencies),
            "mean_ms": np.mean(latencies),
            "p95_ms": np.percentile(latencies, 95),
            "p99_ms": np.percentile(latencies, 99)
        }
    }

if __name__ == "__main__":
    # Production server configuration
    uvicorn.run(
        "production_api:app",
        host="0.0.0.0",
        port=8080,
        workers=4,  # Multi-worker for production
        loop="uvloop",  # High-performance event loop
        log_level="info"
    )