use crate::types::ValidationError;
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
    NotImplemented(String),
    Validation(ValidationError),
    BadRequest(String),
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        match self {
            ApiError::InvalidNonce { expected, got } => (StatusCode::CONFLICT, Json(serde_json::json!({"error":"INVALID_NONCE","message": format!("expected {} got {}", expected, got), "expected": expected, "got": got}))).into_response(),
            ApiError::InvalidSignature => (StatusCode::UNPROCESSABLE_ENTITY, Json(serde_json::json!({"error":"INVALID_SIGNATURE","message":"signature verification failed"}))).into_response(),
            ApiError::InsufficientFunds => (StatusCode::UNPROCESSABLE_ENTITY, Json(serde_json::json!({"error":"INSUFFICIENT_FUNDS","message":"insufficient balance"}))).into_response(),
            ApiError::DuplicateTx => (StatusCode::CONFLICT, Json(serde_json::json!({"error":"DUPLICATE_TRANSACTION","message":"duplicate transaction"}))).into_response(),
            ApiError::MempoolFull => (StatusCode::SERVICE_UNAVAILABLE, Json(serde_json::json!({"error":"MEMPOOL_FULL","message":"mempool full"}))).into_response(),
            ApiError::NotFound => (StatusCode::NOT_FOUND, Json(serde_json::json!({"error":"NOT_FOUND","message":"resource not found"}))).into_response(),
            ApiError::Internal => (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error":"INTERNAL_ERROR","message":"internal error"}))).into_response(),
            ApiError::NotImplemented(msg) => (StatusCode::NOT_IMPLEMENTED, Json(serde_json::json!({"error":"NOT_IMPLEMENTED","message": msg}))).into_response(),
            ApiError::Validation(validation_error) => {
                let status = match validation_error.http_status() {
                    422 => StatusCode::UNPROCESSABLE_ENTITY,
                    409 => StatusCode::CONFLICT,
                    503 => StatusCode::SERVICE_UNAVAILABLE,
                    _ => StatusCode::BAD_REQUEST,
                };
                (status, Json(validation_error.to_json())).into_response()
            },
            ApiError::BadRequest(msg) => (StatusCode::BAD_REQUEST, Json(serde_json::json!({"error":"BAD_REQUEST","message":msg}))).into_response(),
        }
    }
}

impl From<ValidationError> for ApiError {
    fn from(err: ValidationError) -> Self {
        ApiError::Validation(err)
    }
}
