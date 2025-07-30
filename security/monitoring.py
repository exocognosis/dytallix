"""
Dytallix Real-Time Monitoring & Incident Response
- AI-driven anomaly detection and incident response hooks
"""
import time
import json
import threading
import queue
import hashlib
import statistics
from typing import Dict, List, Any, Optional, Callable
from dataclasses import dataclass, asdict
from collections import deque, defaultdict
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class NetworkMetrics:
    """Network performance and security metrics"""
    timestamp: float
    transaction_count: int
    block_height: int
    network_hashrate: float
    node_count: int
    memory_usage: float
    cpu_usage: float
    disk_usage: float
    network_latency: float
    error_rate: float
    
@dataclass
class SecurityAlert:
    """Security alert information"""
    alert_id: str
    alert_type: str
    severity: str  # "low", "medium", "high", "critical"
    timestamp: float
    source: str
    details: Dict[str, Any]
    remediation_actions: List[str]
    
@dataclass
class AnomalyDetection:
    """Anomaly detection result"""
    metric_name: str
    current_value: float
    expected_range: tuple
    anomaly_score: float
    is_anomaly: bool
    timestamp: float

class NetworkMonitor:
    """Real-time network monitoring with anomaly detection"""
    
    def __init__(self, history_size: int = 1000):
        self.history_size = history_size
        self.metrics_history = deque(maxlen=history_size)
        self.anomaly_thresholds = {
            'transaction_count': (0.3, 3.0),  # (min_factor, max_factor) of moving average
            'memory_usage': (0.0, 0.9),  # absolute thresholds
            'cpu_usage': (0.0, 0.8),
            'error_rate': (0.0, 0.05),
            'network_latency': (0.0, 1000.0),  # milliseconds
        }
        self.alerts = deque(maxlen=100)
        self.is_monitoring = False
        self.monitor_thread = None
        self.incident_handlers: List[Callable] = []
        
    def add_incident_handler(self, handler: Callable[[SecurityAlert], None]):
        """Add a function to handle security incidents"""
        self.incident_handlers.append(handler)
        
    def start_monitoring(self, interval: float = 10.0):
        """Start real-time monitoring"""
        if self.is_monitoring:
            logger.warning("Monitoring already started")
            return
            
        self.is_monitoring = True
        self.monitor_thread = threading.Thread(
            target=self._monitoring_loop,
            args=(interval,),
            daemon=True
        )
        self.monitor_thread.start()
        logger.info(f"Started network monitoring with {interval}s interval")
        
    def stop_monitoring(self):
        """Stop real-time monitoring"""
        self.is_monitoring = False
        if self.monitor_thread:
            self.monitor_thread.join(timeout=5.0)
        logger.info("Stopped network monitoring")
        
    def _monitoring_loop(self, interval: float):
        """Main monitoring loop"""
        while self.is_monitoring:
            try:
                # Collect metrics
                metrics = self._collect_metrics()
                self.metrics_history.append(metrics)
                
                # Detect anomalies
                anomalies = self._detect_anomalies(metrics)
                
                # Generate alerts for anomalies
                for anomaly in anomalies:
                    if anomaly.is_anomaly:
                        alert = self._create_alert_from_anomaly(anomaly)
                        self._handle_alert(alert)
                
                time.sleep(interval)
                
            except Exception as e:
                logger.error(f"Error in monitoring loop: {e}")
                time.sleep(interval)
                
    def _collect_metrics(self) -> NetworkMetrics:
        """Collect current network metrics"""
        # In a real implementation, these would come from actual system monitoring
        import random
        
        base_time = time.time()
        
        # Simulate realistic metrics with some randomness
        if len(self.metrics_history) > 0:
            last_metrics = self.metrics_history[-1]
            # Add some variance to previous values
            transaction_count = max(0, int(last_metrics.transaction_count + random.randint(-5, 10)))
            block_height = last_metrics.block_height + random.choice([0, 0, 0, 1])  # Blocks don't always come
            memory_usage = max(0.1, min(0.95, last_metrics.memory_usage + random.uniform(-0.05, 0.05)))
            cpu_usage = max(0.05, min(0.9, last_metrics.cpu_usage + random.uniform(-0.1, 0.1)))
        else:
            transaction_count = random.randint(50, 150)
            block_height = 1000
            memory_usage = random.uniform(0.3, 0.7)
            cpu_usage = random.uniform(0.2, 0.6)
            
        return NetworkMetrics(
            timestamp=base_time,
            transaction_count=transaction_count,
            block_height=block_height,
            network_hashrate=random.uniform(1000, 2000),  # TH/s
            node_count=random.randint(45, 55),
            memory_usage=memory_usage,
            cpu_usage=cpu_usage,
            disk_usage=random.uniform(0.4, 0.8),
            network_latency=random.uniform(50, 200),  # ms
            error_rate=random.uniform(0.001, 0.02),
        )
        
    def _detect_anomalies(self, current_metrics: NetworkMetrics) -> List[AnomalyDetection]:
        """Detect anomalies in current metrics"""
        anomalies = []
        
        if len(self.metrics_history) < 10:  # Need some history for comparison
            return anomalies
            
        # Get recent history for analysis
        recent_metrics = list(self.metrics_history)[-50:]  # Last 50 measurements
        
        # Check each metric for anomalies
        for metric_name, (min_thresh, max_thresh) in self.anomaly_thresholds.items():
            current_value = getattr(current_metrics, metric_name)
            
            if metric_name in ['transaction_count']:
                # Use moving average for dynamic metrics
                historical_values = [getattr(m, metric_name) for m in recent_metrics]
                avg_value = statistics.mean(historical_values)
                std_value = statistics.stdev(historical_values) if len(historical_values) > 1 else 0
                
                expected_min = max(0, avg_value * min_thresh)
                expected_max = avg_value * max_thresh
                expected_range = (expected_min, expected_max)
                
                is_anomaly = current_value < expected_min or current_value > expected_max
                anomaly_score = abs(current_value - avg_value) / (std_value + 1e-6)
                
            else:
                # Use absolute thresholds for system metrics
                expected_range = (min_thresh, max_thresh)
                is_anomaly = current_value < min_thresh or current_value > max_thresh
                anomaly_score = max(0, current_value - max_thresh) + max(0, min_thresh - current_value)
                
            anomaly = AnomalyDetection(
                metric_name=metric_name,
                current_value=current_value,
                expected_range=expected_range,
                anomaly_score=anomaly_score,
                is_anomaly=is_anomaly,
                timestamp=current_metrics.timestamp
            )
            
            anomalies.append(anomaly)
            
        return anomalies
        
    def _create_alert_from_anomaly(self, anomaly: AnomalyDetection) -> SecurityAlert:
        """Create a security alert from an anomaly"""
        severity = "low"
        if anomaly.anomaly_score > 2.0:
            severity = "high"
        elif anomaly.anomaly_score > 1.0:
            severity = "medium"
            
        alert_id = hashlib.sha256(
            f"{anomaly.metric_name}_{anomaly.timestamp}_{anomaly.current_value}".encode()
        ).hexdigest()[:16]
        
        remediation_actions = self._get_remediation_actions(anomaly.metric_name, severity)
        
        return SecurityAlert(
            alert_id=alert_id,
            alert_type=f"anomaly_{anomaly.metric_name}",
            severity=severity,
            timestamp=anomaly.timestamp,
            source="network_monitor",
            details={
                "metric_name": anomaly.metric_name,
                "current_value": anomaly.current_value,
                "expected_range": anomaly.expected_range,
                "anomaly_score": anomaly.anomaly_score,
            },
            remediation_actions=remediation_actions
        )
        
    def _get_remediation_actions(self, metric_name: str, severity: str) -> List[str]:
        """Get recommended remediation actions for a metric anomaly"""
        actions = {
            'transaction_count': [
                "Check network connectivity",
                "Verify node synchronization",
                "Monitor for potential DDoS attacks"
            ],
            'memory_usage': [
                "Check for memory leaks",
                "Restart affected services if needed",
                "Scale up memory if consistently high"
            ],
            'cpu_usage': [
                "Identify high-CPU processes",
                "Check for infinite loops or performance issues",
                "Consider load balancing"
            ],
            'error_rate': [
                "Check application logs for error patterns",
                "Verify network connectivity",
                "Check for malformed requests"
            ],
            'network_latency': [
                "Check network infrastructure",
                "Verify DNS resolution",
                "Check for network congestion"
            ]
        }
        
        base_actions = actions.get(metric_name, ["Manual investigation required"])
        
        if severity in ["high", "critical"]:
            base_actions.append("Escalate to operations team")
            base_actions.append("Consider emergency response procedures")
            
        return base_actions
        
    def _handle_alert(self, alert: SecurityAlert):
        """Handle a security alert"""
        self.alerts.append(alert)
        
        logger.warning(f"SECURITY ALERT [{alert.severity.upper()}]: {alert.alert_type} - "
                      f"{alert.details.get('metric_name', 'unknown')} = "
                      f"{alert.details.get('current_value', 'unknown')}")
        
        # Call registered incident handlers
        for handler in self.incident_handlers:
            try:
                handler(alert)
            except Exception as e:
                logger.error(f"Error in incident handler: {e}")
                
    def get_current_status(self) -> Dict[str, Any]:
        """Get current monitoring status and recent metrics"""
        if not self.metrics_history:
            return {"status": "no_data", "alerts": []}
            
        latest_metrics = self.metrics_history[-1]
        recent_alerts = [asdict(alert) for alert in list(self.alerts)[-10:]]
        
        return {
            "status": "monitoring" if self.is_monitoring else "stopped",
            "latest_metrics": asdict(latest_metrics),
            "recent_alerts": recent_alerts,
            "total_alerts": len(self.alerts),
            "history_size": len(self.metrics_history)
        }

