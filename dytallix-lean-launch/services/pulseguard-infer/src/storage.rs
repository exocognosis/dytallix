use crate::error::InferenceError;
use serde::{Deserialize, Serialize};
use sqlx::{PgPool, Row};

#[derive(Debug, Clone)]
pub struct Database {
    pool: PgPool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StoredFinding {
    pub id: i64,
    pub uuid: String,
    pub tx_hash: String,
    pub address: String,
    pub score: f64,
    pub severity: String,
    pub status: String,
    pub reasons: Vec<String>,
    pub signature_pq: Option<String>,
    pub metadata: Option<serde_json::Value>,
    pub block_height: i64,
    pub timestamp_detected: i64,
    pub timestamp_created: chrono::DateTime<chrono::Utc>,
}

impl Database {
    pub async fn new(database_url: &str) -> Result<Self, InferenceError> {
        let pool = PgPool::connect(database_url).await?;

        // Run migrations if present on disk (skip if missing)
        if std::path::Path::new("./migrations").exists() {
            if let Ok(migrator) =
                sqlx::migrate::Migrator::new(std::path::Path::new("./migrations")).await
            {
                let _ = migrator.run(&pool).await;
            }
        }

        Ok(Self { pool })
    }

    pub async fn store_finding(
        &self,
        finding: &crate::blockchain::Finding,
    ) -> Result<i64, InferenceError> {
        let severity = match finding.score {
            s if s >= 0.9 => "critical",
            s if s >= 0.7 => "high",
            s if s >= 0.5 => "medium",
            _ => "low",
        };

        let metadata = serde_json::to_value(&finding.metadata)?;

        let row = sqlx::query(
            r#"
            INSERT INTO findings (
                tx_hash, address, score, severity, reasons,
                signature_pq, metadata, block_height, timestamp_detected
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id
            "#,
        )
        .bind(&finding.tx_hash)
        .bind(&finding.addr)
        .bind(finding.score)
        .bind(severity)
        .bind(&finding.reasons)
        .bind(&finding.signature_pq)
        .bind(metadata)
        .bind(0i64)
        .bind(finding.timestamp as i64)
        .fetch_one(&self.pool)
        .await?;

        Ok(row.try_get::<i64, _>("id")?)
    }

    #[allow(dead_code)]
    pub async fn get_address_stats(&self, address: &str) -> Result<AddressStats, InferenceError> {
        let row = sqlx::query(
            r#"
            SELECT
                COUNT(*) as total_findings,
                COUNT(*) FILTER (WHERE severity IN ('high', 'critical')) as high_risk_findings,
                AVG(score) as average_score,
                MIN(timestamp_created) as first_seen,
                MAX(timestamp_created) as last_seen
            FROM findings
            WHERE address = $1
            "#,
        )
        .bind(address)
        .fetch_one(&self.pool)
        .await?;

        Ok(AddressStats {
            total_findings: row.try_get::<i64, _>("total_findings").unwrap_or(0) as u64,
            high_risk_findings: row.try_get::<i64, _>("high_risk_findings").unwrap_or(0) as u64,
            average_score: row.try_get::<f64, _>("average_score").unwrap_or(0.0),
            first_seen: row
                .try_get::<Option<chrono::DateTime<chrono::Utc>>, _>("first_seen")
                .ok()
                .flatten(),
            last_seen: row
                .try_get::<Option<chrono::DateTime<chrono::Utc>>, _>("last_seen")
                .ok()
                .flatten(),
        })
    }

    #[allow(dead_code)]
    pub async fn get_velocity_stats(
        &self,
        address: &str,
        window_hours: i64,
    ) -> Result<VelocityStats, InferenceError> {
        let row = sqlx::query(
            r#"
            SELECT
                COUNT(*) as transaction_count,
                SUM(CAST(metadata->>'amount' AS DECIMAL)) as total_volume
            FROM findings
            WHERE address = $1
            AND timestamp_created > NOW() - ($2 * INTERVAL '1 hour')
            "#,
        )
        .bind(address)
        .bind(window_hours)
        .fetch_one(&self.pool)
        .await?;

        Ok(VelocityStats {
            transaction_count: row.try_get::<i64, _>("transaction_count").unwrap_or(0) as u64,
            total_volume: row.try_get::<f64, _>("total_volume").unwrap_or(0.0),
            window_hours: window_hours as u64,
        })
    }

    #[allow(dead_code)]
    pub async fn store_transaction_features(
        &self,
        tx_hash: &str,
        address: &str,
        features: &crate::features::TransactionFeatures,
    ) -> Result<(), InferenceError> {
        let features_json = serde_json::to_value(features)?;

        sqlx::query(
            r#"
            INSERT INTO transaction_features (tx_hash, address, features)
            VALUES ($1, $2, $3)
            ON CONFLICT (tx_hash) DO UPDATE SET
                features = EXCLUDED.features,
                extracted_at = NOW()
            "#,
        )
        .bind(tx_hash)
        .bind(address)
        .bind(features_json)
        .execute(&self.pool)
        .await?;

        Ok(())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AddressStats {
    pub total_findings: u64,
    pub high_risk_findings: u64,
    pub average_score: f64,
    pub first_seen: Option<chrono::DateTime<chrono::Utc>>,
    pub last_seen: Option<chrono::DateTime<chrono::Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VelocityStats {
    pub transaction_count: u64,
    pub total_volume: f64,
    pub window_hours: u64,
}
