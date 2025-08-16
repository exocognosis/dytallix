use crate::rpc::errors::ApiError;
use crate::{
    mempool::{basic_validate, Mempool, MempoolError},
    state::State,
    storage::blocks::TpsWindow,
    storage::{receipts::TxReceipt, state::Storage, tx::Transaction},
    ws::server::WsHub,
    crypto::{canonical_json, sha3_256, ActivePQC},
};
use axum::{
    extract::{Path, Query},
    Extension, Json,
};
use serde::Deserialize;
use serde_json::json;
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};
use crate::storage::oracle::OracleStore;
use crate::runtime::bridge;
use crate::EmissionEngine; // updated import for emission engine via re-export
use crate::util::hash::blake3_tx_hash;
use base64::{engine::general_purpose::STANDARD as B64, Engine};

#[derive(Clone)]
pub struct RpcContext {
    pub storage: Arc<Storage>,
    pub mempool: Arc<Mutex<Mempool>>,
    pub state: Arc<Mutex<State>>,
    pub ws: WsHub,
    pub tps: Arc<Mutex<TpsWindow>>,
    pub emission: Arc<EmissionEngine>,
}

#[derive(Deserialize)]
pub struct SubmitTx {
    pub signed_tx: SignedTx,
}

#[derive(Deserialize, Clone, Debug)]
pub struct Tx {
    pub chain_id: String,
    pub nonce: u64,
    pub msgs: Vec<serde_json::Value>,
    #[serde(deserialize_with = "de_u128_string")] pub fee: u128,
    pub memo: String,
}

fn de_u128_string<'de, D: serde::Deserializer<'de>>(d: D) -> Result<u128, D::Error> { let s = String::deserialize(d)?; s.parse().map_err(serde::de::Error::custom) }

#[derive(Deserialize, Clone, Debug)]
pub struct SignedTx {
    pub tx: Tx,
    pub public_key: String,
    pub signature: String,
    pub algorithm: String,
    pub version: u32,
}

fn verify_envelope(env: &SignedTx) -> bool {
    if env.algorithm != ActivePQC::ALG || env.version != 1 { return false; }
    if let Ok(bytes) = canonical_json(&env.tx) { let hash = sha3_256(&bytes); if let (Ok(pk), Ok(sig)) = (B64.decode(&env.public_key), B64.decode(&env.signature)) { return ActivePQC::verify(&pk, &hash, &sig); } }
    false
}

#[axum::debug_handler]
pub async fn submit(
    ctx: Extension<RpcContext>,
    Json(body): Json<SubmitTx>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let env = body.signed_tx;
    if !verify_envelope(&env) { return Err(ApiError::InvalidSignature); }
    let from = env.msgs_first_from().unwrap_or_default();
    let current_nonce = ctx.state.lock().unwrap().nonce_of(&from);
    if env.tx.nonce != current_nonce { return Err(ApiError::InvalidNonce { expected: current_nonce, got: env.tx.nonce }); }
    // Build legacy Transaction wrapper (single send assumption for now)
    let tx_hash = format!("0x{}", hex::encode(sha3_256(&canonical_json(&env.tx).unwrap())));
    let tx = Transaction::new(
        tx_hash.clone(),
        from.clone(),
        from.clone(),
        0,
        env.tx.fee,
        env.tx.nonce,
        Some(env.signature.clone()),
    );
    {
        let mut mp = ctx.mempool.lock().unwrap();
        if mp.contains(&tx_hash) { return Err(ApiError::DuplicateTx); }
        if mp.is_full() { return Err(ApiError::MempoolFull); }
        if let Err(e) = basic_validate(&ctx.state.lock().unwrap(), &tx) { if e.starts_with("InvalidNonce") { return Err(ApiError::InvalidNonce { expected: current_nonce, got: env.tx.nonce }); } if e.contains("InsufficientBalance") { return Err(ApiError::InsufficientFunds); } return Err(ApiError::Internal); }
        mp.push(tx.clone()).map_err(|e| match e { MempoolError::Duplicate => ApiError::DuplicateTx, MempoolError::Full => ApiError::MempoolFull })?;
    }
    ctx.storage.put_tx(&tx).map_err(|_| ApiError::Internal)?;
    let pending = TxReceipt::pending(&tx);
    ctx.storage.put_pending_receipt(&pending).map_err(|_| ApiError::Internal)?;
    ctx.ws.broadcast_json(&json!({"type":"new_transaction","hash": tx_hash }));
    Ok(Json(json!({"hash": tx_hash, "status":"pending"})))
}

impl SignedTx { fn msgs_first_from(&self) -> Option<String> { self.tx.msgs.get(0).and_then(|v| v.get("from")).and_then(|f| f.as_str()).map(|s| s.to_string()) } }

#[derive(Deserialize)]
pub struct BlocksQuery {
    pub offset: Option<u64>,
    pub limit: Option<u64>,
}

