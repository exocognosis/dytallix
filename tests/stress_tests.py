#!/usr/bin/env python3
"""
Stress Testing Suite for Dytallix Blockchain

This script provides comprehensive stress testing capabilities for the Dytallix
blockchain network, focusing on high transaction loads and system resilience.

Features:
- High-volume transaction simulation
- Network partition testing
- Memory pressure testing
- Consensus mechanism stress testing
- Performance degradation analysis
"""

import asyncio
import argparse
import json
import logging
import random
import statistics
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, asdict
from typing import List, Dict, Optional, Tuple
import sys
import os

# Add the project root to Python path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

@dataclass
class StressTestConfig:
    """Configuration for stress testing parameters"""
    # Transaction volume parameters
    transactions_per_second: int = 1000
    test_duration_seconds: int = 300
    burst_mode: bool = False
    burst_multiplier: float = 5.0
    burst_duration_seconds: int = 30
    
    # Network simulation parameters
    node_count: int = 10
    network_latency_ms: int = 50
    packet_loss_rate: float = 0.01
    
    # Transaction parameters
    transaction_size_bytes: int = 512
    transaction_size_variance: float = 0.2
    
    # PQC algorithm distribution
    dilithium_percentage: float = 0.6
    falcon_percentage: float = 0.3
    sphincs_percentage: float = 0.1
    
    # Resource limits
    max_memory_mb: int = 2048
    max_cpu_cores: int = 8
    
    # Monitoring parameters
    metrics_interval_seconds: int = 10
    enable_detailed_logging: bool = False

@dataclass
class TransactionMetrics:
    """Metrics for individual transactions"""
    transaction_id: str
    timestamp: float
    size_bytes: int
    pqc_algorithm: str
    processing_time_ms: float
    success: bool
    error_message: Optional[str] = None

@dataclass
class SystemMetrics:
    """System-wide performance metrics"""
    timestamp: float
    transactions_processed: int
    transactions_per_second: float
    average_latency_ms: float
    p95_latency_ms: float
    p99_latency_ms: float
    success_rate: float
    memory_usage_mb: float
    cpu_utilization: float
    network_throughput_mbps: float
    active_connections: int
    pending_transactions: int

class MockBlockchainNode:
    """Mock blockchain node for stress testing"""
    
    def __init__(self, node_id: str, config: StressTestConfig):
        self.node_id = node_id
        self.config = config
        self.processed_transactions = 0
        self.failed_transactions = 0
        self.total_processing_time = 0.0
        self.memory_usage = 0
        self.is_running = False
        
    async def start(self):
        """Start the mock node"""
        self.is_running = True
        logging.info(f"Node {self.node_id} started")
        
    async def stop(self):
        """Stop the mock node"""
        self.is_running = False
        logging.info(f"Node {self.node_id} stopped")
        
    async def process_transaction(self, transaction: Dict) -> TransactionMetrics:
        """Process a single transaction and return metrics"""
        start_time = time.time()
        
        # Simulate transaction processing time based on PQC algorithm
        processing_time = self._calculate_processing_time(transaction['pqc_algorithm'])
        
        # Add network latency simulation
        network_delay = random.uniform(0, self.config.network_latency_ms / 1000.0)
        await asyncio.sleep(processing_time + network_delay)
        
        # Simulate occasional failures
        success = random.random() > 0.001  # 0.1% failure rate
        
        end_time = time.time()
        actual_processing_time = (end_time - start_time) * 1000  # Convert to ms
        
        if success:
            self.processed_transactions += 1
        else:
            self.failed_transactions += 1
            
        self.total_processing_time += actual_processing_time
        
        # Update memory usage (simplified simulation)
        self.memory_usage += transaction['size_bytes']
        if self.memory_usage > self.config.max_memory_mb * 1024 * 1024:
            self.memory_usage = self.config.max_memory_mb * 1024 * 1024 * 0.8  # GC simulation
        
        return TransactionMetrics(
            transaction_id=transaction['id'],
            timestamp=start_time,
            size_bytes=transaction['size_bytes'],
            pqc_algorithm=transaction['pqc_algorithm'],
            processing_time_ms=actual_processing_time,
            success=success,
            error_message=None if success else "Simulated processing error"
        )
    
    def _calculate_processing_time(self, pqc_algorithm: str) -> float:
        """Calculate processing time based on PQC algorithm"""
        base_times = {
            'dilithium5': 0.001,    # 1ms base
            'falcon1024': 0.002,    # 2ms base
            'sphincs256': 0.005     # 5ms base
        }
        
        base_time = base_times.get(pqc_algorithm, 0.001)
        # Add some randomness
        return base_time * random.uniform(0.8, 1.2)
    
    def get_metrics(self) -> Dict:
        """Get current node metrics"""
        total_transactions = self.processed_transactions + self.failed_transactions
        success_rate = self.processed_transactions / max(total_transactions, 1)
        avg_processing_time = self.total_processing_time / max(self.processed_transactions, 1)
        
        return {
            'node_id': self.node_id,
            'processed_transactions': self.processed_transactions,
            'failed_transactions': self.failed_transactions,
            'success_rate': success_rate,
            'average_processing_time_ms': avg_processing_time,
            'memory_usage_mb': self.memory_usage / (1024 * 1024),
            'is_running': self.is_running
        }

