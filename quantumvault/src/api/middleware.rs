use axum::{
    extract::{Request, State},
    http::{StatusCode, Method},
    middleware::Next,
    response::{IntoResponse, Response},
};
use serde_json::json;

#[derive(Clone)]
pub struct ApiKeyAuth {
    pub api_key: String,
}

pub async fn auth_middleware(
    State(auth): State<ApiKeyAuth>,
    mut request: Request,
    next: Next,
) -> Result<Response, (StatusCode, String)> {
    // Allow OPTIONS requests (CORS preflight) without authentication
    if request.method() == Method::OPTIONS {
        return Ok(next.run(request).await);
    }

    let api_key = request
        .headers()
        .get("X-API-Key")
        .and_then(|v| v.to_str().ok())
        .ok_or((StatusCode::UNAUTHORIZED, "Missing API key".to_string()))?;

    if api_key != auth.api_key {
        return Err((StatusCode::UNAUTHORIZED, "Invalid API key".to_string()));
    }

    request.extensions_mut().insert("system".to_string());

    Ok(next.run(request).await)
}

pub async fn extract_actor(request: &Request) -> String {
    request
        .extensions()
        .get::<String>()
        .cloned()
        .unwrap_or_else(|| "anonymous".to_string())
}
