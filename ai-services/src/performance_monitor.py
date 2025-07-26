"""
Performance Monitoring and Optimization Module

Provides comprehensive performance monitoring, profiling, and optimization
capabilities for Dytallix AI services to achieve sub-100ms response times.
"""

import asyncio
import time
import logging
import psutil
import os
import gc
import threading
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from collections import defaultdict, deque
import json
from contextlib import asynccontextmanager
import uuid
import functools
import weakref

logger = logging.getLogger(__name__)

@dataclass
class RequestMetrics:
    """Detailed metrics for individual requests"""
    request_id: str
    endpoint: str
    method: str
    start_time: float
    end_time: float
    duration_ms: float
    memory_before_mb: float
    memory_after_mb: float
    memory_peak_mb: float
    cpu_percent: float
    status_code: int
    response_size_bytes: int
    cold_start: bool
    cache_hit: bool
    model_load_time_ms: float
    preprocessing_time_ms: float
    inference_time_ms: float
    postprocessing_time_ms: float
    serialization_time_ms: float
    error_message: Optional[str] = None

@dataclass 
class ServiceMetrics:
    """Aggregated service performance metrics"""
    service_name: str
    total_requests: int
    avg_response_time_ms: float
    p50_response_time_ms: float
    p95_response_time_ms: float
    p99_response_time_ms: float
    success_rate: float
    cache_hit_rate: float
    cold_start_rate: float
    avg_memory_usage_mb: float
    peak_memory_usage_mb: float
    avg_cpu_percent: float
    requests_per_second: float
    error_count: int
    last_reset: datetime

