use axum::{
    extract::{State, Path},
    Json,
    http::StatusCode,
    response::IntoResponse,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use std::sync::Arc;
use crate::application::AttestationService;
use crate::domain::BlockchainAttestationJob;

#[derive(Deserialize)]
pub struct CreateAttestationJobRequest {
    pub anchor_id: Uuid,
    pub filters: serde_json::Value,
}

#[derive(Serialize)]
pub struct CreateAttestationJobResponse {
    pub job_id: Uuid,
    pub status: String,
}

pub async fn create_attestation_job(
    State(service): State<Arc<AttestationService>>,
    Json(payload): Json<CreateAttestationJobRequest>,
) -> impl IntoResponse {
    let job_id = Uuid::new_v4();
    let job = BlockchainAttestationJob::new(payload.anchor_id, None, payload.filters);
    
    // Spawn background task
    let service = service.clone();
    tokio::spawn(async move {
        let _ = service.process_job(&job).await;
    });

    (StatusCode::ACCEPTED, Json(CreateAttestationJobResponse {
        job_id,
        status: "PENDING".to_string(),
    }))
}
