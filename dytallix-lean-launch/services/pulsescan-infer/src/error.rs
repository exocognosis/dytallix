use thiserror::Error;

#[derive(Error, Debug)]
#[allow(dead_code)]
pub enum InferenceError {
    #[error("Model loading error: {0}")]
    ModelLoading(String),

    #[error("Feature extraction error: {0}")]
    FeatureExtraction(String),

    #[error("Inference error: {0}")]
    Inference(String),

    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("Redis error: {0}")]
    Redis(#[from] redis::RedisError),

    #[error("Blockchain error: {0}")]
    Blockchain(String),

    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),

    #[error("Configuration error: {0}")]
    Configuration(String),

    #[error("HTTP error: {0}")]
    Http(#[from] reqwest::Error),

    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Prometheus error: {0}")]
    Prometheus(#[from] prometheus::Error),
}
