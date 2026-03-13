use super::{Scanner, ScanResult};
use crate::domain::{Asset, AssetType, SensitivityLevel, ExposureLevel};
use crate::domain::asset::PqcCompliance;
use anyhow::Result;
use async_trait::async_trait;
use std::sync::Arc;
use tokio::net::TcpStream;
use tokio_rustls::rustls::{ClientConfig, RootCertStore, pki_types::ServerName};
use tokio_rustls::TlsConnector;
use url::Url;

pub struct TlsScanner;

impl TlsScanner {
    pub fn new() -> Self {
        Self
    }
}

#[async_trait]
impl Scanner for TlsScanner {
    async fn scan(&self, target: &str) -> Result<ScanResult> {
        // Parse target as URL or hostname
        let host = if target.contains("://") {
            Url::parse(target)?.host_str().unwrap().to_string()
        } else {
            target.to_string()
        };

        let port = if target.contains(":") && !target.contains("://") {
             target.split(':').nth(1).unwrap().parse::<u16>().unwrap_or(443)
        } else {
            443
        };

        let addr = format!("{}:{}", host, port);

        // Setup Rustls
        let root_store = RootCertStore {
            roots: webpki_roots::TLS_SERVER_ROOTS.to_vec(),
        };
        let config = ClientConfig::builder()
            .with_root_certificates(root_store)
            .with_no_client_auth();
        let connector = TlsConnector::from(Arc::new(config));

        let stream = TcpStream::connect(&addr).await?;
        let domain = ServerName::try_from(host.as_str())?.to_owned();
        
        // Perform handshake
        let stream = connector.connect(domain, stream).await?;
        let (_, session) = stream.get_ref();

        // Extract info
        let cipher_suite = session.negotiated_cipher_suite().map(|cs| cs.suite().as_str().unwrap_or("UNKNOWN"));
        let protocol_version = session.protocol_version().map(|v| format!("{:?}", v));
        
        let mut compliance = PqcCompliance::NonCompliant;
        // Simple heuristic for MVP: if it's standard TLS 1.2/1.3 with classical suites, it's non-compliant
        // In a real PQC world, we'd check for specific PQC KEMs in the handshake (e.g. X25519Kyber768Draft00)
        if let Some(cs) = cipher_suite {
             if cs.contains("KYBER") || cs.contains("DILITHIUM") {
                 compliance = PqcCompliance::Compliant;
             }
        }

        let asset = Asset::new(
            host.clone(),
            AssetType::TlsEndpoint,
            format!("https://{}", addr),
            "network-admin".to_string(),
            SensitivityLevel::Public, // Default for external scan
            vec![],
            ExposureLevel::PublicInternet,
            365,
            serde_json::json!({
                "cipher_suite": cipher_suite,
                "protocol": protocol_version,
                "layer": "TLS"
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
            Some(protocol_version.unwrap_or_default()), // protocol_version
            None, // crypto_agility
            None, // stores_long_lived_data
        );
        
        // We need to manually set the compliance since it's not in the constructor
        let mut asset = asset;
        asset.pqc_compliance = compliance;
        asset.recompute_risk_score();

        Ok(ScanResult {
            assets: vec![asset],
            non_pqc_count: if compliance == PqcCompliance::NonCompliant { 1 } else { 0 },
        })
    }
}
