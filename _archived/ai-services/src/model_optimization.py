"""
Model Optimization Utilities

Provides model loading optimization, caching strategies, and performance
enhancements for AI models to achieve sub-100ms inference times.
"""

import asyncio
import time
import logging
import os
import pickle
import hashlib
import threading
from typing import Dict, List, Optional, Any, Callable, Union
from concurrent.futures import ThreadPoolExecutor
import weakref
from functools import lru_cache, wraps
from dataclasses import dataclass

from performance_monitor import get_profiler, get_model_cache, profile_function

logger = logging.getLogger(__name__)

@dataclass
class ModelInfo:
    """Information about a loaded model"""
    name: str
    version: str
    size_mb: float
    load_time_ms: float
    last_used: float
    use_count: int
    model_type: str

class OptimizedModelLoader:
    """High-performance model loader with caching and preloading"""
    
    def __init__(self, cache_dir: str = "/tmp/dytallix_model_cache"):
        self.cache_dir = cache_dir
        self.loaded_models: Dict[str, Any] = {}
        self.model_info: Dict[str, ModelInfo] = {}
        self.loading_locks: Dict[str, threading.Lock] = {}
        self.preload_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="model_preload")
        self._ensure_cache_dir()
        
    def _ensure_cache_dir(self):
        """Ensure cache directory exists"""
        if not os.path.exists(self.cache_dir):
            os.makedirs(self.cache_dir, exist_ok=True)
            
    def _get_model_key(self, model_name: str, model_version: str = "latest") -> str:
        """Generate unique key for model"""
        return f"{model_name}:{model_version}"
        
    def _get_cache_path(self, model_key: str) -> str:
        """Get cache file path for model"""
        cache_filename = hashlib.md5(model_key.encode()).hexdigest() + ".pkl"
        return os.path.join(self.cache_dir, cache_filename)
        
    async def load_model_async(self, model_name: str, loader_func: Callable, 
                              model_version: str = "latest", force_reload: bool = False) -> Any:
        """Asynchronously load model with caching"""
        model_key = self._get_model_key(model_name, model_version)
        
        # Check if model is already loaded
        if not force_reload and model_key in self.loaded_models:
            # Update usage stats
            if model_key in self.model_info:
                self.model_info[model_key].last_used = time.time()
                self.model_info[model_key].use_count += 1
            return self.loaded_models[model_key]
            
        # Ensure we have a lock for this model
        if model_key not in self.loading_locks:
            self.loading_locks[model_key] = threading.Lock()
            
        # Use lock to prevent concurrent loading of same model
        with self.loading_locks[model_key]:
            # Double-check after acquiring lock
            if not force_reload and model_key in self.loaded_models:
                if model_key in self.model_info:
                    self.model_info[model_key].last_used = time.time()
                    self.model_info[model_key].use_count += 1
                return self.loaded_models[model_key]
                
            logger.info(f"Loading model: {model_name} (version: {model_version})")
            start_time = time.time()
            
            # Try to load from cache first
            cache_path = self._get_cache_path(model_key)
            model = None
            
            if not force_reload and os.path.exists(cache_path):
                try:
                    logger.info(f"Loading model from cache: {cache_path}")
                    with open(cache_path, 'rb') as f:
                        model = pickle.load(f)
                    logger.info(f"Model loaded from cache in {(time.time() - start_time) * 1000:.2f}ms")
                except Exception as e:
                    logger.warning(f"Failed to load model from cache: {e}")
                    model = None
                    
            # Load model if not in cache
            if model is None:
                logger.info(f"Loading model using loader function...")
                
                # Run loader in thread pool to avoid blocking
                loop = asyncio.get_event_loop()
                model = await loop.run_in_executor(self.preload_executor, loader_func)
                
                # Cache the model
                try:
                    with open(cache_path, 'wb') as f:
                        pickle.dump(model, f)
                    logger.info(f"Model cached to: {cache_path}")
                except Exception as e:
                    logger.warning(f"Failed to cache model: {e}")
                    
            load_time = (time.time() - start_time) * 1000
            
            # Store model and info
            self.loaded_models[model_key] = model
            
            # Estimate model size
            try:
                model_size_mb = self._estimate_model_size(model)
            except:
                model_size_mb = 10.0  # Default estimate
                
            self.model_info[model_key] = ModelInfo(
                name=model_name,
                version=model_version,
                size_mb=model_size_mb,
                load_time_ms=load_time,
                last_used=time.time(),
                use_count=1,
                model_type=type(model).__name__
            )
            
            # Record in profiler
            profiler = get_profiler()
            profiler.record_model_warmup(model_name, load_time)
            
            logger.info(f"Model {model_name} loaded successfully in {load_time:.2f}ms")
            return model
            
    def _estimate_model_size(self, model: Any) -> float:
        """Estimate model size in MB"""
        try:
            if hasattr(model, 'get_memory_footprint'):
                # PyTorch models
                return model.get_memory_footprint() / 1024 / 1024
            elif hasattr(model, 'model_size'):
                # Custom models with size attribute
                return model.model_size
            else:
                # Rough estimate using pickle
                import sys
                return sys.getsizeof(pickle.dumps(model)) / 1024 / 1024
        except:
            return 10.0  # Default estimate
            
    def get_model(self, model_name: str, model_version: str = "latest") -> Optional[Any]:
        """Get loaded model (synchronous)"""
        model_key = self._get_model_key(model_name, model_version)
        
        if model_key in self.loaded_models:
            # Update usage stats
            if model_key in self.model_info:
                self.model_info[model_key].last_used = time.time()
                self.model_info[model_key].use_count += 1
            return self.loaded_models[model_key]
        return None
        
    def unload_model(self, model_name: str, model_version: str = "latest"):
        """Unload model from memory"""
        model_key = self._get_model_key(model_name, model_version)
        
        if model_key in self.loaded_models:
            del self.loaded_models[model_key]
            logger.info(f"Unloaded model: {model_name}")
            
        if model_key in self.model_info:
            del self.model_info[model_key]
            
    def get_loaded_models(self) -> Dict[str, ModelInfo]:
        """Get information about all loaded models"""
        return self.model_info.copy()
        
    def clear_cache(self):
        """Clear model cache directory"""
        import shutil
        if os.path.exists(self.cache_dir):
            shutil.rmtree(self.cache_dir)
            self._ensure_cache_dir()
            logger.info("Model cache cleared")
            
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        cache_files = []
        total_cache_size = 0
        
        if os.path.exists(self.cache_dir):
            for filename in os.listdir(self.cache_dir):
                filepath = os.path.join(self.cache_dir, filename)
                if os.path.isfile(filepath):
                    size = os.path.getsize(filepath)
                    cache_files.append({
                        "filename": filename,
                        "size_mb": size / 1024 / 1024,
                        "modified": os.path.getmtime(filepath)
                    })
                    total_cache_size += size
                    
        return {
            "cache_dir": self.cache_dir,
            "total_files": len(cache_files),
            "total_size_mb": total_cache_size / 1024 / 1024,
            "loaded_models": len(self.loaded_models),
            "cache_files": cache_files
        }

