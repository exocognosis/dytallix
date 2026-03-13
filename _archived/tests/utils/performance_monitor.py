#!/usr/bin/env python3
"""
Performance Monitoring and Metrics Collection for Dytallix API
Tracks response times, success rates, error patterns, and system health
"""

import time
import json
import psutil
import asyncio
import requests
import statistics
import threading
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from concurrent.futures import ThreadPoolExecutor, as_completed
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@dataclass
class RequestMetrics:
    endpoint: str
    method: str
    status_code: int
    response_time: float
    payload_size: int
    response_size: int
    timestamp: float
    error_message: Optional[str] = None

@dataclass
class SystemMetrics:
    timestamp: float
    cpu_percent: float
    memory_percent: float
    memory_available: int
    disk_usage_percent: float
    network_io_sent: int
    network_io_recv: int

class PerformanceMonitor:
    def __init__(self, base_url: str = "http://localhost:3030"):
        self.base_url = base_url
        self.request_metrics: List[RequestMetrics] = []
        self.system_metrics: List[SystemMetrics] = []
        self.monitoring_active = False
        self.system_monitor_thread = None
        
    def start_system_monitoring(self, interval: float = 1.0):
        """Start continuous system monitoring"""
        self.monitoring_active = True
        self.system_monitor_thread = threading.Thread(
            target=self._system_monitor_loop, 
            args=(interval,),
            daemon=True
        )
        self.system_monitor_thread.start()
        logger.info("System monitoring started")
    
    def stop_system_monitoring(self):
        """Stop system monitoring"""
        self.monitoring_active = False
        if self.system_monitor_thread:
            self.system_monitor_thread.join(timeout=2)
        logger.info("System monitoring stopped")
    
    def _system_monitor_loop(self, interval: float):
        """System monitoring loop"""
        while self.monitoring_active:
            try:
                # Collect system metrics
                cpu_percent = psutil.cpu_percent(interval=0.1)
                memory = psutil.virtual_memory()
                disk = psutil.disk_usage('/')
                network = psutil.net_io_counters()
                
                metrics = SystemMetrics(
                    timestamp=time.time(),
                    cpu_percent=cpu_percent,
                    memory_percent=memory.percent,
                    memory_available=memory.available,
                    disk_usage_percent=disk.percent,
                    network_io_sent=network.bytes_sent,
                    network_io_recv=network.bytes_recv
                )
                
                self.system_metrics.append(metrics)
                
                # Keep only last 1000 system metrics to prevent memory growth
                if len(self.system_metrics) > 1000:
                    self.system_metrics = self.system_metrics[-1000:]
                
                time.sleep(interval)
                
            except Exception as e:
                logger.error(f"Error in system monitoring: {e}")
                time.sleep(interval)
    
    def measure_request(self, endpoint: str, method: str = "GET", 
                       data: Optional[Dict] = None, 
                       headers: Optional[Dict] = None,
                       timeout: float = 10.0) -> RequestMetrics:
        """Measure a single request and collect metrics"""
        url = f"{self.base_url}{endpoint}"
        payload_size = len(json.dumps(data)) if data else 0
        
        start_time = time.time()
        error_message = None
        status_code = 0
        response_size = 0
        
        try:
            if method.upper() == "GET":
                response = requests.get(url, headers=headers, timeout=timeout)
            elif method.upper() == "POST":
                response = requests.post(url, json=data, headers=headers, timeout=timeout)
            elif method.upper() == "PUT":
                response = requests.put(url, json=data, headers=headers, timeout=timeout)
            elif method.upper() == "DELETE":
                response = requests.delete(url, headers=headers, timeout=timeout)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            status_code = response.status_code
            response_size = len(response.content)
            
        except requests.exceptions.RequestException as e:
            error_message = str(e)
            logger.warning(f"Request failed: {endpoint} - {error_message}")
        
        response_time = time.time() - start_time
        
        metrics = RequestMetrics(
            endpoint=endpoint,
            method=method,
            status_code=status_code,
            response_time=response_time,
            payload_size=payload_size,
            response_size=response_size,
            timestamp=start_time,
            error_message=error_message
        )
        
        self.request_metrics.append(metrics)
        return metrics
    
    def run_load_test(self, endpoint: str, concurrent_users: int = 10, 
                     duration_seconds: int = 60, method: str = "GET",
                     data: Optional[Dict] = None) -> Dict[str, Any]:
        """Run a load test on a specific endpoint"""
        logger.info(f"Starting load test: {endpoint} - {concurrent_users} users for {duration_seconds}s")
        
        start_time = time.time()
        end_time = start_time + duration_seconds
        
        def make_requests():
            """Worker function for making requests"""
            local_metrics = []
            while time.time() < end_time:
                metrics = self.measure_request(endpoint, method, data)
                local_metrics.append(metrics)
                time.sleep(0.1)  # Small delay between requests
            return local_metrics
        
        # Start concurrent workers
        with ThreadPoolExecutor(max_workers=concurrent_users) as executor:
            futures = [executor.submit(make_requests) for _ in range(concurrent_users)]
            
            # Collect all metrics
            all_metrics = []
            for future in as_completed(futures):
                try:
                    metrics_batch = future.result()
                    all_metrics.extend(metrics_batch)
                except Exception as e:
                    logger.error(f"Worker failed: {e}")
        
        actual_duration = time.time() - start_time
        
        # Analyze results
        return self._analyze_load_test_results(all_metrics, actual_duration, concurrent_users)
    
    def _analyze_load_test_results(self, metrics: List[RequestMetrics], 
                                  duration: float, concurrent_users: int) -> Dict[str, Any]:
        """Analyze load test results"""
        if not metrics:
            return {"error": "No metrics collected"}
        
        # Filter out errored requests for response time analysis
        successful_metrics = [m for m in metrics if m.status_code == 200]
        error_metrics = [m for m in metrics if m.status_code != 200 or m.error_message]
        
        response_times = [m.response_time for m in successful_metrics]
        
        if response_times:
            response_time_stats = {
                "min": min(response_times),
                "max": max(response_times),
                "mean": statistics.mean(response_times),
                "median": statistics.median(response_times),
                "p95": self._percentile(response_times, 95),
                "p99": self._percentile(response_times, 99)
            }
        else:
            response_time_stats = {"error": "No successful requests"}
        
        # Status code distribution
        status_codes = {}
        for metric in metrics:
            code = metric.status_code or "error"
            status_codes[str(code)] = status_codes.get(str(code), 0) + 1
        
        # Throughput calculation
        total_requests = len(metrics)
        requests_per_second = total_requests / duration if duration > 0 else 0
        
        return {
            "test_summary": {
                "duration_seconds": duration,
                "concurrent_users": concurrent_users,
                "total_requests": total_requests,
                "successful_requests": len(successful_metrics),
                "failed_requests": len(error_metrics),
                "requests_per_second": requests_per_second,
                "success_rate": len(successful_metrics) / total_requests if total_requests > 0 else 0
            },
            "response_time_stats": response_time_stats,
            "status_code_distribution": status_codes,
            "error_summary": self._analyze_errors(error_metrics)
        }
    
    def _analyze_errors(self, error_metrics: List[RequestMetrics]) -> Dict[str, Any]:
        """Analyze error patterns"""
        if not error_metrics:
            return {"total_errors": 0}
        
        error_by_type = {}
        error_by_status = {}
        
        for metric in error_metrics:
            # Group by error message
            error_type = metric.error_message or f"HTTP_{metric.status_code}"
            error_by_type[error_type] = error_by_type.get(error_type, 0) + 1
            
            # Group by status code
            status = str(metric.status_code) if metric.status_code else "connection_error"
            error_by_status[status] = error_by_status.get(status, 0) + 1
        
        return {
            "total_errors": len(error_metrics),
            "error_by_type": error_by_type,
            "error_by_status": error_by_status
        }
    
    def benchmark_all_endpoints(self, requests_per_endpoint: int = 10) -> Dict[str, Any]:
        """Benchmark all major API endpoints"""
        logger.info("Starting comprehensive endpoint benchmark")
        
        endpoints_to_test = [
            {"endpoint": "/status", "method": "GET"},
            {"endpoint": "/health", "method": "GET"},
            {"endpoint": "/blocks", "method": "GET"},
            {"endpoint": "/blocks?limit=5", "method": "GET"},
            {"endpoint": "/transactions", "method": "GET"},
            {"endpoint": "/transactions?limit=5", "method": "GET"},
            {"endpoint": "/peers", "method": "GET"},
            {"endpoint": "/stats", "method": "GET"},
            {"endpoint": "/balance/test_address", "method": "GET"},
            {"endpoint": "/transaction/test_hash", "method": "GET"},
            {"endpoint": "/blocks/latest", "method": "GET"},
            {"endpoint": "/submit", "method": "POST", "data": {
                "from": "test_sender",
                "to": "test_receiver", 
                "amount": 1000,
                "fee": 10
            }}
        ]
        
        benchmark_results = {}
        
        for endpoint_config in endpoints_to_test:
            endpoint = endpoint_config["endpoint"]
            method = endpoint_config["method"]
            data = endpoint_config.get("data")
            
            logger.info(f"Benchmarking {method} {endpoint}")
            
            # Collect metrics for this endpoint
            endpoint_metrics = []
            for i in range(requests_per_endpoint):
                metrics = self.measure_request(endpoint, method, data)
                endpoint_metrics.append(metrics)
                time.sleep(0.1)  # Small delay between requests
            
            # Analyze endpoint performance
            successful = [m for m in endpoint_metrics if m.status_code == 200]
            response_times = [m.response_time for m in successful]
            
            if response_times:
                benchmark_results[f"{method} {endpoint}"] = {
                    "total_requests": len(endpoint_metrics),
                    "successful_requests": len(successful),
                    "success_rate": len(successful) / len(endpoint_metrics),
                    "avg_response_time": statistics.mean(response_times),
                    "min_response_time": min(response_times),
                    "max_response_time": max(response_times),
                    "p95_response_time": self._percentile(response_times, 95)
                }
            else:
                benchmark_results[f"{method} {endpoint}"] = {
                    "error": "No successful requests"
                }
        
        return benchmark_results
    
    def get_performance_summary(self, time_window_minutes: int = 10) -> Dict[str, Any]:
        """Get performance summary for the last N minutes"""
        cutoff_time = time.time() - (time_window_minutes * 60)
        
        # Filter recent metrics
        recent_requests = [m for m in self.request_metrics if m.timestamp >= cutoff_time]
        recent_system = [m for m in self.system_metrics if m.timestamp >= cutoff_time]
        
        if not recent_requests:
            return {"error": "No recent request data"}
        
        # Request performance analysis
        successful_requests = [m for m in recent_requests if m.status_code == 200]
        response_times = [m.response_time for m in successful_requests]
        
        request_summary = {
            "total_requests": len(recent_requests),
            "successful_requests": len(successful_requests),
            "success_rate": len(successful_requests) / len(recent_requests),
            "avg_response_time": statistics.mean(response_times) if response_times else 0,
            "requests_per_minute": len(recent_requests) / time_window_minutes
        }
        
        # System performance analysis
        if recent_system:
            system_summary = {
                "avg_cpu_percent": statistics.mean([m.cpu_percent for m in recent_system]),
                "avg_memory_percent": statistics.mean([m.memory_percent for m in recent_system]),
                "max_cpu_percent": max([m.cpu_percent for m in recent_system]),
                "max_memory_percent": max([m.memory_percent for m in recent_system])
            }
        else:
            system_summary = {"error": "No recent system data"}
        
        return {
            "time_window_minutes": time_window_minutes,
            "request_performance": request_summary,
            "system_performance": system_summary,
            "timestamp": datetime.now().isoformat()
        }
    
    def export_metrics(self, format: str = "json") -> str:
        """Export all collected metrics"""
        data = {
            "export_timestamp": datetime.now().isoformat(),
            "request_metrics": [asdict(m) for m in self.request_metrics],
            "system_metrics": [asdict(m) for m in self.system_metrics],
            "summary": self.get_performance_summary()
        }
        
        if format.lower() == "json":
            return json.dumps(data, indent=2)
        else:
            raise ValueError(f"Unsupported format: {format}")
    
    def _percentile(self, data: List[float], percentile: float) -> float:
        """Calculate percentile"""
        if not data:
            return 0
        sorted_data = sorted(data)
        index = int((percentile / 100.0) * len(sorted_data))
        if index >= len(sorted_data):
            index = len(sorted_data) - 1
        return sorted_data[index]
    
    def generate_performance_report(self) -> Dict[str, Any]:
        """Generate comprehensive performance report"""
        logger.info("Generating comprehensive performance report")
        
        if not self.request_metrics:
            return {"error": "No metrics collected"}
        
        # Overall statistics
        total_requests = len(self.request_metrics)
        successful_requests = [m for m in self.request_metrics if m.status_code == 200]
        failed_requests = [m for m in self.request_metrics if m.status_code != 200 or m.error_message]
        
        # Response time analysis
        response_times = [m.response_time for m in successful_requests]
        
        # Endpoint performance breakdown
        endpoint_performance = {}
        for metric in self.request_metrics:
            key = f"{metric.method} {metric.endpoint}"
            if key not in endpoint_performance:
                endpoint_performance[key] = []
            endpoint_performance[key].append(metric)
        
        endpoint_summary = {}
        for endpoint, metrics in endpoint_performance.items():
            successful = [m for m in metrics if m.status_code == 200]
            times = [m.response_time for m in successful]
            
            if times:
                endpoint_summary[endpoint] = {
                    "total_requests": len(metrics),
                    "successful_requests": len(successful),
                    "success_rate": len(successful) / len(metrics),
                    "avg_response_time": statistics.mean(times),
                    "p95_response_time": self._percentile(times, 95)
                }
        
        # Time-based analysis (if we have enough data)
        time_analysis = self._analyze_performance_over_time()
        
        return {
            "report_generated": datetime.now().isoformat(),
            "overall_stats": {
                "total_requests": total_requests,
                "successful_requests": len(successful_requests),
                "failed_requests": len(failed_requests),
                "overall_success_rate": len(successful_requests) / total_requests,
                "avg_response_time": statistics.mean(response_times) if response_times else 0,
                "p95_response_time": self._percentile(response_times, 95),
                "p99_response_time": self._percentile(response_times, 99)
            },
            "endpoint_performance": endpoint_summary,
            "time_analysis": time_analysis,
            "system_resource_usage": self._analyze_system_resources()
        }
    
    def _analyze_performance_over_time(self) -> Dict[str, Any]:
        """Analyze performance trends over time"""
        if len(self.request_metrics) < 10:
            return {"error": "Insufficient data for time analysis"}
        
        # Group by time buckets (1 minute intervals)
        time_buckets = {}
        for metric in self.request_metrics:
            bucket = int(metric.timestamp // 60) * 60  # Round to minute
            if bucket not in time_buckets:
                time_buckets[bucket] = []
            time_buckets[bucket].append(metric)
        
        # Analyze each time bucket
        time_series = []
        for timestamp, metrics in sorted(time_buckets.items()):
            successful = [m for m in metrics if m.status_code == 200]
            response_times = [m.response_time for m in successful]
            
            time_series.append({
                "timestamp": timestamp,
                "total_requests": len(metrics),
                "successful_requests": len(successful),
                "avg_response_time": statistics.mean(response_times) if response_times else 0
            })
        
        return {
            "time_buckets": len(time_buckets),
            "time_series_data": time_series
        }
    
    def _analyze_system_resources(self) -> Dict[str, Any]:
        """Analyze system resource usage"""
        if not self.system_metrics:
            return {"error": "No system metrics collected"}
        
        cpu_usage = [m.cpu_percent for m in self.system_metrics]
        memory_usage = [m.memory_percent for m in self.system_metrics]
        
        return {
            "cpu_stats": {
                "avg": statistics.mean(cpu_usage),
                "max": max(cpu_usage),
                "min": min(cpu_usage)
            },
            "memory_stats": {
                "avg": statistics.mean(memory_usage),
                "max": max(memory_usage),
                "min": min(memory_usage)
            },
            "samples_collected": len(self.system_metrics)
        }


# Example usage and testing functions
async def run_comprehensive_performance_test(base_url: str = "http://localhost:3030"):
    """Run a comprehensive performance test suite"""
    monitor = PerformanceMonitor(base_url)
    
    # Start system monitoring
    monitor.start_system_monitoring()
    
    try:
        logger.info("Starting comprehensive performance testing")
        
        # 1. Benchmark all endpoints
        benchmark_results = monitor.benchmark_all_endpoints(requests_per_endpoint=5)
        
        # 2. Run load tests on critical endpoints
        load_test_results = {}
        critical_endpoints = ["/status", "/blocks", "/transactions"]
        
        for endpoint in critical_endpoints:
            logger.info(f"Load testing {endpoint}")
            load_results = monitor.run_load_test(
                endpoint=endpoint,
                concurrent_users=5,
                duration_seconds=30
            )
            load_test_results[endpoint] = load_results
            
            # Small delay between load tests
            await asyncio.sleep(2)
        
        # 3. Generate final report
        performance_report = monitor.generate_performance_report()
        
        return {
            "benchmark_results": benchmark_results,
            "load_test_results": load_test_results,
            "performance_report": performance_report
        }
    
    finally:
        monitor.stop_system_monitoring()


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Dytallix Performance Monitoring")
    parser.add_argument("--url", default="http://localhost:3030", help="Base URL for API")
    parser.add_argument("--test", choices=["benchmark", "load", "comprehensive"], 
                       default="comprehensive", help="Type of test to run")
    parser.add_argument("--output", help="JSON output file for results")
    parser.add_argument("--duration", type=int, default=60, help="Load test duration in seconds")
    parser.add_argument("--users", type=int, default=10, help="Concurrent users for load test")
    
    args = parser.parse_args()
    
    async def main():
        if args.test == "comprehensive":
            results = await run_comprehensive_performance_test(args.url)
        elif args.test == "benchmark":
            monitor = PerformanceMonitor(args.url)
            results = monitor.benchmark_all_endpoints()
        elif args.test == "load":
            monitor = PerformanceMonitor(args.url)
            results = monitor.run_load_test("/status", args.users, args.duration)
        
        if args.output:
            with open(args.output, 'w') as f:
                json.dump(results, f, indent=2)
            print(f"Results saved to {args.output}")
        else:
            print(json.dumps(results, indent=2))
    
    asyncio.run(main())