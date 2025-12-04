use crate::application::audit_service::AuditService;
use crate::domain::{Asset, ProtectionJob, ProtectionPolicy, AssetType};
use crate::infrastructure::{CryptoEngine, AssetRepository, PolicyRepository, JobRepository};
use anyhow::{Context, Result};
use sqlx::PgPool;
use std::sync::Arc;
use std::time::Duration;
use tokio::time;
use tracing::{info, error};

pub struct JobEngine {
    job_repo: Arc<dyn JobRepository>,
    asset_repo: Arc<dyn AssetRepository>,
    policy_repo: Arc<dyn PolicyRepository>,
    crypto_engine: Arc<CryptoEngine>,
    audit_service: Arc<AuditService>,
    poll_interval: Duration,
    batch_size: i64,
    pool: PgPool,
}

impl JobEngine {
    pub fn new(
        job_repo: Arc<dyn JobRepository>,
        asset_repo: Arc<dyn AssetRepository>,
        policy_repo: Arc<dyn PolicyRepository>,
        crypto_engine: Arc<CryptoEngine>,
        audit_service: Arc<AuditService>,
        poll_interval: Duration,
        batch_size: i64,
        pool: PgPool,
    ) -> Self {
        Self {
            job_repo,
            asset_repo,
            policy_repo,
            crypto_engine,
            audit_service,
            poll_interval,
            batch_size,
            pool,
        }
    }

    pub async fn start(self: Arc<Self>) {
        info!("Starting job engine with poll interval: {:?}", self.poll_interval);
        
        let mut interval = time::interval(self.poll_interval);
        
        loop {
            interval.tick().await;
            
            match self.process_pending_jobs().await {
                Ok(count) if count > 0 => {
                    info!("Processed {} jobs", count);
                }
                Ok(_) => {}
                Err(e) => {
                    error!("Error processing jobs: {}", e);
                }
            }
        }
    }

    async fn process_pending_jobs(&self) -> Result<usize> {
        let jobs = self.job_repo.get_pending(self.batch_size).await?;
        
        let count = jobs.len();
        
        if count == 0 {
            return Ok(0);
        }

        info!("Found {} pending jobs", count);
        
        for job in jobs {
            if let Err(e) = self.process_job(job).await {
                error!("Failed to process job: {}", e);
            }
        }

        Ok(count)
    }

    async fn process_job(&self, mut job: ProtectionJob) -> Result<()> {
        info!("Processing job {} for asset {}", job.id, job.asset_id);
        
        job.mark_running();
        self.job_repo.update_status(&job).await?;
        
        self.audit_service.log_job_started(
            job.id,
            job.asset_id,
            job.policy_id,
            "job-engine",
        ).await?;

        let result = self.execute_job(&job).await;
        
        match result {
            Ok(()) => {
                info!("Job {} completed successfully", job.id);
                job.mark_success();
                self.job_repo.update_status(&job).await?;
                
                self.audit_service.log_job_completed(
                    job.id,
                    job.asset_id,
                    job.policy_id,
                    "job-engine",
                ).await?;
            }
            Err(e) => {
                error!("Job {} failed: {}", job.id, e);
                let error_msg = e.to_string();
                job.mark_failed(error_msg.clone());
                self.job_repo.update_status(&job).await?;
                
                self.audit_service.log_job_failed(
                    job.id,
                    job.asset_id,
                    job.policy_id,
                    &error_msg,
                    "job-engine",
                ).await?;
            }
        }

        Ok(())
    }