class InferenceOptimizer:
    """Optimize model inference for maximum performance"""
    
    def __init__(self):
        self.batch_processors: Dict[str, 'BatchProcessor'] = {}
        self.inference_cache = get_model_cache()
        
    @profile_function("inference_optimization")
    async def optimized_inference(self, model: Any, inputs: Any, model_name: str = "unknown",
                                 use_cache: bool = True, use_batching: bool = False) -> Any:
        """Run optimized inference with caching and batching"""
        
        # Generate cache key
        cache_key = None
        if use_cache:
            cache_key = self._generate_inference_cache_key(inputs, model_name)
            cached_result = self.inference_cache.get(cache_key)
            if cached_result is not None:
                return cached_result
                
        # Run inference
        start_time = time.time()
        
        if use_batching and model_name in self.batch_processors:
            # Use batch processor
            result = await self.batch_processors[model_name].process(model, inputs)
        else:
            # Direct inference
            if asyncio.iscoroutinefunction(getattr(model, 'predict', None)):
                result = await model.predict(inputs)
            elif asyncio.iscoroutinefunction(getattr(model, '__call__', None)):
                result = await model(inputs)
            elif hasattr(model, 'predict'):
                result = model.predict(inputs)
            elif callable(model):
                result = model(inputs)
            else:
                raise ValueError(f"Model {model_name} is not callable or doesn't have predict method")
                
        inference_time = (time.time() - start_time) * 1000
        
        # Cache successful results
        if use_cache and cache_key and result is not None:
            try:
                # Estimate result size
                result_size_mb = len(str(result).encode()) / 1024 / 1024
                self.inference_cache.put(cache_key, result, result_size_mb)
            except Exception as e:
                logger.warning(f"Failed to cache inference result: {e}")
                
        logger.debug(f"Inference for {model_name} completed in {inference_time:.2f}ms")
        return result
        
    def _generate_inference_cache_key(self, inputs: Any, model_name: str) -> str:
        """Generate cache key for inference inputs"""
        try:
            # Create hash of inputs
            input_str = str(inputs) if not isinstance(inputs, str) else inputs
            input_hash = hashlib.md5(input_str.encode()).hexdigest()
            return f"inference:{model_name}:{input_hash}"
        except Exception as e:
            # Fallback to timestamp-based key (no caching)
            logger.warning(f"Failed to generate cache key: {e}")
            return f"inference:{model_name}:{time.time()}"
            
    def create_batch_processor(self, model_name: str, batch_size: int = 8, 
                             max_wait_ms: float = 50) -> 'BatchProcessor':
        """Create batch processor for a model"""
        processor = BatchProcessor(batch_size=batch_size, max_wait_ms=max_wait_ms)
        self.batch_processors[model_name] = processor
        return processor
        
    def get_inference_stats(self) -> Dict[str, Any]:
        """Get inference statistics"""
        return {
            "cache_stats": self.inference_cache.get_stats(),
            "batch_processors": {
                name: processor.get_stats() 
                for name, processor in self.batch_processors.items()
            }
        }

