use axum::{
    extract::{State, Path, Query},
    Json,
    http::StatusCode,
    response::IntoResponse,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use std::sync::Arc;
use crate::application::ScanService;
use crate::domain::ScanType;

// DTOs
#[derive(Deserialize)]
pub struct CreateScanRequest {
    pub targets: Vec<String>,
    pub scan_type: ScanType,
}

#[derive(Serialize)]
pub struct CreateScanResponse {
    pub id: Uuid,
    pub status: String,
}

pub async fn create_scan(
    State(scan_service): State<Arc<ScanService>>,
    Json(payload): Json<CreateScanRequest>,
) -> impl IntoResponse {
    // In a real app, we'd create the record first and return ID
    let scan_id = Uuid::new_v4();
    
    // Spawn background task
    let service = scan_service.clone();
    tokio::spawn(async move {
        let _ = service.run_scan(scan_id, payload.targets, payload.scan_type).await;
    });

    (StatusCode::ACCEPTED, Json(CreateScanResponse {
        id: scan_id,
        status: "PENDING".to_string(),
    }))
}

pub async fn get_scans() -> impl IntoResponse {
    // Placeholder for listing scans
    Json::<Vec<String>>(vec![])
}

pub async fn get_scan(Path(id): Path<Uuid>) -> impl IntoResponse {
    // Placeholder for getting scan details
    Json(serde_json::json!({ "id": id, "status": "COMPLETED" }))
}
