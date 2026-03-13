"""Telemetry and metrics with Prometheus and OpenTelemetry."""
import logging
import time
from typing import Dict, Any, Optional
from prometheus_client import Counter, Histogram, Gauge, CollectorRegistry

try:
    from opentelemetry import trace
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import BatchSpanProcessor
    from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
    from opentelemetry.trace import Status, StatusCode
    OTEL_AVAILABLE = True
except ImportError:
    OTEL_AVAILABLE = False
    trace = None

logger = logging.getLogger(__name__)


class TelemetryManager:
    """Manages Prometheus metrics and OpenTelemetry tracing."""
    
    def __init__(self, 
                 service_name: str = "pulseguard",
                 otlp_endpoint: str = "http://localhost:4317",
                 enable_tracing: bool = True):
        
        self.service_name = service_name
        self.enable_tracing = enable_tracing
        
        # Prometheus registry
        self.registry = CollectorRegistry()
        
        # Initialize Prometheus metrics
        self._init_prometheus_metrics()
        
        # Initialize OpenTelemetry tracing
        self.tracer = None
        if enable_tracing and OTEL_AVAILABLE:
            self._init_opentelemetry(otlp_endpoint)
            
    def _init_prometheus_metrics(self):
        """Initialize Prometheus metrics."""
        # API metrics
        self.api_requests_total = Counter(
            'pg_api_requests_total',
            'Total API requests',
            ['method', 'endpoint', 'status'],
            registry=self.registry
        )
        
        self.api_latency_seconds = Histogram(
            'pg_api_latency_seconds',
            'API request latency',
            ['method', 'endpoint'],
            buckets=(0.005, 0.01, 0.025, 0.05, 0.075, 0.1, 0.25, 0.5, 0.75, 1.0, 2.5, 5.0),
            registry=self.registry
        )
        
        # Scoring metrics
        self.score_distribution = Histogram(
            'pg_score_distribution',
            'Distribution of anomaly scores',
            buckets=(0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0),
            registry=self.registry
        )
        
        self.detector_counts = Counter(
            'pg_detector_counts_total',
            'Detector trigger counts by reason code',
            ['code'],
            registry=self.registry
        )
        
        # Model metrics
        self.model_version_info = Gauge(
            'pg_model_version_info',
            'Model version information',
            ['version', 'model_type'],
            registry=self.registry
        )
        
        # Data pipeline metrics
        self.queue_lag = Gauge(
            'pg_queue_lag',
            'Queue lag in number of items',
            ['queue_type'],
            registry=self.registry
        )
        
        self.block_gap = Gauge(
            'pg_block_gap',
            'Gap between latest and processed block',
            registry=self.registry
        )
        
        # Feature metrics
        self.feature_computation_seconds = Histogram(
            'pg_feature_computation_seconds',
            'Time to compute features',
            ['feature_type'],
            registry=self.registry
        )
        
    def _init_opentelemetry(self, otlp_endpoint: str):
        """Initialize OpenTelemetry tracing."""
        try:
            # Set up tracer provider
            trace.set_tracer_provider(TracerProvider())
            
            # Configure OTLP exporter
            otlp_exporter = OTLPSpanExporter(endpoint=otlp_endpoint)
            span_processor = BatchSpanProcessor(otlp_exporter)
            trace.get_tracer_provider().add_span_processor(span_processor)
            
            # Get tracer
            self.tracer = trace.get_tracer(self.service_name)
            
            logger.info(f"OpenTelemetry initialized with endpoint: {otlp_endpoint}")
            
        except Exception as e:
            logger.error(f"Failed to initialize OpenTelemetry: {e}")
            self.tracer = None
            
    def record_api_request(self, method: str, endpoint: str, status_code: int, latency: float):
        """Record API request metrics."""
        try:
            self.api_requests_total.labels(
                method=method,
                endpoint=endpoint,
                status=str(status_code)
            ).inc()
            
            self.api_latency_seconds.labels(
                method=method,
                endpoint=endpoint
            ).observe(latency)
            
        except Exception as e:
            logger.error(f"Error recording API metrics: {e}")
            
    def record_score(self, score: float):
        """Record anomaly score."""
        try:
            self.score_distribution.observe(score)
        except Exception as e:
            logger.error(f"Error recording score: {e}")
            
    def record_detector_trigger(self, reason_code: str):
        """Record detector trigger."""
        try:
            self.detector_counts.labels(code=reason_code).inc()
        except Exception as e:
            logger.error(f"Error recording detector trigger: {e}")
            
    def update_model_version(self, version: str, model_type: str):
        """Update model version info."""
        try:
            self.model_version_info.labels(
                version=version,
                model_type=model_type
            ).set(1)
        except Exception as e:
            logger.error(f"Error updating model version: {e}")
            
    def update_queue_lag(self, queue_type: str, lag: int):
        """Update queue lag metric."""
        try:
            self.queue_lag.labels(queue_type=queue_type).set(lag)
        except Exception as e:
            logger.error(f"Error updating queue lag: {e}")
            
    def update_block_gap(self, gap: int):
        """Update block gap metric."""
        try:
            self.block_gap.set(gap)
        except Exception as e:
            logger.error(f"Error updating block gap: {e}")
            
    def record_feature_computation(self, feature_type: str, duration: float):
        """Record feature computation time."""
        try:
            self.feature_computation_seconds.labels(
                feature_type=feature_type
            ).observe(duration)
        except Exception as e:
            logger.error(f"Error recording feature computation: {e}")
            
    def start_span(self, name: str, attributes: Optional[Dict[str, Any]] = None):
        """Start a new trace span."""
        if not self.tracer:
            return DummySpan()
            
        try:
            span = self.tracer.start_span(name)
            if attributes:
                for key, value in attributes.items():
                    span.set_attribute(key, value)
            return span
        except Exception as e:
            logger.error(f"Error starting span: {e}")
            return DummySpan()
            
    def get_registry(self):
        """Get Prometheus registry for metrics export."""
        return self.registry


