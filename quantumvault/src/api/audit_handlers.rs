use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::{IntoResponse, Json},
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::sync::Arc;
use uuid::Uuid;

use crate::domain::verify_chain;
use crate::infrastructure::{AuditRepository, AuditFilter};

pub struct AuditHandlers {
    audit_repo: Arc<dyn AuditRepository>,
}

impl AuditHandlers {
    pub fn new(audit_repo: Arc<dyn AuditRepository>) -> Self {
        Self { audit_repo }
    }
}

#[derive(Debug, Deserialize)]
pub struct AuditQuery {
    pub asset_id: Option<Uuid>,
    pub policy_id: Option<Uuid>,
    pub job_id: Option<Uuid>,
    pub actor: Option<String>,
    pub event_type: Option<String>,
    pub from_time: Option<DateTime<Utc>>,
    pub to_time: Option<DateTime<Utc>>,
}

pub async fn query_audit_handler(
    State(handlers): State<Arc<AuditHandlers>>,
    Query(query): Query<AuditQuery>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let filter = AuditFilter {
        asset_id: query.asset_id,
        policy_id: query.policy_id,
        job_id: query.job_id,
        actor: query.actor,
        event_type: query.event_type,
        from_time: query.from_time,
        to_time: query.to_time,
    };

    let events = handlers.audit_repo.query(filter).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(json!({ "events": events, "count": events.len() })))
}

pub async fn verify_audit_chain_handler(
    State(handlers): State<Arc<AuditHandlers>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let events = handlers.audit_repo.get_all_ordered().await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let is_valid = verify_chain(&events);

    Ok(Json(json!({
        "valid": is_valid,
        "total_events": events.len(),
        "message": if is_valid {
            "Audit chain is intact and valid"
        } else {
            "Audit chain integrity check FAILED - possible tampering detected"
        }
    })))
}
