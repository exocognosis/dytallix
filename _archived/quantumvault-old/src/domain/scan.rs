use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, sqlx::Type, PartialEq, Eq)]
#[sqlx(type_name = "scan_type", rename_all = "lowercase")]
#[serde(rename_all = "lowercase")]
pub enum ScanType {
    Discovery,
    Rescan,
    PolicyValidation,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, sqlx::Type, PartialEq, Eq)]
#[sqlx(type_name = "scan_status", rename_all = "lowercase")]
#[serde(rename_all = "lowercase")]
pub enum ScanStatus {
    Running,
    Success,
    Failed,
    Partial,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Scan {
    pub id: Uuid,
    pub scan_type: ScanType,
    pub triggered_by: Option<String>,
    pub started_at: DateTime<Utc>,
    pub completed_at: Option<DateTime<Utc>>,
    pub number_of_assets_scanned: i32,
    pub number_of_non_pqc_assets_found: i32,
    pub status: ScanStatus,
    pub error_message: Option<String>,
}

impl Scan {
    pub fn new(scan_type: ScanType, triggered_by: Option<String>) -> Self {
        Self {
            id: Uuid::new_v4(),
            scan_type,
            triggered_by,
            started_at: Utc::now(),
            completed_at: None,
            number_of_assets_scanned: 0,
            number_of_non_pqc_assets_found: 0,
            status: ScanStatus::Running,
            error_message: None,
        }
    }

    pub fn complete(&mut self, assets_scanned: i32, non_pqc_found: i32) {
        self.status = ScanStatus::Success;
        self.completed_at = Some(Utc::now());
        self.number_of_assets_scanned = assets_scanned;
        self.number_of_non_pqc_assets_found = non_pqc_found;
    }

    pub fn fail(&mut self, error: String) {
        self.status = ScanStatus::Failed;
        self.completed_at = Some(Utc::now());
        self.error_message = Some(error);
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ScanAsset {
    pub id: Uuid,
    pub scan_id: Uuid,
    pub asset_id: Uuid,
    pub scan_result: String, // NEW, UPDATED, UNCHANGED
    pub details: serde_json::Value,
}
