use crate::rpc::errors::ApiError;
use crate::rpc::RpcContext;
use crate::storage::oracle::{AiRiskRecord, OracleStore};
use crate::runtime::oracle::{OracleAiRiskInput, OracleAiRiskBatchInput, verify_sig};
use axum::{Extension, Json};
use serde_json::json;

/// Submit a single AI risk score
#[axum::debug_handler]
pub async fn submit_ai_risk(
    Extension(ctx): Extension<RpcContext>,
    Json(inp): Json<OracleAiRiskInput>,
) -> Result<Json<serde_json::Value>, ApiError> {
    // Delegate to the runtime module
    crate::runtime::oracle::post_ai_risk(Extension(ctx), Json(inp)).await
}

/// Submit multiple AI risk scores in batch
#[axum::debug_handler]
pub async fn submit_ai_risk_batch(
    Extension(ctx): Extension<RpcContext>,
    Json(inp): Json<OracleAiRiskBatchInput>,
) -> Result<Json<serde_json::Value>, ApiError> {
    // Delegate to the runtime module
    crate::runtime::oracle::post_ai_risk_batch(Extension(ctx), Json(inp)).await
}

/// Get AI risk scores for multiple transactions
#[axum::debug_handler]
pub async fn get_ai_risk_batch(
    Extension(ctx): Extension<RpcContext>,
    Json(tx_hashes): Json<Vec<String>>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let store = OracleStore {
        db: &ctx.storage.db,
    };
    
    let mut results = Vec::new();
    let mut not_found = Vec::new();
    
    for tx_hash in tx_hashes {
        if let Some(risk_record) = store.get_ai_risk(&tx_hash) {
            results.push(json!({
                "tx_hash": tx_hash,
                "model_id": risk_record.model_id,
                "risk_score": risk_record.risk_score,
                "confidence": risk_record.confidence,
                "oracle_pubkey": risk_record.oracle_pubkey
            }));
        } else {
            not_found.push(tx_hash);
        }
    }
    
    Ok(Json(json!({
        "found": results,
        "not_found": not_found,
        "total_requested": results.len() + not_found.len(),
        "total_found": results.len()
    })))
}

/// Get oracle statistics and health information
#[axum::debug_handler]
pub async fn oracle_stats(
    Extension(ctx): Extension<RpcContext>,
) -> Result<Json<serde_json::Value>, ApiError> {
    // For now, return basic stats. In a real implementation, we'd track more metrics
    let configured_pubkey = std::env::var("AI_ORACLE_PUBKEY").is_ok();
    
    Ok(Json(json!({
        "signature_verification_enabled": configured_pubkey,
        "supported_endpoints": [
            "/oracle/ai_risk",
            "/oracle/ai_risk_batch", 
            "/oracle/ai_risk_query_batch",
            "/oracle/stats"
        ],
        "schema_version": "1.0",
        "validation_rules": {
            "risk_score_range": "0.0 to 1.0",
            "confidence_range": "0.0 to 1.0",
            "tx_hash_format": "hex string starting with 0x",
            "model_id_required": true
        }
    })))
}