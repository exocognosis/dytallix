use crate::domain::{ProtectionJob, JobStatus};
use async_trait::async_trait;
use sqlx::PgPool;
use anyhow::Result;
use uuid::Uuid;

#[async_trait]
pub trait JobRepository: Send + Sync {
    async fn enqueue(&self, job: &ProtectionJob) -> Result<ProtectionJob>;
    async fn update_status(&self, job: &ProtectionJob) -> Result<ProtectionJob>;
    async fn find_by_id(&self, id: Uuid) -> Result<Option<ProtectionJob>>;
    async fn get_pending(&self, limit: i64) -> Result<Vec<ProtectionJob>>;
    async fn list_by_asset(&self, asset_id: Uuid) -> Result<Vec<ProtectionJob>>;
}

pub struct PostgresJobRepository {
    pool: PgPool,
}

impl PostgresJobRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl JobRepository for PostgresJobRepository {
    async fn enqueue(&self, job: &ProtectionJob) -> Result<ProtectionJob> {
        sqlx::query_as::<_, ProtectionJob>(
            r#"
            INSERT INTO jobs (id, asset_id, policy_id, status, error_message, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
            "#,
        )
        .bind(job.id)
        .bind(job.asset_id)
        .bind(job.policy_id)
        .bind(&job.status)
        .bind(&job.error_message)
        .bind(job.created_at)
        .bind(job.updated_at)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| e.into())
        
    }

    async fn update_status(&self, job: &ProtectionJob) -> Result<ProtectionJob> {
        sqlx::query_as::<_, ProtectionJob>(
            r#"
            UPDATE jobs 
            SET status = $2, error_message = $3, updated_at = $4
            WHERE id = $1
            RETURNING *
            "#,
        )
        .bind(job.id)
        .bind(&job.status)
        .bind(&job.error_message)
        .bind(job.updated_at)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| e.into())
        
    }

    async fn find_by_id(&self, id: Uuid) -> Result<Option<ProtectionJob>> {
        sqlx::query_as::<_, ProtectionJob>("SELECT * FROM jobs WHERE id = $1")
            .bind(id)
            .fetch_optional(&self.pool)
            .await
        .map_err(|e| e.into())
            
    }

    async fn get_pending(&self, limit: i64) -> Result<Vec<ProtectionJob>> {
        sqlx::query_as::<_, ProtectionJob>(
            r#"
            SELECT * FROM jobs 
            WHERE status = 'pending'
            ORDER BY created_at ASC
            LIMIT $1
            "#,
        )
        .bind(limit)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| e.into())
        
    }

    async fn list_by_asset(&self, asset_id: Uuid) -> Result<Vec<ProtectionJob>> {
        sqlx::query_as::<_, ProtectionJob>(
            "SELECT * FROM jobs WHERE asset_id = $1 ORDER BY created_at DESC"
        )
        .bind(asset_id)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| e.into())
        
    }
}
