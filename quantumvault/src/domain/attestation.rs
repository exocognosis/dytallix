use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, sqlx::Type, PartialEq, Eq)]
#[sqlx(type_name = "job_status", rename_all = "lowercase")]
#[serde(rename_all = "lowercase")]
pub enum JobStatus {
    Pending,
    Running,
    Completed,
    Failed,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct BlockchainAttestationJob {
    pub id: Uuid,
    pub created_by: Option<String>,
    pub anchor_id: Uuid,
    pub filters: serde_json::Value,
    pub total_assets: i32,
    pub succeeded_count: i32,
    pub failed_count: i32,
    pub status: JobStatus,
    pub blockchain_network: Option<String>,
    pub created_at: DateTime<Utc>,
    pub completed_at: Option<DateTime<Utc>>,
}

impl BlockchainAttestationJob {
    pub fn new(anchor_id: Uuid, created_by: Option<String>, filters: serde_json::Value) -> Self {
        Self {
            id: Uuid::new_v4(),
            created_by,
            anchor_id,
            filters,
            total_assets: 0,
            succeeded_count: 0,
            failed_count: 0,
            status: JobStatus::Pending,
            blockchain_network: None,
            created_at: Utc::now(),
            completed_at: None,
        }
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, sqlx::Type, PartialEq, Eq)]
#[sqlx(type_name = "attestation_status", rename_all = "lowercase")]
#[serde(rename_all = "lowercase")]
pub enum AttestationStatus {
    Pending,
    Success,
    Failed,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct BlockchainAttestation {
    pub id: Uuid,
    pub job_id: Uuid,
    pub asset_id: Uuid,
    pub anchor_id: Uuid,
    pub attestation_status: AttestationStatus,
    pub blockchain_tx_id: Option<String>,
    pub attested_at: Option<DateTime<Utc>>,
    pub error_message: Option<String>,
    pub payload_hash: Option<String>,
    pub created_at: DateTime<Utc>,
}

impl BlockchainAttestation {
    pub fn new(job_id: Uuid, asset_id: Uuid, anchor_id: Uuid) -> Self {
        Self {
            id: Uuid::new_v4(),
            job_id,
            asset_id,
            anchor_id,
            attestation_status: AttestationStatus::Pending,
            blockchain_tx_id: None,
            attested_at: None,
            error_message: None,
            payload_hash: None,
            created_at: Utc::now(),
        }
    }
}