class DummySpan:
    """Dummy span for when tracing is disabled."""
    
    def __enter__(self):
        return self
        
    def __exit__(self, exc_type, exc_val, exc_tb):
        pass
        
    def set_attribute(self, key: str, value: Any):
        pass
        
    def set_status(self, status):
        pass
        
    def end(self):
        pass


class TimingContext:
    """Context manager for timing operations."""
    
    def __init__(self, telemetry: TelemetryManager, operation: str, **attributes):
        self.telemetry = telemetry
        self.operation = operation
        self.attributes = attributes
        self.start_time = None
        self.span = None
        
    def __enter__(self):
        self.start_time = time.time()
        self.span = self.telemetry.start_span(
            f"pulseguard.{self.operation}",
            self.attributes
        )
        return self
        
    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.start_time:
            duration = time.time() - self.start_time
            
            # Record timing metric if available
            if hasattr(self.telemetry, f"record_{self.operation}_time"):
                getattr(self.telemetry, f"record_{self.operation}_time")(duration)
                
        if self.span:
            if exc_type:
                self.span.set_status(Status(StatusCode.ERROR, str(exc_val)))
            else:
                self.span.set_status(Status(StatusCode.OK))
            self.span.end()


# Global telemetry manager
telemetry_manager = None


def init_telemetry(service_name: str = "pulseguard",
                  otlp_endpoint: str = "http://localhost:4317",
                  enable_tracing: bool = True) -> TelemetryManager:
    """Initialize global telemetry manager."""
    global telemetry_manager
    telemetry_manager = TelemetryManager(service_name, otlp_endpoint, enable_tracing)
    return telemetry_manager


def get_telemetry() -> Optional[TelemetryManager]:
    """Get the global telemetry manager."""
    return telemetry_manager


def timing_context(operation: str, **attributes):
    """Create a timing context for an operation."""
    if telemetry_manager:
        return TimingContext(telemetry_manager, operation, **attributes)
    else:
        return DummySpan()