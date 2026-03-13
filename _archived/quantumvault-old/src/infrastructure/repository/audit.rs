use crate::domain::AuditEvent;
use anyhow::Result;
use async_trait::async_trait;
use chrono::{DateTime, Utc};
use sqlx::PgPool;
use uuid::Uuid;

#[async_trait]
pub trait AuditRepository: Send + Sync {
    async fn append(&self, event: &AuditEvent) -> Result<AuditEvent>;
    async fn get_last_hash(&self) -> Result<String>;
    async fn query(&self, filter: AuditFilter) -> Result<Vec<AuditEvent>>;
    async fn get_all_ordered(&self) -> Result<Vec<AuditEvent>>;
}

#[derive(Debug, Clone)]
pub struct AuditFilter {
    pub asset_id: Option<Uuid>,
    pub policy_id: Option<Uuid>,
    pub job_id: Option<Uuid>,
    pub actor: Option<String>,
    pub event_type: Option<String>,
    pub from_time: Option<DateTime<Utc>>,
    pub to_time: Option<DateTime<Utc>>,
}

pub struct PostgresAuditRepository {
    pool: PgPool,
}

impl PostgresAuditRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl AuditRepository for PostgresAuditRepository {
    async fn append(&self, event: &AuditEvent) -> Result<AuditEvent> {
        sqlx::query_as::<_, AuditEvent>(
            r#"
            INSERT INTO audit_events (id, event_type, asset_id, policy_id, job_id, actor, payload_json, prev_hash, current_hash, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
            "#,
        )
        .bind(event.id)
        .bind(&event.event_type)
        .bind(event.asset_id)
        .bind(event.policy_id)
        .bind(event.job_id)
        .bind(&event.actor)
        .bind(&event.payload_json)
        .bind(&event.prev_hash)
        .bind(&event.current_hash)
        .bind(event.created_at)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| e.into())
    }

    async fn get_last_hash(&self) -> Result<String> {
        let result: Option<(String,)> = sqlx::query_as(
            "SELECT current_hash FROM audit_events ORDER BY created_at DESC LIMIT 1"
        )
        .fetch_optional(&self.pool)
        .await?;

        Ok(result.map(|(hash,)| hash).unwrap_or_else(|| "genesis".to_string()))
    }

    async fn query(&self, filter: AuditFilter) -> Result<Vec<AuditEvent>> {
        let mut query = String::from("SELECT * FROM audit_events WHERE 1=1");
        
        if filter.asset_id.is_some() {
            query.push_str(" AND asset_id = $1");
        }
        if filter.policy_id.is_some() {
            query.push_str(" AND policy_id = $2");
        }
        if filter.job_id.is_some() {
            query.push_str(" AND job_id = $3");
        }
        if filter.actor.is_some() {
            query.push_str(" AND actor = $4");
        }
        if filter.event_type.is_some() {
            query.push_str(" AND event_type = $5");
        }
        if filter.from_time.is_some() {
            query.push_str(" AND created_at >= $6");
        }
        if filter.to_time.is_some() {
            query.push_str(" AND created_at <= $7");
        }
        query.push_str(" ORDER BY created_at DESC");

        let mut q = sqlx::query_as::<_, AuditEvent>(&query);
        
        if let Some(asset_id) = filter.asset_id {
            q = q.bind(asset_id);
        }
        if let Some(policy_id) = filter.policy_id {
            q = q.bind(policy_id);
        }
        if let Some(job_id) = filter.job_id {
            q = q.bind(job_id);
        }
        if let Some(ref actor) = filter.actor {
            q = q.bind(actor);
        }
        if let Some(ref event_type) = filter.event_type {
            q = q.bind(event_type);
        }
        if let Some(from_time) = filter.from_time {
            q = q.bind(from_time);
        }
        if let Some(to_time) = filter.to_time {
            q = q.bind(to_time);
        }

        q.fetch_all(&self.pool)
            .await
        .map_err(|e| e.into())
    }

    async fn get_all_ordered(&self) -> Result<Vec<AuditEvent>> {
        sqlx::query_as::<_, AuditEvent>("SELECT * FROM audit_events ORDER BY created_at ASC")
            .fetch_all(&self.pool)
            .await
        .map_err(|e| e.into())
    }
}
