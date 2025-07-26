"""
Performance Dashboard and Monitoring Endpoints

Provides real-time performance monitoring, metrics visualization,
and comprehensive reporting for AI service optimization.
"""

import json
import time
import asyncio
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Query, BackgroundTasks
from fastapi.responses import HTMLResponse, JSONResponse
import logging

from performance_monitor import get_profiler, get_model_cache, get_embedding_cache, get_worker_pool
from model_optimization import get_model_loader, get_inference_optimizer, get_embedding_cache as get_embedding_cache_opt
from performance_middleware import get_model_warmup_service, get_response_optimizer

logger = logging.getLogger(__name__)

# Create performance monitoring router
performance_router = APIRouter(prefix="/performance", tags=["performance"])

@performance_router.get("/health")
async def performance_health():
    """Get performance monitoring system health"""
    profiler = get_profiler()
    model_loader = get_model_loader()
    
    health_status = {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "uptime_seconds": time.time() - profiler.startup_time,
        "active_requests": len(profiler.active_requests),
        "total_requests": len(profiler.metrics_history),
        "loaded_models": len(model_loader.loaded_models),
        "cache_status": {
            "model_cache": get_model_cache().get_stats(),
            "embedding_cache": get_embedding_cache().get_stats()
        }
    }
    
    return health_status

@performance_router.get("/metrics")
async def get_performance_metrics():
    """Get comprehensive performance metrics"""
    profiler = get_profiler()
    return profiler.get_performance_summary()

@performance_router.get("/metrics/real-time")
async def get_real_time_metrics():
    """Get real-time performance metrics"""
    profiler = get_profiler()
    
    # Get metrics from last 5 minutes
    five_minutes_ago = time.time() - 300
    recent_metrics = [m for m in profiler.metrics_history if m.start_time > five_minutes_ago]
    
    if not recent_metrics:
        return {
            "status": "no_recent_data",
            "timeframe": "5_minutes",
            "metrics_count": 0
        }
    
    # Calculate real-time stats
    response_times = [m.duration_ms for m in recent_metrics if m.duration_ms > 0]
    
    real_time_stats = {
        "timeframe": "5_minutes",
        "timestamp": datetime.now().isoformat(),
        "metrics_count": len(recent_metrics),
        "requests_per_minute": len(recent_metrics) / 5,
        "avg_response_time_ms": sum(response_times) / len(response_times) if response_times else 0,
        "max_response_time_ms": max(response_times) if response_times else 0,
        "min_response_time_ms": min(response_times) if response_times else 0,
        "success_rate": len([m for m in recent_metrics if 200 <= m.status_code < 300]) / len(recent_metrics),
        "cache_hit_rate": len([m for m in recent_metrics if m.cache_hit]) / len(recent_metrics),
        "cold_start_rate": len([m for m in recent_metrics if m.cold_start]) / len(recent_metrics),
        "endpoints": {}
    }
    
    # Per-endpoint stats
    endpoints = set(m.endpoint for m in recent_metrics)
    for endpoint in endpoints:
        endpoint_metrics = [m for m in recent_metrics if m.endpoint == endpoint]
        endpoint_times = [m.duration_ms for m in endpoint_metrics if m.duration_ms > 0]
        
        real_time_stats["endpoints"][endpoint] = {
            "requests": len(endpoint_metrics),
            "avg_response_time_ms": sum(endpoint_times) / len(endpoint_times) if endpoint_times else 0,
            "success_rate": len([m for m in endpoint_metrics if 200 <= m.status_code < 300]) / len(endpoint_metrics)
        }
    
    return real_time_stats