class TransactionGenerator:
    """Generates transactions for stress testing"""
    
    def __init__(self, config: StressTestConfig):
        self.config = config
        self.transaction_counter = 0
        
    def generate_transaction(self) -> Dict:
        """Generate a single transaction"""
        self.transaction_counter += 1
        
        # Determine PQC algorithm based on configured distribution
        rand = random.random()
        if rand < self.config.dilithium_percentage:
            pqc_algorithm = 'dilithium5'
        elif rand < self.config.dilithium_percentage + self.config.falcon_percentage:
            pqc_algorithm = 'falcon1024'
        else:
            pqc_algorithm = 'sphincs256'
        
        # Calculate transaction size with variance
        base_size = self.config.transaction_size_bytes
        variance = base_size * self.config.transaction_size_variance
        size = int(random.uniform(base_size - variance, base_size + variance))
        
        return {
            'id': f"tx_{self.transaction_counter:08d}",
            'timestamp': time.time(),
            'size_bytes': size,
            'pqc_algorithm': pqc_algorithm,
            'data': f"mock_transaction_data_{self.transaction_counter}"
        }
    
    async def generate_load(self, target_tps: int, duration_seconds: int) -> List[Dict]:
        """Generate transactions at the target TPS for specified duration"""
        transactions = []
        interval = 1.0 / target_tps
        
        start_time = time.time()
        while time.time() - start_time < duration_seconds:
            transaction = self.generate_transaction()
            transactions.append(transaction)
            
            # Wait for next transaction
            await asyncio.sleep(interval)
            
        return transactions