pub async fn list_blocks(
    Query(q): Query<BlocksQuery>,
    ctx: axum::Extension<RpcContext>,
) -> Json<serde_json::Value> {
    let limit = q.limit.unwrap_or(10).min(100);
    let height = ctx.storage.height();
    let mut blocks = vec![];
    let mut h = q.offset.unwrap_or(height);
    while h > 0 && blocks.len() < limit as usize {
        if let Some(b) = ctx.storage.get_block_by_height(h) {
            blocks.push(json!({"height": b.header.height, "hash": b.hash, "txs": b.txs.iter().map(|t| &t.hash).collect::<Vec<_>>() }));
        }
        if h == 0 {
            break;
        }
        h -= 1;
    }
    Json(json!({"blocks": blocks}))
}

pub async fn get_block(
    Path(id): Path<String>,
    ctx: axum::Extension<RpcContext>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let block = if id.starts_with("0x") {
        ctx.storage.get_block_by_hash(id.clone())
    } else if id == "latest" {
        ctx.storage.get_block_by_height(ctx.storage.height())
    } else {
        id.parse::<u64>()
            .ok()
            .and_then(|h| ctx.storage.get_block_by_height(h))
    };
    if let Some(b) = block {
        Ok(Json(
            json!({"hash": b.hash, "height": b.header.height, "parent": b.header.parent, "timestamp": b.header.timestamp, "txs": b.txs }),
        ))
    } else {
        Err(ApiError::NotFound)
    }
}

pub async fn get_balance(
    Path(addr): Path<String>,
    ctx: axum::Extension<RpcContext>,
) -> Json<serde_json::Value> {
    let bal = ctx.state.lock().unwrap().balance_of(&addr);
    Json(json!({"balance": bal.to_string()}))
}

pub async fn get_tx(
    Path(hash): Path<String>,
    ctx: axum::Extension<RpcContext>,
) -> Result<Json<serde_json::Value>, ApiError> {
    if let Some(r) = ctx.storage.get_receipt(&hash) {
        let mut v = serde_json::to_value(r).unwrap();
        let store = OracleStore {
            db: &ctx.storage.db,
        };
        if let Some(ai) = store.get_ai_risk(&hash) {
            v["ai_risk_score"] = serde_json::json!(ai.score);
        }
        Ok(Json(v))
    } else if ctx.mempool.lock().unwrap().contains(&hash) {
        let store = OracleStore {
            db: &ctx.storage.db,
        };
        let mut base = serde_json::json!({"status":"pending","hash": hash });
        if let Some(ai) = store.get_ai_risk(&hash) {
            base["ai_risk_score"] = serde_json::json!(ai.score);
        }
        Ok(Json(base))
    } else {
        Err(ApiError::NotFound)
    }
}

pub async fn stats(ctx: axum::Extension<RpcContext>) -> Json<serde_json::Value> {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();
    let rolling_tps = { ctx.tps.lock().unwrap().rolling_tps(now) };
    let chain_id = ctx.storage.get_chain_id();
    let em_snap = ctx.emission.snapshot();
    Json(
        json!({"height": ctx.storage.height(), "mempool_size": ctx.mempool.lock().unwrap().len(), "rolling_tps": rolling_tps, "chain_id": chain_id, "emission_pools": em_snap.pools }),
    )
}

pub async fn peers() -> Json<serde_json::Value> {
    Json(json!([]))
}

// Bridge endpoints
pub async fn bridge_ingest(
    Extension(ctx): Extension<RpcContext>,
    Json(body): Json<bridge::IngestBridgeMessage>,
) -> Result<Json<serde_json::Value>, ApiError> {
    bridge::ingest(Extension(ctx), Json(body)).await
}
pub async fn bridge_halt(
    Extension(ctx): Extension<RpcContext>,
    Json(body): Json<bridge::BridgeHaltToggle>,
) -> Result<Json<serde_json::Value>, ApiError> {
    bridge::halt_toggle(Extension(ctx), Json(body)).await
}
pub async fn bridge_state(
    Extension(ctx): Extension<RpcContext>,
) -> Result<Json<serde_json::Value>, ApiError> {
    bridge::bridge_state(Extension(ctx)).await
}

pub async fn emission_claim(
    Extension(ctx): Extension<RpcContext>,
    Json(body): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let pool = body
        .get("pool")
        .and_then(|v| v.as_str())
        .ok_or(ApiError::Internal)?;
    let amount = body
        .get("amount")
        .and_then(|v| v.as_u64())
        .ok_or(ApiError::Internal)? as u128;
    let to = body
        .get("to")
        .and_then(|v| v.as_str())
        .ok_or(ApiError::Internal)?;
    match ctx.emission.claim(pool, amount, to) {
        Ok(remaining) => Ok(Json(
            json!({"pool": pool, "remaining": remaining.to_string()}),
        )),
        Err(_) => Err(ApiError::Internal),
    }
}

pub mod errors;
