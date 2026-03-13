use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type, PartialEq)]
#[sqlx(type_name = "job_status", rename_all = "lowercase")]
#[serde(rename_all = "lowercase")]
pub enum JobStatus {
    Pending,
    Running,
    Success,
    Failed,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ProtectionJob {
    pub id: Uuid,
    pub asset_id: Uuid,
    pub policy_id: Uuid,
    pub status: JobStatus,
    pub error_message: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl ProtectionJob {
    pub fn new(asset_id: Uuid, policy_id: Uuid) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4(),
            asset_id,
            policy_id,
            status: JobStatus::Pending,
            error_message: None,
            created_at: now,
            updated_at: now,
        }
    }

    pub fn mark_running(&mut self) {
        self.status = JobStatus::Running;
        self.updated_at = Utc::now();
    }

    pub fn mark_success(&mut self) {
        self.status = JobStatus::Success;
        self.error_message = None;
        self.updated_at = Utc::now();
    }

    pub fn mark_failed(&mut self, error: String) {
        self.status = JobStatus::Failed;
        self.error_message = Some(error);
        self.updated_at = Utc::now();
    }
}
