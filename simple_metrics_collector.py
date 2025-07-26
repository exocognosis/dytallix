#!/usr/bin/env python3
"""
Simple Metrics Collector Service
Continuously collects metrics from Dytallix services
"""

import asyncio
import json
import time
import requests
from datetime import datetime
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI(title="Dytallix Metrics Collector", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global metrics storage
metrics_data = {
    "blockchain": {"status": "unknown", "last_check": None},
    "ai_services": {"status": "unknown", "last_check": None},
    "frontend": {"status": "unknown", "last_check": None},
    "performance": {"status": "unknown", "last_check": None}
}

async def collect_metrics():
    """Background task to collect metrics"""
    while True:
        try:
            current_time = datetime.now().isoformat()
            
            # Check blockchain health
            try:
                response = requests.get("http://localhost:3030/health", timeout=5)
                if response.status_code == 200:
                    metrics_data["blockchain"]["status"] = "online"
                    metrics_data["blockchain"]["data"] = response.json()
                else:
                    metrics_data["blockchain"]["status"] = "error"
            except:
                metrics_data["blockchain"]["status"] = "offline"
            metrics_data["blockchain"]["last_check"] = current_time
            
            # Check AI services health
            try:
                response = requests.get("http://localhost:8000/health", timeout=5)
                if response.status_code == 200:
                    metrics_data["ai_services"]["status"] = "online"
                    metrics_data["ai_services"]["data"] = response.json()
                else:
                    metrics_data["ai_services"]["status"] = "error"
            except:
                metrics_data["ai_services"]["status"] = "offline"
            metrics_data["ai_services"]["last_check"] = current_time
            
            # Check frontend
            try:
                response = requests.get("http://localhost:3000", timeout=5)
                if response.status_code == 200:
                    metrics_data["frontend"]["status"] = "online"
                else:
                    metrics_data["frontend"]["status"] = "error"
            except:
                metrics_data["frontend"]["status"] = "offline"
            metrics_data["frontend"]["last_check"] = current_time
            
            # Check performance dashboard
            try:
                response = requests.get("http://localhost:9090/health", timeout=5)
                if response.status_code == 200:
                    metrics_data["performance"]["status"] = "online"
                    metrics_data["performance"]["data"] = response.json()
                else:
                    metrics_data["performance"]["status"] = "error"
            except:
                metrics_data["performance"]["status"] = "offline"
            metrics_data["performance"]["last_check"] = current_time
            
            print(f"📊 Metrics collected at {current_time}")
            
        except Exception as e:
            print(f"❌ Error collecting metrics: {e}")
        
        await asyncio.sleep(10)  # Collect every 10 seconds

@app.on_event("startup")
async def startup_event():
    """Start metrics collection on startup"""
    asyncio.create_task(collect_metrics())

@app.get("/")
async def root():
    """Metrics collector home"""
    return {
        "service": "Dytallix Metrics Collector",
        "status": "running",
        "endpoints": {
            "metrics": "/metrics",
            "health": "/health",
            "summary": "/summary"
        }
    }

@app.get("/health")
async def health():
    """Health check"""
    return {
        "success": True,
        "data": {
            "status": "healthy",
            "service": "metrics_collector",
            "timestamp": datetime.now().isoformat()
        }
    }

@app.get("/metrics")
async def get_metrics():
    """Get all collected metrics"""
    return {
        "success": True,
        "data": metrics_data,
        "timestamp": datetime.now().isoformat()
    }

@app.get("/summary")
async def get_summary():
    """Get summary of service statuses"""
    online_count = sum(1 for service in metrics_data.values() if service["status"] == "online")
    total_services = len(metrics_data)
    
    return {
        "success": True,
        "data": {
            "services_online": online_count,
            "total_services": total_services,
            "system_health": "healthy" if online_count == total_services else "degraded",
            "services": {name: data["status"] for name, data in metrics_data.items()}
        },
        "timestamp": datetime.now().isoformat()
    }

if __name__ == "__main__":
    print("🚀 Starting Dytallix Metrics Collector on port 3001")
    print("📊 Metrics API: http://localhost:3001/metrics")
    print("📋 Summary: http://localhost:3001/summary")
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=3001,
        log_level="info"
    )
