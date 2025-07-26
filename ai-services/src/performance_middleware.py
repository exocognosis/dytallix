"""
FastAPI Performance Middleware

High-performance middleware for monitoring AI service response times,
memory usage, and implementing optimization strategies.
"""

import time
import json
import uuid
import gzip
import asyncio
from typing import Callable, Dict, Any, Optional
from fastapi import Request, Response
from fastapi.middleware.base import BaseHTTPMiddleware
from fastapi.responses import JSONResponse
import logging
import psutil

from performance_monitor import get_profiler, get_model_cache, get_embedding_cache

logger = logging.getLogger(__name__)

class PerformanceMonitoringMiddleware(BaseHTTPMiddleware):
    """FastAPI middleware for comprehensive performance monitoring"""
    
    def __init__(self, app, enable_compression: bool = True, enable_caching: bool = True):
        super().__init__(app)
        self.enable_compression = enable_compression
        self.enable_caching = enable_caching
        self.profiler = get_profiler()
        self.model_cache = get_model_cache()
        self.embedding_cache = get_embedding_cache()
        
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request with performance monitoring"""
        
        # Generate request ID
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        
        # Start performance tracking
        start_time = time.time()
        endpoint = str(request.url.path)
        method = request.method
        
        # Check if this is a cold start (first request after startup)
        cold_start = len(self.profiler.metrics_history) == 0
        
        # Start profiling
        metrics = self.profiler.start_request(request_id, endpoint, method, cold_start)
        
        # Add timing headers
        request.state.start_time = start_time
        request.state.metrics = metrics
        
        # Check cache for GET requests
        cache_hit = False
        cached_response = None
        
        if self.enable_caching and method == "GET" and endpoint not in ["/health", "/metrics", "/models/status"]:
            cache_key = self._generate_cache_key(request)
            cached_response = self.model_cache.get(cache_key)
            if cached_response:
                cache_hit = True
                
        # Process request
        if cache_hit and cached_response:
            # Return cached response
            response = JSONResponse(
                content=cached_response["content"],
                status_code=cached_response["status_code"],
                headers=cached_response.get("headers", {})
            )
            response_size = len(json.dumps(cached_response["content"]).encode())
            
        else:
            # Process request normally
            try:
                # Track preprocessing time
                preprocessing_start = time.time()
                
                # Call the actual endpoint
                response = await call_next(request)
                
                # Calculate timing
                preprocessing_time = (time.time() - preprocessing_start) * 1000
                
                # Update timing in metrics
                self.profiler.update_request_timing(
                    request_id,
                    preprocessing_time_ms=preprocessing_time
                )
                
                # Get response size
                response_size = 0
                if hasattr(response, 'body'):
                    response_size = len(response.body) if response.body else 0
                
                # Cache successful GET responses
                if (self.enable_caching and method == "GET" and 
                    response.status_code == 200 and 
                    endpoint not in ["/health", "/metrics", "/models/status"]):
                    
                    try:
                        if hasattr(response, 'body') and response.body:
                            response_data = json.loads(response.body.decode())
                            cache_key = self._generate_cache_key(request)
                            
                            cached_item = {
                                "content": response_data,
                                "status_code": response.status_code,
                                "headers": dict(response.headers),
                                "timestamp": time.time()
                            }
                            
                            # Estimate cache size (rough approximation)
                            cache_size_mb = len(json.dumps(cached_item).encode()) / 1024 / 1024
                            self.model_cache.put(cache_key, cached_item, cache_size_mb)
                            
                    except Exception as e:
                        logger.warning(f"Failed to cache response: {e}")
                        
            except Exception as e:
                logger.error(f"Request processing error: {e}")
                response = JSONResponse(
                    content={"error": "Internal server error", "request_id": request_id},
                    status_code=500
                )
                response_size = len(json.dumps({"error": "Internal server error"}).encode())
                
        # Add performance headers
        processing_time = (time.time() - start_time) * 1000
        
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Processing-Time"] = f"{processing_time:.2f}ms"
        response.headers["X-Cache-Hit"] = str(cache_hit)
        response.headers["X-Cold-Start"] = str(cold_start)
        
        # Add memory usage header
        memory_mb = psutil.Process().memory_info().rss / 1024 / 1024
        response.headers["X-Memory-Usage"] = f"{memory_mb:.2f}MB"
        
        # Compress response if enabled and beneficial
        if (self.enable_compression and 
            response_size > 1024 and  # Only compress if > 1KB
            "gzip" in request.headers.get("accept-encoding", "")):
            
            try:
                compression_start = time.time()
                
                if hasattr(response, 'body') and response.body:
                    compressed_body = gzip.compress(response.body)
                    if len(compressed_body) < len(response.body):
                        response.body = compressed_body
                        response.headers["Content-Encoding"] = "gzip"
                        response.headers["Content-Length"] = str(len(compressed_body))
                        response_size = len(compressed_body)
                        
                        compression_time = (time.time() - compression_start) * 1000
                        response.headers["X-Compression-Time"] = f"{compression_time:.2f}ms"
                        response.headers["X-Compression-Ratio"] = f"{len(response.body)/len(compressed_body):.2f}"
                        
            except Exception as e:
                logger.warning(f"Response compression failed: {e}")
        
        # Complete performance tracking
        self.profiler.end_request(
            request_id=request_id,
            status_code=response.status_code,
            response_size=response_size,
            cache_hit=cache_hit,
            error_message=None if response.status_code < 400 else "Request failed"
        )
        
        return response
        
    def _generate_cache_key(self, request: Request) -> str:
        """Generate cache key for request"""
        # Simple cache key based on URL and query parameters
        url_str = str(request.url)
        return f"response_cache:{hash(url_str)}"

class RequestTimingMiddleware(BaseHTTPMiddleware):
    """Lightweight timing middleware for critical performance monitoring"""
    
    def __init__(self, app):
        super().__init__(app)
        self.profiler = get_profiler()
        
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Track request timing with minimal overhead"""
        
        start_time = time.perf_counter()
        endpoint = str(request.url.path)
        
        # Process request
        response = await call_next(request)
        
        # Calculate timing
        processing_time = (time.perf_counter() - start_time) * 1000
        
        # Add timing header
        response.headers["X-Response-Time"] = f"{processing_time:.2f}ms"
        
        # Log slow requests
        if processing_time > 100:  # Log requests > 100ms
            logger.warning(f"Slow request detected: {endpoint} took {processing_time:.2f}ms")
        elif processing_time > 500:  # Critical threshold
            logger.error(f"CRITICAL: Very slow request: {endpoint} took {processing_time:.2f}ms")
            
        return response

