#!/usr/bin/env python3
"""
AI API PERFORMANCE TESTING SUITE

This module provides comprehensive performance testing for Dytallix AI services,
including cold start metrics, warm performance benchmarking, and load testing
for fraud detection, risk scoring, and contract analysis APIs.
"""

import asyncio
import aiohttp
import time
import json
import statistics
import concurrent.futures
from dataclasses import dataclass, asdict
from typing import List, Dict, Optional, Tuple
import argparse
import sys
import os
from datetime import datetime, timezone

@dataclass
class AIAPIConfig:
    """Configuration for AI API performance testing"""
    base_url: str = "http://localhost:8000"
    endpoints: List[str] = None
    test_duration_seconds: int = 60
    concurrent_requests: int = 10
    warmup_requests: int = 5
    timeout_seconds: int = 30
    
    def __post_init__(self):
        if self.endpoints is None:
            self.endpoints = [
                "/api/v1/fraud-detection",
                "/api/v1/risk-scoring", 
                "/api/v1/contract-analysis",
                "/api/v1/health"
            ]

@dataclass
class APIPerformanceMetrics:
    """Performance metrics for individual API calls"""
    endpoint: str
    method: str
    request_size_bytes: int
    response_size_bytes: int
    execution_time_ms: float
    status_code: int
    success: bool
    error_message: Optional[str]
    timestamp: float
    cold_start: bool = False
    
@dataclass
class AIAPIBenchmarkResults:
    """Aggregated benchmark results for AI APIs"""
    config: AIAPIConfig
    start_time: float
    end_time: float
    total_requests: int
    successful_requests: int
    failed_requests: int
    average_rps: float
    peak_rps: float
    average_response_time_ms: float
    p95_response_time_ms: float
    p99_response_time_ms: float
    cold_start_time_ms: float
    warm_performance_ms: float
    error_rate: float
    throughput_score: float
    individual_metrics: List[APIPerformanceMetrics]
    endpoint_performance: Dict[str, Dict[str, float]]

