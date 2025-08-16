use axum::{Json, extract::{Path, Query}, http::StatusCode, Extension};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use serde_json::json;
use crate::{storage::{state::Storage, tx::Transaction, receipts::{TxReceipt}}, mempool::{Mempool, MempoolError, basic_validate}, state::State, ws::server::WsHub, storage::blocks::TpsWindow};
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Clone)]
pub struct RpcContext { pub storage: Arc<Storage>, pub mempool: Arc<Mutex<Mempool>>, pub state: Arc<Mutex<State>>, pub ws: WsHub, pub tps: Arc<Mutex<TpsWindow>> }

#[derive(Deserialize)]
pub struct SubmitTx { pub from:String, pub to:String, pub amount: u128, pub fee: u128, pub nonce: Option<u64>, pub signature: Option<String> }

#[derive(Serialize)]
struct StatsResponse { height: u64, mempool_size: usize, #[serde(skip_serializing_if = "Option::is_none")] rolling_tps: Option<f64>, #[serde(skip_serializing_if = "Option::is_none")] chain_id: Option<String> }

fn blake3_hex(input: &str) -> String { let h = blake3::hash(input.as_bytes()); let mut out = String::with_capacity(66); out.push_str("0x"); for b in h.as_bytes() { out.push_str(&format!("{:02x}", b)); } out }

#[axum::debug_handler]
pub async fn submit(ctx: Extension<RpcContext>, Json(body): Json<SubmitTx>) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    let current_nonce = ctx.state.lock().unwrap().nonce_of(&body.from);
    let nonce = body.nonce.unwrap_or(current_nonce);
    if nonce != current_nonce { return Err((StatusCode::UNPROCESSABLE_ENTITY, Json(json!({"error":"InvalidNonce","expected": current_nonce, "got": nonce })))) }
    let tx_hash = blake3_hex(&format!("{}:{}:{}:{}:{}", body.from, body.to, body.amount, body.fee, nonce));
    let tx = Transaction::new(tx_hash.clone(), body.from.clone(), body.to.clone(), body.amount, body.fee, nonce, body.signature.clone());
    {
        let mut mp = ctx.mempool.lock().unwrap();
        if mp.contains(&tx_hash) { return Err((StatusCode::CONFLICT, Json(json!({"error":"Duplicate"})))) }
        if mp.is_full() { return Err((StatusCode::TOO_MANY_REQUESTS, Json(json!({"error":"MempoolFull"})))) }
        // basic pre-validate (signature placeholder) using current state snapshot
        if let Err(e) = basic_validate(&ctx.state.lock().unwrap(), &tx) { return Err((StatusCode::UNPROCESSABLE_ENTITY, Json(json!({"error": e })))) }
        mp.push(tx.clone()).map_err(|e| match e { MempoolError::Duplicate => (StatusCode::CONFLICT, Json(json!({"error":"Duplicate"}))), MempoolError::Full => (StatusCode::TOO_MANY_REQUESTS, Json(json!({"error":"MempoolFull"}))) })?;
    }
    ctx.storage.put_tx(&tx).map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error":"StorageError"}))))?;
    let pending = TxReceipt::pending(&tx);
    ctx.storage.put_pending_receipt(&pending).map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error":"StorageError"}))))?;
    ctx.ws.broadcast_json(&json!({"type":"new_transaction","hash": tx_hash }));
    Ok(Json(json!({"hash": tx_hash, "status":"pending"})))
}

#[derive(Deserialize)]
pub struct BlocksQuery { pub offset: Option<u64>, pub limit: Option<u64> }

pub async fn list_blocks(Query(q): Query<BlocksQuery>, ctx: axum::Extension<RpcContext>) -> Json<serde_json::Value> {
    let limit = q.limit.unwrap_or(10).min(100);
    let height = ctx.storage.height();
    let mut blocks = vec![];
    let mut h = q.offset.unwrap_or(height);
    while h>0 && blocks.len() < limit as usize { if let Some(b) = ctx.storage.get_block_by_height(h) { blocks.push(json!({"height": b.header.height, "hash": b.hash, "txs": b.txs.iter().map(|t| &t.hash).collect::<Vec<_>>() })); } if h==0 { break; } h-=1; }
    Json(json!({"blocks": blocks}))
}

pub async fn get_block(Path(id): Path<String>, ctx: axum::Extension<RpcContext>) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    let block = if id.starts_with("0x") { ctx.storage.get_block_by_hash(id.clone()) } else if id == "latest" { ctx.storage.get_block_by_height(ctx.storage.height()) } else { id.parse::<u64>().ok().and_then(|h| ctx.storage.get_block_by_height(h)) };
    if let Some(b) = block { Ok(Json(json!({"hash": b.hash, "height": b.header.height, "parent": b.header.parent, "timestamp": b.header.timestamp, "txs": b.txs }))) } else { Err((StatusCode::NOT_FOUND, Json(json!({"error":"NotFound"})))) }
}

pub async fn get_balance(Path(addr): Path<String>, ctx: axum::Extension<RpcContext>) -> Json<serde_json::Value> { let bal = ctx.state.lock().unwrap().balance_of(&addr); Json(json!({"balance": bal.to_string()})) }

pub async fn get_tx(Path(hash): Path<String>, ctx: axum::Extension<RpcContext>) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    if let Some(r) = ctx.storage.get_receipt(&hash) { Ok(Json(serde_json::to_value(r).unwrap())) } else if ctx.mempool.lock().unwrap().contains(&hash) { Ok(Json(json!({"status":"pending","hash": hash }))) } else { Err((StatusCode::NOT_FOUND, Json(json!({"error":"NotFound"})))) }
}

pub async fn stats(ctx: axum::Extension<RpcContext>) -> Json<serde_json::Value> {
    let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs();
    let rolling_tps = { ctx.tps.lock().unwrap().rolling_tps(now) };
    let chain_id = ctx.storage.get_chain_id();
    Json(json!({"height": ctx.storage.height(), "mempool_size": ctx.mempool.lock().unwrap().len(), "rolling_tps": rolling_tps, "chain_id": chain_id }))
}

pub async fn peers() -> Json<serde_json::Value> { Json(json!([])) }
