use ed25519_dalek::{Verifier, PublicKey, Signature};
use serde::Deserialize;
use axum::{Json, Extension};
use crate::rpc::errors::ApiError;
use crate::rpc::RpcContext;
use crate::storage::oracle::{OracleStore, AiRiskRecord};
use base64::Engine; // for new decode API
use base64::engine::general_purpose::STANDARD as B64;

#[derive(Deserialize)]
pub struct OracleAiRiskInput {
    pub tx_hash: String,
    pub score: f32,
    pub signature: Option<String>,
}

// Public for unit testing
pub fn verify_sig(pubkey_b64: &str, tx_hash: &str, score: f32, sig_b64: &str) -> bool {
    if let (Ok(pk_bytes), Ok(sig_bytes)) = (B64.decode(pubkey_b64), B64.decode(sig_b64)) {
        if let (Ok(pk), Ok(sig)) = (PublicKey::from_bytes(&pk_bytes), Signature::from_bytes(&sig_bytes)) {
            let msg = format!("{}:{}", tx_hash, score);
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
    if !(0.0..=1.0).contains(&inp.score) { return Err(ApiError::Internal); }
    let configured_pk = std::env::var("AI_ORACLE_PUBKEY").ok();
    if let Some(pk) = configured_pk.as_ref() {
        let sig = inp.signature.as_ref().ok_or(ApiError::Internal)?;
        if !verify_sig(pk, &inp.tx_hash, inp.score, sig) {
            return Err(ApiError::Internal);
        }
    }
    let store = OracleStore { db: &ctx.storage.db };
    let rec = AiRiskRecord { tx_hash: inp.tx_hash.clone(), score: inp.score, signature: inp.signature.clone(), oracle_pubkey: configured_pk };
    store.put_ai_risk(&rec).map_err(|_| ApiError::Internal)?;
    Ok(Json(serde_json::json!({"ok": true})))
}