class BatchProcessor:
    """Batch processing for improved throughput"""
    
    def __init__(self, batch_size: int = 8, max_wait_ms: float = 50):
        self.batch_size = batch_size
        self.max_wait_ms = max_wait_ms
        self.pending_requests: List[Dict[str, Any]] = []
        self.processing_lock = asyncio.Lock()
        self.stats = {
            "total_requests": 0,
            "batched_requests": 0,
            "batch_count": 0,
            "avg_batch_size": 0,
            "avg_wait_time_ms": 0
        }
        
    async def process(self, model: Any, inputs: Any) -> Any:
        """Process input with batching"""
        request_id = id(inputs)
        request_info = {
            "id": request_id,
            "inputs": inputs,
            "result": None,
            "completed": asyncio.Event(),
            "timestamp": time.time()
        }
        
        async with self.processing_lock:
            self.pending_requests.append(request_info)
            self.stats["total_requests"] += 1
            
            # Process batch if full or timeout
            should_process = (
                len(self.pending_requests) >= self.batch_size or
                (self.pending_requests and 
                 (time.time() - self.pending_requests[0]["timestamp"]) * 1000 >= self.max_wait_ms)
            )
            
            if should_process:
                await self._process_batch(model)
                
        # Wait for this request to complete
        await request_info["completed"].wait()
        return request_info["result"]
        
    async def _process_batch(self, model: Any):
        """Process a batch of requests"""
        if not self.pending_requests:
            return
            
        batch = self.pending_requests.copy()
        self.pending_requests.clear()
        
        start_time = time.time()
        
        try:
            # Prepare batch inputs
            batch_inputs = [req["inputs"] for req in batch]
            
            # Run batch inference
            if hasattr(model, 'predict_batch'):
                batch_results = await model.predict_batch(batch_inputs)
            elif hasattr(model, 'predict'):
                # Fallback to individual predictions
                batch_results = []
                for inputs in batch_inputs:
                    result = await model.predict(inputs) if asyncio.iscoroutinefunction(model.predict) else model.predict(inputs)
                    batch_results.append(result)
            else:
                raise ValueError("Model doesn't support batch processing")
                
            # Assign results to requests
            for req, result in zip(batch, batch_results):
                req["result"] = result
                req["completed"].set()
                
            # Update stats
            batch_size = len(batch)
            processing_time = (time.time() - start_time) * 1000
            wait_time = (start_time - batch[0]["timestamp"]) * 1000
            
            self.stats["batched_requests"] += batch_size
            self.stats["batch_count"] += 1
            self.stats["avg_batch_size"] = self.stats["batched_requests"] / self.stats["batch_count"]
            self.stats["avg_wait_time_ms"] = ((self.stats["avg_wait_time_ms"] * (self.stats["batch_count"] - 1) + wait_time) / 
                                            self.stats["batch_count"])
            
            logger.debug(f"Processed batch of {batch_size} requests in {processing_time:.2f}ms")
            
        except Exception as e:
            logger.error(f"Batch processing failed: {e}")
            # Mark all requests as failed
            for req in batch:
                req["result"] = None
                req["completed"].set()
                
    def get_stats(self) -> Dict[str, Any]:
        """Get batch processing statistics"""
        return self.stats.copy()

