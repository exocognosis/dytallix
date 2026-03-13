#!/usr/bin/env python3
"""
Metrics Collector for Dytallix API Testing
Collects and analyzes performance metrics, response times, and system behavior
"""

import json
import time
import statistics
import requests
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@dataclass
class MetricPoint:
    """Individual metric measurement"""
    timestamp: float
    endpoint: str
    method: str
    response_time_ms: float
    status_code: int
    response_size_bytes: int
    success: bool
    error_message: Optional[str] = None

@dataclass
class EndpointMetrics:
    """Aggregated metrics for an endpoint"""
    endpoint: str
    method: str
    total_requests: int
    successful_requests: int
    failed_requests: int
    success_rate: float
    avg_response_time_ms: float
    min_response_time_ms: float
    max_response_time_ms: float
    p50_response_time_ms: float
    p95_response_time_ms: float
    p99_response_time_ms: float
    avg_response_size_bytes: float
    total_bytes_transferred: int
    requests_per_second: float
    error_types: Dict[str, int]

class MetricsCollector:
    def __init__(self, base_url: str = "http://localhost:3030"):
        self.base_url = base_url
        self.metrics: List[MetricPoint] = []
        self.collection_start_time = None
        self.collection_end_time = None
        
    def add_metric(self, endpoint: str, method: str, response_time_ms: float, 
                   status_code: int, response_size_bytes: int, success: bool,
                   error_message: Optional[str] = None):
        """Add a metric point"""
        metric = MetricPoint(
            timestamp=time.time(),
            endpoint=endpoint,
            method=method,
            response_time_ms=response_time_ms,
            status_code=status_code,
            response_size_bytes=response_size_bytes,
            success=success,
            error_message=error_message
        )
        self.metrics.append(metric)
    
    async def collect_endpoint_metrics(self, endpoint: str, method: str = "GET", 
                                     duration_seconds: int = 60, 
                                     request_interval: float = 1.0,
                                     payload: Optional[Dict] = None) -> List[MetricPoint]:
        """Collect metrics for a specific endpoint over time"""
        logger.info(f"Starting metric collection for {method} {endpoint} for {duration_seconds}s")
        
        start_time = time.time()
        endpoint_metrics = []
        
        while time.time() - start_time < duration_seconds:
            try:
                request_start = time.time()
                
                if method.upper() == "GET":
                    response = requests.get(f"{self.base_url}{endpoint}", timeout=10)
                elif method.upper() == "POST":
                    response = requests.post(f"{self.base_url}{endpoint}", json=payload, timeout=10)
                else:
                    response = requests.request(method, f"{self.base_url}{endpoint}", 
                                              json=payload, timeout=10)
                
                response_time = (time.time() - request_start) * 1000  # Convert to ms
                response_size = len(response.content)
                success = 200 <= response.status_code < 400
                
                metric = MetricPoint(
                    timestamp=time.time(),
                    endpoint=endpoint,
                    method=method,
                    response_time_ms=response_time,
                    status_code=response.status_code,
                    response_size_bytes=response_size,
                    success=success
                )
                
                endpoint_metrics.append(metric)
                self.metrics.append(metric)
                
            except requests.exceptions.Timeout:
                metric = MetricPoint(
                    timestamp=time.time(),
                    endpoint=endpoint,
                    method=method,
                    response_time_ms=10000,  # Timeout threshold
                    status_code=0,
                    response_size_bytes=0,
                    success=False,
                    error_message="Timeout"
                )
                endpoint_metrics.append(metric)
                self.metrics.append(metric)
                
            except Exception as e:
                metric = MetricPoint(
                    timestamp=time.time(),
                    endpoint=endpoint,
                    method=method,
                    response_time_ms=0,
                    status_code=0,
                    response_size_bytes=0,
                    success=False,
                    error_message=str(e)
                )
                endpoint_metrics.append(metric)
                self.metrics.append(metric)
            
            await asyncio.sleep(request_interval)
        
        logger.info(f"Collected {len(endpoint_metrics)} metrics for {method} {endpoint}")
        return endpoint_metrics
    
    async def collect_comprehensive_metrics(self, duration_seconds: int = 300) -> Dict[str, List[MetricPoint]]:
        """Collect comprehensive metrics across all endpoints"""
        logger.info(f"Starting comprehensive metric collection for {duration_seconds}s")
        self.collection_start_time = time.time()
        
        # Define endpoints to test
        endpoints_to_test = [
            ("/health", "GET", None),
            ("/status", "GET", None),
            ("/stats", "GET", None),
            ("/peers", "GET", None),
            ("/blocks", "GET", None),
            ("/transactions", "GET", None),
            ("/balance/test_address", "GET", None),
            ("/submit", "POST", {"from": "test", "to": "test", "amount": 1000, "fee": 100}),
        ]
        
        # Run metric collection for all endpoints concurrently
        tasks = []
        for endpoint, method, payload in endpoints_to_test:
            # Stagger requests to avoid overwhelming the server
            interval = max(0.5, len(endpoints_to_test) * 0.1)
            task = self.collect_endpoint_metrics(endpoint, method, duration_seconds, interval, payload)
            tasks.append(task)
        
        # Wait for all collections to complete
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        self.collection_end_time = time.time()
        
        # Organize results by endpoint
        endpoint_results = {}
        for i, (endpoint, method, _) in enumerate(endpoints_to_test):
            if i < len(results) and not isinstance(results[i], Exception):
                endpoint_results[f"{method} {endpoint}"] = results[i]
            else:
                logger.error(f"Failed to collect metrics for {method} {endpoint}")
                endpoint_results[f"{method} {endpoint}"] = []
        
        return endpoint_results
    
    def analyze_endpoint_metrics(self, endpoint_metrics: List[MetricPoint]) -> EndpointMetrics:
        """Analyze metrics for a specific endpoint"""
        if not endpoint_metrics:
            return None
        
        # Basic counts
        total_requests = len(endpoint_metrics)
        successful_requests = sum(1 for m in endpoint_metrics if m.success)
        failed_requests = total_requests - successful_requests
        success_rate = (successful_requests / total_requests) * 100 if total_requests > 0 else 0
        
        # Response time statistics
        response_times = [m.response_time_ms for m in endpoint_metrics]
        avg_response_time = statistics.mean(response_times)
        min_response_time = min(response_times)
        max_response_time = max(response_times)
        
        # Percentiles
        sorted_times = sorted(response_times)
        p50 = statistics.median(sorted_times)
        p95 = sorted_times[int(0.95 * len(sorted_times))] if sorted_times else 0
        p99 = sorted_times[int(0.99 * len(sorted_times))] if sorted_times else 0
        
        # Response size statistics
        response_sizes = [m.response_size_bytes for m in endpoint_metrics]
        avg_response_size = statistics.mean(response_sizes) if response_sizes else 0
        total_bytes = sum(response_sizes)
        
        # Request rate
        if endpoint_metrics:
            time_span = endpoint_metrics[-1].timestamp - endpoint_metrics[0].timestamp
            requests_per_second = total_requests / max(time_span, 1)
        else:
            requests_per_second = 0
        
        # Error analysis
        error_types = {}
        for metric in endpoint_metrics:
            if not metric.success:
                error_key = f"HTTP_{metric.status_code}" if metric.status_code > 0 else metric.error_message or "Unknown"
                error_types[error_key] = error_types.get(error_key, 0) + 1
        
        return EndpointMetrics(
            endpoint=endpoint_metrics[0].endpoint,
            method=endpoint_metrics[0].method,
            total_requests=total_requests,
            successful_requests=successful_requests,
            failed_requests=failed_requests,
            success_rate=success_rate,
            avg_response_time_ms=avg_response_time,
            min_response_time_ms=min_response_time,
            max_response_time_ms=max_response_time,
            p50_response_time_ms=p50,
            p95_response_time_ms=p95,
            p99_response_time_ms=p99,
            avg_response_size_bytes=avg_response_size,
            total_bytes_transferred=total_bytes,
            requests_per_second=requests_per_second,
            error_types=error_types
        )
    
    def generate_performance_report(self) -> Dict[str, Any]:
        """Generate comprehensive performance report"""
        if not self.metrics:
            return {"error": "No metrics collected"}
        
        # Group metrics by endpoint
        endpoint_groups = {}
        for metric in self.metrics:
            key = f"{metric.method} {metric.endpoint}"
            if key not in endpoint_groups:
                endpoint_groups[key] = []
            endpoint_groups[key].append(metric)
        
        # Analyze each endpoint
        endpoint_analyses = {}
        for endpoint_key, metrics in endpoint_groups.items():
            analysis = self.analyze_endpoint_metrics(metrics)
            if analysis:
                endpoint_analyses[endpoint_key] = asdict(analysis)
        
        # Overall statistics
        total_requests = len(self.metrics)
        successful_requests = sum(1 for m in self.metrics if m.success)
        overall_success_rate = (successful_requests / total_requests) * 100 if total_requests > 0 else 0
        
        all_response_times = [m.response_time_ms for m in self.metrics]
        overall_avg_response_time = statistics.mean(all_response_times) if all_response_times else 0
        
        # Time-based analysis
        time_span = (self.collection_end_time - self.collection_start_time) if self.collection_end_time else 0
        overall_request_rate = total_requests / max(time_span, 1)
        
        # Performance thresholds analysis
        fast_requests = sum(1 for m in self.metrics if m.response_time_ms < 100)
        acceptable_requests = sum(1 for m in self.metrics if 100 <= m.response_time_ms < 1000)
        slow_requests = sum(1 for m in self.metrics if m.response_time_ms >= 1000)
        
        return {
            "collection_info": {
                "start_time": datetime.fromtimestamp(self.collection_start_time).isoformat() if self.collection_start_time else None,
                "end_time": datetime.fromtimestamp(self.collection_end_time).isoformat() if self.collection_end_time else None,
                "duration_seconds": time_span,
                "base_url": self.base_url
            },
            "overall_metrics": {
                "total_requests": total_requests,
                "successful_requests": successful_requests,
                "failed_requests": total_requests - successful_requests,
                "success_rate": overall_success_rate,
                "average_response_time_ms": overall_avg_response_time,
                "requests_per_second": overall_request_rate
            },
            "performance_distribution": {
                "fast_requests_under_100ms": fast_requests,
                "acceptable_requests_100ms_to_1s": acceptable_requests,
                "slow_requests_over_1s": slow_requests,
                "fast_percentage": (fast_requests / max(total_requests, 1)) * 100,
                "acceptable_percentage": (acceptable_requests / max(total_requests, 1)) * 100,
                "slow_percentage": (slow_requests / max(total_requests, 1)) * 100
            },
            "endpoint_metrics": endpoint_analyses,
            "recommendations": self.generate_performance_recommendations(endpoint_analyses)
        }
    
    def generate_performance_recommendations(self, endpoint_analyses: Dict[str, Dict]) -> List[str]:
        """Generate performance recommendations based on metrics"""
        recommendations = []
        
        for endpoint, metrics in endpoint_analyses.items():
            success_rate = metrics.get("success_rate", 0)
            avg_response_time = metrics.get("avg_response_time_ms", 0)
            p95_response_time = metrics.get("p95_response_time_ms", 0)
            
            # Success rate recommendations
            if success_rate < 95:
                recommendations.append(f"LOW RELIABILITY: {endpoint} has {success_rate:.1f}% success rate")
            
            # Response time recommendations
            if avg_response_time > 1000:
                recommendations.append(f"SLOW RESPONSE: {endpoint} average response time is {avg_response_time:.1f}ms")
            elif avg_response_time > 500:
                recommendations.append(f"MODERATE PERFORMANCE: {endpoint} average response time is {avg_response_time:.1f}ms")
            
            # P95 recommendations
            if p95_response_time > 2000:
                recommendations.append(f"POOR P95: {endpoint} 95th percentile response time is {p95_response_time:.1f}ms")
            
            # Error analysis
            error_types = metrics.get("error_types", {})
            if error_types:
                for error_type, count in error_types.items():
                    if count > metrics.get("total_requests", 0) * 0.05:  # More than 5% errors
                        recommendations.append(f"HIGH ERROR RATE: {endpoint} has {count} {error_type} errors")
        
        # Overall system recommendations
        if not recommendations:
            recommendations.append("GOOD: All endpoints performing within acceptable parameters")
        
        return recommendations
    
    def export_metrics(self, filename: str):
        """Export raw metrics to JSON file"""
        metrics_data = {
            "collection_info": {
                "start_time": self.collection_start_time,
                "end_time": self.collection_end_time,
                "base_url": self.base_url,
                "total_metrics": len(self.metrics)
            },
            "metrics": [asdict(metric) for metric in self.metrics]
        }
        
        with open(filename, 'w') as f:
            json.dump(metrics_data, f, indent=2)
        
        logger.info(f"Metrics exported to {filename}")