@performance_router.get("/metrics/history")
async def get_metrics_history(
    hours: int = Query(1, description="Number of hours of history to retrieve"),
    endpoint: Optional[str] = Query(None, description="Filter by specific endpoint")
):
    """Get historical performance metrics"""
    profiler = get_profiler()
    
    # Calculate time range
    start_time = time.time() - (hours * 3600)
    
    # Filter metrics
    filtered_metrics = [
        m for m in profiler.metrics_history 
        if m.start_time > start_time and (not endpoint or m.endpoint == endpoint)
    ]
    
    if not filtered_metrics:
        return {
            "status": "no_data",
            "timeframe_hours": hours,
            "endpoint_filter": endpoint,
            "metrics_count": 0
        }
    
    # Group metrics by time buckets (10-minute intervals)
    bucket_size = 600  # 10 minutes
    buckets = {}
    
    for metric in filtered_metrics:
        bucket_key = int(metric.start_time // bucket_size) * bucket_size
        if bucket_key not in buckets:
            buckets[bucket_key] = []
        buckets[bucket_key].append(metric)
    
    # Calculate stats for each bucket
    history_data = []
    for bucket_time in sorted(buckets.keys()):
        bucket_metrics = buckets[bucket_time]
        response_times = [m.duration_ms for m in bucket_metrics if m.duration_ms > 0]
        
        bucket_stats = {
            "timestamp": datetime.fromtimestamp(bucket_time).isoformat(),
            "requests": len(bucket_metrics),
            "avg_response_time_ms": sum(response_times) / len(response_times) if response_times else 0,
            "max_response_time_ms": max(response_times) if response_times else 0,
            "success_rate": len([m for m in bucket_metrics if 200 <= m.status_code < 300]) / len(bucket_metrics),
            "cache_hit_rate": len([m for m in bucket_metrics if m.cache_hit]) / len(bucket_metrics),
            "memory_avg_mb": sum(m.memory_after_mb for m in bucket_metrics) / len(bucket_metrics)
        }
        history_data.append(bucket_stats)
    
    return {
        "timeframe_hours": hours,
        "endpoint_filter": endpoint,
        "total_metrics": len(filtered_metrics),
        "buckets": len(history_data),
        "data": history_data
    }

@performance_router.get("/flame-graph")
async def get_flame_graph_data():
    """Get flame graph data for performance analysis"""
    profiler = get_profiler()
    return profiler.get_flame_graph_data()

@performance_router.get("/models")
async def get_model_performance():
    """Get model loading and inference performance"""
    model_loader = get_model_loader()
    inference_optimizer = get_inference_optimizer()
    warmup_service = get_model_warmup_service()
    
    return {
        "loaded_models": model_loader.get_loaded_models(),
        "cache_stats": model_loader.get_cache_stats(),
        "inference_stats": inference_optimizer.get_inference_stats(),
        "warmup_stats": warmup_service.get_warmup_stats()
    }

@performance_router.get("/cache")
async def get_cache_performance():
    """Get caching performance metrics"""
    model_cache = get_model_cache()
    embedding_cache_std = get_embedding_cache()
    embedding_cache_opt = get_embedding_cache_opt()
    
    return {
        "model_cache": model_cache.get_stats(),
        "embedding_cache_std": embedding_cache_std.get_stats(),
        "embedding_cache_opt": embedding_cache_opt.get_stats()
    }

@performance_router.get("/system")
async def get_system_metrics():
    """Get system resource utilization"""
    import psutil
    
    # CPU metrics
    cpu_percent = psutil.cpu_percent(interval=1)
    cpu_count = psutil.cpu_count()
    cpu_freq = psutil.cpu_freq()
    
    # Memory metrics
    memory = psutil.virtual_memory()
    
    # Disk metrics
    disk = psutil.disk_usage('/')
    
    # Network metrics
    network = psutil.net_io_counters()
    
    return {
        "timestamp": datetime.now().isoformat(),
        "cpu": {
            "percent": cpu_percent,
            "count": cpu_count,
            "frequency_mhz": cpu_freq.current if cpu_freq else None
        },
        "memory": {
            "total_mb": memory.total / 1024 / 1024,
            "available_mb": memory.available / 1024 / 1024,
            "used_mb": memory.used / 1024 / 1024,
            "percent": memory.percent
        },
        "disk": {
            "total_gb": disk.total / 1024 / 1024 / 1024,
            "used_gb": disk.used / 1024 / 1024 / 1024,
            "free_gb": disk.free / 1024 / 1024 / 1024,
            "percent": (disk.used / disk.total) * 100
        },
        "network": {
            "bytes_sent": network.bytes_sent,
            "bytes_recv": network.bytes_recv,
            "packets_sent": network.packets_sent,
            "packets_recv": network.packets_recv
        }
    }

@performance_router.post("/cache/clear")
async def clear_caches():
    """Clear all performance caches"""
    model_cache = get_model_cache()
    embedding_cache_std = get_embedding_cache()
    embedding_cache_opt = get_embedding_cache_opt()
    model_loader = get_model_loader()
    
    # Clear caches
    model_cache.clear()
    embedding_cache_std.clear()
    model_loader.clear_cache()
    
    return {
        "status": "success",
        "message": "All caches cleared",
        "timestamp": datetime.now().isoformat()
    }

@performance_router.post("/warmup")
async def trigger_model_warmup(background_tasks: BackgroundTasks):
    """Trigger model warmup process"""
    warmup_service = get_model_warmup_service()
    
    # Define warmup functions for each model type
    async def warmup_fraud_detection():
        # Dummy warmup for fraud detection model
        await asyncio.sleep(0.1)
        
    async def warmup_risk_scoring():
        # Dummy warmup for risk scoring model
        await asyncio.sleep(0.1)
        
    async def warmup_contract_nlp():
        # Dummy warmup for contract NLP model
        await asyncio.sleep(0.1)
    
    warmup_functions = {
        "fraud_detection": warmup_fraud_detection,
        "risk_scoring": warmup_risk_scoring,
        "contract_nlp": warmup_contract_nlp
    }
    
    # Add warmup task to background
    background_tasks.add_task(warmup_service.warmup_all_models, warmup_functions)
    
    return {
        "status": "started",
        "message": "Model warmup process started",
        "models": list(warmup_functions.keys()),
        "timestamp": datetime.now().isoformat()
    }

@performance_router.get("/export/csv")
async def export_metrics_csv():
    """Export performance metrics as CSV"""
    profiler = get_profiler()
    csv_data = profiler.export_metrics_csv()
    
    from fastapi.responses import PlainTextResponse
    return PlainTextResponse(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=performance_metrics.csv"}
    )

@performance_router.get("/dashboard")
async def performance_dashboard():
    """Serve performance monitoring dashboard"""
    html_content = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Dytallix AI Performance Dashboard</title>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
            .container { max-width: 1200px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 30px; color: #333; }
            .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 30px; }
            .metric-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .metric-title { font-size: 18px; font-weight: bold; margin-bottom: 10px; color: #333; }
            .metric-value { font-size: 24px; font-weight: bold; color: #007bff; }
            .metric-unit { font-size: 14px; color: #666; }
            .chart-container { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 20px; }
            .status-good { color: #28a745; }
            .status-warning { color: #ffc107; }
            .status-critical { color: #dc3545; }
            .refresh-btn { background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; margin-bottom: 20px; }
            .refresh-btn:hover { background: #0056b3; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🚀 Dytallix AI Performance Dashboard</h1>
                <button class="refresh-btn" onclick="refreshDashboard()">🔄 Refresh</button>
                <span id="lastUpdate"></span>
            </div>
            
            <div class="metrics-grid" id="metricsGrid">
                <!-- Metrics will be populated here -->
            </div>
            
            <div class="chart-container">
                <h3>Response Time Trends</h3>
                <canvas id="responseTimeChart" width="400" height="200"></canvas>
            </div>
            
            <div class="chart-container">
                <h3>Request Volume</h3>
                <canvas id="requestVolumeChart" width="400" height="200"></canvas>
            </div>
            
            <div class="chart-container">
                <h3>Cache Performance</h3>
                <canvas id="cacheChart" width="400" height="200"></canvas>
            </div>
        </div>

        <script>
            let responseTimeChart, requestVolumeChart, cacheChart;
            
            async function fetchMetrics() {
                try {
                    const response = await fetch('/performance/metrics/real-time');
                    return await response.json();
                } catch (error) {
                    console.error('Error fetching metrics:', error);
                    return null;
                }
            }
            
            async function fetchHistory() {
                try {
                    const response = await fetch('/performance/metrics/history?hours=2');
                    return await response.json();
                } catch (error) {
                    console.error('Error fetching history:', error);
                    return null;
                }
            }
            
            function updateMetricsGrid(metrics) {
                const grid = document.getElementById('metricsGrid');
                
                const cards = [
                    {
                        title: 'Average Response Time',
                        value: metrics.avg_response_time_ms ? metrics.avg_response_time_ms.toFixed(2) : '0',
                        unit: 'ms',
                        status: metrics.avg_response_time_ms < 100 ? 'good' : metrics.avg_response_time_ms < 500 ? 'warning' : 'critical'
                    },
                    {
                        title: 'Requests per Minute',
                        value: metrics.requests_per_minute ? metrics.requests_per_minute.toFixed(1) : '0',
                        unit: 'req/min',
                        status: 'good'
                    },
                    {
                        title: 'Success Rate',
                        value: metrics.success_rate ? (metrics.success_rate * 100).toFixed(1) : '0',
                        unit: '%',
                        status: metrics.success_rate > 0.95 ? 'good' : metrics.success_rate > 0.90 ? 'warning' : 'critical'
                    },
                    {
                        title: 'Cache Hit Rate',
                        value: metrics.cache_hit_rate ? (metrics.cache_hit_rate * 100).toFixed(1) : '0',
                        unit: '%',
                        status: metrics.cache_hit_rate > 0.7 ? 'good' : metrics.cache_hit_rate > 0.5 ? 'warning' : 'critical'
                    },
                    {
                        title: 'Cold Start Rate',
                        value: metrics.cold_start_rate ? (metrics.cold_start_rate * 100).toFixed(1) : '0',
                        unit: '%',
                        status: metrics.cold_start_rate < 0.1 ? 'good' : metrics.cold_start_rate < 0.2 ? 'warning' : 'critical'
                    },
                    {
                        title: 'Active Requests',
                        value: metrics.metrics_count || '0',
                        unit: 'requests',
                        status: 'good'
                    }
                ];
                
                grid.innerHTML = cards.map(card => `
                    <div class="metric-card">
                        <div class="metric-title">${card.title}</div>
                        <div class="metric-value status-${card.status}">${card.value}</div>
                        <div class="metric-unit">${card.unit}</div>
                    </div>
                `).join('');
            }
            
            function initCharts() {
                // Response Time Chart
                const responseTimeCtx = document.getElementById('responseTimeChart').getContext('2d');
                responseTimeChart = new Chart(responseTimeCtx, {
                    type: 'line',
                    data: {
                        labels: [],
                        datasets: [{
                            label: 'Avg Response Time (ms)',
                            data: [],
                            borderColor: '#007bff',
                            tension: 0.1
                        }]
                    },
                    options: {
                        responsive: true,
                        scales: {
                            y: {
                                beginAtZero: true
                            }
                        }
                    }
                });
                
                // Request Volume Chart
                const requestVolumeCtx = document.getElementById('requestVolumeChart').getContext('2d');
                requestVolumeChart = new Chart(requestVolumeCtx, {
                    type: 'bar',
                    data: {
                        labels: [],
                        datasets: [{
                            label: 'Requests',
                            data: [],
                            backgroundColor: '#28a745'
                        }]
                    },
                    options: {
                        responsive: true,
                        scales: {
                            y: {
                                beginAtZero: true
                            }
                        }
                    }
                });
                
                // Cache Performance Chart
                const cacheCtx = document.getElementById('cacheChart').getContext('2d');
                cacheChart = new Chart(cacheCtx, {
                    type: 'doughnut',
                    data: {
                        labels: ['Cache Hits', 'Cache Misses'],
                        datasets: [{
                            data: [70, 30],
                            backgroundColor: ['#28a745', '#dc3545']
                        }]
                    },
                    options: {
                        responsive: true
                    }
                });
            }
            
            function updateCharts(historyData) {
                if (!historyData || !historyData.data) return;
                
                const data = historyData.data.slice(-20); // Last 20 data points
                
                // Update response time chart
                responseTimeChart.data.labels = data.map(d => new Date(d.timestamp).toLocaleTimeString());
                responseTimeChart.data.datasets[0].data = data.map(d => d.avg_response_time_ms);
                responseTimeChart.update();
                
                // Update request volume chart
                requestVolumeChart.data.labels = data.map(d => new Date(d.timestamp).toLocaleTimeString());
                requestVolumeChart.data.datasets[0].data = data.map(d => d.requests);
                requestVolumeChart.update();
                
                // Update cache chart with latest data
                if (data.length > 0) {
                    const latestData = data[data.length - 1];
                    const hitRate = latestData.cache_hit_rate * 100;
                    const missRate = 100 - hitRate;
                    
                    cacheChart.data.datasets[0].data = [hitRate, missRate];
                    cacheChart.update();
                }
            }
            
            async function refreshDashboard() {
                const metrics = await fetchMetrics();
                const history = await fetchHistory();
                
                if (metrics) {
                    updateMetricsGrid(metrics);
                }
                
                if (history) {
                    updateCharts(history);
                }
                
                document.getElementById('lastUpdate').textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
            }
            
            // Initialize dashboard
            document.addEventListener('DOMContentLoaded', function() {
                initCharts();
                refreshDashboard();
                
                // Auto-refresh every 30 seconds
                setInterval(refreshDashboard, 30000);
            });
        </script>
    </body>
    </html>
    """
    
    return HTMLResponse(content=html_content)

@performance_router.get("/reports/optimization")
async def generate_optimization_report():
    """Generate comprehensive optimization report"""
    profiler = get_profiler()
    model_loader = get_model_loader()
    inference_optimizer = get_inference_optimizer()
    
    # Analyze performance data
    recent_metrics = list(profiler.metrics_history)[-1000:]  # Last 1000 requests
    
    if not recent_metrics:
        return {"error": "No performance data available"}
    
    # Calculate baseline metrics
    response_times = [m.duration_ms for m in recent_metrics if m.duration_ms > 0]
    cold_start_times = [m.duration_ms for m in recent_metrics if m.cold_start and m.duration_ms > 0]
    warm_times = [m.duration_ms for m in recent_metrics if not m.cold_start and m.duration_ms > 0]
    
    # Performance analysis
    analysis = {
        "timestamp": datetime.now().isoformat(),
        "sample_size": len(recent_metrics),
        "baseline_metrics": {
            "avg_response_time_ms": sum(response_times) / len(response_times) if response_times else 0,
            "p95_response_time_ms": sorted(response_times)[int(len(response_times) * 0.95)] if response_times else 0,
            "p99_response_time_ms": sorted(response_times)[int(len(response_times) * 0.99)] if response_times else 0,
            "cold_start_avg_ms": sum(cold_start_times) / len(cold_start_times) if cold_start_times else 0,
            "warm_avg_ms": sum(warm_times) / len(warm_times) if warm_times else 0,
            "cache_hit_rate": len([m for m in recent_metrics if m.cache_hit]) / len(recent_metrics),
            "success_rate": len([m for m in recent_metrics if 200 <= m.status_code < 300]) / len(recent_metrics)
        },
        "performance_targets": {
            "target_cold_start_ms": 1000,
            "target_warm_ms": 100,
            "target_cache_hit_rate": 0.8,
            "target_success_rate": 0.99
        },
        "optimization_opportunities": [],
        "model_performance": model_loader.get_loaded_models(),
        "cache_performance": {
            "model_cache": get_model_cache().get_stats(),
            "inference_cache": inference_optimizer.get_inference_stats()
        }
    }
    
    # Identify optimization opportunities
    baseline = analysis["baseline_metrics"]
    targets = analysis["performance_targets"]
    
    if baseline["cold_start_avg_ms"] > targets["target_cold_start_ms"]:
        analysis["optimization_opportunities"].append({
            "category": "cold_start",
            "priority": "high",
            "current_ms": baseline["cold_start_avg_ms"],
            "target_ms": targets["target_cold_start_ms"],
            "improvement_potential_ms": baseline["cold_start_avg_ms"] - targets["target_cold_start_ms"],
            "recommendations": [
                "Implement model preloading at startup",
                "Use model caching to avoid repeated loading",
                "Optimize model initialization code",
                "Consider model quantization or pruning"
            ]
        })
    
    if baseline["warm_avg_ms"] > targets["target_warm_ms"]:
        analysis["optimization_opportunities"].append({
            "category": "warm_response",
            "priority": "medium",
            "current_ms": baseline["warm_avg_ms"],
            "target_ms": targets["target_warm_ms"],
            "improvement_potential_ms": baseline["warm_avg_ms"] - targets["target_warm_ms"],
            "recommendations": [
                "Implement response caching",
                "Use batch processing for multiple requests",
                "Optimize inference pipeline",
                "Add connection pooling"
            ]
        })
    
    if baseline["cache_hit_rate"] < targets["target_cache_hit_rate"]:
        analysis["optimization_opportunities"].append({
            "category": "caching",
            "priority": "medium",
            "current_rate": baseline["cache_hit_rate"],
            "target_rate": targets["target_cache_hit_rate"],
            "improvement_potential": targets["target_cache_hit_rate"] - baseline["cache_hit_rate"],
            "recommendations": [
                "Increase cache size",
                "Improve cache key generation",
                "Implement smarter cache eviction policies",
                "Add cache warming strategies"
            ]
        })
    
    # Calculate potential improvement
    if cold_start_times and warm_times:
        current_improvement = ((sum(cold_start_times) / len(cold_start_times)) - 
                              (sum(warm_times) / len(warm_times))) / (sum(cold_start_times) / len(cold_start_times))
        analysis["current_improvement_rate"] = current_improvement
        
        target_improvement = (targets["target_cold_start_ms"] - targets["target_warm_ms"]) / targets["target_cold_start_ms"]
        analysis["target_improvement_rate"] = target_improvement
        analysis["additional_improvement_needed"] = target_improvement - current_improvement
    
    return analysis

# Additional utility endpoints
@performance_router.get("/status")
async def get_performance_status():
    """Get overall performance system status"""
    profiler = get_profiler()
    
    # Check if performance is within acceptable thresholds
    recent_metrics = list(profiler.metrics_history)[-100:]  # Last 100 requests
    
    if not recent_metrics:
        return {
            "status": "unknown",
            "message": "No performance data available",
            "timestamp": datetime.now().isoformat()
        }
    
    response_times = [m.duration_ms for m in recent_metrics if m.duration_ms > 0]
    avg_response_time = sum(response_times) / len(response_times) if response_times else 0
    success_rate = len([m for m in recent_metrics if 200 <= m.status_code < 300]) / len(recent_metrics)
    
    # Determine status
    if avg_response_time < 100 and success_rate > 0.95:
        status = "excellent"
        status_color = "#28a745"
    elif avg_response_time < 250 and success_rate > 0.90:
        status = "good"
        status_color = "#007bff"
    elif avg_response_time < 500 and success_rate > 0.85:
        status = "warning"
        status_color = "#ffc107"
    else:
        status = "critical"
        status_color = "#dc3545"
    
    return {
        "status": status,
        "status_color": status_color,
        "avg_response_time_ms": avg_response_time,
        "success_rate": success_rate,
        "sample_size": len(recent_metrics),
        "timestamp": datetime.now().isoformat()
    }