class ModelWarmupService:
    """Service for warming up AI models at startup"""
    
    def __init__(self):
        self.warmed_models = set()
        self.warmup_times = {}
        self.profiler = get_profiler()
        
    async def warmup_model(self, model_name: str, warmup_func: Callable):
        """Warmup a specific model"""
        if model_name in self.warmed_models:
            return
            
        logger.info(f"Starting warmup for model: {model_name}")
        start_time = time.time()
        
        try:
            await warmup_func()
            warmup_time = (time.time() - start_time) * 1000
            
            self.warmed_models.add(model_name)
            self.warmup_times[model_name] = warmup_time
            self.profiler.record_model_warmup(model_name, warmup_time)
            
            logger.info(f"Model {model_name} warmed up in {warmup_time:.2f}ms")
            
        except Exception as e:
            logger.error(f"Failed to warmup model {model_name}: {e}")
            raise
            
    async def warmup_all_models(self, model_warmup_funcs: Dict[str, Callable]):
        """Warmup all models concurrently"""
        logger.info("Starting model warmup process...")
        
        warmup_tasks = []
        for model_name, warmup_func in model_warmup_funcs.items():
            task = asyncio.create_task(self.warmup_model(model_name, warmup_func))
            warmup_tasks.append(task)
            
        # Execute warmups concurrently
        await asyncio.gather(*warmup_tasks, return_exceptions=True)
        
        total_warmup_time = sum(self.warmup_times.values())
        logger.info(f"Model warmup completed. Total time: {total_warmup_time:.2f}ms")
        logger.info(f"Warmed models: {list(self.warmed_models)}")
        
    def is_model_warmed(self, model_name: str) -> bool:
        """Check if a model has been warmed up"""
        return model_name in self.warmed_models
        
    def get_warmup_stats(self) -> Dict[str, Any]:
        """Get warmup statistics"""
        return {
            "warmed_models": list(self.warmed_models),
            "warmup_times_ms": self.warmup_times.copy(),
            "total_warmup_time_ms": sum(self.warmup_times.values()),
            "average_warmup_time_ms": (sum(self.warmup_times.values()) / len(self.warmup_times) 
                                     if self.warmup_times else 0)
        }

class ResponseOptimizer:
    """Optimize response serialization and compression"""
    
    def __init__(self):
        self.compression_stats = {
            "total_responses": 0,
            "compressed_responses": 0,
            "total_size_before": 0,
            "total_size_after": 0
        }
        
    def optimize_response(self, data: Any, compress: bool = True) -> Dict[str, Any]:
        """Optimize response data for fast serialization"""
        
        # Convert to JSON-serializable format
        if hasattr(data, 'dict'):
            # Pydantic model
            optimized_data = data.dict()
        elif hasattr(data, '__dict__'):
            # Regular object
            optimized_data = data.__dict__
        else:
            optimized_data = data
            
        # Remove None values to reduce size
        if isinstance(optimized_data, dict):
            optimized_data = {k: v for k, v in optimized_data.items() if v is not None}
            
        # Round floating point numbers to reduce precision
        optimized_data = self._round_floats(optimized_data, precision=4)
        
        return optimized_data
        
    def _round_floats(self, obj: Any, precision: int = 4) -> Any:
        """Round floating point numbers to reduce size"""
        if isinstance(obj, float):
            return round(obj, precision)
        elif isinstance(obj, dict):
            return {k: self._round_floats(v, precision) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [self._round_floats(item, precision) for item in obj]
        else:
            return obj
            
    def get_compression_stats(self) -> Dict[str, Any]:
        """Get compression statistics"""
        stats = self.compression_stats.copy()
        if stats["total_responses"] > 0:
            stats["compression_ratio"] = (stats["total_size_after"] / stats["total_size_before"] 
                                        if stats["total_size_before"] > 0 else 1.0)
            stats["compression_rate"] = (stats["compressed_responses"] / stats["total_responses"])
        else:
            stats["compression_ratio"] = 1.0
            stats["compression_rate"] = 0.0
            
        return stats

# Global instances
_model_warmup_service = ModelWarmupService()
_response_optimizer = ResponseOptimizer()

def get_model_warmup_service() -> ModelWarmupService:
    """Get the global model warmup service"""
    return _model_warmup_service

def get_response_optimizer() -> ResponseOptimizer:
    """Get the global response optimizer"""
    return _response_optimizer