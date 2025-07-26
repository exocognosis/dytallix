#!/usr/bin/env python3
"""
Cross-Chain Bridge Stress Testing Framework

Comprehensive stress testing system for validating bridge performance
under various load conditions, including sustained load, burst traffic,
and failure recovery scenarios.
"""

import asyncio
import json
import logging
import time
import statistics
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
import concurrent.futures
import aiohttp
import random
import threading
from pathlib import Path

logger = logging.getLogger(__name__)

@dataclass
class TransactionRequest:
    """Bridge transaction request for testing"""
    id: str
    asset_id: str
    amount: int
    source_chain: str
    dest_chain: str
    source_address: str
    dest_address: str
    priority: int = 1  # 1=normal, 2=high, 3=critical
    timestamp: float = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = time.time()

@dataclass
class TransactionResult:
    """Result of a bridge transaction test"""
    request_id: str
    success: bool
    start_time: float
    end_time: float
    latency_ms: float
    error_message: Optional[str] = None
    bridge_tx_id: Optional[str] = None
    confirmations: int = 0

@dataclass
class StressTestConfig:
    """Configuration for stress test scenarios"""
    name: str
    duration_seconds: int
    target_tps: float  # transactions per second
    burst_pattern: bool = False
    burst_duration_seconds: int = 60
    burst_multiplier: float = 2.0
    failure_injection: bool = False
    failure_rate: float = 0.05  # 5% artificial failures
    concurrent_users: int = 10
    asset_types: List[str] = None
    
    def __post_init__(self):
        if self.asset_types is None:
            self.asset_types = ["DYT", "OSMO", "ETH", "USDC"]

@dataclass
class StressTestResults:
    """Comprehensive stress test results"""
    config: StressTestConfig
    start_time: float
    end_time: float
    total_requests: int
    successful_requests: int
    failed_requests: int
    success_rate: float
    average_latency_ms: float
    p50_latency_ms: float
    p95_latency_ms: float
    p99_latency_ms: float
    max_latency_ms: float
    min_latency_ms: float
    throughput_tps: float
    throughput_tph: float
    error_breakdown: Dict[str, int]
    performance_over_time: List[Dict[str, Any]]