    async fn execute_job(&self, job: &ProtectionJob) -> Result<()> {
        let mut asset = self.asset_repo.find_by_id(job.asset_id).await?
            .ok_or_else(|| anyhow::anyhow!("Asset not found"))?;
        
        let policy = self.policy_repo.find_by_id(job.policy_id).await?
            .ok_or_else(|| anyhow::anyhow!("Policy not found"))?;

        if !policy.is_compatible_with_asset_type(&asset.asset_type) {
            return Err(anyhow::anyhow!("Policy is not compatible with asset type"));
        }

        match asset.asset_type {
            AssetType::DataStore | AssetType::KeyMaterial => {
                self.protect_data_asset(&mut asset, &policy).await?;
            }
            AssetType::TlsEndpoint | AssetType::Certificate => {
                self.protect_tls_asset(&mut asset, &policy).await?;
            }
            AssetType::ApiEndpoint => {
                self.protect_api_asset(&mut asset, &policy).await?;
            }
            _ => {
                // Other asset types not supported for automated protection yet
                return Err(anyhow::anyhow!("Asset type not supported for automated protection"));
            }
        }

        self.asset_repo.update(&asset).await?;
        
        Ok(())
    }

    async fn protect_data_asset(
        &self,
        asset: &mut Asset,
        policy: &ProtectionPolicy,
    ) -> Result<()> {
        info!("Protecting data asset {} with policy {}", asset.id, policy.name);
        
        let wrapped_key = self.crypto_engine.wrap_data_key(policy)?;
        
        sqlx::query(
            r#"
            INSERT INTO data_keys (id, asset_id, wrapped_key_blob, nonce, pqc_ciphertext, classical_ciphertext, algorithm, kem_algorithm, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
            "#,
        )
        .bind(uuid::Uuid::new_v4())
        .bind(asset.id)
        .bind(&wrapped_key.wrapped_key)
        .bind(&wrapped_key.nonce)
        .bind(&wrapped_key.pqc_ciphertext)
        .bind(&wrapped_key.classical_ciphertext)
        .bind(&wrapped_key.algorithm)
        .bind(&wrapped_key.kem_algorithm)
        .execute(&self.pool)
        .await?;

        let encryption_profile = serde_json::json!({
            "protected": true,
            "kem": policy.kem,
            "symmetric": policy.symmetric_algo,
            "mode": policy.mode,
            "protected_at": chrono::Utc::now().to_rfc3339(),
        });

        asset.update_encryption_profile(encryption_profile.clone());
        
        self.audit_service.log_crypto_operation(
            asset.id,
            "data_key_wrap",
            encryption_profile,
            "job-engine",
        ).await?;

        Ok(())
    }

    async fn protect_tls_asset(
        &self,
        asset: &mut Asset,
        policy: &ProtectionPolicy,
    ) -> Result<()> {
        info!("Protecting TLS asset {} with policy {}", asset.id, policy.name);
        
        let keypair = self.crypto_engine.generate_hybrid_keypair(policy)?;
        
        let encryption_profile = serde_json::json!({
            "protected": true,
            "kem": policy.kem,
            "signature": policy.signature_scheme,
            "mode": policy.mode,
            "pqc_public_key": hex::encode(&keypair.pqc_public_key),
            "classical_public_key": hex::encode(&keypair.classical_public_key),
            "signature_public_key": hex::encode(&keypair.signature_public_key),
            "protected_at": chrono::Utc::now().to_rfc3339(),
        });

        asset.update_encryption_profile(encryption_profile.clone());
        
        self.audit_service.log_crypto_operation(
            asset.id,
            "hybrid_keypair_generation",
            encryption_profile,
            "job-engine",
        ).await?;

        Ok(())
    }

    async fn protect_api_asset(
        &self,
        asset: &mut Asset,
        policy: &ProtectionPolicy,
    ) -> Result<()> {
        info!("Protecting API asset {} with policy {}", asset.id, policy.name);
        
        let keypair = self.crypto_engine.generate_hybrid_keypair(policy)?;
        
        let encryption_profile = serde_json::json!({
            "protected": true,
            "kem": policy.kem,
            "signature": policy.signature_scheme,
            "mode": policy.mode,
            "signature_public_key": hex::encode(&keypair.signature_public_key),
            "protected_at": chrono::Utc::now().to_rfc3339(),
        });

        asset.update_encryption_profile(encryption_profile.clone());
        
        self.audit_service.log_crypto_operation(
            asset.id,
            "api_protection",
            encryption_profile,
            "job-engine",
        ).await?;

        Ok(())
    }
}
