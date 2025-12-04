use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::{IntoResponse, Json},
    Extension,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::sync::Arc;
use uuid::Uuid;

use crate::application::AuditService;
use crate::domain::{ProtectionPolicy, ProtectionMode};
use crate::infrastructure::PolicyRepository;

pub struct PolicyHandlers {
    policy_repo: Arc<dyn PolicyRepository>,
    audit_service: Arc<AuditService>,
}

impl PolicyHandlers {
    pub fn new(policy_repo: Arc<dyn PolicyRepository>, audit_service: Arc<AuditService>) -> Self {
        Self {
            policy_repo,
            audit_service,
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct CreatePolicyRequest {
    pub name: String,
    pub description: String,
    pub kem: String,
    pub signature_scheme: String,
    pub symmetric_algo: String,
    pub mode: ProtectionMode,
    pub rotation_interval_days: i32,
}

pub async fn list_policies_handler(
    State(handlers): State<Arc<PolicyHandlers>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let policies = handlers.policy_repo.list_all().await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(json!({ "policies": policies })))
}

pub async fn get_policy_handler(
    State(handlers): State<Arc<PolicyHandlers>>,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let policy = handlers.policy_repo.find_by_id(id).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .ok_or((StatusCode::NOT_FOUND, "Policy not found".to_string()))?;

    Ok(Json(json!(policy)))
}

pub async fn create_policy_handler(
    State(handlers): State<Arc<PolicyHandlers>>,
    Extension(actor): Extension<String>,
    Json(payload): Json<CreatePolicyRequest>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let policy = ProtectionPolicy::new(
        payload.name,
        payload.description,
        payload.kem,
        payload.signature_scheme,
        payload.symmetric_algo,
        payload.mode,
        payload.rotation_interval_days,
    );

    policy.validate()
        .map_err(|e| (StatusCode::BAD_REQUEST, e))?;

    let created = handlers.policy_repo.create(&policy).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    handlers.audit_service.log_policy_created(created.id, &created.name, &actor).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok((StatusCode::CREATED, Json(json!(created))))
}
