use async_trait::async_trait;
use crate::domain::Asset;
use anyhow::Result;

#[async_trait]
pub trait Scanner: Send + Sync {
    async fn scan(&self, target: &str) -> Result<ScanResult>;
}

pub mod tls_scanner;
pub mod http_scanner;

pub use tls_scanner::TlsScanner;
pub use http_scanner::HttpScanner;

#[derive(Debug)]
pub struct ScanResult {
    pub assets: Vec<Asset>,
    pub non_pqc_count: i32,
}
