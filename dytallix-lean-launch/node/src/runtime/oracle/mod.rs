use crate::rpc::errors::ApiError;
use crate::rpc::RpcContext;
use crate::storage::oracle::{AiRiskRecord, OracleStore};
use axum::{Extension, Json};
use base64::engine::general_purpose::STANDARD as B64;
use base64::Engine; // for new decode API
use ed25519_dalek::{PublicKey, Signature, Verifier};
use serde::Deserialize;

#[derive(Deserialize)]
pub struct OracleAiRiskInput {
    pub tx_hash: String,
    pub model_id: String,
    pub risk_score: f32,
    pub confidence: Option<f32>,
    pub signature: Option<String>,
}

#[derive(Deserialize)]
pub struct OracleAiRiskBatchInput {
    pub records: Vec<OracleAiRiskInput>,
}

// Public for unit testing
pub fn verify_sig(pubkey_b64: &str, tx_hash: &str, risk_score: f32, sig_b64: &str) -> bool {
    if let (Ok(pk_bytes), Ok(sig_bytes)) = (B64.decode(pubkey_b64), B64.decode(sig_b64)) {
        if let (Ok(pk), Ok(sig)) = (
            PublicKey::from_bytes(&pk_bytes),
            Signature::from_bytes(&sig_bytes),
        ) {
            let msg = format!("{}:{}", tx_hash, risk_score);
            return pk.verify(msg.as_bytes(), &sig).is_ok();
        }
    }
    false
}

#[axum::debug_handler]
pub async fn post_ai_risk(
    Extension(ctx): Extension<RpcContext>,
    Json(inp): Json<OracleAiRiskInput>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let start_time = std::time::SystemTime::now();
    
    if !(0.0..=1.0).contains(&inp.risk_score) {
        return Err(ApiError::Internal);
    }
    let configured_pk = std::env::var("AI_ORACLE_PUBKEY").ok();
    if let Some(pk) = configured_pk.as_ref() {
        let sig = inp.signature.as_ref().ok_or(ApiError::Internal)?;
        if !verify_sig(pk, &inp.tx_hash, inp.risk_score, sig) {
            return Err(ApiError::Internal);
        }
    }
    let store = OracleStore {
        db: &ctx.storage.db,
    };
    let rec = AiRiskRecord {
        tx_hash: inp.tx_hash.clone(),
        model_id: inp.model_id,
        risk_score: inp.risk_score,
        confidence: inp.confidence,
        signature: inp.signature.clone(),
        oracle_pubkey: configured_pk,
    };
    store.put_ai_risk(&rec).map_err(|_| ApiError::Internal)?;
    
    // Record oracle metrics
    if let Ok(latency) = start_time.elapsed() {
        ctx.metrics.record_oracle_update(latency);
    }
    
    Ok(Json(serde_json::json!({"ok": true})))
}

#[axum::debug_handler]
pub async fn post_ai_risk_batch(
    Extension(ctx): Extension<RpcContext>,
    Json(inp): Json<OracleAiRiskBatchInput>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let start_time = std::time::SystemTime::now();
    
    let configured_pk = std::env::var("AI_ORACLE_PUBKEY").ok();
    let store = OracleStore {
        db: &ctx.storage.db,
    };
    
    let mut records = Vec::new();
    let mut errors = Vec::new();
    
    for (idx, risk_input) in inp.records.iter().enumerate() {
        // Validate each record
        if !(0.0..=1.0).contains(&risk_input.risk_score) {
            errors.push(format!("Record {}: risk_score out of range", idx));
            continue;
        }
        
        // Verify signature if required
        if let Some(pk) = configured_pk.as_ref() {
            if let Some(sig) = risk_input.signature.as_ref() {
                if !verify_sig(pk, &risk_input.tx_hash, risk_input.risk_score, sig) {
                    errors.push(format!("Record {}: invalid signature", idx));
                    continue;
                }
            } else {
                errors.push(format!("Record {}: missing required signature", idx));
                continue;
            }
        }
        
        let rec = AiRiskRecord {
            tx_hash: risk_input.tx_hash.clone(),
            model_id: risk_input.model_id.clone(),
            risk_score: risk_input.risk_score,
            confidence: risk_input.confidence,
            signature: risk_input.signature.clone(),
            oracle_pubkey: configured_pk.clone(),
        };
        records.push(rec);
    }
    
    let failed_hashes = store.put_ai_risks_batch(&records).map_err(|_| ApiError::Internal)?;
    
    // Record oracle metrics for batch processing
    if let Ok(latency) = start_time.elapsed() {
        ctx.metrics.record_oracle_update(latency);
    }
    
    Ok(Json(serde_json::json!({
        "processed": records.len(),
        "failed": failed_hashes.len(),
        "failed_hashes": failed_hashes,
        "validation_errors": errors
    })))
}