class EmbeddingCache:
    """Specialized cache for embeddings and feature vectors"""
    
    def __init__(self, max_size_mb: int = 256):
        self.cache: Dict[str, Any] = {}
        self.access_times: Dict[str, float] = {}
        self.max_size_mb = max_size_mb
        self.current_size_mb = 0
        self._lock = threading.RLock()
        
    def get_embedding(self, text: str, model_name: str = "default") -> Optional[Any]:
        """Get cached embedding"""
        cache_key = self._generate_embedding_key(text, model_name)
        
        with self._lock:
            if cache_key in self.cache:
                self.access_times[cache_key] = time.time()
                return self.cache[cache_key]
            return None
            
    def store_embedding(self, text: str, embedding: Any, model_name: str = "default"):
        """Store embedding in cache"""
        cache_key = self._generate_embedding_key(text, model_name)
        
        with self._lock:
            # Estimate embedding size
            try:
                import sys
                embedding_size_mb = sys.getsizeof(embedding) / 1024 / 1024
            except:
                embedding_size_mb = 0.1  # Default estimate
                
            # Evict if necessary
            while self.current_size_mb + embedding_size_mb > self.max_size_mb and self.cache:
                lru_key = min(self.access_times.keys(), key=lambda k: self.access_times[k])
                del self.cache[lru_key]
                del self.access_times[lru_key]
                self.current_size_mb -= embedding_size_mb  # Rough estimate
                
            # Store new embedding
            self.cache[cache_key] = embedding
            self.access_times[cache_key] = time.time()
            self.current_size_mb += embedding_size_mb
            
    def _generate_embedding_key(self, text: str, model_name: str) -> str:
        """Generate cache key for embedding"""
        text_hash = hashlib.md5(text.encode()).hexdigest()
        return f"embedding:{model_name}:{text_hash}"
        
    def get_stats(self) -> Dict[str, Any]:
        """Get embedding cache statistics"""
        with self._lock:
            return {
                "cached_embeddings": len(self.cache),
                "size_mb": self.current_size_mb,
                "max_size_mb": self.max_size_mb,
                "utilization": self.current_size_mb / self.max_size_mb if self.max_size_mb > 0 else 0
            }

# Decorators for model optimization
def cache_result(cache_key_func: Optional[Callable] = None, ttl_seconds: int = 3600):
    """Decorator to cache function results"""
    def decorator(func):
        cache = {}
        cache_times = {}
        
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            # Generate cache key
            if cache_key_func:
                cache_key = cache_key_func(*args, **kwargs)
            else:
                cache_key = str(hash((str(args), str(sorted(kwargs.items())))))
                
            # Check cache
            current_time = time.time()
            if cache_key in cache:
                cache_time = cache_times.get(cache_key, 0)
                if current_time - cache_time < ttl_seconds:
                    return cache[cache_key]
                else:
                    # Remove expired entry
                    del cache[cache_key]
                    del cache_times[cache_key]
                    
            # Execute function
            result = await func(*args, **kwargs)
            
            # Cache result
            cache[cache_key] = result
            cache_times[cache_key] = current_time
            
            return result
            
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            # Generate cache key
            if cache_key_func:
                cache_key = cache_key_func(*args, **kwargs)
            else:
                cache_key = str(hash((str(args), str(sorted(kwargs.items())))))
                
            # Check cache
            current_time = time.time()
            if cache_key in cache:
                cache_time = cache_times.get(cache_key, 0)
                if current_time - cache_time < ttl_seconds:
                    return cache[cache_key]
                else:
                    # Remove expired entry
                    del cache[cache_key]
                    del cache_times[cache_key]
                    
            # Execute function
            result = func(*args, **kwargs)
            
            # Cache result
            cache[cache_key] = result
            cache_times[cache_key] = current_time
            
            return result
            
        return async_wrapper if asyncio.iscoroutinefunction(func) else sync_wrapper
    return decorator

def preload_model(model_name: str, loader_func: Callable):
    """Decorator to ensure model is preloaded"""
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            # Ensure model is loaded
            loader = get_model_loader()
            model = await loader.load_model_async(model_name, loader_func)
            
            # Add model to kwargs if not present
            if 'model' not in kwargs:
                kwargs['model'] = model
                
            return await func(*args, **kwargs)
            
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            # For sync functions, we can't preload async, so just try to get cached model
            loader = get_model_loader()
            model = loader.get_model(model_name)
            
            if model and 'model' not in kwargs:
                kwargs['model'] = model
                
            return func(*args, **kwargs)
            
        return async_wrapper if asyncio.iscoroutinefunction(func) else sync_wrapper
    return decorator

# Global instances
_model_loader = OptimizedModelLoader()
_inference_optimizer = InferenceOptimizer()
_embedding_cache = EmbeddingCache()

def get_model_loader() -> OptimizedModelLoader:
    """Get the global model loader"""
    return _model_loader

def get_inference_optimizer() -> InferenceOptimizer:
    """Get the global inference optimizer"""
    return _inference_optimizer

def get_embedding_cache() -> EmbeddingCache:
    """Get the global embedding cache"""
    return _embedding_cache