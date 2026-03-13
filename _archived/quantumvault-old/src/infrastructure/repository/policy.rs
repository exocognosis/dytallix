use crate::domain::{ProtectionPolicy, ProtectionMode};
use async_trait::async_trait;
use chrono::{DateTime, Utc};
use sqlx::PgPool;
use anyhow::Result;
use uuid::Uuid;

#[async_trait]
pub trait PolicyRepository: Send + Sync {
    async fn create(&self, policy: &ProtectionPolicy) -> Result<ProtectionPolicy>;
    async fn update(&self, policy: &ProtectionPolicy) -> Result<ProtectionPolicy>;
    async fn find_by_id(&self, id: Uuid) -> Result<Option<ProtectionPolicy>>;
    async fn list_all(&self) -> Result<Vec<ProtectionPolicy>>;
    async fn get_default_policies(&self) -> Result<Vec<ProtectionPolicy>>;
}

pub struct PostgresPolicyRepository {
    pool: PgPool,
}

impl PostgresPolicyRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[derive(sqlx::FromRow)]
struct PolicyRow {
    id: Uuid,
    name: String,
    description: String,
    kem: String,
    signature_scheme: String,
    symmetric_algo: String,
    mode: ProtectionMode,
    rotation_interval_days: i32,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

impl From<PolicyRow> for ProtectionPolicy {
    fn from(row: PolicyRow) -> Self {
        ProtectionPolicy {
            id: row.id,
            name: row.name,
            description: row.description,
            kem: row.kem,
            signature_scheme: row.signature_scheme,
            symmetric_algo: row.symmetric_algo,
            mode: row.mode,
            rotation_interval_days: row.rotation_interval_days,
            created_at: row.created_at,
            updated_at: row.updated_at,
        }
    }
}

#[async_trait]
impl PolicyRepository for PostgresPolicyRepository {
    async fn create(&self, policy: &ProtectionPolicy) -> Result<ProtectionPolicy> {
        let row = sqlx::query_as::<_, PolicyRow>(
            r#"
            INSERT INTO policies (id, name, description, kem, signature_scheme, symmetric_algo, mode, rotation_interval_days, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
            "#,
        )
        .bind(policy.id)
        .bind(&policy.name)
        .bind(&policy.description)
        .bind(&policy.kem)
        .bind(&policy.signature_scheme)
        .bind(&policy.symmetric_algo)
        .bind(&policy.mode)
        .bind(policy.rotation_interval_days)
        .bind(policy.created_at)
        .bind(policy.updated_at)
        .fetch_one(&self.pool)
        .await?;

        Ok(row.into())
    }

    async fn update(&self, policy: &ProtectionPolicy) -> Result<ProtectionPolicy> {
        let row = sqlx::query_as::<_, PolicyRow>(
            r#"
            UPDATE policies 
            SET name = $2, description = $3, kem = $4, signature_scheme = $5, 
                symmetric_algo = $6, mode = $7, rotation_interval_days = $8, updated_at = $9
            WHERE id = $1
            RETURNING *
            "#,
        )
        .bind(policy.id)
        .bind(&policy.name)
        .bind(&policy.description)
        .bind(&policy.kem)
        .bind(&policy.signature_scheme)
        .bind(&policy.symmetric_algo)
        .bind(&policy.mode)
        .bind(policy.rotation_interval_days)
        .bind(policy.updated_at)
        .fetch_one(&self.pool)
        .await?;

        Ok(row.into())
    }

    async fn find_by_id(&self, id: Uuid) -> Result<Option<ProtectionPolicy>> {
        let row = sqlx::query_as::<_, PolicyRow>("SELECT * FROM policies WHERE id = $1")
            .bind(id)
            .fetch_optional(&self.pool)
            .await?;

        Ok(row.map(Into::into))
    }

    async fn list_all(&self) -> Result<Vec<ProtectionPolicy>> {
        let rows = sqlx::query_as::<_, PolicyRow>("SELECT * FROM policies ORDER BY created_at DESC")
            .fetch_all(&self.pool)
            .await?;

        Ok(rows.into_iter().map(Into::into).collect())
    }

    async fn get_default_policies(&self) -> Result<Vec<ProtectionPolicy>> {
        self.list_all().await
        .map_err(|e| e.into())
    }
}
