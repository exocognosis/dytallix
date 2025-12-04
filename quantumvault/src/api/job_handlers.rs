use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::{IntoResponse, Json},
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::sync::Arc;
use uuid::Uuid;

use crate::domain::ProtectionJob;
use crate::infrastructure::{JobRepository, AssetRepository, PolicyRepository};

pub struct JobHandlers {
    job_repo: Arc<dyn JobRepository>,
    asset_repo: Arc<dyn AssetRepository>,
    policy_repo: Arc<dyn PolicyRepository>,
}

impl JobHandlers {
    pub fn new(
        job_repo: Arc<dyn JobRepository>,
        asset_repo: Arc<dyn AssetRepository>,
        policy_repo: Arc<dyn PolicyRepository>,
    ) -> Self {
        Self {
            job_repo,
            asset_repo,
            policy_repo,
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct ApplyPolicyRequest {
    pub policy_id: Uuid,
}

pub async fn apply_policy_handler(
    State(handlers): State<Arc<JobHandlers>>,
    Path(asset_id): Path<Uuid>,
    Json(payload): Json<ApplyPolicyRequest>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let asset = handlers.asset_repo.find_by_id(asset_id).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .ok_or((StatusCode::NOT_FOUND, "Asset not found".to_string()))?;

    let policy = handlers.policy_repo.find_by_id(payload.policy_id).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .ok_or((StatusCode::NOT_FOUND, "Policy not found".to_string()))?;

    if !policy.is_compatible_with_asset_type(&asset.asset_type) {
        return Err((
            StatusCode::BAD_REQUEST,
            format!("Policy '{}' is not compatible with asset type '{:?}'", policy.name, asset.asset_type)
        ));
    }

    let job = ProtectionJob::new(asset_id, payload.policy_id);

    let created = handlers.job_repo.enqueue(&job).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok((StatusCode::CREATED, Json(json!(created))))
}

pub async fn get_job_handler(
    State(handlers): State<Arc<JobHandlers>>,
    Path(job_id): Path<Uuid>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let job = handlers.job_repo.find_by_id(job_id).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .ok_or((StatusCode::NOT_FOUND, "Job not found".to_string()))?;

    Ok(Json(json!(job)))
}

#[derive(Debug, Deserialize)]
pub struct ListJobsQuery {
    pub asset_id: Option<Uuid>,
}

pub async fn list_jobs_handler(
    State(handlers): State<Arc<JobHandlers>>,
    Query(query): Query<ListJobsQuery>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let jobs = if let Some(asset_id) = query.asset_id {
        handlers.job_repo.list_by_asset(asset_id).await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    } else {
        vec![]
    };

    Ok(Json(json!({ "jobs": jobs })))
}