# Global monitor instance
_global_monitor = None

def get_monitor() -> NetworkMonitor:
    """Get the global network monitor instance"""
    global _global_monitor
    if _global_monitor is None:
        _global_monitor = NetworkMonitor()
    return _global_monitor

def monitor_network() -> dict:
    """Monitor network and return current status with alerts"""
    monitor = get_monitor()
    
    # Start monitoring if not already started
    if not monitor.is_monitoring:
        monitor.start_monitoring(interval=5.0)  # Check every 5 seconds
        
    return monitor.get_current_status()

def incident_response(event: dict) -> None:
    """Handle automated/manual response to detected incidents"""
    try:
        logger.info(f"Incident response triggered for event: {event}")
        
        # Parse the event
        alert_type = event.get('alert_type', 'unknown')
        severity = event.get('severity', 'low')
        details = event.get('details', {})
        
        # Automated responses based on alert type and severity
        if alert_type.startswith('anomaly_'):
            metric_name = details.get('metric_name', '')
            current_value = details.get('current_value', 0)
            
            if metric_name == 'memory_usage' and severity in ['high', 'critical']:
                logger.warning("HIGH MEMORY USAGE DETECTED - Implementing memory management")
                # In a real system, this might trigger garbage collection, service restarts, etc.
                
            elif metric_name == 'error_rate' and severity in ['high', 'critical']:
                logger.warning("HIGH ERROR RATE DETECTED - Implementing error mitigation")
                # In a real system, this might enable circuit breakers, rate limiting, etc.
                
            elif metric_name == 'transaction_count' and current_value > 200:
                logger.warning("TRANSACTION SPIKE DETECTED - Scaling resources")
                # In a real system, this might trigger auto-scaling
                
        # Log the incident response
        response_action = {
            'timestamp': time.time(),
            'alert_type': alert_type,
            'severity': severity,
            'response_actions': [
                f"Logged incident of type {alert_type}",
                f"Assessed severity as {severity}",
                "Applied automated response rules",
            ],
            'status': 'handled'
        }
        
        logger.info(f"Incident response completed: {response_action}")
        
        # In a real system, this would also:
        # - Send notifications to operations team
        # - Update incident tracking systems
        # - Execute specific remediation scripts
        # - Coordinate with external monitoring systems
        
    except Exception as e:
        logger.error(f"Error in incident response: {e}")

# Default incident handler
def default_incident_handler(alert: SecurityAlert):
    """Default handler for security alerts"""
    incident_response(asdict(alert))

# Register the default handler
def setup_monitoring():
    """Set up monitoring with default configuration"""
    monitor = get_monitor()
    monitor.add_incident_handler(default_incident_handler)
    logger.info("Monitoring system initialized with default incident handler")

# Initialize monitoring when module is imported
setup_monitoring()