class BridgeStressTester:
    """High-performance stress testing framework for bridge operations"""
    
    def __init__(self, bridge_endpoint: str = "http://localhost:8080", 
                 results_dir: str = "/tmp/dytallix_stress_results"):
        self.bridge_endpoint = bridge_endpoint
        self.results_dir = Path(results_dir)
        self.results_dir.mkdir(exist_ok=True)
        
        # Test state
        self.active_tests: Dict[str, bool] = {}
        self.test_results: Dict[str, StressTestResults] = {}
        
        # Performance tracking
        self.transaction_queue = asyncio.Queue()
        self.result_queue = asyncio.Queue()
        self.metrics_lock = threading.Lock()
        
        # Circuit breaker for safety
        self.circuit_breaker_threshold = 0.8  # 80% failure rate triggers stop
        self.circuit_breaker_window = 100  # Check last 100 transactions
        
    async def run_stress_test(self, config: StressTestConfig) -> StressTestResults:
        """Run a comprehensive stress test scenario"""
        logger.info(f"Starting stress test: {config.name}")
        
        test_id = f"{config.name}_{int(time.time())}"
        self.active_tests[test_id] = True
        
        start_time = time.time()
        
        try:
            # Initialize test environment
            await self._setup_test_environment(config)
            
            # Run the actual stress test
            results = await self._execute_stress_test(config, test_id)
            
            # Post-test analysis
            await self._analyze_results(results)
            
            # Save results
            await self._save_test_results(results)
            
            self.test_results[test_id] = results
            
            logger.info(f"Stress test completed: {config.name}")
            logger.info(f"Success rate: {results.success_rate:.2%}")
            logger.info(f"Average latency: {results.average_latency_ms:.1f}ms")
            logger.info(f"Throughput: {results.throughput_tph:.1f} tx/hour")
            
            return results
            
        except Exception as e:
            logger.error(f"Stress test failed: {config.name} - {e}")
            raise
        finally:
            self.active_tests[test_id] = False
    
    async def _setup_test_environment(self, config: StressTestConfig):
        """Initialize test environment and validate bridge connectivity"""
        logger.info("Setting up test environment...")
        
        # Validate bridge endpoint connectivity
        async with aiohttp.ClientSession() as session:
            try:
                async with session.get(f"{self.bridge_endpoint}/health", timeout=10) as response:
                    if response.status != 200:
                        raise Exception(f"Bridge health check failed: {response.status}")
                logger.info("Bridge connectivity validated")
            except Exception as e:
                raise Exception(f"Cannot connect to bridge endpoint: {e}")
        
        # Pre-warm any caches or connections
        await self._prewarm_bridge_connections(config.concurrent_users)
        
        logger.info("Test environment setup complete")
    
    async def _prewarm_bridge_connections(self, concurrent_users: int):
        """Pre-warm bridge connections for better test accuracy"""
        logger.info(f"Pre-warming {concurrent_users} bridge connections...")
        
        async def prewarm_connection(session):
            try:
                async with session.get(f"{self.bridge_endpoint}/status", timeout=5) as response:
                    return response.status == 200
            except:
                return False
        
        async with aiohttp.ClientSession() as session:
            tasks = [prewarm_connection(session) for _ in range(concurrent_users)]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
        successful_prewarming = sum(1 for r in results if r is True)
        logger.info(f"Pre-warmed {successful_prewarming}/{concurrent_users} connections")
    
    async def _execute_stress_test(self, config: StressTestConfig, test_id: str) -> StressTestResults:
        """Execute the main stress test scenario"""
        
        start_time = time.time()
        transaction_results: List[TransactionResult] = []
        performance_snapshots: List[Dict[str, Any]] = []
        
        # Start performance monitoring
        monitor_task = asyncio.create_task(
            self._monitor_performance(config, performance_snapshots)
        )
        
        # Start result collector
        collector_task = asyncio.create_task(
            self._collect_results(transaction_results)
        )
        
        try:
            if config.burst_pattern:
                await self._run_burst_pattern_test(config, test_id)
            else:
                await self._run_sustained_load_test(config, test_id)
            
            # Wait for all transactions to complete
            await self._wait_for_completion(config.duration_seconds + 60)  # Extra timeout
            
        finally:
            # Stop monitoring
            monitor_task.cancel()
            collector_task.cancel()
            
            try:
                await monitor_task
            except asyncio.CancelledError:
                pass
            
            try:
                await collector_task
            except asyncio.CancelledError:
                pass
        
        end_time = time.time()
        
        # Compile final results
        return self._compile_test_results(
            config, start_time, end_time, transaction_results, performance_snapshots
        )
    
    async def _run_sustained_load_test(self, config: StressTestConfig, test_id: str):
        """Run sustained load test pattern"""
        logger.info(f"Running sustained load test: {config.target_tps} TPS for {config.duration_seconds}s")
        
        # Calculate timing
        interval_between_tx = 1.0 / config.target_tps if config.target_tps > 0 else 1.0
        end_time = time.time() + config.duration_seconds
        
        # Start worker tasks
        worker_tasks = []
        for i in range(config.concurrent_users):
            task = asyncio.create_task(self._transaction_worker(f"worker_{i}", test_id))
            worker_tasks.append(task)
        
        # Generate transactions at target rate
        tx_counter = 0
        while time.time() < end_time and self.active_tests.get(test_id, False):
            
            # Generate transaction request
            request = self._generate_transaction_request(config, tx_counter)
            
            # Add to queue
            await self.transaction_queue.put(request)
            
            tx_counter += 1
            
            # Rate limiting
            await asyncio.sleep(interval_between_tx)
            
            # Circuit breaker check
            if tx_counter % self.circuit_breaker_window == 0:
                if await self._check_circuit_breaker():
                    logger.warning("Circuit breaker triggered - stopping test")
                    break
        
        # Signal workers to stop
        for _ in worker_tasks:
            await self.transaction_queue.put(None)  # Poison pill
        
        # Wait for workers to complete
        await asyncio.gather(*worker_tasks, return_exceptions=True)
        
        logger.info(f"Sustained load test completed: {tx_counter} transactions generated")
    
    async def _run_burst_pattern_test(self, config: StressTestConfig, test_id: str):
        """Run burst pattern test"""
        logger.info(f"Running burst pattern test: {config.target_tps} TPS base, "
                   f"{config.target_tps * config.burst_multiplier} TPS burst")
        
        end_time = time.time() + config.duration_seconds
        tx_counter = 0
        
        # Start worker tasks
        worker_tasks = []
        for i in range(config.concurrent_users):
            task = asyncio.create_task(self._transaction_worker(f"burst_worker_{i}", test_id))
            worker_tasks.append(task)
        
        while time.time() < end_time and self.active_tests.get(test_id, False):
            
            # Determine if we're in burst mode
            cycle_time = time.time() % (config.burst_duration_seconds * 2)
            is_burst = cycle_time < config.burst_duration_seconds
            
            current_tps = config.target_tps * config.burst_multiplier if is_burst else config.target_tps
            interval = 1.0 / current_tps if current_tps > 0 else 1.0
            
            # Generate burst of transactions
            burst_start = time.time()
            burst_end = burst_start + min(interval * 10, 1.0)  # Generate up to 1 second of transactions
            
            while time.time() < burst_end and time.time() < end_time:
                request = self._generate_transaction_request(config, tx_counter)
                await self.transaction_queue.put(request)
                tx_counter += 1
                
                await asyncio.sleep(interval)
            
            # Brief pause between bursts
            await asyncio.sleep(0.1)
        
        # Signal workers to stop
        for _ in worker_tasks:
            await self.transaction_queue.put(None)
        
        await asyncio.gather(*worker_tasks, return_exceptions=True)
        
        logger.info(f"Burst pattern test completed: {tx_counter} transactions generated")
    
    def _generate_transaction_request(self, config: StressTestConfig, tx_counter: int) -> TransactionRequest:
        """Generate a random transaction request for testing"""
        
        # Select random asset
        asset_id = random.choice(config.asset_types)
        
        # Generate random amount (1-1000 units)
        amount = random.randint(1, 1000) * 10**6  # Assuming 6 decimal places
        
        # Select random chain pair
        chains = ["ethereum", "osmosis", "dytallix"]
        source_chain = random.choice(chains)
        dest_chain = random.choice([c for c in chains if c != source_chain])
        
        # Generate addresses
        source_address = f"{source_chain}_address_{random.randint(1000, 9999)}"
        dest_address = f"{dest_chain}_address_{random.randint(1000, 9999)}"
        
        # Random priority (mostly normal, some high)
        priority = 2 if random.random() < 0.1 else 1
        
        return TransactionRequest(
            id=f"stress_test_tx_{tx_counter}_{int(time.time() * 1000)}",
            asset_id=asset_id,
            amount=amount,
            source_chain=source_chain,
            dest_chain=dest_chain,
            source_address=source_address,
            dest_address=dest_address,
            priority=priority
        )
    
    async def _transaction_worker(self, worker_id: str, test_id: str):
        """Worker task that processes transaction requests"""
        logger.debug(f"Transaction worker {worker_id} started")
        
        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=60)) as session:
            while self.active_tests.get(test_id, False):
                try:
                    # Get next transaction request
                    request = await asyncio.wait_for(self.transaction_queue.get(), timeout=1.0)
                    
                    if request is None:  # Poison pill - shutdown signal
                        break
                    
                    # Process the transaction
                    result = await self._process_transaction(session, request)
                    
                    # Add result to queue
                    await self.result_queue.put(result)
                    
                except asyncio.TimeoutError:
                    continue  # No transactions available, keep waiting
                except Exception as e:
                    logger.error(f"Worker {worker_id} error: {e}")
                    continue
        
        logger.debug(f"Transaction worker {worker_id} finished")
    
    async def _process_transaction(self, session: aiohttp.ClientSession, 
                                  request: TransactionRequest) -> TransactionResult:
        """Process a single bridge transaction"""
        start_time = time.time()
        
        try:
            # Prepare transaction payload
            payload = {
                "asset_id": request.asset_id,
                "amount": request.amount,
                "source_chain": request.source_chain,
                "dest_chain": request.dest_chain,
                "source_address": request.source_address,
                "dest_address": request.dest_address,
                "priority": request.priority
            }
            
            # Send transaction to bridge
            async with session.post(
                f"{self.bridge_endpoint}/bridge/lock_asset",
                json=payload,
                timeout=30
            ) as response:
                
                end_time = time.time()
                latency_ms = (end_time - start_time) * 1000
                
                if response.status == 200:
                    response_data = await response.json()
                    bridge_tx_id = response_data.get("bridge_tx_id")
                    
                    return TransactionResult(
                        request_id=request.id,
                        success=True,
                        start_time=start_time,
                        end_time=end_time,
                        latency_ms=latency_ms,
                        bridge_tx_id=bridge_tx_id
                    )
                else:
                    error_text = await response.text()
                    return TransactionResult(
                        request_id=request.id,
                        success=False,
                        start_time=start_time,
                        end_time=end_time,
                        latency_ms=latency_ms,
                        error_message=f"HTTP {response.status}: {error_text}"
                    )
                    
        except Exception as e:
            end_time = time.time()
            latency_ms = (end_time - start_time) * 1000
            
            return TransactionResult(
                request_id=request.id,
                success=False,
                start_time=start_time,
                end_time=end_time,
                latency_ms=latency_ms,
                error_message=str(e)
            )
    
    async def _collect_results(self, transaction_results: List[TransactionResult]):
        """Collect transaction results from worker tasks"""
        while True:
            try:
                result = await asyncio.wait_for(self.result_queue.get(), timeout=1.0)
                with self.metrics_lock:
                    transaction_results.append(result)
                    
                    # Log progress every 100 transactions
                    if len(transaction_results) % 100 == 0:
                        success_count = sum(1 for r in transaction_results if r.success)
                        success_rate = success_count / len(transaction_results)
                        logger.info(f"Progress: {len(transaction_results)} transactions, "
                                  f"{success_rate:.2%} success rate")
                        
            except asyncio.TimeoutError:
                continue
            except asyncio.CancelledError:
                break
    
    async def _monitor_performance(self, config: StressTestConfig, 
                                  performance_snapshots: List[Dict[str, Any]]):
        """Monitor performance metrics during test execution"""
        logger.info("Starting performance monitoring")
        
        while True:
            try:
                await asyncio.sleep(10)  # Take snapshot every 10 seconds
                
                # Collect current metrics
                snapshot = await self._get_performance_snapshot()
                performance_snapshots.append(snapshot)
                
                logger.debug(f"Performance snapshot: {snapshot}")
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Performance monitoring error: {e}")
                continue
        
        logger.info("Performance monitoring stopped")
    
    async def _get_performance_snapshot(self) -> Dict[str, Any]:
        """Get current performance metrics snapshot"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{self.bridge_endpoint}/metrics", timeout=5) as response:
                    if response.status == 200:
                        metrics = await response.json()
                        return {
                            "timestamp": time.time(),
                            "bridge_metrics": metrics,
                            "system_metrics": await self._get_system_metrics()
                        }
        except Exception as e:
            logger.warning(f"Failed to get performance snapshot: {e}")
        
        return {
            "timestamp": time.time(),
            "bridge_metrics": {},
            "system_metrics": {}
        }
    
    async def _get_system_metrics(self) -> Dict[str, Any]:
        """Get system resource metrics"""
        try:
            import psutil
            
            return {
                "cpu_percent": psutil.cpu_percent(),
                "memory_percent": psutil.virtual_memory().percent,
                "network_io": dict(psutil.net_io_counters()._asdict()),
                "disk_io": dict(psutil.disk_io_counters()._asdict())
            }
        except ImportError:
            return {}
        except Exception as e:
            logger.warning(f"Failed to get system metrics: {e}")
            return {}
    
    async def _check_circuit_breaker(self) -> bool:
        """Check if circuit breaker should trigger"""
        # This would check recent failure rates and trigger if too high
        # For now, return False (no circuit breaker trigger)
        return False
    
    async def _wait_for_completion(self, timeout_seconds: int):
        """Wait for all transactions to complete with timeout"""
        logger.info(f"Waiting for test completion (timeout: {timeout_seconds}s)")
        
        start_wait = time.time()
        while time.time() - start_wait < timeout_seconds:
            if self.transaction_queue.empty() and self.result_queue.empty():
                logger.info("All transactions completed")
                return
            await asyncio.sleep(1)
        
        logger.warning("Timeout waiting for test completion")
    
    def _compile_test_results(self, config: StressTestConfig, start_time: float, 
                            end_time: float, transaction_results: List[TransactionResult],
                            performance_snapshots: List[Dict[str, Any]]) -> StressTestResults:
        """Compile comprehensive test results"""
        
        if not transaction_results:
            logger.warning("No transaction results to compile")
            return StressTestResults(
                config=config,
                start_time=start_time,
                end_time=end_time,
                total_requests=0,
                successful_requests=0,
                failed_requests=0,
                success_rate=0.0,
                average_latency_ms=0.0,
                p50_latency_ms=0.0,
                p95_latency_ms=0.0,
                p99_latency_ms=0.0,
                max_latency_ms=0.0,
                min_latency_ms=0.0,
                throughput_tps=0.0,
                throughput_tph=0.0,
                error_breakdown={},
                performance_over_time=performance_snapshots
            )
        
        # Basic statistics
        total_requests = len(transaction_results)
        successful_requests = sum(1 for r in transaction_results if r.success)
        failed_requests = total_requests - successful_requests
        success_rate = successful_requests / total_requests if total_requests > 0 else 0.0
        
        # Latency statistics
        latencies = [r.latency_ms for r in transaction_results if r.success]
        if latencies:
            average_latency_ms = statistics.mean(latencies)
            p50_latency_ms = statistics.median(latencies)
            p95_latency_ms = self._percentile(latencies, 0.95)
            p99_latency_ms = self._percentile(latencies, 0.99)
            max_latency_ms = max(latencies)
            min_latency_ms = min(latencies)
        else:
            average_latency_ms = p50_latency_ms = p95_latency_ms = p99_latency_ms = 0.0
            max_latency_ms = min_latency_ms = 0.0
        
        # Throughput statistics
        test_duration = end_time - start_time
        throughput_tps = successful_requests / test_duration if test_duration > 0 else 0.0
        throughput_tph = throughput_tps * 3600
        
        # Error breakdown
        error_breakdown = {}
        for result in transaction_results:
            if not result.success and result.error_message:
                error_type = self._categorize_error(result.error_message)
                error_breakdown[error_type] = error_breakdown.get(error_type, 0) + 1
        
        return StressTestResults(
            config=config,
            start_time=start_time,
            end_time=end_time,
            total_requests=total_requests,
            successful_requests=successful_requests,
            failed_requests=failed_requests,
            success_rate=success_rate,
            average_latency_ms=average_latency_ms,
            p50_latency_ms=p50_latency_ms,
            p95_latency_ms=p95_latency_ms,
            p99_latency_ms=p99_latency_ms,
            max_latency_ms=max_latency_ms,
            min_latency_ms=min_latency_ms,
            throughput_tps=throughput_tps,
            throughput_tph=throughput_tph,
            error_breakdown=error_breakdown,
            performance_over_time=performance_snapshots
        )
    
    def _percentile(self, data: List[float], percentile: float) -> float:
        """Calculate percentile value"""
        if not data:
            return 0.0
        sorted_data = sorted(data)
        index = int(len(sorted_data) * percentile)
        return sorted_data[min(index, len(sorted_data) - 1)]
    
    def _categorize_error(self, error_message: str) -> str:
        """Categorize error message into error type"""
        error_lower = error_message.lower()
        
        if "timeout" in error_lower:
            return "timeout"
        elif "connection" in error_lower:
            return "connection_error"
        elif "500" in error_lower:
            return "server_error"
        elif "400" in error_lower or "401" in error_lower or "403" in error_lower:
            return "client_error"
        elif "network" in error_lower:
            return "network_error"
        else:
            return "unknown_error"
    
    async def _analyze_results(self, results: StressTestResults):
        """Perform post-test analysis and generate recommendations"""
        logger.info("Analyzing test results...")
        
        # Performance analysis
        if results.success_rate < 0.95:
            logger.warning(f"Low success rate: {results.success_rate:.2%} (target: >95%)")
        
        if results.average_latency_ms > 30000:
            logger.warning(f"High average latency: {results.average_latency_ms:.1f}ms (target: <30s)")
        
        if results.throughput_tph < 400:
            logger.warning(f"Low throughput: {results.throughput_tph:.1f} tx/hour (target: >400)")
        
        # Error analysis
        if results.error_breakdown:
            logger.info("Error breakdown:")
            for error_type, count in results.error_breakdown.items():
                percentage = (count / results.total_requests) * 100
                logger.info(f"  {error_type}: {count} ({percentage:.1f}%)")
        
        logger.info("Analysis complete")
    
    async def _save_test_results(self, results: StressTestResults):
        """Save test results to files"""
        timestamp = datetime.fromtimestamp(results.start_time).strftime("%Y%m%d_%H%M%S")
        filename = f"stress_test_{results.config.name}_{timestamp}.json"
        filepath = self.results_dir / filename
        
        # Convert results to JSON-serializable format
        results_dict = asdict(results)
        
        with open(filepath, 'w') as f:
            json.dump(results_dict, f, indent=2, default=str)
        
        logger.info(f"Test results saved to: {filepath}")
        
        # Also generate a human-readable summary
        summary_filename = f"stress_test_summary_{results.config.name}_{timestamp}.txt"
        summary_filepath = self.results_dir / summary_filename
        
        with open(summary_filepath, 'w') as f:
            f.write(self._generate_results_summary(results))
        
        logger.info(f"Test summary saved to: {summary_filepath}")
    
    def _generate_results_summary(self, results: StressTestResults) -> str:
        """Generate human-readable results summary"""
        return f"""