class AIAPIPerformanceTester:
    """Comprehensive AI API performance testing suite"""
    
    def __init__(self, config: AIAPIConfig):
        self.config = config
        self.metrics: List[APIPerformanceMetrics] = []
        self.session: Optional[aiohttp.ClientSession] = None
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=self.config.timeout_seconds)
        )
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()

    async def run_comprehensive_benchmark(self) -> AIAPIBenchmarkResults:
        """Run complete AI API performance benchmark suite"""
        print("🚀 Starting AI API Performance Benchmarks")
        print(f"Base URL: {self.config.base_url}")
        print(f"Endpoints: {self.config.endpoints}")
        
        start_time = time.time()
        
        # Run different benchmark phases
        await self.test_cold_start_performance()
        await self.test_warm_performance()
        await self.test_load_performance()
        await self.test_concurrent_performance()
        await self.test_sustained_load()
        
        end_time = time.time()
        
        # Calculate results
        results = self.calculate_benchmark_results(start_time, end_time)
        
        print("✅ AI API Benchmark completed successfully")
        print(f"Total requests: {results.total_requests}")
        print(f"Success rate: {(1.0 - results.error_rate) * 100:.2f}%")
        print(f"Average RPS: {results.average_rps:.2f}")
        print(f"Cold start time: {results.cold_start_time_ms:.2f}ms")
        print(f"Warm performance: {results.warm_performance_ms:.2f}ms")
        
        return results

    async def test_cold_start_performance(self):
        """Test AI service cold start performance"""
        print("🧊 Testing cold start performance...")
        
        for endpoint in self.config.endpoints:
            # Ensure service is cold by waiting
            await asyncio.sleep(2)
            
            start_time = time.time()
            metrics = await self.make_api_request(endpoint, cold_start=True)
            
            if metrics:
                self.metrics.append(metrics)
                print(f"  {endpoint}: {metrics.execution_time_ms:.2f}ms (cold start)")

    async def test_warm_performance(self):
        """Test AI service warm performance after warmup"""
        print("🔥 Testing warm performance...")
        
        # Warmup phase
        for _ in range(self.config.warmup_requests):
            for endpoint in self.config.endpoints:
                await self.make_api_request(endpoint)
        
        # Measure warm performance
        for endpoint in self.config.endpoints:
            warm_times = []
            
            for _ in range(5):  # Take multiple measurements
                metrics = await self.make_api_request(endpoint)
                if metrics and metrics.success:
                    warm_times.append(metrics.execution_time_ms)
                    self.metrics.append(metrics)
            
            if warm_times:
                avg_warm_time = statistics.mean(warm_times)
                print(f"  {endpoint}: {avg_warm_time:.2f}ms (warm)")

    async def test_load_performance(self):
        """Test API performance under load"""
        print(f"⚡ Testing load performance with {self.config.concurrent_requests} concurrent requests...")
        
        tasks = []
        for _ in range(self.config.concurrent_requests):
            for endpoint in self.config.endpoints:
                task = asyncio.create_task(self.make_api_request(endpoint))
                tasks.append(task)
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        successful_loads = 0
        for result in results:
            if isinstance(result, APIPerformanceMetrics) and result.success:
                self.metrics.append(result)
                successful_loads += 1
        
        load_success_rate = (successful_loads / len(tasks)) * 100
        print(f"  Load test success rate: {load_success_rate:.2f}%")

    async def test_concurrent_performance(self):
        """Test concurrent request handling"""
        print("🔄 Testing concurrent request performance...")
        
        concurrent_levels = [1, 5, 10, 20, 50]
        
        for level in concurrent_levels:
            print(f"  Testing {level} concurrent requests...")
            
            start_time = time.time()
            tasks = []
            
            for _ in range(level):
                endpoint = self.config.endpoints[0]  # Use primary endpoint
                task = asyncio.create_task(self.make_api_request(endpoint))
                tasks.append(task)
            
            results = await asyncio.gather(*tasks, return_exceptions=True)
            end_time = time.time()
            
            successful_concurrent = sum(1 for r in results 
                                      if isinstance(r, APIPerformanceMetrics) and r.success)
            
            for result in results:
                if isinstance(result, APIPerformanceMetrics):
                    self.metrics.append(result)
            
            rps = successful_concurrent / (end_time - start_time)
            print(f"    {level} concurrent: {rps:.2f} RPS")

    async def test_sustained_load(self):
        """Test sustained load over time"""
        print(f"⏱️ Testing sustained load for {self.config.test_duration_seconds} seconds...")
        
        start_time = time.time()
        request_count = 0
        
        while (time.time() - start_time) < self.config.test_duration_seconds:
            interval_start = time.time()
            interval_requests = 0
            
            # Make requests for 1 second intervals
            while (time.time() - interval_start) < 1.0:
                endpoint = self.config.endpoints[request_count % len(self.config.endpoints)]
                metrics = await self.make_api_request(endpoint)
                
                if metrics:
                    self.metrics.append(metrics)
                    if metrics.success:
                        interval_requests += 1
                
                request_count += 1
            
            print(f"  Interval RPS: {interval_requests}")

    async def make_api_request(self, endpoint: str, cold_start: bool = False) -> Optional[APIPerformanceMetrics]:
        """Make an API request and measure performance"""
        if not self.session:
            return None
        
        url = f"{self.config.base_url}{endpoint}"
        timestamp = time.time()
        
        # Prepare test data based on endpoint
        test_data = self.get_test_data_for_endpoint(endpoint)
        request_size = len(json.dumps(test_data).encode()) if test_data else 0
        
        start_time = time.time()
        
        try:
            if endpoint == "/api/v1/health":
                # Health check - GET request
                async with self.session.get(url) as response:
                    response_data = await response.text()
                    status_code = response.status
                    success = status_code == 200
            else:
                # API endpoints - POST requests
                async with self.session.post(url, json=test_data) as response:
                    response_data = await response.text()
                    status_code = response.status
                    success = status_code == 200
            
            execution_time_ms = (time.time() - start_time) * 1000
            response_size = len(response_data.encode())
            
            return APIPerformanceMetrics(
                endpoint=endpoint,
                method="GET" if endpoint == "/api/v1/health" else "POST",
                request_size_bytes=request_size,
                response_size_bytes=response_size,
                execution_time_ms=execution_time_ms,
                status_code=status_code,
                success=success,
                error_message=None,
                timestamp=timestamp,
                cold_start=cold_start
            )
            
        except Exception as e:
            execution_time_ms = (time.time() - start_time) * 1000
            
            return APIPerformanceMetrics(
                endpoint=endpoint,
                method="POST",
                request_size_bytes=request_size,
                response_size_bytes=0,
                execution_time_ms=execution_time_ms,
                status_code=0,
                success=False,
                error_message=str(e),
                timestamp=timestamp,
                cold_start=cold_start
            )

    def get_test_data_for_endpoint(self, endpoint: str) -> Dict:
        """Generate appropriate test data for each endpoint"""
        if endpoint == "/api/v1/fraud-detection":
            return {
                "transaction": {
                    "amount": 1000.0,
                    "from_address": "0x1234567890123456789012345678901234567890",
                    "to_address": "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
                    "timestamp": int(time.time()),
                    "gas_price": 20000000000,
                    "gas_limit": 21000
                },
                "user_profile": {
                    "account_age_days": 365,
                    "transaction_history_count": 150,
                    "average_transaction_amount": 500.0,
                    "countries": ["US", "CA"]
                }
            }
        
        elif endpoint == "/api/v1/risk-scoring":
            return {
                "address": "0x1234567890123456789012345678901234567890",
                "transaction_history": [
                    {"amount": 100, "timestamp": int(time.time()) - 3600},
                    {"amount": 500, "timestamp": int(time.time()) - 7200},
                    {"amount": 250, "timestamp": int(time.time()) - 10800}
                ],
                "context": {
                    "network": "ethereum",
                    "block_number": 18500000
                }
            }
        
        elif endpoint == "/api/v1/contract-analysis":
            return {
                "contract_code": "pragma solidity ^0.8.0; contract Test { uint256 public value; function setValue(uint256 _value) public { value = _value; } }",
                "contract_address": "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
                "analysis_type": "security",
                "deployment_context": {
                    "network": "sepolia",
                    "deployer": "0x1234567890123456789012345678901234567890"
                }
            }
        
        elif endpoint == "/api/v1/health":
            return {}  # Health endpoint doesn't need data
        
        else:
            return {"test": True, "timestamp": int(time.time())}

    def calculate_benchmark_results(self, start_time: float, end_time: float) -> AIAPIBenchmarkResults:
        """Calculate comprehensive benchmark results"""
        total_requests = len(self.metrics)
        successful_requests = sum(1 for m in self.metrics if m.success)
        failed_requests = total_requests - successful_requests
        
        duration_seconds = end_time - start_time
        average_rps = total_requests / duration_seconds if duration_seconds > 0 else 0
        
        # Calculate peak RPS from 1-second intervals
        rps_intervals = {}
        for metric in self.metrics:
            interval = int(metric.timestamp)
            rps_intervals[interval] = rps_intervals.get(interval, 0) + 1
        
        peak_rps = max(rps_intervals.values()) if rps_intervals else 0
        
        # Response time statistics
        successful_times = [m.execution_time_ms for m in self.metrics if m.success]
        
        if successful_times:
            average_response_time = statistics.mean(successful_times)
            p95_response_time = statistics.quantiles(successful_times, n=20)[18]  # 95th percentile
            p99_response_time = statistics.quantiles(successful_times, n=100)[98]  # 99th percentile
        else:
            average_response_time = p95_response_time = p99_response_time = 0
        
        # Cold start and warm performance
        cold_start_times = [m.execution_time_ms for m in self.metrics if m.cold_start and m.success]
        warm_times = [m.execution_time_ms for m in self.metrics if not m.cold_start and m.success]
        
        cold_start_time = statistics.mean(cold_start_times) if cold_start_times else 0
        warm_performance = statistics.mean(warm_times) if warm_times else 0
        
        # Error rate
        error_rate = failed_requests / total_requests if total_requests > 0 else 0
        
        # Throughput score (requests per second with quality factor)
        throughput_score = average_rps * (1 - error_rate) * (1000 / (average_response_time + 1))
        
        # Per-endpoint performance analysis
        endpoint_performance = {}
        for endpoint in self.config.endpoints:
            endpoint_metrics = [m for m in self.metrics if m.endpoint == endpoint and m.success]
            
            if endpoint_metrics:
                endpoint_performance[endpoint] = {
                    "average_response_time_ms": statistics.mean([m.execution_time_ms for m in endpoint_metrics]),
                    "success_rate": len(endpoint_metrics) / len([m for m in self.metrics if m.endpoint == endpoint]),
                    "total_requests": len([m for m in self.metrics if m.endpoint == endpoint]),
                    "throughput_rps": len(endpoint_metrics) / duration_seconds if duration_seconds > 0 else 0
                }
        
        return AIAPIBenchmarkResults(
            config=self.config,
            start_time=start_time,
            end_time=end_time,
            total_requests=total_requests,
            successful_requests=successful_requests,
            failed_requests=failed_requests,
            average_rps=average_rps,
            peak_rps=peak_rps,
            average_response_time_ms=average_response_time,
            p95_response_time_ms=p95_response_time,
            p99_response_time_ms=p99_response_time,
            cold_start_time_ms=cold_start_time,
            warm_performance_ms=warm_performance,
            error_rate=error_rate,
            throughput_score=throughput_score,
            individual_metrics=self.metrics,
            endpoint_performance=endpoint_performance
        )

    def export_results_json(self, results: AIAPIBenchmarkResults) -> str:
        """Export results as JSON"""
        return json.dumps(asdict(results), indent=2, default=str)

    def export_results_csv(self, results: AIAPIBenchmarkResults) -> str:
        """Export individual metrics as CSV"""
        csv_lines = ["endpoint,method,execution_time_ms,status_code,success,cold_start,timestamp"]
        
        for metric in results.individual_metrics:
            csv_lines.append(f"{metric.endpoint},{metric.method},{metric.execution_time_ms},"
                           f"{metric.status_code},{metric.success},{metric.cold_start},{metric.timestamp}")
        
        return "\n".join(csv_lines)

    def print_detailed_report(self, results: AIAPIBenchmarkResults):
        """Print detailed performance report"""
        print("\n" + "="*80)
        print("AI API PERFORMANCE BENCHMARK REPORT")
        print("="*80)
        
        print(f"\n📊 OVERALL PERFORMANCE")
        print(f"Test Duration: {results.end_time - results.start_time:.2f} seconds")
        print(f"Total Requests: {results.total_requests}")
        print(f"Successful Requests: {results.successful_requests}")
        print(f"Failed Requests: {results.failed_requests}")
        print(f"Success Rate: {(1 - results.error_rate) * 100:.2f}%")
        print(f"Average RPS: {results.average_rps:.2f}")
        print(f"Peak RPS: {results.peak_rps:.2f}")
        
        print(f"\n⏱️ RESPONSE TIME ANALYSIS")
        print(f"Average Response Time: {results.average_response_time_ms:.2f}ms")
        print(f"95th Percentile: {results.p95_response_time_ms:.2f}ms")
        print(f"99th Percentile: {results.p99_response_time_ms:.2f}ms")
        
        print(f"\n🧊 COLD START vs WARM PERFORMANCE")
        print(f"Cold Start Time: {results.cold_start_time_ms:.2f}ms")
        print(f"Warm Performance: {results.warm_performance_ms:.2f}ms")
        if results.cold_start_time_ms > 0 and results.warm_performance_ms > 0:
            improvement = ((results.cold_start_time_ms - results.warm_performance_ms) / results.cold_start_time_ms) * 100
            print(f"Performance Improvement: {improvement:.2f}%")
        
        print(f"\n📈 THROUGHPUT SCORE")
        print(f"Throughput Score: {results.throughput_score:.2f}")
        
        print(f"\n🎯 PER-ENDPOINT PERFORMANCE")
        for endpoint, perf in results.endpoint_performance.items():
            print(f"{endpoint}:")
            print(f"  Average Response Time: {perf['average_response_time_ms']:.2f}ms")
            print(f"  Success Rate: {perf['success_rate'] * 100:.2f}%")
            print(f"  Total Requests: {perf['total_requests']}")
            print(f"  Throughput: {perf['throughput_rps']:.2f} RPS")


