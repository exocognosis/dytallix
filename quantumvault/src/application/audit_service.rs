use crate::domain::{Asset, AuditEvent};
use crate::infrastructure::{AssetRepository, AuditRepository};
use anyhow::Result;
use std::sync::Arc;
use uuid::Uuid;

pub struct AuditService {
    audit_repo: Arc<dyn AuditRepository>,
}

impl AuditService {
    pub fn new(audit_repo: Arc<dyn AuditRepository>) -> Self {
        Self { audit_repo }
    }

    pub async fn log_asset_created(
        &self,
        asset: &Asset,
        actor: &str,
    ) -> Result<AuditEvent> {
        let prev_hash = self.audit_repo.get_last_hash().await?;
        
        let payload = serde_json::json!({
            "asset_id": asset.id,
            "asset_name": asset.name,
            "asset_type": asset.asset_type,
            "owner": asset.owner,
        });

        let event = AuditEvent::new(
            "asset.created".to_string(),
            actor.to_string(),
            payload,
            Some(asset.id),
            None,
            None,
            prev_hash,
        );

        self.audit_repo.append(&event).await
    }

    pub async fn log_asset_classified(
        &self,
        asset: &Asset,
        actor: &str,
    ) -> Result<AuditEvent> {
        let prev_hash = self.audit_repo.get_last_hash().await?;
        
        let payload = serde_json::json!({
            "asset_id": asset.id,
            "sensitivity": asset.sensitivity,
            "exposure_level": asset.exposure_level,
            "risk_score": asset.risk_score,
            "regulatory_tags": asset.regulatory_tags,
        });

        let event = AuditEvent::new(
            "asset.classified".to_string(),
            actor.to_string(),
            payload,
            Some(asset.id),
            None,
            None,
            prev_hash,
        );

        self.audit_repo.append(&event).await
    }

    pub async fn log_policy_created(
        &self,
        policy_id: Uuid,
        policy_name: &str,
        actor: &str,
    ) -> Result<AuditEvent> {
        let prev_hash = self.audit_repo.get_last_hash().await?;
        
        let payload = serde_json::json!({
            "policy_id": policy_id,
            "policy_name": policy_name,
        });

        let event = AuditEvent::new(
            "policy.created".to_string(),
            actor.to_string(),
            payload,
            None,
            Some(policy_id),
            None,
            prev_hash,
        );

        self.audit_repo.append(&event).await
    }

    pub async fn log_job_started(
        &self,
        job_id: Uuid,
        asset_id: Uuid,
        policy_id: Uuid,
        actor: &str,
    ) -> Result<AuditEvent> {
        let prev_hash = self.audit_repo.get_last_hash().await?;
        
        let payload = serde_json::json!({
            "job_id": job_id,
            "asset_id": asset_id,
            "policy_id": policy_id,
        });

        let event = AuditEvent::new(
            "job.started".to_string(),
            actor.to_string(),
            payload,
            Some(asset_id),
            Some(policy_id),
            Some(job_id),
            prev_hash,
        );

        self.audit_repo.append(&event).await
    }

    pub async fn log_job_completed(
        &self,
        job_id: Uuid,
        asset_id: Uuid,
        policy_id: Uuid,
        actor: &str,
    ) -> Result<AuditEvent> {
        let prev_hash = self.audit_repo.get_last_hash().await?;
        
        let payload = serde_json::json!({
            "job_id": job_id,
            "asset_id": asset_id,
            "policy_id": policy_id,
            "status": "success",
        });

        let event = AuditEvent::new(
            "job.completed".to_string(),
            actor.to_string(),
            payload,
            Some(asset_id),
            Some(policy_id),
            Some(job_id),
            prev_hash,
        );

        self.audit_repo.append(&event).await
    }

    pub async fn log_job_failed(
        &self,
        job_id: Uuid,
        asset_id: Uuid,
        policy_id: Uuid,
        error: &str,
        actor: &str,
    ) -> Result<AuditEvent> {
        let prev_hash = self.audit_repo.get_last_hash().await?;
        
        let payload = serde_json::json!({
            "job_id": job_id,
            "asset_id": asset_id,
            "policy_id": policy_id,
            "status": "failed",
            "error": error,
        });

        let event = AuditEvent::new(
            "job.failed".to_string(),
            actor.to_string(),
            payload,
            Some(asset_id),
            Some(policy_id),
            Some(job_id),
            prev_hash,
        );

        self.audit_repo.append(&event).await
    }

    pub async fn log_crypto_operation(
        &self,
        asset_id: Uuid,
        operation: &str,
        details: serde_json::Value,
        actor: &str,
    ) -> Result<AuditEvent> {
        let prev_hash = self.audit_repo.get_last_hash().await?;
        
        let mut payload = serde_json::json!({
            "asset_id": asset_id,
            "operation": operation,
        });
        
        if let serde_json::Value::Object(map) = details {
            if let serde_json::Value::Object(payload_map) = &mut payload {
                for (k, v) in map {
                    payload_map.insert(k, v);
                }
            }
        }

        let event = AuditEvent::new(
            "crypto.operation".to_string(),
            actor.to_string(),
            payload,
            Some(asset_id),
            None,
            None,
            prev_hash,
        );

        self.audit_repo.append(&event).await
    }
}