Bridge Stress Test Results Summary
==================================

Test Configuration:
- Name: {results.config.name}
- Duration: {results.config.duration_seconds} seconds
- Target TPS: {results.config.target_tps}
- Concurrent Users: {results.config.concurrent_users}
- Burst Pattern: {results.config.burst_pattern}

Test Results:
- Total Requests: {results.total_requests:,}
- Successful Requests: {results.successful_requests:,}
- Failed Requests: {results.failed_requests:,}
- Success Rate: {results.success_rate:.2%}

Performance Metrics:
- Average Latency: {results.average_latency_ms:.1f}ms
- P50 Latency: {results.p50_latency_ms:.1f}ms
- P95 Latency: {results.p95_latency_ms:.1f}ms
- P99 Latency: {results.p99_latency_ms:.1f}ms
- Max Latency: {results.max_latency_ms:.1f}ms
- Min Latency: {results.min_latency_ms:.1f}ms

Throughput:
- Transactions per Second: {results.throughput_tps:.2f}
- Transactions per Hour: {results.throughput_tph:.1f}

Error Breakdown:
{chr(10).join(f"- {error_type}: {count}" for error_type, count in results.error_breakdown.items())}

Test Duration: {results.end_time - results.start_time:.1f} seconds
Test Completed: {datetime.fromtimestamp(results.end_time).isoformat()}
"""

# Predefined test scenarios
def get_production_readiness_test() -> StressTestConfig:
    """500+ transactions per hour sustained load test"""
    return StressTestConfig(
        name="production_readiness",
        duration_seconds=3600,  # 1 hour
        target_tps=0.15,  # ~540 transactions per hour
        concurrent_users=8,
        asset_types=["DYT", "OSMO", "ETH", "USDC", "ATOM"]
    )

def get_burst_load_test() -> StressTestConfig:
    """Burst load test - 100 transactions in 5 minutes"""
    return StressTestConfig(
        name="burst_load",
        duration_seconds=300,  # 5 minutes
        target_tps=0.33,  # ~20 transactions per minute base
        burst_pattern=True,
        burst_duration_seconds=60,
        burst_multiplier=3.0,  # 3x during burst
        concurrent_users=15
    )

def get_failure_recovery_test() -> StressTestConfig:
    """Network failure recovery test"""
    return StressTestConfig(
        name="failure_recovery",
        duration_seconds=1800,  # 30 minutes
        target_tps=0.1,
        failure_injection=True,
        failure_rate=0.15,  # 15% artificial failures
        concurrent_users=5
    )

def get_high_concurrency_test() -> StressTestConfig:
    """High concurrency test"""
    return StressTestConfig(
        name="high_concurrency",
        duration_seconds=600,  # 10 minutes
        target_tps=0.5,
        concurrent_users=25,
        asset_types=["DYT", "ETH"]
    )

async def main():
    """Example usage of the stress testing framework"""
    
    # Initialize the stress tester
    tester = BridgeStressTester()
    
    # Define test scenarios
    test_scenarios = [
        get_production_readiness_test(),
        get_burst_load_test(),
        get_failure_recovery_test(),
        get_high_concurrency_test()
    ]
    
    # Run all test scenarios
    for config in test_scenarios:
        print(f"\n{'='*60}")
        print(f"Running stress test: {config.name}")
        print(f"{'='*60}")
        
        try:
            results = await tester.run_stress_test(config)
            
            print(f"\nTest Results Summary:")
            print(f"Success Rate: {results.success_rate:.2%}")
            print(f"Average Latency: {results.average_latency_ms:.1f}ms")
            print(f"Throughput: {results.throughput_tph:.1f} tx/hour")
            print(f"Total Requests: {results.total_requests:,}")
            
            # Check if test meets targets
            if results.success_rate >= 0.99 and results.average_latency_ms <= 30000 and results.throughput_tph >= 400:
                print("✅ Test PASSED - Meets performance targets")
            else:
                print("❌ Test FAILED - Does not meet performance targets")
                
        except Exception as e:
            print(f"❌ Test FAILED with error: {e}")
        
        # Brief pause between tests
        await asyncio.sleep(10)
    
    print(f"\n{'='*60}")
    print("All stress tests completed!")
    print(f"Results saved to: {tester.results_dir}")

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(main())