async def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Dytallix API Metrics Collector")
    parser.add_argument("--url", default="http://localhost:3030", help="Base URL for API")
    parser.add_argument("--duration", type=int, default=60, help="Collection duration in seconds")
    parser.add_argument("--endpoint", help="Specific endpoint to test (optional)")
    parser.add_argument("--method", default="GET", help="HTTP method to use")
    parser.add_argument("--output", help="Output file for performance report")
    parser.add_argument("--raw-output", help="Output file for raw metrics")
    
    args = parser.parse_args()
    
    collector = MetricsCollector(args.url)
    
    try:
        if args.endpoint:
            # Collect metrics for specific endpoint
            logger.info(f"Collecting metrics for {args.method} {args.endpoint}")
            await collector.collect_endpoint_metrics(args.endpoint, args.method, args.duration)
        else:
            # Collect comprehensive metrics
            await collector.collect_comprehensive_metrics(args.duration)
        
        # Generate performance report
        report = collector.generate_performance_report()
        
        # Output results
        if args.output:
            with open(args.output, 'w') as f:
                json.dump(report, f, indent=2)
            print(f"Performance report saved to {args.output}")
        else:
            print(json.dumps(report, indent=2))
        
        # Export raw metrics if requested
        if args.raw_output:
            collector.export_metrics(args.raw_output)
        
    except KeyboardInterrupt:
        logger.info("Metrics collection interrupted by user")
    except Exception as e:
        logger.error(f"Metrics collection failed: {e}")

if __name__ == "__main__":
    asyncio.run(main())