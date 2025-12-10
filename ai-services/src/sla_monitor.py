"""
AI SLA Monitoring and Reporting System

Monitors AI service performance against defined SLAs and generates
compliance reports for production readiness assessment.
"""

import asyncio
import json
import logging
import time
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from datetime import datetime, timezone, timedelta
import numpy as np
from pathlib import Path
from collections import deque
import aiohttp
import statistics

logger = logging.getLogger(__name__)

@dataclass
class SLAMetric:
    """Individual SLA metric measurement"""
    timestamp: datetime
    service_name: str
    metric_name: str
    value: float
    threshold: float
    compliant: bool
    response_time_ms: Optional[float] = None
    error_message: Optional[str] = None

@dataclass
class SLAReport:
    """SLA compliance report"""
    period_start: datetime
    period_end: datetime
    total_requests: int
    successful_requests: int
    average_latency_ms: float
    p95_latency_ms: float
    p99_latency_ms: float
    accuracy_rate: float
    error_rate: float
    availability_percent: float
    sla_compliance_score: float
    violations: List[Dict[str, Any]]

class SLAMonitor:
    """Production SLA monitoring system for AI services"""
    
    def __init__(self, config_path: str = "config/sla_config.json"):
        self.config = self._load_config(config_path)
        self.metrics_history: deque = deque(maxlen=100000)
        self.current_metrics: Dict[str, Any] = {}
        
        # SLA thresholds
        self.latency_sla_ms = self.config.get('latency_sla_ms', 1000)
        self.accuracy_sla = self.config.get('accuracy_sla', 0.95)
        self.availability_sla = self.config.get('availability_sla', 0.999)
        self.error_rate_sla = self.config.get('error_rate_sla', 0.01)
        
        # Monitoring configuration
        self.monitoring_interval = self.config.get('monitoring_interval', 60)
        self.report_interval = self.config.get('report_interval', 3600)
        
        # Service endpoints
        self.ai_services = self.config.get('ai_services', {
            'fraud_detection': 'http://localhost:8001/api/fraud/score',
            'bridge_optimization': 'http://localhost:8002/api/optimize',
            'risk_scoring': 'http://localhost:8003/api/risk/score'
        })
        
        logger.info(f"SLA Monitor initialized - Latency: <{self.latency_sla_ms}ms, Accuracy: >{self.accuracy_sla}")

    def _load_config(self, config_path: str) -> Dict[str, Any]:
        """Load SLA monitoring configuration"""
        try:
            with open(config_path, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            logger.warning(f"Config file not found: {config_path}. Using defaults.")
            return {
                'latency_sla_ms': 1000,
                'accuracy_sla': 0.95,
                'availability_sla': 0.999,
                'error_rate_sla': 0.01,
                'monitoring_interval': 60,
                'report_interval': 3600
            }

    async def start_monitoring(self):
        """Start continuous SLA monitoring"""
        logger.info("Starting SLA monitoring...")
        
        # Start monitoring tasks
        monitoring_task = asyncio.create_task(self._monitoring_loop())
        reporting_task = asyncio.create_task(self._reporting_loop())
        
        try:
            await asyncio.gather(monitoring_task, reporting_task)
        except KeyboardInterrupt:
            logger.info("SLA monitoring stopped")

    async def _monitoring_loop(self):
        """Main monitoring loop"""
        while True:
            try:
                # Test all AI services
                for service_name, endpoint in self.ai_services.items():
                    await self._test_service(service_name, endpoint)
                
                await asyncio.sleep(self.monitoring_interval)
                
            except Exception as e:
                logger.error(f"Monitoring loop error: {e}")
                await asyncio.sleep(30)  # Back off on error

    async def _test_service(self, service_name: str, endpoint: str):
        """Test individual AI service for SLA compliance"""
        
        # Generate test payload based on service
        test_payload = self._generate_test_payload(service_name)
        
        start_time = time.time()
        error_message = None
        
        try:
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=5)) as session:
                async with session.post(endpoint, json=test_payload) as response:
                    response_time_ms = (time.time() - start_time) * 1000
                    
                    if response.status == 200:
                        result = await response.json()
                        accuracy = self._extract_accuracy(service_name, result)
                        
                        # Record latency metric
                        latency_metric = SLAMetric(
                            timestamp=datetime.now(timezone.utc),
                            service_name=service_name,
                            metric_name='latency_ms',
                            value=response_time_ms,
                            threshold=self.latency_sla_ms,
                            compliant=response_time_ms <= self.latency_sla_ms,
                            response_time_ms=response_time_ms
                        )
                        self.metrics_history.append(latency_metric)
                        
                        # Record accuracy metric if available
                        if accuracy is not None:
                            accuracy_metric = SLAMetric(
                                timestamp=datetime.now(timezone.utc),
                                service_name=service_name,
                                metric_name='accuracy',
                                value=accuracy,
                                threshold=self.accuracy_sla,
                                compliant=accuracy >= self.accuracy_sla,
                                response_time_ms=response_time_ms
                            )
                            self.metrics_history.append(accuracy_metric)
                    
                    else:
                        error_message = f"HTTP {response.status}"
                        
        except asyncio.TimeoutError:
            error_message = "Request timeout"
            response_time_ms = 5000  # Timeout duration
        except Exception as e:
            error_message = str(e)
            response_time_ms = (time.time() - start_time) * 1000
        
        # Record error metric if there was an error
        if error_message:
            error_metric = SLAMetric(
                timestamp=datetime.now(timezone.utc),
                service_name=service_name,
                metric_name='error',
                value=1.0,
                threshold=0.0,
                compliant=False,
                response_time_ms=response_time_ms,
                error_message=error_message
            )
            self.metrics_history.append(error_metric)

    def _generate_test_payload(self, service_name: str) -> Dict[str, Any]:
        """Generate appropriate test payload for each service"""
        
        if service_name == 'fraud_detection':
            return {
                'transaction': {
                    'amount': 1000.0,
                    'from_address': '0x1234567890abcdef',
                    'to_address': '0xabcdef1234567890',
                    'timestamp': int(time.time()),
                    'gas_price': 20,
                    'nonce': 42
                }
            }
        
        elif service_name == 'bridge_optimization':
            return {
                'network_condition': {
                    'rpc_latency_ms': 150.0,
                    'block_time_ms': 6000.0,
                    'network_congestion': 0.3,
                    'error_rate': 0.02,
                    'timestamp': time.time()
                }
            }
        
        elif service_name == 'risk_scoring':
            return {
                'contract_bytecode': '0x608060405234801561001057600080fd5b50...',
                'deployment_context': {
                    'deployer': '0x1234567890abcdef',
                    'gas_limit': 500000,
                    'value': 0
                }
            }
        
        else:
            return {'test': True, 'timestamp': time.time()}

    def _extract_accuracy(self, service_name: str, response: Dict[str, Any]) -> Optional[float]:
        """Extract accuracy metric from service response"""
        
        if service_name == 'fraud_detection':
            # For fraud detection, we consider accuracy as confidence when score is reasonable
            confidence = response.get('confidence', 0.0)
            score = response.get('fraud_score', 0.0)
            # Simple heuristic: if confidence > 0.8 and score is not extreme, consider accurate
            if confidence > 0.8 and 0.1 < score < 0.9:
                return confidence
                
        elif service_name == 'bridge_optimization':
            # For optimization, accuracy is based on confidence score
            return response.get('confidence_score', 0.0)
            
        elif service_name == 'risk_scoring':
            # For risk scoring, accuracy is based on confidence
            return response.get('confidence', 0.0)
        
        return None

    async def _reporting_loop(self):
        """Generate periodic SLA reports"""
        while True:
            try:
                await asyncio.sleep(self.report_interval)
                report = self.generate_sla_report()
                await self._save_sla_report(report)
                
            except Exception as e:
                logger.error(f"Reporting loop error: {e}")

    def generate_sla_report(self, hours_back: int = 1) -> SLAReport:
        """Generate SLA compliance report for specified time period"""
        
        end_time = datetime.now(timezone.utc)
        start_time = end_time - timedelta(hours=hours_back)
        
        # Filter metrics for time period
        period_metrics = [
            m for m in self.metrics_history
            if start_time <= m.timestamp <= end_time
        ]
        
        if not period_metrics:
            logger.warning("No metrics available for SLA report")
            return self._empty_sla_report(start_time, end_time)
        
        # Calculate SLA metrics
        total_requests = len([m for m in period_metrics if m.metric_name in ['latency_ms', 'error']])
        error_requests = len([m for m in period_metrics if m.metric_name == 'error'])
        successful_requests = total_requests - error_requests
        
        # Latency metrics
        latency_metrics = [m for m in period_metrics if m.metric_name == 'latency_ms']
        if latency_metrics:
            latencies = [m.value for m in latency_metrics]
            average_latency_ms = statistics.mean(latencies)
            p95_latency_ms = np.percentile(latencies, 95)
            p99_latency_ms = np.percentile(latencies, 99)
        else:
            average_latency_ms = p95_latency_ms = p99_latency_ms = 0.0
        
        # Accuracy metrics
        accuracy_metrics = [m for m in period_metrics if m.metric_name == 'accuracy']
        if accuracy_metrics:
            accuracy_rate = statistics.mean([m.value for m in accuracy_metrics])
        else:
            accuracy_rate = 0.0
        
        # Error rate
        error_rate = error_requests / total_requests if total_requests > 0 else 0.0
        
        # Availability (based on successful responses)
        availability_percent = successful_requests / total_requests if total_requests > 0 else 0.0
        
        # SLA compliance score
        sla_compliance_score = self._calculate_sla_compliance_score(
            average_latency_ms, accuracy_rate, error_rate, availability_percent
        )
        
        # Collect violations
        violations = self._collect_violations(period_metrics)
        
        return SLAReport(
            period_start=start_time,
            period_end=end_time,
            total_requests=total_requests,
            successful_requests=successful_requests,
            average_latency_ms=average_latency_ms,
            p95_latency_ms=p95_latency_ms,
            p99_latency_ms=p99_latency_ms,
            accuracy_rate=accuracy_rate,
            error_rate=error_rate,
            availability_percent=availability_percent,
            sla_compliance_score=sla_compliance_score,
            violations=violations
        )

    def _calculate_sla_compliance_score(self, latency: float, accuracy: float, 
                                      error_rate: float, availability: float) -> float:
        """Calculate overall SLA compliance score (0-1)"""
        
        # Component scores
        latency_score = 1.0 if latency <= self.latency_sla_ms else max(0, 1 - (latency - self.latency_sla_ms) / self.latency_sla_ms)
        accuracy_score = min(1.0, accuracy / self.accuracy_sla) if accuracy > 0 else 0.0
        error_score = 1.0 if error_rate <= self.error_rate_sla else max(0, 1 - (error_rate - self.error_rate_sla) / self.error_rate_sla)
        availability_score = min(1.0, availability / self.availability_sla)
        
        # Weighted average (latency and accuracy are most important)
        weights = [0.3, 0.4, 0.15, 0.15]  # latency, accuracy, error_rate, availability
        scores = [latency_score, accuracy_score, error_score, availability_score]
        
        return sum(w * s for w, s in zip(weights, scores))

    def _collect_violations(self, metrics: List[SLAMetric]) -> List[Dict[str, Any]]:
        """Collect SLA violations from metrics"""
        violations = []
        
        for metric in metrics:
            if not metric.compliant:
                violations.append({
                    'timestamp': metric.timestamp.isoformat(),
                    'service': metric.service_name,
                    'metric': metric.metric_name,
                    'value': metric.value,
                    'threshold': metric.threshold,
                    'error_message': metric.error_message
                })
        
        return violations

    def _empty_sla_report(self, start_time: datetime, end_time: datetime) -> SLAReport:
        """Generate empty SLA report when no data is available"""
        return SLAReport(
            period_start=start_time,
            period_end=end_time,
            total_requests=0,
            successful_requests=0,
            average_latency_ms=0.0,
            p95_latency_ms=0.0,
            p99_latency_ms=0.0,
            accuracy_rate=0.0,
            error_rate=0.0,
            availability_percent=0.0,
            sla_compliance_score=0.0,
            violations=[]
        )

    async def _save_sla_report(self, report: SLAReport):
        """Save SLA report to evidence directory"""
        
        # Create evidence directory
        evidence_dir = Path("launch-evidence/ai")
        evidence_dir.mkdir(parents=True, exist_ok=True)
        
        # Save detailed report
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        report_file = evidence_dir / f"ai_sla_report_{timestamp}.json"
        
        with open(report_file, 'w') as f:
            json.dump(asdict(report), f, indent=2, default=str)
        
        # Update the main SLA report file
        main_report_file = evidence_dir / "ai_sla_report.json"
        
        # Load existing reports to maintain history
        existing_reports = []
        if main_report_file.exists():
            try:
                with open(main_report_file, 'r') as f:
                    data = json.load(f)
                    existing_reports = data.get('historical_reports', [])
            except:
                pass
        
        # Add current report to history (keep last 24 hours)
        existing_reports.append(asdict(report))
        existing_reports = existing_reports[-24:]  # Keep last 24 hours
        
        # Create summary report
        summary_report = {
            'generated_at': datetime.now(timezone.utc).isoformat(),
            'current_sla_status': {
                'compliance_score': report.sla_compliance_score,
                'latency_p95_ms': report.p95_latency_ms,
                'accuracy_rate': report.accuracy_rate,
                'error_rate': report.error_rate,
                'availability_percent': report.availability_percent,
                'sla_targets': {
                    'latency_ms': self.latency_sla_ms,
                    'accuracy': self.accuracy_sla,
                    'error_rate': self.error_rate_sla,
                    'availability': self.availability_sla
                }
            },
            'recent_violations': report.violations[-10:],  # Last 10 violations
            'historical_reports': existing_reports,
            'trends': self._calculate_sla_trends(existing_reports)
        }
        
        with open(main_report_file, 'w') as f:
            json.dump(summary_report, f, indent=2, default=str)
        
        logger.info(f"SLA report saved: compliance={report.sla_compliance_score:.3f}")

    def _calculate_sla_trends(self, reports: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calculate SLA trends from historical reports"""
        if len(reports) < 2:
            return {'status': 'insufficient_data'}
        
        # Get compliance scores from last 12 reports
        recent_scores = [r['sla_compliance_score'] for r in reports[-12:]]
        
        if len(recent_scores) >= 2:
            trend_slope = (recent_scores[-1] - recent_scores[0]) / len(recent_scores)
            
            if trend_slope > 0.01:
                trend_direction = 'improving'
            elif trend_slope < -0.01:
                trend_direction = 'degrading'
            else:
                trend_direction = 'stable'
        else:
            trend_direction = 'unknown'
        
        return {
            'compliance_trend': trend_direction,
            'average_compliance': statistics.mean(recent_scores),
            'min_compliance': min(recent_scores),
            'max_compliance': max(recent_scores),
            'trend_slope': trend_slope if len(recent_scores) >= 2 else 0
        }

    def get_current_sla_status(self) -> Dict[str, Any]:
        """Get current real-time SLA status"""
        
        # Get metrics from last 5 minutes
        recent_time = datetime.now(timezone.utc) - timedelta(minutes=5)
        recent_metrics = [
            m for m in self.metrics_history
            if m.timestamp >= recent_time
        ]
        
        if not recent_metrics:
            return {'status': 'no_recent_data'}
        
        # Quick compliance check
        latency_violations = len([m for m in recent_metrics if m.metric_name == 'latency_ms' and not m.compliant])
        accuracy_violations = len([m for m in recent_metrics if m.metric_name == 'accuracy' and not m.compliant])
        error_count = len([m for m in recent_metrics if m.metric_name == 'error'])
        
        total_requests = len([m for m in recent_metrics if m.metric_name in ['latency_ms', 'error']])
        
        return {
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'monitoring_status': 'active',
            'recent_requests': total_requests,
            'latency_violations': latency_violations,
            'accuracy_violations': accuracy_violations,
            'error_count': error_count,
            'compliance_status': 'healthy' if (latency_violations + accuracy_violations + error_count) == 0 else 'degraded'
        }

# CLI integration for testing
async def run_sla_test():
    """Run a quick SLA test for all services"""
    monitor = SLAMonitor()
    
    print("Running SLA compliance test...")
    
    # Test each service once
    for service_name, endpoint in monitor.ai_services.items():
        print(f"Testing {service_name}...")
        await monitor._test_service(service_name, endpoint)
    
    # Generate report
    report = monitor.generate_sla_report(hours_back=1)
    
    print(f"\nSLA Test Results:")
    print(f"Compliance Score: {report.sla_compliance_score:.2%}")
    print(f"Average Latency: {report.average_latency_ms:.1f}ms")
    print(f"Accuracy Rate: {report.accuracy_rate:.2%}")
    print(f"Error Rate: {report.error_rate:.2%}")
    print(f"Violations: {len(report.violations)}")
    
    # Save the test report
    await monitor._save_sla_report(report)
    
    return report

if __name__ == '__main__':
    asyncio.run(run_sla_test())