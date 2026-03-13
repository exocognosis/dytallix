use super::{Scanner, ScanResult};
use crate::domain::{Asset, AssetType, SensitivityLevel, ExposureLevel};
use crate::domain::asset::PqcCompliance;
use anyhow::Result;
use async_trait::async_trait;
use reqwest::Client;

pub struct HttpScanner {
    client: Client,
}

impl HttpScanner {
    pub fn new() -> Self {
        Self {
            client: Client::builder()
                .danger_accept_invalid_certs(true) // For scanning purposes
                .build()
                .unwrap(),
        }
    }
}

#[async_trait]
impl Scanner for HttpScanner {
    async fn scan(&self, target: &str) -> Result<ScanResult> {
        let url = if target.contains("://") {
            target.to_string()
        } else {
            format!("https://{}", target)
        };

        let res = self.client.get(&url).send().await?;
        let headers = res.headers();
        
        // Inspect headers for security policies
        let hsts = headers.get("Strict-Transport-Security").map(|v| v.to_str().unwrap_or(""));
        let server = headers.get("Server").map(|v| v.to_str().unwrap_or(""));

        let asset = Asset::new(
            url.clone(),
            AssetType::ApiEndpoint,
            url.clone(),
            "web-admin".to_string(),
            SensitivityLevel::Public,
            vec![],
            ExposureLevel::PublicInternet,
            365,
            serde_json::json!({
                "hsts": hsts,
                "server": server,
                "layer": "HTTP"
            }),
            Some("PROD".to_string()),
            None,
            // PQC fields
            None, // service_role
            None, // crypto_usage
            None, // algo_pk
            None, // pk_key_bits
            None, // algo_sym
            None, // sym_key_bits
            None, // hash_algo
            None, // protocol_version
            None, // crypto_agility
            None, // stores_long_lived_data
        );

        // HTTP scan itself doesn't determine PQC compliance usually, unless we see specific headers
        // Default to Unknown or inherit from TLS scan if we were combining them
        let mut asset = asset;
        asset.pqc_compliance = PqcCompliance::Unknown; 
        asset.recompute_risk_score();

        Ok(ScanResult {
            assets: vec![asset],
            non_pqc_count: 0, // Don't double count if TLS scanner handles the crypto part
        })
    }
}
