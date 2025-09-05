use crate::error::InferenceError;
use prometheus::{Counter, Encoder, Gauge, Histogram, HistogramOpts, Registry, TextEncoder};
use warp::Filter;

#[derive(Clone)]
pub struct MetricsServer {
    registry: Registry,
    port: u16,
}

impl MetricsServer {
    pub fn new(port: u16) -> Self {
        let registry = Registry::new();

        Self { registry, port }
    }

    pub async fn start(self) -> Result<(), InferenceError> {
        let metrics_route = warp::path("metrics").and(warp::get()).map(move || {
            let encoder = TextEncoder::new();
            let metric_families = self.registry.gather();
            let mut buffer = Vec::new();
            encoder.encode(&metric_families, &mut buffer).unwrap();
            String::from_utf8(buffer).unwrap()
        });

        let health_route = warp::path("health").and(warp::get()).map(|| {
            warp::reply::json(&serde_json::json!({
                "status": "healthy",
                "timestamp": chrono::Utc::now()
            }))
        });

        let routes = metrics_route.or(health_route);

        tracing::info!("Starting metrics server on port {}", self.port);

        warp::serve(routes).run(([0, 0, 0, 0], self.port)).await;

        Ok(())
    }
}

#[allow(dead_code)]
pub struct Metrics {
    pub findings_total: Counter,
    pub inference_duration: Histogram,
    pub model_accuracy: Gauge,
    pub feature_extraction_duration: Histogram,
    pub blockchain_submissions: Counter,
    pub database_operations: Counter,
}

#[allow(dead_code)]
impl Metrics {
    pub fn new(registry: &Registry) -> Result<Self, InferenceError> {
        let findings_total = Counter::new(
            "pulsescan_findings_total",
            "Total number of findings detected",
        )?;
        registry.register(Box::new(findings_total.clone()))?;

        let inference_duration = Histogram::with_opts(HistogramOpts::new(
            "pulsescan_inference_duration_seconds",
            "Time spent running inference",
        ))?;
        registry.register(Box::new(inference_duration.clone()))?;

        let model_accuracy = Gauge::new("pulsescan_model_accuracy", "Current model accuracy")?;
        registry.register(Box::new(model_accuracy.clone()))?;

        let feature_extraction_duration = Histogram::with_opts(HistogramOpts::new(
            "pulsescan_feature_extraction_duration_seconds",
            "Time spent extracting features",
        ))?;
        registry.register(Box::new(feature_extraction_duration.clone()))?;

        let blockchain_submissions = Counter::new(
            "pulsescan_blockchain_submissions_total",
            "Total blockchain submissions",
        )?;
        registry.register(Box::new(blockchain_submissions.clone()))?;

        let database_operations = Counter::new(
            "pulsescan_database_operations_total",
            "Total database operations",
        )?;
        registry.register(Box::new(database_operations.clone()))?;

        Ok(Self {
            findings_total,
            inference_duration,
            model_accuracy,
            feature_extraction_duration,
            blockchain_submissions,
            database_operations,
        })
    }

    pub fn record_finding(&self, _severity: &str) {
        self.findings_total.inc();
    }

    pub fn record_inference_duration(&self, duration: f64) {
        self.inference_duration.observe(duration);
    }

    pub fn set_model_accuracy(&self, accuracy: f64) {
        self.model_accuracy.set(accuracy);
    }

    pub fn record_feature_extraction_duration(&self, duration: f64) {
        self.feature_extraction_duration.observe(duration);
    }

    pub fn record_blockchain_submission(&self) {
        self.blockchain_submissions.inc();
    }

    pub fn record_database_operation(&self) {
        self.database_operations.inc();
    }
}