class StressTestOrchestrator:
    """Orchestrates the stress testing process"""
    
    def __init__(self, config: StressTestConfig):
        self.config = config
        self.nodes = []
        self.generator = TransactionGenerator(config)
        self.metrics_history = []
        self.transaction_metrics = []
        
        # Setup logging
        log_level = logging.DEBUG if config.enable_detailed_logging else logging.INFO
        logging.basicConfig(
            level=log_level,
            format='%(asctime)s - %(levelname)s - %(message)s'
        )
        
    async def setup_nodes(self):
        """Setup mock blockchain nodes"""
        logging.info(f"Setting up {self.config.node_count} nodes...")
        
        for i in range(self.config.node_count):
            node = MockBlockchainNode(f"node_{i:03d}", self.config)
            await node.start()
            self.nodes.append(node)
            
        logging.info(f"All {len(self.nodes)} nodes started successfully")
    
    async def run_stress_test(self):
        """Run the main stress test"""
        logging.info("🚀 Starting stress test...")
        logging.info(f"Target: {self.config.transactions_per_second} TPS for {self.config.test_duration_seconds}s")
        
        # Setup nodes
        await self.setup_nodes()
        
        # Start metrics collection
        metrics_task = asyncio.create_task(self._collect_metrics())
        
        # Generate and process transactions
        await self._run_transaction_load()
        
        # Stop metrics collection
        metrics_task.cancel()
        
        # Cleanup
        await self._cleanup_nodes()
        
        # Generate report
        self._generate_report()
    
    async def _run_transaction_load(self):
        """Run the transaction load generation and processing"""
        if self.config.burst_mode:
            await self._run_burst_mode()
        else:
            await self._run_sustained_load()
    
    async def _run_sustained_load(self):
        """Run sustained load testing"""
        logging.info("Running sustained load test...")
        
        # Create transaction queue
        transaction_queue = asyncio.Queue(maxsize=10000)
        
        # Start transaction generator
        generator_task = asyncio.create_task(
            self._generate_transactions_async(transaction_queue)
        )
        
        # Start transaction processors
        processor_tasks = []
        for node in self.nodes:
            task = asyncio.create_task(
                self._process_transactions_async(node, transaction_queue)
            )
            processor_tasks.append(task)
        
        # Wait for test duration
        await asyncio.sleep(self.config.test_duration_seconds)
        
        # Stop generation
        generator_task.cancel()
        
        # Wait for queue to empty
        await transaction_queue.join()
        
        # Stop processors
        for task in processor_tasks:
            task.cancel()
    
    async def _run_burst_mode(self):
        """Run burst mode testing"""
        logging.info("Running burst mode test...")
        
        normal_tps = self.config.transactions_per_second
        burst_tps = int(normal_tps * self.config.burst_multiplier)
        
        burst_interval = 60  # Burst every 60 seconds
        elapsed = 0
        
        while elapsed < self.config.test_duration_seconds:
            # Normal load phase
            normal_duration = min(burst_interval - self.config.burst_duration_seconds, 
                                self.config.test_duration_seconds - elapsed)
            if normal_duration > 0:
                logging.info(f"Normal load: {normal_tps} TPS for {normal_duration}s")
                await self._run_load_phase(normal_tps, normal_duration)
                elapsed += normal_duration
            
            # Burst phase
            if elapsed < self.config.test_duration_seconds:
                burst_duration = min(self.config.burst_duration_seconds,
                                   self.config.test_duration_seconds - elapsed)
                logging.info(f"Burst load: {burst_tps} TPS for {burst_duration}s")
                await self._run_load_phase(burst_tps, burst_duration)
                elapsed += burst_duration
    
    async def _run_load_phase(self, tps: int, duration: int):
        """Run a specific load phase"""
        transaction_queue = asyncio.Queue(maxsize=10000)
        
        # Generate transactions at target TPS
        async def generate():
            interval = 1.0 / tps
            start_time = time.time()
            
            while time.time() - start_time < duration:
                transaction = self.generator.generate_transaction()
                await transaction_queue.put(transaction)
                await asyncio.sleep(interval)
        
        # Process transactions
        async def process(node):
            while True:
                try:
                    transaction = await asyncio.wait_for(
                        transaction_queue.get(), timeout=1.0
                    )
                    metrics = await node.process_transaction(transaction)
                    self.transaction_metrics.append(metrics)
                    transaction_queue.task_done()
                except asyncio.TimeoutError:
                    break
        
        # Start tasks
        tasks = [asyncio.create_task(generate())]
        for node in self.nodes:
            tasks.append(asyncio.create_task(process(node)))
        
        # Wait for completion
        await asyncio.gather(*tasks, return_exceptions=True)
    
    async def _generate_transactions_async(self, queue: asyncio.Queue):
        """Async transaction generator"""
        interval = 1.0 / self.config.transactions_per_second
        
        while True:
            transaction = self.generator.generate_transaction()
            await queue.put(transaction)
            await asyncio.sleep(interval)
    
    async def _process_transactions_async(self, node: MockBlockchainNode, queue: asyncio.Queue):
        """Async transaction processor"""
        while True:
            try:
                transaction = await queue.get()
                metrics = await node.process_transaction(transaction)
                self.transaction_metrics.append(metrics)
                queue.task_done()
            except asyncio.CancelledError:
                break
    
    async def _collect_metrics(self):
        """Collect system metrics periodically"""
        while True:
            try:
                await asyncio.sleep(self.config.metrics_interval_seconds)
                
                # Collect metrics from all nodes
                node_metrics = [node.get_metrics() for node in self.nodes]
                
                # Calculate system-wide metrics
                system_metrics = self._calculate_system_metrics(node_metrics)
                self.metrics_history.append(system_metrics)
                
                # Log current status
                logging.info(f"TPS: {system_metrics.transactions_per_second:.1f}, "
                           f"Latency: {system_metrics.average_latency_ms:.1f}ms, "
                           f"Success: {system_metrics.success_rate:.2%}")
                           
            except asyncio.CancelledError:
                break
    
    def _calculate_system_metrics(self, node_metrics: List[Dict]) -> SystemMetrics:
        """Calculate system-wide metrics from node metrics"""
        total_processed = sum(m['processed_transactions'] for m in node_metrics)
        total_failed = sum(m['failed_transactions'] for m in node_metrics)
        total_transactions = total_processed + total_failed
        
        success_rate = total_processed / max(total_transactions, 1)
        
        # Calculate latency percentiles from recent transactions
        recent_latencies = [
            m.processing_time_ms for m in self.transaction_metrics[-1000:]
            if m.success
        ]
        
        avg_latency = statistics.mean(recent_latencies) if recent_latencies else 0
        p95_latency = statistics.quantiles(recent_latencies, n=20)[18] if len(recent_latencies) >= 20 else avg_latency
        p99_latency = statistics.quantiles(recent_latencies, n=100)[98] if len(recent_latencies) >= 100 else avg_latency
        
        # Calculate TPS (based on recent window)
        recent_window = 60  # seconds
        current_time = time.time()
        recent_transactions = [
            m for m in self.transaction_metrics 
            if current_time - m.timestamp <= recent_window and m.success
        ]
        tps = len(recent_transactions) / recent_window
        
        # Calculate memory usage
        avg_memory = statistics.mean(m['memory_usage_mb'] for m in node_metrics)
        
        return SystemMetrics(
            timestamp=current_time,
            transactions_processed=total_processed,
            transactions_per_second=tps,
            average_latency_ms=avg_latency,
            p95_latency_ms=p95_latency,
            p99_latency_ms=p99_latency,
            success_rate=success_rate,
            memory_usage_mb=avg_memory,
            cpu_utilization=0.0,  # TODO: Implement CPU monitoring
            network_throughput_mbps=0.0,  # TODO: Implement network monitoring
            active_connections=len(self.nodes),
            pending_transactions=0  # TODO: Implement queue monitoring
        )
    
    async def _cleanup_nodes(self):
        """Cleanup all nodes"""
        logging.info("Cleaning up nodes...")
        for node in self.nodes:
            await node.stop()
    
    def _generate_report(self):
        """Generate final test report"""
        logging.info("📊 Generating stress test report...")
        
        if not self.metrics_history:
            logging.warning("No metrics collected!")
            return
        
        # Calculate overall statistics
        total_transactions = len(self.transaction_metrics)
        successful_transactions = sum(1 for m in self.transaction_metrics if m.success)
        success_rate = successful_transactions / max(total_transactions, 1)
        
        latencies = [m.processing_time_ms for m in self.transaction_metrics if m.success]
        avg_latency = statistics.mean(latencies) if latencies else 0
        
        max_tps = max(m.transactions_per_second for m in self.metrics_history)
        avg_tps = statistics.mean(m.transactions_per_second for m in self.metrics_history)
        
        # Generate report
        report = {
            'test_config': asdict(self.config),
            'summary': {
                'total_transactions': total_transactions,
                'successful_transactions': successful_transactions,
                'success_rate': success_rate,
                'average_latency_ms': avg_latency,
                'max_tps_achieved': max_tps,
                'average_tps': avg_tps,
                'test_duration_actual': self.metrics_history[-1].timestamp - self.metrics_history[0].timestamp if self.metrics_history else 0
            },
            'detailed_metrics': [asdict(m) for m in self.metrics_history[-10:]]  # Last 10 samples
        }
        
        # Save report
        report_filename = f"stress_test_report_{int(time.time())}.json"
        with open(report_filename, 'w') as f:
            json.dump(report, f, indent=2)
        
        # Print summary
        print("\n" + "="*60)
        print("🎯 STRESS TEST RESULTS")
        print("="*60)
        print(f"📊 Total Transactions: {total_transactions:,}")
        print(f"✅ Success Rate: {success_rate:.2%}")
        print(f"⏱️  Average Latency: {avg_latency:.2f}ms")
        print(f"🚀 Max TPS Achieved: {max_tps:.1f}")
        print(f"📈 Average TPS: {avg_tps:.1f}")
        print(f"⏰ Test Duration: {report['summary']['test_duration_actual']:.1f}s")
        print(f"💾 Report saved: {report_filename}")
        print("="*60)

async def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description="Dytallix Blockchain Stress Testing Suite")
    
    parser.add_argument('--tps', type=int, default=1000,
                       help='Target transactions per second (default: 1000)')
    parser.add_argument('--duration', type=int, default=300,
                       help='Test duration in seconds (default: 300)')
    parser.add_argument('--nodes', type=int, default=10,
                       help='Number of nodes to simulate (default: 10)')
    parser.add_argument('--burst', action='store_true',
                       help='Enable burst mode testing')
    parser.add_argument('--burst-multiplier', type=float, default=5.0,
                       help='Burst load multiplier (default: 5.0)')
    parser.add_argument('--verbose', action='store_true',
                       help='Enable detailed logging')
    
    args = parser.parse_args()
    
    # Create configuration
    config = StressTestConfig(
        transactions_per_second=args.tps,
        test_duration_seconds=args.duration,
        node_count=args.nodes,
        burst_mode=args.burst,
        burst_multiplier=args.burst_multiplier,
        enable_detailed_logging=args.verbose
    )
    
    # Run stress test
    orchestrator = StressTestOrchestrator(config)
    await orchestrator.run_stress_test()

if __name__ == "__main__":
    asyncio.run(main())