use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::Serialize;

#[derive(Debug, Serialize)]
#[serde(tag = "error", content = "details", rename_all = "PascalCase")]
pub enum ApiError {
    InvalidNonce { expected: u64, got: u64 },
    InvalidSignature,
    InsufficientFunds,
    DuplicateTx,
    MempoolFull,
    NotFound,
    Internal,
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        match self {
            ApiError::InvalidNonce { expected, got } => (StatusCode::UNPROCESSABLE_ENTITY, Json(serde_json::json!({"error":"InvalidNonce","message": format!("expected {} got {}", expected, got)}))).into_response(),
            ApiError::InvalidSignature => (StatusCode::UNPROCESSABLE_ENTITY, Json(serde_json::json!({"error":"InvalidSignature","message":"signature verification failed"}))).into_response(),
            ApiError::InsufficientFunds => (StatusCode::UNPROCESSABLE_ENTITY, Json(serde_json::json!({"error":"InsufficientFunds","message":"insufficient balance"}))).into_response(),
            ApiError::DuplicateTx => (StatusCode::CONFLICT, Json(serde_json::json!({"error":"DuplicateTx","message":"duplicate transaction"}))).into_response(),
            ApiError::MempoolFull => (StatusCode::TOO_MANY_REQUESTS, Json(serde_json::json!({"error":"MempoolFull","message":"mempool full"}))).into_response(),
            ApiError::NotFound => (StatusCode::NOT_FOUND, Json(serde_json::json!({"error":"NotFound","message":"resource not found"}))).into_response(),
            ApiError::Internal => (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error":"Internal","message":"internal error"}))).into_response(),
        }
    }
}