class PerformanceProfiler:
    """Advanced performance profiler for AI services"""
    
    def __init__(self, max_metrics_history: int = 10000):
        self.metrics_history: deque = deque(maxlen=max_metrics_history)
        self.service_metrics: Dict[str, ServiceMetrics] = {}
        self.active_requests: Dict[str, RequestMetrics] = {}
        self.startup_time = time.time()
        self.cache_stats = {"hits": 0, "misses": 0, "size": 0}
        self.model_warmup_times: Dict[str, float] = {}
        self.performance_thresholds = {
            "response_time_ms_warn": 100,
            "response_time_ms_critical": 500,
            "memory_mb_warn": 1024,
            "memory_mb_critical": 2048,
            "cpu_percent_warn": 80,
            "cpu_percent_critical": 95
        }
        self._lock = threading.Lock()
        
    def start_request(self, request_id: str, endpoint: str, method: str = "POST", cold_start: bool = False) -> RequestMetrics:
        """Start tracking a new request"""
        current_time = time.time()
        memory_info = psutil.Process().memory_info()
        
        metrics = RequestMetrics(
            request_id=request_id,
            endpoint=endpoint,
            method=method,
            start_time=current_time,
            end_time=0,
            duration_ms=0,
            memory_before_mb=memory_info.rss / 1024 / 1024,
            memory_after_mb=0,
            memory_peak_mb=memory_info.rss / 1024 / 1024,
            cpu_percent=psutil.cpu_percent(),
            status_code=0,
            response_size_bytes=0,
            cold_start=cold_start,
            cache_hit=False,
            model_load_time_ms=0,
            preprocessing_time_ms=0,
            inference_time_ms=0,
            postprocessing_time_ms=0,
            serialization_time_ms=0
        )
        
        with self._lock:
            self.active_requests[request_id] = metrics
            
        return metrics
        
    def end_request(self, request_id: str, status_code: int, response_size: int, 
                   cache_hit: bool = False, error_message: Optional[str] = None):
        """Complete request tracking"""
        current_time = time.time()
        memory_info = psutil.Process().memory_info()
        
        with self._lock:
            if request_id in self.active_requests:
                metrics = self.active_requests[request_id]
                metrics.end_time = current_time
                metrics.duration_ms = (current_time - metrics.start_time) * 1000
                metrics.memory_after_mb = memory_info.rss / 1024 / 1024
                metrics.memory_peak_mb = max(metrics.memory_peak_mb, metrics.memory_after_mb)
                metrics.status_code = status_code
                metrics.response_size_bytes = response_size
                metrics.cache_hit = cache_hit
                metrics.error_message = error_message
                
                # Update cache stats
                if cache_hit:
                    self.cache_stats["hits"] += 1
                else:
                    self.cache_stats["misses"] += 1
                    
                # Store completed metric
                self.metrics_history.append(metrics)
                
                # Update service metrics
                self._update_service_metrics(metrics)
                
                # Remove from active requests
                del self.active_requests[request_id]
                
                # Check performance thresholds
                self._check_performance_thresholds(metrics)
                
    def update_request_timing(self, request_id: str, **timing_updates):
        """Update specific timing components for a request"""
        with self._lock:
            if request_id in self.active_requests:
                metrics = self.active_requests[request_id]
                for key, value in timing_updates.items():
                    if hasattr(metrics, key):
                        setattr(metrics, key, value)
                        
    def record_model_warmup(self, model_name: str, warmup_time_ms: float):
        """Record model warmup time"""
        self.model_warmup_times[model_name] = warmup_time_ms
        logger.info(f"Model {model_name} warmup completed in {warmup_time_ms:.2f}ms")
        
    def _update_service_metrics(self, request_metrics: RequestMetrics):
        """Update aggregated service metrics"""
        service_name = request_metrics.endpoint
        
        if service_name not in self.service_metrics:
            self.service_metrics[service_name] = ServiceMetrics(
                service_name=service_name,
                total_requests=0,
                avg_response_time_ms=0,
                p50_response_time_ms=0,
                p95_response_time_ms=0,
                p99_response_time_ms=0,
                success_rate=0,
                cache_hit_rate=0,
                cold_start_rate=0,
                avg_memory_usage_mb=0,
                peak_memory_usage_mb=0,
                avg_cpu_percent=0,
                requests_per_second=0,
                error_count=0,
                last_reset=datetime.now()
            )
            
        service_metrics = self.service_metrics[service_name]
        service_metrics.total_requests += 1
        
        # Get recent metrics for this service
        recent_metrics = [m for m in self.metrics_history 
                         if m.endpoint == service_name and m.end_time > 0][-100:]
        
        if recent_metrics:
            response_times = [m.duration_ms for m in recent_metrics]
            service_metrics.avg_response_time_ms = sum(response_times) / len(response_times)
            service_metrics.p50_response_time_ms = sorted(response_times)[len(response_times)//2]
            service_metrics.p95_response_time_ms = sorted(response_times)[int(len(response_times)*0.95)]
            service_metrics.p99_response_time_ms = sorted(response_times)[int(len(response_times)*0.99)]
            
            successful_requests = [m for m in recent_metrics if 200 <= m.status_code < 300]
            service_metrics.success_rate = len(successful_requests) / len(recent_metrics)
            
            cache_hits = [m for m in recent_metrics if m.cache_hit]
            service_metrics.cache_hit_rate = len(cache_hits) / len(recent_metrics)
            
            cold_starts = [m for m in recent_metrics if m.cold_start]
            service_metrics.cold_start_rate = len(cold_starts) / len(recent_metrics)
            
            memory_usage = [m.memory_after_mb for m in recent_metrics]
            service_metrics.avg_memory_usage_mb = sum(memory_usage) / len(memory_usage)
            service_metrics.peak_memory_usage_mb = max(memory_usage)
            
            cpu_usage = [m.cpu_percent for m in recent_metrics]
            service_metrics.avg_cpu_percent = sum(cpu_usage) / len(cpu_usage)
            
            # Calculate RPS for last minute
            one_minute_ago = time.time() - 60
            recent_requests = [m for m in recent_metrics if m.start_time > one_minute_ago]
            service_metrics.requests_per_second = len(recent_requests) / 60
            
            error_requests = [m for m in recent_metrics if m.status_code >= 400 or m.error_message]
            service_metrics.error_count = len(error_requests)
            
    def _check_performance_thresholds(self, metrics: RequestMetrics):
        """Check if performance metrics exceed thresholds"""
        if metrics.duration_ms > self.performance_thresholds["response_time_ms_critical"]:
            logger.error(f"CRITICAL: Response time {metrics.duration_ms:.2f}ms exceeds threshold for {metrics.endpoint}")
        elif metrics.duration_ms > self.performance_thresholds["response_time_ms_warn"]:
            logger.warning(f"WARNING: Response time {metrics.duration_ms:.2f}ms approaching threshold for {metrics.endpoint}")
            
        if metrics.memory_after_mb > self.performance_thresholds["memory_mb_critical"]:
            logger.error(f"CRITICAL: Memory usage {metrics.memory_after_mb:.2f}MB exceeds threshold")
        elif metrics.memory_after_mb > self.performance_thresholds["memory_mb_warn"]:
            logger.warning(f"WARNING: Memory usage {metrics.memory_after_mb:.2f}MB approaching threshold")
            
    def get_performance_summary(self) -> Dict[str, Any]:
        """Get comprehensive performance summary"""
        uptime_seconds = time.time() - self.startup_time
        
        summary = {
            "uptime_seconds": uptime_seconds,
            "total_requests": len(self.metrics_history),
            "active_requests": len(self.active_requests),
            "cache_stats": self.cache_stats.copy(),
            "cache_hit_rate": (self.cache_stats["hits"] / 
                             (self.cache_stats["hits"] + self.cache_stats["misses"]) 
                             if (self.cache_stats["hits"] + self.cache_stats["misses"]) > 0 else 0),
            "model_warmup_times": self.model_warmup_times.copy(),
            "service_metrics": {name: asdict(metrics) for name, metrics in self.service_metrics.items()},
            "system_info": {
                "cpu_count": psutil.cpu_count(),
                "memory_total_mb": psutil.virtual_memory().total / 1024 / 1024,
                "memory_available_mb": psutil.virtual_memory().available / 1024 / 1024,
                "memory_percent": psutil.virtual_memory().percent,
                "cpu_percent": psutil.cpu_percent()
            }
        }
        
        if self.metrics_history:
            recent_metrics = list(self.metrics_history)[-1000:]  # Last 1000 requests
            response_times = [m.duration_ms for m in recent_metrics if m.duration_ms > 0]
            
            if response_times:
                summary["overall_performance"] = {
                    "avg_response_time_ms": sum(response_times) / len(response_times),
                    "p50_response_time_ms": sorted(response_times)[len(response_times)//2],
                    "p95_response_time_ms": sorted(response_times)[int(len(response_times)*0.95)],
                    "p99_response_time_ms": sorted(response_times)[int(len(response_times)*0.99)],
                    "min_response_time_ms": min(response_times),
                    "max_response_time_ms": max(response_times)
                }
                
        return summary
        
    def get_flame_graph_data(self) -> Dict[str, Any]:
        """Generate flame graph data for performance analysis"""
        flame_data = {
            "nodes": [],
            "links": [],
            "timing_breakdown": {}
        }
        
        if not self.metrics_history:
            return flame_data
            
        # Analyze timing breakdown across recent requests
        recent_metrics = list(self.metrics_history)[-500:]  # Last 500 requests
        
        for endpoint in set(m.endpoint for m in recent_metrics):
            endpoint_metrics = [m for m in recent_metrics if m.endpoint == endpoint]
            
            if endpoint_metrics:
                avg_timings = {
                    "model_load": sum(m.model_load_time_ms for m in endpoint_metrics) / len(endpoint_metrics),
                    "preprocessing": sum(m.preprocessing_time_ms for m in endpoint_metrics) / len(endpoint_metrics),
                    "inference": sum(m.inference_time_ms for m in endpoint_metrics) / len(endpoint_metrics),
                    "postprocessing": sum(m.postprocessing_time_ms for m in endpoint_metrics) / len(endpoint_metrics),
                    "serialization": sum(m.serialization_time_ms for m in endpoint_metrics) / len(endpoint_metrics)
                }
                
                flame_data["timing_breakdown"][endpoint] = avg_timings
                
        return flame_data
        
    def export_metrics_csv(self) -> str:
        """Export metrics to CSV format"""
        if not self.metrics_history:
            return "No metrics available"
            
        lines = ["request_id,endpoint,duration_ms,memory_mb,cpu_percent,cache_hit,cold_start,status_code"]
        
        for metrics in self.metrics_history:
            lines.append(f"{metrics.request_id},{metrics.endpoint},{metrics.duration_ms:.2f},"
                        f"{metrics.memory_after_mb:.2f},{metrics.cpu_percent:.2f},"
                        f"{metrics.cache_hit},{metrics.cold_start},{metrics.status_code}")
                        
        return "\n".join(lines)

# Global performance profiler instance
_profiler = PerformanceProfiler()

def get_profiler() -> PerformanceProfiler:
    """Get the global performance profiler instance"""
    return _profiler

@asynccontextmanager
async def profile_request(endpoint: str, method: str = "POST", cold_start: bool = False):
    """Context manager for profiling requests"""
    request_id = str(uuid.uuid4())
    profiler = get_profiler()
    
    metrics = profiler.start_request(request_id, endpoint, method, cold_start)
    
    try:
        yield metrics
        profiler.end_request(request_id, 200, 0)  # Default success
    except Exception as e:
        profiler.end_request(request_id, 500, 0, error_message=str(e))
        raise

def profile_function(endpoint_name: str = None, track_memory: bool = True):
    """Decorator for profiling individual functions"""
    def decorator(func):
        @functools.wraps(func)
        async def async_wrapper(*args, **kwargs):
            endpoint = endpoint_name or f"{func.__module__}.{func.__name__}"
            
            async with profile_request(endpoint, "FUNCTION") as metrics:
                start_time = time.time()
                memory_before = psutil.Process().memory_info().rss / 1024 / 1024 if track_memory else 0
                
                try:
                    result = await func(*args, **kwargs)
                    
                    end_time = time.time()
                    execution_time = (end_time - start_time) * 1000
                    
                    profiler = get_profiler()
                    profiler.update_request_timing(
                        metrics.request_id,
                        inference_time_ms=execution_time
                    )
                    
                    return result
                    
                except Exception as e:
                    profiler = get_profiler() 
                    profiler.end_request(metrics.request_id, 500, 0, error_message=str(e))
                    raise
                    
        @functools.wraps(func)
        def sync_wrapper(*args, **kwargs):
            endpoint = endpoint_name or f"{func.__module__}.{func.__name__}"
            request_id = str(uuid.uuid4())
            profiler = get_profiler()
            
            metrics = profiler.start_request(request_id, endpoint, "FUNCTION")
            start_time = time.time()
            
            try:
                result = func(*args, **kwargs)
                
                end_time = time.time()
                execution_time = (end_time - start_time) * 1000
                
                profiler.update_request_timing(
                    request_id,
                    inference_time_ms=execution_time
                )
                profiler.end_request(request_id, 200, 0)
                
                return result
                
            except Exception as e:
                profiler.end_request(request_id, 500, 0, error_message=str(e))
                raise
                
        return async_wrapper if asyncio.iscoroutinefunction(func) else sync_wrapper
    return decorator

class ModelCache:
    """High-performance caching system for models and embeddings"""
    
    def __init__(self, max_size_mb: int = 512):
        self.cache: Dict[str, Any] = {}
        self.access_times: Dict[str, float] = {}
        self.cache_sizes: Dict[str, float] = {}
        self.max_size_mb = max_size_mb
        self.current_size_mb = 0
        self._lock = threading.RLock()
        
    def get(self, key: str) -> Optional[Any]:
        """Get item from cache"""
        with self._lock:
            if key in self.cache:
                self.access_times[key] = time.time()
                profiler = get_profiler()
                profiler.cache_stats["hits"] += 1
                return self.cache[key]
            else:
                profiler = get_profiler() 
                profiler.cache_stats["misses"] += 1
                return None
                
    def put(self, key: str, value: Any, size_mb: float = 0.1):
        """Put item in cache with LRU eviction"""
        with self._lock:
            # Remove existing key if present
            if key in self.cache:
                self.current_size_mb -= self.cache_sizes[key]
                del self.cache[key]
                del self.cache_sizes[key]
                del self.access_times[key]
                
            # Evict items if necessary
            while self.current_size_mb + size_mb > self.max_size_mb and self.cache:
                lru_key = min(self.access_times.keys(), key=lambda k: self.access_times[k])
                self.current_size_mb -= self.cache_sizes[lru_key]
                del self.cache[lru_key]
                del self.cache_sizes[lru_key]
                del self.access_times[lru_key]
                
            # Add new item
            self.cache[key] = value
            self.cache_sizes[key] = size_mb
            self.access_times[key] = time.time()
            self.current_size_mb += size_mb
            
            profiler = get_profiler()
            profiler.cache_stats["size"] = len(self.cache)
            
    def clear(self):
        """Clear all cached items"""
        with self._lock:
            self.cache.clear()
            self.access_times.clear()
            self.cache_sizes.clear()
            self.current_size_mb = 0
            
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        with self._lock:
            return {
                "items": len(self.cache),
                "size_mb": self.current_size_mb,
                "max_size_mb": self.max_size_mb,
                "utilization": self.current_size_mb / self.max_size_mb if self.max_size_mb > 0 else 0
            }

# Global cache instances
_model_cache = ModelCache(max_size_mb=512)
_embedding_cache = ModelCache(max_size_mb=256)

def get_model_cache() -> ModelCache:
    """Get the global model cache"""
    return _model_cache

def get_embedding_cache() -> ModelCache:
    """Get the global embedding cache"""
    return _embedding_cache

class AsyncWorkerPool:
    """Asynchronous worker pool for background tasks"""
    
    def __init__(self, max_workers: int = 4):
        self.max_workers = max_workers
        self.queue: asyncio.Queue = asyncio.Queue()
        self.workers: List[asyncio.Task] = []
        self.running = False
        
    async def start(self):
        """Start the worker pool"""
        self.running = True
        for i in range(self.max_workers):
            worker = asyncio.create_task(self._worker(f"worker-{i}"))
            self.workers.append(worker)
        logger.info(f"Started async worker pool with {self.max_workers} workers")
        
    async def stop(self):
        """Stop the worker pool"""
        self.running = False
        
        # Cancel all workers
        for worker in self.workers:
            worker.cancel()
            
        # Wait for workers to finish
        await asyncio.gather(*self.workers, return_exceptions=True)
        self.workers.clear()
        
    async def submit(self, coro):
        """Submit a coroutine for background execution"""
        if self.running:
            await self.queue.put(coro)
        else:
            logger.warning("Worker pool not running, skipping task submission")
            
    async def _worker(self, worker_name: str):
        """Worker loop"""
        logger.info(f"Worker {worker_name} started")
        
        while self.running:
            try:
                # Wait for task with timeout
                coro = await asyncio.wait_for(self.queue.get(), timeout=1.0)
                
                # Execute the coroutine
                start_time = time.time()
                await coro
                execution_time = (time.time() - start_time) * 1000
                
                logger.debug(f"Worker {worker_name} completed task in {execution_time:.2f}ms")
                
            except asyncio.TimeoutError:
                # Normal timeout, continue loop
                continue
            except asyncio.CancelledError:
                logger.info(f"Worker {worker_name} cancelled")
                break
            except Exception as e:
                logger.error(f"Worker {worker_name} error: {e}")
                
        logger.info(f"Worker {worker_name} stopped")

# Global worker pool
_worker_pool = AsyncWorkerPool(max_workers=4)

def get_worker_pool() -> AsyncWorkerPool:
    """Get the global worker pool"""
    return _worker_pool