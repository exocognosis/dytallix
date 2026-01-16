#!/usr/bin/env python3
"""
Performance Optimization Test Suite

Tests the performance optimizations implemented for Dytallix AI services
to ensure sub-100ms response times and proper functionality.
"""

import asyncio
import aiohttp
import time
import json
import statistics
from typing import List, Dict, Any
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class PerformanceTestSuite:
    """Test suite for performance optimizations"""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.test_results: List[Dict[str, Any]] = []
        
    async def test_fraud_detection_performance(self, session: aiohttp.ClientSession):
        """Test fraud detection endpoint performance"""
        endpoint = "/analyze/fraud"
        url = f"{self.base_url}{endpoint}"
        
        test_data = {
            "transaction": {
                "from_address": "0x1234567890123456789012345678901234567890",
                "to_address": "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
                "amount": 1000.0,
                "timestamp": int(time.time())
            },
            "historical_data": [
                {
                    "from_address": "0x1234567890123456789012345678901234567890",
                    "to_address": "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
                    "amount": 500.0,
                    "timestamp": int(time.time()) - 3600
                }
            ]
        }
        
        # Test cold start (first request)
        logger.info("Testing fraud detection cold start...")
        start_time = time.perf_counter()
        
        try:
            async with session.post(url, json=test_data) as response:
                cold_start_data = await response.json()
                cold_start_time = (time.perf_counter() - start_time) * 1000
                
                self.test_results.append({
                    "endpoint": endpoint,
                    "test_type": "cold_start",
                    "response_time_ms": cold_start_time,
                    "status_code": response.status,
                    "success": response.status == 200,
                    "cache_hit": response.headers.get("X-Cache-Hit", "false").lower() == "true"
                })
                
                logger.info(f"Cold start: {cold_start_time:.2f}ms")
                
        except Exception as e:
            logger.error(f"Cold start test failed: {e}")
            self.test_results.append({
                "endpoint": endpoint,
                "test_type": "cold_start",
                "response_time_ms": 0,
                "status_code": 0,
                "success": False,
                "error": str(e)
            })
        
        # Test warm performance (multiple requests)
        logger.info("Testing fraud detection warm performance...")
        warm_times = []
        
        for i in range(5):
            start_time = time.perf_counter()
            
            try:
                async with session.post(url, json=test_data) as response:
                    warm_data = await response.json()
                    warm_time = (time.perf_counter() - start_time) * 1000
                    warm_times.append(warm_time)
                    
                    self.test_results.append({
                        "endpoint": endpoint,
                        "test_type": "warm",
                        "response_time_ms": warm_time,
                        "status_code": response.status,
                        "success": response.status == 200,
                        "cache_hit": response.headers.get("X-Cache-Hit", "false").lower() == "true"
                    })
                    
            except Exception as e:
                logger.error(f"Warm test {i+1} failed: {e}")
                
        if warm_times:
            avg_warm_time = statistics.mean(warm_times)
            logger.info(f"Average warm performance: {avg_warm_time:.2f}ms")
            
    async def test_risk_scoring_performance(self, session: aiohttp.ClientSession):
        """Test risk scoring endpoint performance"""
        endpoint = "/analyze/risk"
        url = f"{self.base_url}{endpoint}"
        
        test_data = {
            "transaction": {
                "from_address": "0x1234567890123456789012345678901234567890",
                "to_address": "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
                "amount": 1000.0,
                "timestamp": int(time.time())
            },
            "address_history": [
                {
                    "from_address": "0x1234567890123456789012345678901234567890",
                    "to_address": "0xother567890123456789012345678901234567890",
                    "amount": 250.0,
                    "timestamp": int(time.time()) - 7200
                }
            ]
        }
        
        # Test performance
        logger.info("Testing risk scoring performance...")
        
        for i in range(3):
            start_time = time.perf_counter()
            
            try:
                async with session.post(url, json=test_data) as response:
                    risk_data = await response.json()
                    response_time = (time.perf_counter() - start_time) * 1000
                    
                    self.test_results.append({
                        "endpoint": endpoint,
                        "test_type": "warm",
                        "response_time_ms": response_time,
                        "status_code": response.status,
                        "success": response.status == 200,
                        "cache_hit": response.headers.get("X-Cache-Hit", "false").lower() == "true"
                    })
                    
                    logger.info(f"Risk scoring {i+1}: {response_time:.2f}ms")
                    
            except Exception as e:
                logger.error(f"Risk scoring test {i+1} failed: {e}")
                
    async def test_performance_monitoring(self, session: aiohttp.ClientSession):
        """Test performance monitoring endpoints"""
        endpoints = [
            "/performance/health",
            "/performance/metrics",
            "/performance/metrics/real-time",
            "/performance/models",
            "/performance/cache",
            "/performance/system"
        ]
        
        logger.info("Testing performance monitoring endpoints...")
        
        for endpoint in endpoints:
            url = f"{self.base_url}{endpoint}"
            start_time = time.perf_counter()
            
            try:
                async with session.get(url) as response:
                    monitoring_data = await response.json()
                    response_time = (time.perf_counter() - start_time) * 1000
                    
                    self.test_results.append({
                        "endpoint": endpoint,
                        "test_type": "monitoring",
                        "response_time_ms": response_time,
                        "status_code": response.status,
                        "success": response.status == 200
                    })
                    
                    logger.info(f"Monitoring {endpoint}: {response_time:.2f}ms")
                    
            except Exception as e:
                logger.error(f"Monitoring test for {endpoint} failed: {e}")
                
    async def test_concurrent_performance(self, session: aiohttp.ClientSession):
        """Test concurrent request performance"""
        endpoint = "/analyze/fraud"
        url = f"{self.base_url}{endpoint}"
        
        test_data = {
            "transaction": {
                "from_address": "0x1234567890123456789012345678901234567890",
                "to_address": "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
                "amount": 1000.0,
                "timestamp": int(time.time())
            }
        }
        
        logger.info("Testing concurrent request performance...")
        
        # Create 10 concurrent requests
        concurrent_requests = 10
        tasks = []
        
        for i in range(concurrent_requests):
            task = asyncio.create_task(self._make_timed_request(session, url, test_data, i))
            tasks.append(task)
            
        # Execute all requests concurrently
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        successful_results = [r for r in results if isinstance(r, dict) and r.get("success")]
        
        if successful_results:
            response_times = [r["response_time_ms"] for r in successful_results]
            avg_concurrent_time = statistics.mean(response_times)
            max_concurrent_time = max(response_times)
            
            logger.info(f"Concurrent requests: {len(successful_results)}/{concurrent_requests} successful")
            logger.info(f"Average concurrent response time: {avg_concurrent_time:.2f}ms")
            logger.info(f"Max concurrent response time: {max_concurrent_time:.2f}ms")
            
            for result in successful_results:
                self.test_results.append({
                    "endpoint": endpoint,
                    "test_type": "concurrent",
                    "response_time_ms": result["response_time_ms"],
                    "status_code": result["status_code"],
                    "success": result["success"]
                })
                
    async def _make_timed_request(self, session: aiohttp.ClientSession, url: str, 
                                 data: dict, request_id: int) -> dict:
        """Make a timed request for concurrent testing"""
        start_time = time.perf_counter()
        
        try:
            async with session.post(url, json=data) as response:
                await response.json()  # Consume response
                response_time = (time.perf_counter() - start_time) * 1000
                
                return {
                    "request_id": request_id,
                    "response_time_ms": response_time,
                    "status_code": response.status,
                    "success": response.status == 200
                }
                
        except Exception as e:
            return {
                "request_id": request_id,
                "response_time_ms": 0,
                "status_code": 0,
                "success": False,
                "error": str(e)
            }
            
    def analyze_results(self) -> Dict[str, Any]:
        """Analyze test results and generate report"""
        if not self.test_results:
            return {"error": "No test results available"}
            
        # Separate results by test type
        cold_start_results = [r for r in self.test_results if r.get("test_type") == "cold_start"]
        warm_results = [r for r in self.test_results if r.get("test_type") == "warm"]
        concurrent_results = [r for r in self.test_results if r.get("test_type") == "concurrent"]
        monitoring_results = [r for r in self.test_results if r.get("test_type") == "monitoring"]
        
        analysis = {
            "test_summary": {
                "total_tests": len(self.test_results),
                "successful_tests": len([r for r in self.test_results if r.get("success", False)]),
                "failed_tests": len([r for r in self.test_results if not r.get("success", False)])
            },
            "performance_analysis": {}
        }
        
        # Analyze cold start performance
        if cold_start_results:
            cold_times = [r["response_time_ms"] for r in cold_start_results if r.get("success")]
            if cold_times:
                analysis["performance_analysis"]["cold_start"] = {
                    "average_ms": statistics.mean(cold_times),
                    "max_ms": max(cold_times),
                    "min_ms": min(cold_times),
                    "target_ms": 1000,
                    "target_met": max(cold_times) < 1000
                }
                
        # Analyze warm performance
        if warm_results:
            warm_times = [r["response_time_ms"] for r in warm_results if r.get("success")]
            if warm_times:
                analysis["performance_analysis"]["warm"] = {
                    "average_ms": statistics.mean(warm_times),
                    "max_ms": max(warm_times),
                    "min_ms": min(warm_times),
                    "p95_ms": statistics.quantiles(warm_times, n=20)[18] if len(warm_times) > 20 else max(warm_times),
                    "target_ms": 100,
                    "target_met": statistics.mean(warm_times) < 100
                }
                
        # Analyze concurrent performance
        if concurrent_results:
            concurrent_times = [r["response_time_ms"] for r in concurrent_results if r.get("success")]
            if concurrent_times:
                analysis["performance_analysis"]["concurrent"] = {
                    "average_ms": statistics.mean(concurrent_times),
                    "max_ms": max(concurrent_times),
                    "requests_completed": len(concurrent_times),
                    "target_met": statistics.mean(concurrent_times) < 200  # Allow higher for concurrent
                }
                
        # Analyze monitoring performance
        if monitoring_results:
            monitoring_times = [r["response_time_ms"] for r in monitoring_results if r.get("success")]
            if monitoring_times:
                analysis["performance_analysis"]["monitoring"] = {
                    "average_ms": statistics.mean(monitoring_times),
                    "max_ms": max(monitoring_times),
                    "all_endpoints_working": len([r for r in monitoring_results if r.get("success")]) == len(monitoring_results)
                }
                
        # Overall assessment
        targets_met = []
        if "cold_start" in analysis["performance_analysis"]:
            targets_met.append(analysis["performance_analysis"]["cold_start"]["target_met"])
        if "warm" in analysis["performance_analysis"]:
            targets_met.append(analysis["performance_analysis"]["warm"]["target_met"])
            
        analysis["overall_assessment"] = {
            "all_targets_met": all(targets_met) if targets_met else False,
            "performance_grade": "EXCELLENT" if all(targets_met) else "NEEDS_IMPROVEMENT",
            "optimization_successful": all(targets_met) if targets_met else False
        }
        
        return analysis
        
    async def run_full_test_suite(self):
        """Run the complete performance test suite"""
        logger.info("🚀 Starting Dytallix AI Performance Test Suite")
        
        timeout = aiohttp.ClientTimeout(total=30)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            try:
                # Test core AI endpoints
                await self.test_fraud_detection_performance(session)
                await self.test_risk_scoring_performance(session)
                
                # Test monitoring endpoints
                await self.test_performance_monitoring(session)
                
                # Test concurrent performance
                await self.test_concurrent_performance(session)
                
                # Analyze results
                analysis = self.analyze_results()
                
                # Print results
                self.print_test_report(analysis)
                
                return analysis
                
            except Exception as e:
                logger.error(f"Test suite execution failed: {e}")
                return {"error": str(e)}
                
    def print_test_report(self, analysis: Dict[str, Any]):
        """Print formatted test report"""
        print("\n" + "="*80)
        print("🎯 DYTALLIX AI PERFORMANCE TEST REPORT")
        print("="*80)
        
        if "error" in analysis:
            print(f"❌ Test execution failed: {analysis['error']}")
            return
            
        summary = analysis.get("test_summary", {})
        performance = analysis.get("performance_analysis", {})
        assessment = analysis.get("overall_assessment", {})
        
        print(f"\n📊 TEST SUMMARY")
        print(f"Total Tests: {summary.get('total_tests', 0)}")
        print(f"Successful: {summary.get('successful_tests', 0)}")
        print(f"Failed: {summary.get('failed_tests', 0)}")
        
        if "cold_start" in performance:
            cold = performance["cold_start"]
            print(f"\n🧊 COLD START PERFORMANCE")
            print(f"Average: {cold['average_ms']:.2f}ms")
            print(f"Target: <{cold['target_ms']}ms")
            print(f"Status: {'✅ PASSED' if cold['target_met'] else '❌ FAILED'}")
            
        if "warm" in performance:
            warm = performance["warm"]
            print(f"\n🔥 WARM PERFORMANCE")
            print(f"Average: {warm['average_ms']:.2f}ms")
            print(f"P95: {warm.get('p95_ms', 0):.2f}ms")
            print(f"Target: <{warm['target_ms']}ms")
            print(f"Status: {'✅ PASSED' if warm['target_met'] else '❌ FAILED'}")
            
        if "concurrent" in performance:
            concurrent = performance["concurrent"]
            print(f"\n🔄 CONCURRENT PERFORMANCE")
            print(f"Average: {concurrent['average_ms']:.2f}ms")
            print(f"Completed: {concurrent['requests_completed']} requests")
            print(f"Status: {'✅ PASSED' if concurrent['target_met'] else '❌ FAILED'}")
            
        print(f"\n🎯 OVERALL ASSESSMENT")
        print(f"Performance Grade: {assessment.get('performance_grade', 'UNKNOWN')}")
        print(f"Optimization Status: {'✅ SUCCESSFUL' if assessment.get('optimization_successful') else '❌ NEEDS WORK'}")
        
        print("\n" + "="*80)

async def main():
    """Main test execution"""
    test_suite = PerformanceTestSuite()
    
    try:
        results = await test_suite.run_full_test_suite()
        
        # Save results to file
        with open("/tmp/performance_test_results.json", "w") as f:
            json.dump({
                "timestamp": time.time(),
                "results": results,
                "raw_data": test_suite.test_results
            }, f, indent=2)
            
        logger.info("Test results saved to /tmp/performance_test_results.json")
        
    except KeyboardInterrupt:
        logger.info("Test suite interrupted by user")
    except Exception as e:
        logger.error(f"Test suite failed: {e}")

if __name__ == "__main__":
    asyncio.run(main())