async def main():
    """Main function for running AI API performance tests"""
    parser = argparse.ArgumentParser(description="AI API Performance Testing Suite")
    parser.add_argument("--base-url", default="http://localhost:8000", 
                       help="Base URL for AI API services")
    parser.add_argument("--duration", type=int, default=60,
                       help="Test duration in seconds")
    parser.add_argument("--concurrent", type=int, default=10,
                       help="Number of concurrent requests")
    parser.add_argument("--output", help="Output file for results (JSON)")
    parser.add_argument("--csv-output", help="Output file for CSV metrics")
    
    args = parser.parse_args()
    
    config = AIAPIConfig(
        base_url=args.base_url,
        test_duration_seconds=args.duration,
        concurrent_requests=args.concurrent
    )
    
    async with AIAPIPerformanceTester(config) as tester:
        results = await tester.run_comprehensive_benchmark()
        
        # Print detailed report
        tester.print_detailed_report(results)
        
        # Export results if requested
        if args.output:
            with open(args.output, 'w') as f:
                f.write(tester.export_results_json(results))
            print(f"\n💾 Results exported to {args.output}")
        
        if args.csv_output:
            with open(args.csv_output, 'w') as f:
                f.write(tester.export_results_csv(results))
            print(f"📊 CSV metrics exported to {args.csv_output}")


if __name__ == "__main__":
    asyncio.run(main())