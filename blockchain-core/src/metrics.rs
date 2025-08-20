use prometheus::{
    Counter, Histogram, IntGauge, Opts, Registry, Encoder, TextEncoder,
    HistogramOpts, HistogramVec, CounterVec, IntGaugeVec
};
use std::collections::HashMap;
use warp::{Filter, Reply};
use once_cell::sync::Lazy;
use std::sync::Arc;

// Global metrics registry
static METRICS_REGISTRY: Lazy<Registry> = Lazy::new(|| {
    let registry = Registry::new();
    
    // Register all metrics
    registry.register(Box::new(HTTP_REQUESTS_TOTAL.clone())).unwrap();
    registry.register(Box::new(HTTP_5XX_RESPONSES_TOTAL.clone())).unwrap();
    registry.register(Box::new(HTTP_REQUEST_DURATION.clone())).unwrap();
    registry.register(Box::new(FAUCET_REQUESTS_TOTAL.clone())).unwrap();
    registry.register(Box::new(RATE_LIMIT_HITS_TOTAL.clone())).unwrap();
    registry.register(Box::new(IN_FLIGHT_REQUESTS.clone())).unwrap();
    
    registry
});

// HTTP metrics
static HTTP_REQUESTS_TOTAL: Lazy<CounterVec> = Lazy::new(|| {
    CounterVec::new(
        Opts::new("http_requests_total", "Total number of HTTP requests"),
        &["path", "method", "status"]
    ).unwrap()
});

static HTTP_5XX_RESPONSES_TOTAL: Lazy<CounterVec> = Lazy::new(|| {
    CounterVec::new(
        Opts::new("http_5xx_responses_total", "Total number of 5xx HTTP responses"),
        &["path", "method"]
    ).unwrap()
});

static HTTP_REQUEST_DURATION: Lazy<HistogramVec> = Lazy::new(|| {
    HistogramVec::new(
        HistogramOpts::new(
            "http_request_duration_seconds",
            "HTTP request duration in seconds"
        ).buckets(vec![0.1, 0.3, 0.5, 0.7, 1.0, 3.0, 5.0, 7.0, 10.0]),
        &["path", "method"]
    ).unwrap()
});

// Faucet-specific metrics  
static FAUCET_REQUESTS_TOTAL: Lazy<CounterVec> = Lazy::new(|| {
    CounterVec::new(
        Opts::new("faucet_requests_total", "Total number of faucet requests"),
        &["result"] // success, error, rate_limited
    ).unwrap()
});

static RATE_LIMIT_HITS_TOTAL: Lazy<Counter> = Lazy::new(|| {
    Counter::new("rate_limit_hits_total", "Total number of rate limit hits").unwrap()
});

// In-flight requests gauge
static IN_FLIGHT_REQUESTS: Lazy<IntGauge> = Lazy::new(|| {
    IntGauge::new("in_flight_requests", "Number of in-flight HTTP requests").unwrap()
});

pub struct MetricsMiddleware;

impl MetricsMiddleware {
    pub fn new() -> Self {
        Self
    }

    // Clean path to avoid PII in metrics labels
    fn clean_path(path: &str) -> String {
        path
            // Replace long alphanumeric strings (potential addresses)
            .replace(regex::Regex::new(r"/[a-zA-Z0-9]{20,}").unwrap().as_str(), "/[address]")
            // Replace numeric IDs
            .replace(regex::Regex::new(r"/\d+").unwrap().as_str(), "/[id]") 
            // Replace dytallix addresses
            .replace(regex::Regex::new(r"/dyt[a-zA-Z0-9]+").unwrap().as_str(), "/[address]")
            // Replace hex hashes
            .replace(regex::Regex::new(r"/0x[a-fA-F0-9]+").unwrap().as_str(), "/[hash]")
    }

    pub fn track_request(&self, path: &str, method: &str, status: u16, duration: f64) {
        let clean_path = Self::clean_path(path);
        
        // Track total requests
        HTTP_REQUESTS_TOTAL
            .with_label_values(&[&clean_path, method, &status.to_string()])
            .inc();
        
        // Track 5xx responses
        if status >= 500 {
            HTTP_5XX_RESPONSES_TOTAL
                .with_label_values(&[&clean_path, method])
                .inc();
        }
        
        // Track request duration
        HTTP_REQUEST_DURATION
            .with_label_values(&[&clean_path, method])
            .observe(duration);
    }

    pub fn track_faucet_request(&self, result: &str) {
        FAUCET_REQUESTS_TOTAL
            .with_label_values(&[result])
            .inc();
    }

    pub fn track_rate_limit_hit(&self) {
        RATE_LIMIT_HITS_TOTAL.inc();
    }

    pub fn inc_in_flight(&self) {
        IN_FLIGHT_REQUESTS.inc();
    }

    pub fn dec_in_flight(&self) {
        IN_FLIGHT_REQUESTS.dec();
    }
}

// Metrics endpoint handler
pub async fn metrics_handler() -> Result<impl Reply, warp::Rejection> {
    let encoder = TextEncoder::new();
    let metric_families = METRICS_REGISTRY.gather();
    
    match encoder.encode_to_string(&metric_families) {
        Ok(metrics) => {
            Ok(warp::reply::with_header(
                metrics,
                "content-type",
                encoder.format_type(),
            ))
        }
        Err(e) => {
            log::error!("Failed to encode metrics: {}", e);
            Ok(warp::reply::with_header(
                "Error generating metrics".to_string(),
                "content-type",
                "text/plain",
            ))
        }
    }
}

// Warp filter for metrics middleware
pub fn with_metrics() -> impl Filter<Extract = (Arc<MetricsMiddleware>,), Error = std::convert::Infallible> + Clone {
    warp::any().map(|| Arc::new(MetricsMiddleware::new()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_clean_path() {
        assert_eq!(
            MetricsMiddleware::clean_path("/api/balance/dyt1abcdef123456789"),
            "/api/balance/[address]"
        );
        assert_eq!(
            MetricsMiddleware::clean_path("/api/tx/0x1234567890abcdef"),
            "/api/tx/[hash]"
        );
        assert_eq!(
            MetricsMiddleware::clean_path("/api/user/12345"),
            "/api/user/[id]"
        );
    }

    #[test]
    fn test_metrics_tracking() {
        let middleware = MetricsMiddleware::new();
        
        // Test request tracking
        middleware.track_request("/api/test", "GET", 200, 0.5);
        middleware.track_request("/api/test", "GET", 500, 1.0);
        
        // Test faucet tracking
        middleware.track_faucet_request("success");
        middleware.track_faucet_request("error");
        
        // Test rate limit tracking
        middleware.track_rate_limit_hit();
        
        // Test in-flight requests
        middleware.inc_in_flight();
        middleware.dec_in_flight();
    }
}