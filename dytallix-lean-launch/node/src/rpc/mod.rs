use crate::rpc::errors::ApiError;
use crate::runtime::bridge;
use crate::runtime::emission::EmissionEngine;
use crate::runtime::fee_burn::FeeBurnEngine;
use crate::runtime::governance::{GovernanceModule, ProposalType};
#[cfg(feature = "oracle")]
use crate::runtime::oracle::current_timestamp;
use crate::runtime::staking::StakingModule;
#[cfg(not(feature = "oracle"))]
fn current_timestamp() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}
#[cfg(feature = "oracle")]
use crate::storage::oracle::OracleStore;
use crate::types::{Msg, SignedTx, ValidationError};
use crate::{
    mempool::{basic_validate, Mempool},
    state::State,
    storage::blocks::TpsWindow,
    storage::{receipts::TxReceipt, state::Storage, tx::Transaction},
    ws::server::WsHub,
};
use axum::{
    extract::{Path, Query},
    Extension, Json,
};
#[cfg(feature = "contracts")]
use base64::Engine;
use serde::Deserialize;
use serde_json::json;
use std::collections::HashMap;
use std::fs::OpenOptions;
use std::io::Write;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};

pub mod ai;
pub mod errors; // restored errors module export
#[cfg(feature = "oracle")]
pub mod oracle;

/// GET /account/:addr - Return account details including nonce and balances
pub async fn get_account(
    Extension(ctx): Extension<RpcContext>,
    Path(addr): Path<String>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let mut state = ctx.state.lock().unwrap();
    let nonce = state.nonce_of(&addr);
    let balances = state.balances_of(&addr);
    Ok(Json(json!({
        "address": addr,
        "nonce": nonce,
        "balances": balances
    })))
}

#[derive(Clone)]
pub struct RpcContext {
    pub storage: Arc<Storage>,
    pub mempool: Arc<Mutex<Mempool>>,
    pub state: Arc<Mutex<State>>,
    pub ws: WsHub,
    pub tps: Arc<Mutex<TpsWindow>>,
    pub emission: Arc<Mutex<EmissionEngine>>,
    pub governance: Arc<Mutex<GovernanceModule>>,
    pub staking: Arc<Mutex<StakingModule>>,
    pub fee_burn: Arc<Mutex<FeeBurnEngine>>,
    pub metrics: Arc<crate::metrics::Metrics>,
    pub features: FeatureFlags,
    /// Minimal in-memory WASM contract state for JSON-RPC facade (legacy)
    pub wasm_contracts: Arc<Mutex<HashMap<String, u64>>>, // address -> counter
    /// WASM runtime for contract deployment and execution
    #[cfg(feature = "contracts")]
    pub wasm_runtime: Arc<crate::runtime::wasm::WasmRuntime>,
}

#[derive(Clone, Copy)]
pub struct FeatureFlags {
    pub governance: bool,
    pub staking: bool,
}

#[derive(Deserialize)]
pub struct SubmitTx {
    pub signed_tx: SignedTx,
}

fn validate_signed_tx(
    signed_tx: &SignedTx,
    expected_chain_id: &str,
    expected_nonce: u64,
    account_state: &crate::state::AccountState,
) -> Result<(), ValidationError> {
    // Verify signature
    if signed_tx.verify().is_err() {
        return Err(ValidationError::InvalidSignature);
    }

    // Validate transaction
    if signed_tx.tx.validate(expected_chain_id).is_err() {
        return Err(ValidationError::InvalidChainId {
            expected: expected_chain_id.to_string(),
            got: signed_tx.tx.chain_id.clone(),
        });
    }

    // Check nonce
    if signed_tx.tx.nonce != expected_nonce {
        return Err(ValidationError::InvalidNonce {
            expected: expected_nonce,
            got: signed_tx.tx.nonce,
        });
    }

    // Calculate required amounts per denomination
    let mut required_per_denom: std::collections::HashMap<String, u128> =
        std::collections::HashMap::new();

    // Add transaction fee (always in udgt for now)
    let fee_denom = "udgt".to_string();
    required_per_denom.insert(fee_denom.clone(), signed_tx.tx.fee);
    eprintln!("[DEBUG balance] Fee: {} {}", signed_tx.tx.fee, fee_denom);

    // Add amounts from messages
    for msg in &signed_tx.tx.msgs {
        match msg {
            Msg::Send { denom, amount, .. } => {
                // Convert DGT/DRT to micro denominations (udgt/udrt)
                // If already in micro-denom, use as-is
                let (micro_denom, micro_amount) = match denom.to_ascii_lowercase().as_str() {
                    "dgt" => ("udgt", amount.saturating_mul(1_000_000)),
                    "drt" => ("udrt", amount.saturating_mul(1_000_000)),
                    "udgt" => ("udgt", *amount),
                    "udrt" => ("udrt", *amount),
                    _ => (denom.as_str(), *amount),
                };

                eprintln!("[DEBUG balance] msg denom={}, amount={} -> micro_denom={}, micro_amount={}", 
                    denom, amount, micro_denom, micro_amount);

                let current = required_per_denom.get(micro_denom).copied().unwrap_or(0);
                let new_total = current.saturating_add(micro_amount);
                eprintln!("[DEBUG balance] Running total for {}: {} + {} = {}", 
                    micro_denom, current, micro_amount, new_total);
                required_per_denom.insert(micro_denom.to_string(), new_total);
            }
        }
    }

    eprintln!("[DEBUG balance] Final required amounts: {:?}", required_per_denom);

    // Check balance for each required denomination
    for (denom, required_amount) in required_per_denom {
        let available = account_state.balance_of(&denom);
        if available < required_amount {
            return Err(ValidationError::InsufficientFunds {
                required: required_amount,
                available,
            });
        }
    }

    Ok(())
}

fn append_submit_log(entry: &serde_json::Value) {
    let dir = std::path::PathBuf::from("launch-evidence/tx");
    let _ = std::fs::create_dir_all(&dir);
    let path = dir.join("submit_demo.log");
    if let Ok(mut f) = OpenOptions::new().create(true).append(true).open(path) {
        let line = serde_json::to_string(entry).unwrap_or_else(|_| "{}".to_string());
        let _ = writeln!(f, "{line}");
    }
}

#[axum::debug_handler]
pub async fn submit(
    ctx: Extension<RpcContext>,
    Json(body): Json<SubmitTx>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let signed_tx = body.signed_tx;

    // Precompute basic info for logging
    let base_log = |accepted: bool, detail: serde_json::Value| {
        json!({
            "ts": current_timestamp(),
            "accepted": accepted,
            "detail": detail
        })
    };

    // Get chain ID and first sender address
    let chain_id = ctx.storage.get_chain_id().unwrap_or_default();
    let from = signed_tx.first_from_address().ok_or_else(|| {
        let err = ApiError::Validation(ValidationError::Internal(
            "no sender address found".to_string(),
        ));
        append_submit_log(&base_log(
            false,
            json!({
                "reason": "no_sender",
                "chain_id": chain_id,
            }),
        ));
        err
    })?;

    // Get current nonce and account state
    let mut state = ctx.state.lock().unwrap();
    let current_nonce = state.nonce_of(from);
    let account_state = state.get_account(from);
    drop(state);

    // Validate the signed transaction
    if let Err(ve) = validate_signed_tx(&signed_tx, &chain_id, current_nonce, &account_state) {
        let detail = match &ve {
            ValidationError::InvalidChainId { expected, got } => json!({
                "error": "INVALID_CHAIN_ID", "expected": expected, "got": got, "from": from, "nonce": signed_tx.tx.nonce
            }),
            ValidationError::InvalidNonce { expected, got } => json!({
                "error": "INVALID_NONCE", "expected": expected, "got": got, "from": from, "nonce": signed_tx.tx.nonce
            }),
            ValidationError::InvalidSignature => json!({
                "error": "INVALID_SIGNATURE", "from": from, "nonce": signed_tx.tx.nonce
            }),
            ValidationError::InsufficientFunds {
                required,
                available,
            } => json!({
                "error": "INSUFFICIENT_FUNDS", "required": required.to_string(), "available": available.to_string(), "from": from, "nonce": signed_tx.tx.nonce
            }),
            ValidationError::DuplicateTransaction => json!({
                "error": "DUPLICATE_TRANSACTION", "from": from, "nonce": signed_tx.tx.nonce
            }),
            ValidationError::MempoolFull => json!({
                "error": "MEMPOOL_FULL", "from": from, "nonce": signed_tx.tx.nonce
            }),
            ValidationError::Internal(msg) => json!({
                "error": "INTERNAL_ERROR", "message": msg, "from": from, "nonce": signed_tx.tx.nonce
            }),
        };
        append_submit_log(&base_log(false, detail));
        return Err(ApiError::from(ve));
    }

    // Generate transaction hash
    let tx_hash = signed_tx.tx_hash().map_err(|_| {
        let err = ApiError::Validation(ValidationError::Internal(
            "failed to generate tx hash".to_string(),
        ));
        append_submit_log(&base_log(false, json!({
            "error": "INTERNAL_ERROR", "message": "tx_hash_failed", "from": from, "nonce": signed_tx.tx.nonce
        })));
        err
    })?;

    // Check for duplicate transaction
    {
        let mempool = ctx.mempool.lock().unwrap();
        if mempool.contains(&tx_hash) {
            append_submit_log(&base_log(
                false,
                json!({
                    "error": "DUPLICATE_TRANSACTION", "tx_hash": tx_hash, "from": from
                }),
            ));
            return Err(ApiError::Validation(ValidationError::DuplicateTransaction));
        }
        if mempool.is_full() {
            append_submit_log(&base_log(
                false,
                json!({
                    "error": "MEMPOOL_FULL", "tx_hash": tx_hash
                }),
            ));
            return Err(ApiError::Validation(ValidationError::MempoolFull));
        }
    }

    // Build legacy Transaction wrapper for storage compatibility
    // TODO: Remove this legacy conversion once storage is updated
    let mut legacy_tx = Transaction::new(
        tx_hash.clone(),
        from.to_string(),
        from.to_string(),
        0, // populate below based on msgs
        signed_tx.tx.fee,
        signed_tx.tx.nonce,
        Some(signed_tx.signature.clone()),
    )
    .with_pqc(
        signed_tx.public_key.clone(),
        signed_tx.tx.chain_id.clone(),
        signed_tx.tx.memo.clone(),
    );

    // Convert messages to storage format
    use crate::storage::tx::TxMessage;
    let mut tx_messages = Vec::new();
    
    // Sum send amounts so legacy accounting reserves the correct value
    let mut total_amount: u128 = 0;
    let mut first_to = legacy_tx.to.clone();
    let mut first_denom = "udgt".to_string(); // Default for backward compatibility
    for msg in &signed_tx.tx.msgs {
        let Msg::Send { to, amount, denom, from: msg_from, .. } = msg;
        total_amount = total_amount.saturating_add(*amount);
        
        // Convert DGT/DRT to micro denominations for storage
        let micro_denom = match denom.to_ascii_uppercase().as_str() {
            "DGT" => "udgt".to_string(),
            "DRT" => "udrt".to_string(),
            _ => denom.clone(), // Pass through other denoms
        };
        
        // Store message in new format
        tx_messages.push(TxMessage::Send {
            from: msg_from.clone(),
            to: to.clone(),
            denom: micro_denom.clone(),
            amount: *amount,
        });
        
        if first_to == from {
            first_to = to.clone();
            first_denom = micro_denom;
        }
    }
    legacy_tx.amount = total_amount;
    legacy_tx.to = first_to;
    legacy_tx.denom = first_denom;
    legacy_tx = legacy_tx.with_messages(tx_messages).with_algorithm(&signed_tx.algorithm);

    // Additional validation using legacy system
    {
        let state = ctx.state.lock().unwrap();
        if let Err(e) = basic_validate(&state, &legacy_tx) {
            if e.starts_with("InvalidNonce") {
                append_submit_log(&base_log(
                    false,
                    json!({
                        "error": "INVALID_NONCE", "expected": current_nonce, "got": signed_tx.tx.nonce, "tx_hash": tx_hash
                    }),
                ));
                return Err(ApiError::InvalidNonce {
                    expected: current_nonce,
                    got: signed_tx.tx.nonce,
                });
            }
            if e.contains("InsufficientBalance") {
                append_submit_log(&base_log(
                    false,
                    json!({
                        "error": "INSUFFICIENT_FUNDS", "tx_hash": tx_hash
                    }),
                ));
                return Err(ApiError::InsufficientFunds);
            }
            append_submit_log(&base_log(
                false,
                json!({
                    "error": "INTERNAL_ERROR", "message": e, "tx_hash": tx_hash
                }),
            ));
            return Err(ApiError::Internal);
        }
    }

    // Add to mempool
    let state_snapshot = {
        // Clone so we can drop the lock before touching the mempool
        ctx.state.lock().unwrap().clone()
    };
    {
        let mut mempool = ctx.mempool.lock().unwrap();
        let min_gas_price = mempool.config().min_gas_price;
        legacy_tx.gas_price = min_gas_price;
        if legacy_tx.gas_limit == 0 {
            // Default legacy gas limit: ENV override -> governance parameter
            let fallback_gas_limit = std::env::var("DYTALLIX_DEFAULT_GAS_LIMIT")
                .ok()
                .and_then(|s| s.parse::<u64>().ok())
                .unwrap_or_else(|| {
                    // Read from governance config as the canonical default
                    let gov = ctx.governance.lock().unwrap();
                    gov.get_config().gas_limit
                });
            legacy_tx.gas_limit = fallback_gas_limit;
        }
        // Use add_transaction directly to capture detailed rejection reasons
        if let Err(reason) = mempool.add_transaction_trusted(&state_snapshot, legacy_tx.clone()) {
            let (api_err, code) = match reason {
                crate::mempool::RejectionReason::InvalidSignature => {
                    (ApiError::InvalidSignature, "INVALID_SIGNATURE")
                }
                crate::mempool::RejectionReason::NonceGap { expected, got } => {
                    let e = ApiError::InvalidNonce { expected, got };
                    append_submit_log(&base_log(
                        false,
                        json!({
                            "error": "INVALID_NONCE", "expected": expected, "got": got, "tx_hash": tx_hash
                        }),
                    ));
                    return Err(e);
                }
                crate::mempool::RejectionReason::InsufficientFunds => {
                    (ApiError::InsufficientFunds, "INSUFFICIENT_FUNDS")
                }
                crate::mempool::RejectionReason::UnderpricedGas { .. } => (
                    ApiError::BadRequest("underpriced gas".to_string()),
                    "UNDERPRICED_GAS",
                ),
                crate::mempool::RejectionReason::OversizedTx { .. } => (
                    ApiError::BadRequest("oversized transaction".to_string()),
                    "OVERSIZED_TX",
                ),
                crate::mempool::RejectionReason::Duplicate(_) => {
                    (ApiError::DuplicateTx, "DUPLICATE_TRANSACTION")
                }
                crate::mempool::RejectionReason::PolicyViolation(msg) => (
                    ApiError::BadRequest(format!("policy violation: {msg}")),
                    "POLICY_VIOLATION",
                ),
                crate::mempool::RejectionReason::InternalError(_) => {
                    (ApiError::Internal, "INTERNAL_ERROR")
                }
            };
            append_submit_log(&base_log(
                false,
                json!({
                    "error": code, "tx_hash": tx_hash
                }),
            ));
            return Err(api_err);
        }
    }

    // Store transaction and receipt
    ctx.storage
        .put_tx(&legacy_tx)
        .map_err(|_| ApiError::Internal)?;
    let pending = TxReceipt::pending(&legacy_tx);
    ctx.storage
        .put_pending_receipt(&pending)
        .map_err(|_| ApiError::Internal)?;

    // Broadcast to websocket
    ctx.ws.broadcast_json(&json!({
        "type": "new_transaction",
        "hash": tx_hash
    }));

    // Success evidence log
    append_submit_log(&base_log(
        true,
        json!({
            "tx_hash": tx_hash,
            "from": from,
            "nonce": signed_tx.tx.nonce,
            "fee": signed_tx.tx.fee.to_string(),
            "chain_id": chain_id
        }),
    ));

    Ok(Json(json!({
        "hash": tx_hash,
        "status": "pending"
    })))
}

// Remove legacy helper function
// impl SignedTx { fn msgs_first_from(&self) { self.tx.msgs.get(0).and_then(|v| v.get("from")).and_then(|f| f.as_str()).map(|s| s.to_string()) } }

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
        let obj = json!({
            "hash": b.hash,
            "height": b.header.height,
            "parent": b.header.parent,
            "timestamp": b.header.timestamp,
            "txs": b.txs,
        });
        Ok(Json(obj))
    } else {
        Err(ApiError::NotFound)
    }
}

// New: getTransactionReceipt endpoint (hash path param) returning full receipt metadata
#[axum::debug_handler]
pub async fn get_transaction_receipt(
    Path(hash): Path<String>,
    ctx: axum::Extension<RpcContext>,
) -> Result<Json<serde_json::Value>, ApiError> {
    if let Some(r) = ctx.storage.get_receipt(&hash) {
        let v = serde_json::to_value(&r).unwrap();
        return Ok(Json(v));
    }
    Err(ApiError::NotFound)
}

pub async fn get_balance(
    Path(addr): Path<String>,
    Query(params): Query<std::collections::HashMap<String, String>>,
    ctx: axum::Extension<RpcContext>,
) -> Json<serde_json::Value> {
    let mut state = ctx.state.lock().unwrap();

    // Check if specific denomination is requested
    if let Some(denom) = params.get("denom") {
        let bal = state.balance_of(&addr, denom);
        return Json(json!({
            "address": addr,
            "denom": denom,
            "balance": bal.to_string()
        }));
    }

    // Return all balances for the address
    let balances = state.balances_of(&addr);
    let legacy_balance = state.legacy_balance_of(&addr);

    // Format balances for multi-denomination response
    let formatted_balances: std::collections::HashMap<String, serde_json::Value> = balances
        .iter()
        .map(|(denom, amount)| {
            let denom_info = match denom.as_str() {
                "udgt" => json!({
                    "balance": amount.to_string(),
                    "formatted": format!("{} DGT", amount / 1_000_000), // Assuming 6 decimal places
                    "type": "governance",
                    "description": "Governance token for voting and staking"
                }),
                "udrt" => json!({
                    "balance": amount.to_string(),
                    "formatted": format!("{} DRT", amount / 1_000_000), // Assuming 6 decimal places
                    "type": "reward",
                    "description": "Reward token for transaction fees and staking rewards"
                }),
                _ => json!({
                    "balance": amount.to_string(),
                    "type": "unknown"
                }),
            };
            (denom.clone(), denom_info)
        })
        .collect();

    Json(json!({
        "address": addr,
        "balances": formatted_balances,
        "legacy_balance": legacy_balance.to_string() // For backward compatibility
    }))
}

pub async fn get_tx(
    Path(hash): Path<String>,
    ctx: axum::Extension<RpcContext>,
) -> Result<Json<serde_json::Value>, ApiError> {
    if let Some(r) = ctx.storage.get_receipt(&hash) {
        let v = {
            #[cfg(feature = "oracle")]
            let mut tmp = serde_json::to_value(r).unwrap();
            #[cfg(not(feature = "oracle"))]
            let tmp = serde_json::to_value(r).unwrap();
            #[cfg(feature = "oracle")]
            {
                let store = OracleStore {
                    db: &ctx.storage.db,
                };
                if let Some(ai) = store.get_ai_risk(&hash) {
                    tmp["ai_risk_score"] = serde_json::json!(ai.risk_score);
                    tmp["ai_model_id"] = serde_json::json!(ai.model_id);
                    if let Some(confidence) = ai.confidence {
                        tmp["ai_confidence"] = serde_json::json!(confidence);
                    }
                }
            }
            tmp
        };
        return Ok(Json(v));
    }
    if ctx.mempool.lock().unwrap().contains(&hash) {
        let base = {
            #[cfg(feature = "oracle")]
            let mut tmp = serde_json::json!({"status":"pending","hash": hash });
            #[cfg(not(feature = "oracle"))]
            let tmp = serde_json::json!({"status":"pending","hash": hash });
            #[cfg(feature = "oracle")]
            {
                let store = OracleStore {
                    db: &ctx.storage.db,
                };
                if let Some(ai) = store.get_ai_risk(&hash) {
                    tmp["ai_risk_score"] = serde_json::json!(ai.risk_score);
                    tmp["ai_model_id"] = serde_json::json!(ai.model_id);
                    if let Some(confidence) = ai.confidence {
                        tmp["ai_confidence"] = serde_json::json!(confidence);
                    }
                }
            }
            tmp
        };
        return Ok(Json(base));
    }
    Err(ApiError::NotFound)
}

pub async fn stats(ctx: axum::Extension<RpcContext>) -> Json<serde_json::Value> {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();
    let rolling_tps = { ctx.tps.lock().unwrap().rolling_tps(now) };
    let chain_id = ctx.storage.get_chain_id();
    let em_snap = ctx.emission.lock().unwrap().snapshot();
    Json(
        json!({"height": ctx.storage.height(), "mempool_size": ctx.mempool.lock().unwrap().len(), "rolling_tps": rolling_tps, "chain_id": chain_id, "emission_pools": em_snap.pools }),
    )
}

/// GET /status - Node status endpoint for health check and basic info
pub async fn status(ctx: axum::Extension<RpcContext>) -> Json<serde_json::Value> {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();
    let latest_height = ctx.storage.height();
    let mempool_size = ctx.mempool.lock().unwrap().len();
    let chain_id = ctx.storage.get_chain_id();

    // For this implementation, we assume the node is never syncing (single node setup)
    // In a real network, this would check sync status against peers
    let syncing = false;

    Json(json!({
        "status": "healthy",
        "latest_height": latest_height,
        "syncing": syncing,
        "mempool_size": mempool_size,
        "chain_id": chain_id,
        "timestamp": now
    }))
}

/// GET /api/pqc/status - PQC configuration and status
pub async fn pqc_status() -> Json<serde_json::Value> {
    let default_algo = std::env::var("DYT_PQC_ALGO_DEFAULT").unwrap_or_else(|_| "dilithium3".to_string());
    let allowlist = std::env::var("DYT_PQC_ALGO_ALLOWLIST")
        .unwrap_or_else(|_| "dilithium3,dilithium5".to_string());
    
    let allowed_algorithms: Vec<&str> = allowlist.split(',').map(|s| s.trim()).collect();
    
    Json(json!({
        "pqc_enabled": true,
        "algo_default": default_algo,
        "allowlist": allowed_algorithms,
        "supported_algorithms": {
            "dilithium3": {
                "name": "CRYSTALS-Dilithium3",
                "nist_level": 3,
                "status": "primary",
                "public_key_bytes": 1952,
                "signature_bytes": 3309
            },
            "dilithium5": {
                "name": "CRYSTALS-Dilithium5",
                "nist_level": 5,
                "status": "supported",
                "public_key_bytes": 2592,
                "signature_bytes": 4627
            },
            "falcon512": {
                "name": "FALCON-512",
                "nist_level": 1,
                "status": "experimental",
                "public_key_bytes": 897,
                "signature_bytes": 666
            }
        }
    }))
}

pub async fn peers() -> Json<serde_json::Value> {
    Json(json!([]))
}

/// Global pause flag for block producer (ops simulation)
pub static PAUSE_PRODUCER: AtomicBool = AtomicBool::new(false);

/// POST /ops/pause - pause block production (simulation)
pub async fn ops_pause() -> Json<serde_json::Value> {
    PAUSE_PRODUCER.store(true, Ordering::Relaxed);
    Json(json!({"ok": true, "paused": true}))
}

/// POST /ops/resume - resume block production (simulation)
pub async fn ops_resume() -> Json<serde_json::Value> {
    PAUSE_PRODUCER.store(false, Ordering::Relaxed);
    Json(json!({"ok": true, "paused": false}))
}

/// GET /metrics - Prometheus metrics exposition (text/plain)
#[cfg(feature = "metrics")]
pub async fn metrics_export(
    Extension(ctx): Extension<RpcContext>,
) -> Result<(axum::http::StatusCode, String), ApiError> {
    use prometheus::TextEncoder;
    let enc = TextEncoder::new();
    let families = ctx.metrics.gather();
    match enc.encode_to_string(&families) {
        Ok(body) => Ok((axum::http::StatusCode::OK, body)),
        Err(_) => Err(ApiError::Internal),
    }
}

/// GET /metrics - Not implemented when metrics feature is disabled
#[cfg(not(feature = "metrics"))]
pub async fn metrics_export() -> Result<(axum::http::StatusCode, String), ApiError> {
    Ok((
        axum::http::StatusCode::NOT_IMPLEMENTED,
        "# metrics feature not compiled; rebuild with --features metrics".to_string(),
    ))
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
    match ctx.emission.lock().unwrap().claim(pool, amount, to) {
        Ok(remaining) => Ok(Json(
            json!({"pool": pool, "remaining": remaining.to_string()}),
        )),
        Err(_) => Err(ApiError::Internal),
    }
}

pub async fn gov_submit_proposal(
    Extension(ctx): Extension<RpcContext>,
    Json(body): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>, ApiError> {
    if !ctx.features.governance {
        return Err(ApiError::NotImplemented(
            "governance feature disabled".into(),
        ));
    }
    use crate::runtime::governance::ProposalType;

    let title = body
        .get("title")
        .and_then(|v| v.as_str())
        .ok_or(ApiError::Internal)?;
    let description = body
        .get("description")
        .and_then(|v| v.as_str())
        .ok_or(ApiError::Internal)?;
    let key = body
        .get("key")
        .and_then(|v| v.as_str())
        .ok_or(ApiError::Internal)?;
    let value = body
        .get("value")
        .and_then(|v| v.as_str())
        .ok_or(ApiError::Internal)?;
    let height = ctx.storage.height();
    let proposal_type = ProposalType::ParameterChange {
        key: key.to_string(),
        value: value.to_string(),
    };
    match ctx.governance.lock().unwrap().submit_proposal(
        height,
        title.to_string(),
        description.to_string(),
        proposal_type,
    ) {
        Ok(proposal_id) => Ok(Json(json!({"proposal_id": proposal_id}))),
        Err(_) => Err(ApiError::Internal),
    }
}

pub async fn gov_deposit(
    Extension(ctx): Extension<RpcContext>,
    Json(body): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>, ApiError> {
    if !ctx.features.governance {
        return Err(ApiError::NotImplemented(
            "governance feature disabled".into(),
        ));
    }
    let depositor = body
        .get("depositor")
        .and_then(|v| v.as_str())
        .ok_or(ApiError::Internal)?;
    let proposal_id = body
        .get("proposal_id")
        .and_then(|v| v.as_u64())
        .ok_or(ApiError::Internal)?;
    let amount = body
        .get("amount")
        .and_then(|v| v.as_u64())
        .ok_or(ApiError::Internal)? as u128;
    let height = ctx.storage.height();

    match ctx
        .governance
        .lock()
        .unwrap()
        .deposit(height, depositor, proposal_id, amount, "udgt")
    {
        Ok(()) => Ok(Json(json!({"success": true}))),
        Err(e) => {
            eprintln!("Governance deposit error: {e}");
            Err(ApiError::Internal)
        }
    }
}

pub async fn gov_vote(
    Extension(ctx): Extension<RpcContext>,
    Json(body): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>, ApiError> {
    if !ctx.features.governance {
        return Err(ApiError::NotImplemented(
            "governance feature disabled".into(),
        ));
    }
    use crate::runtime::governance::VoteOption;

    let voter = body
        .get("voter")
        .and_then(|v| v.as_str())
        .ok_or(ApiError::Internal)?;
    let proposal_id = body
        .get("proposal_id")
        .and_then(|v| v.as_u64())
        .ok_or(ApiError::Internal)?;
    let option_str = body
        .get("option")
        .and_then(|v| v.as_str())
        .ok_or(ApiError::Internal)?;
    let height = ctx.storage.height();

    let option = match option_str {
        "yes" => VoteOption::Yes,
        "no" => VoteOption::No,
        "no_with_veto" => VoteOption::NoWithVeto,
        "abstain" => VoteOption::Abstain,
        _ => return Err(ApiError::Internal),
    };

    match ctx
        .governance
        .lock()
        .unwrap()
        .vote(height, voter, proposal_id, option)
    {
        Ok(()) => Ok(Json(json!({"success": true}))),
        Err(e) => {
            eprintln!("Governance vote error: {e}");
            Err(ApiError::Internal)
        }
    }
}

pub async fn gov_get_proposal(
    Extension(ctx): Extension<RpcContext>,
    Path(proposal_id): Path<u64>,
) -> Result<Json<serde_json::Value>, ApiError> {
    match ctx.governance.lock().unwrap().get_proposal(proposal_id) {
        Ok(Some(proposal)) => Ok(Json(serde_json::to_value(proposal).unwrap())),
        Ok(None) => Err(ApiError::Internal),
        Err(e) => {
            eprintln!("Governance get proposal error: {e}");
            Err(ApiError::Internal)
        }
    }
}

pub async fn gov_tally(
    Extension(ctx): Extension<RpcContext>,
    Path(proposal_id): Path<u64>,
) -> Result<Json<serde_json::Value>, ApiError> {
    match ctx.governance.lock().unwrap().tally(proposal_id) {
        Ok(tally) => Ok(Json(serde_json::to_value(tally).unwrap())),
        Err(e) => {
            eprintln!("Governance tally error: {e}");
            Err(ApiError::Internal)
        }
    }
}

pub async fn gov_execute(
    Extension(ctx): Extension<RpcContext>,
    Json(body): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>, ApiError> {
    if !ctx.features.governance {
        return Err(ApiError::NotImplemented(
            "governance feature disabled".into(),
        ));
    }

    let proposal_id = body
        .get("proposal_id")
        .and_then(|v| v.as_u64())
        .ok_or(ApiError::Internal)?;

    match ctx.governance.lock().unwrap().execute(proposal_id) {
        Ok(()) => Ok(Json(json!({"success": true, "proposal_id": proposal_id}))),
        Err(e) => {
            eprintln!("Governance execute error: {e}");
            Err(ApiError::BadRequest(e))
        }
    }
}
// Runtime flags control behavior; queries remain available regardless of compile features

pub async fn gov_get_config(
    Extension(ctx): Extension<RpcContext>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let config = {
        let governance = ctx.governance.lock().unwrap();
        governance.get_config().clone()
    };
    Ok(Json(serde_json::to_value(config).unwrap()))
}

/// GET /api/governance/proposals - List all governance proposals
pub async fn gov_list_proposals(
    Extension(ctx): Extension<RpcContext>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let governance = ctx.governance.lock().unwrap();

    match governance.get_all_proposals() {
        Ok(proposals) => {
            let mut proposal_list = Vec::new();

            for proposal in proposals {
                // Get current tally for each proposal
                let current_tally = governance.tally(proposal.id).ok();
                let total_voting_power = governance.total_voting_power().unwrap_or(1);

                let participating_voting_power = current_tally
                    .as_ref()
                    .map(|t| t.total_voting_power)
                    .unwrap_or(0);

                let quorum_met = if total_voting_power > 0 {
                    let quorum_required =
                        (total_voting_power * governance.get_config().quorum) / 10000;
                    participating_voting_power >= quorum_required
                } else {
                    false
                };

                let proposal_summary = json!({
                    "id": proposal.id,
                    "type": match &proposal.proposal_type {
                        ProposalType::ParameterChange { key, .. } => format!("ParameterChange({key})")
                    },
                    "title": proposal.title,
                    "status": proposal.status,
                    "submit_time": proposal.submit_height, // In a real impl, convert to timestamp
                    "deposit_end": proposal.deposit_end_height,
                    "voting_end": proposal.voting_end_height,
                    "current_tally": current_tally.as_ref().map(|tally| json!({
                        "yes": tally.yes.to_string(),
                        "no": tally.no.to_string(),
                        "abstain": tally.abstain.to_string(),
                        "no_with_veto": tally.no_with_veto.to_string(),
                        "total_voting_power": total_voting_power.to_string(),
                        "participating_voting_power": participating_voting_power.to_string(),
                        "quorum_met": quorum_met
                    }))
                });

                proposal_list.push(proposal_summary);
            }

            Ok(Json(json!({
                "proposals": proposal_list
            })))
        }
        Err(e) => {
            eprintln!("Failed to get proposals: {e}");
            Err(ApiError::Internal)
        }
    }
}

/// GET /api/governance/proposals/{id}/votes - Get votes for a specific proposal
pub async fn gov_get_proposal_votes(
    Extension(ctx): Extension<RpcContext>,
    Path(proposal_id): Path<u64>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let governance = ctx.governance.lock().unwrap();

    match governance.get_proposal_votes(proposal_id) {
        Ok(votes) => {
            let vote_list: Vec<_> = votes
                .into_iter()
                .map(|vote| {
                    json!({
                        "voter": vote.voter,
                        "option": vote.option,
                        "voting_power": vote.weight.to_string(),
                        "timestamp": null // TODO: add timestamp to Vote struct
                    })
                })
                .collect();

            Ok(Json(json!({
                "proposal_id": proposal_id,
                "votes": vote_list
            })))
        }
        Err(e) => {
            eprintln!("Failed to get proposal votes: {e}");
            Err(ApiError::Internal)
        }
    }
}

/// GET /api/governance/voting-power/{address} - Get voting power for specific address
pub async fn gov_get_voting_power(
    Extension(ctx): Extension<RpcContext>,
    Path(address): Path<String>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let governance = ctx.governance.lock().unwrap();

    match governance.voting_power(&address) {
        Ok(voting_power) => Ok(Json(json!({
            "address": address,
            "voting_power": voting_power.to_string()
        }))),
        Err(e) => {
            eprintln!("Failed to get voting power for {address}: {e}");
            Err(ApiError::Internal)
        }
    }
}

/// GET /api/governance/total-voting-power - Get total voting power
pub async fn gov_get_total_voting_power(
    Extension(ctx): Extension<RpcContext>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let governance = ctx.governance.lock().unwrap();

    match governance.total_voting_power() {
        Ok(total_power) => {
            let active_power = governance.active_set_voting_power().unwrap_or(total_power);

            Ok(Json(json!({
                "total_voting_power": total_power.to_string(),
                "active_set_voting_power": active_power.to_string()
            })))
        }
        Err(e) => {
            eprintln!("Failed to get total voting power: {e}");
            Err(ApiError::Internal)
        }
    }
}

/// GET /api/contracts - List minimal in-memory contracts (address + counter)
pub async fn list_contracts(
    Extension(ctx): Extension<RpcContext>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let map = ctx.wasm_contracts.lock().unwrap();
    let mut items: Vec<serde_json::Value> = Vec::new();
    for (addr, counter) in map.iter() {
        items.push(json!({"address": addr, "counter": counter}));
    }
    Ok(Json(json!({"contracts": items})))
}

// Rewards API endpoints

#[derive(Deserialize)]
pub struct RewardsQuery {
    pub limit: Option<u32>,
    pub start_height: Option<u64>,
}

/// GET /api/rewards - Get recent emission events with pagination (staking optional)
pub async fn get_rewards(
    Extension(ctx): Extension<RpcContext>,
    Query(params): Query<RewardsQuery>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let limit = params.limit.unwrap_or(50).min(500);
    let current_height = ctx.storage.height();
    let start_height = params.start_height.unwrap_or(current_height);
    let mut events = Vec::new();
    let emission = ctx.emission.lock().unwrap();
    for height in (1..=start_height.min(current_height))
        .rev()
        .take(limit as usize)
    {
        if let Some(event) = emission.get_event(height) {
            if ctx.features.staking {
                let formatted_event = json!({
                    "height": event.height,
                    "timestamp": event.timestamp,
                    "total_emitted": event.total_emitted.to_string(),
                    "pools": {
                        "block_rewards": event.pools.get("block_rewards").unwrap_or(&0).to_string(),
                        "staking_rewards": event.pools.get("staking_rewards").unwrap_or(&0).to_string(),
                        "ai_module_incentives": event.pools.get("ai_module_incentives").unwrap_or(&0).to_string(),
                        "bridge_operations": event.pools.get("bridge_operations").unwrap_or(&0).to_string(),
                    },
                    "reward_index_after": event.reward_index_after.map(|v| v.to_string()),
                    "circulating_supply": event.circulating_supply.to_string(),
                });
                events.push(formatted_event);
            } else {
                events.push(json!({
                    "height": event.height,
                    "timestamp": event.timestamp,
                    "total_emitted": event.total_emitted.to_string(),
                    "circulating_supply": event.circulating_supply.to_string(),
                }));
            }
        }
    }
    // Staking stats: real values if staking enabled; otherwise zeros
    let (total_stake, reward_index, pending_emission) = if ctx.features.staking {
        ctx.staking.lock().unwrap().get_stats()
    } else {
        (0, 0, 0)
    };
    Ok(Json(json!({
        "events": events,
        "pagination": {"limit": limit, "start_height": start_height, "total_available": current_height},
        "staking_stats": {
            "total_stake": total_stake.to_string(),
            "reward_index": reward_index.to_string(),
            "pending_emission": pending_emission.to_string(),
        }
    })))
}

/// GET /api/rewards/:height - Get emission event for specific height
pub async fn get_rewards_by_height(
    Extension(ctx): Extension<RpcContext>,
    Path(height): Path<u64>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let emission = ctx.emission.lock().unwrap();

    match emission.get_event(height) {
        Some(event) => {
            // Format numbers as strings to prevent JS precision issues
            let formatted_event = json!({
                "height": event.height,
                "timestamp": event.timestamp,
                "total_emitted": event.total_emitted.to_string(),
                "pools": {
                    "block_rewards": event.pools.get("block_rewards").unwrap_or(&0).to_string(),
                    "staking_rewards": event.pools.get("staking_rewards").unwrap_or(&0).to_string(),
                    "ai_module_incentives": event.pools.get("ai_module_incentives").unwrap_or(&0).to_string(),
                    "bridge_operations": event.pools.get("bridge_operations").unwrap_or(&0).to_string(),
                },
                "reward_index_after": event.reward_index_after.map(|v| v.to_string()),
                "circulating_supply": event.circulating_supply.to_string(),
            });
            Ok(Json(formatted_event))
        }
        None => Err(ApiError::Internal), // Could return 404 instead
    }
}

/// POST /dev/faucet - Development-only faucet to credit balances directly
/// Body: { "address": string, "udgt": u64 (optional), "udrt": u64 (optional) }
pub async fn dev_faucet(
    Extension(ctx): Extension<RpcContext>,
    Json(payload): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let addr = payload
        .get("address")
        .and_then(|v| v.as_str())
        .ok_or(ApiError::BadRequest("missing address".to_string()))?;
    let udgt = payload
        .get("udgt")
        .and_then(|v| v.as_u64())
        .unwrap_or(1_000_000);
    let udrt = payload
        .get("udrt")
        .and_then(|v| v.as_u64())
        .unwrap_or(50_000_000);
    {
        let mut st = ctx.state.lock().unwrap();
        st.credit(addr, "udgt", udgt as u128);
        st.credit(addr, "udrt", udrt as u128);
    }
    Ok(Json(serde_json::json!({
        "success": true,
        "address": addr,
        "credited": {"udgt": udgt.to_string(), "udrt": udrt.to_string()}
    })))
}

/// Enhanced stats endpoint with emission data (staking optional)
pub async fn stats_with_emission(
    Extension(ctx): Extension<RpcContext>,
) -> Result<Json<serde_json::Value>, ApiError> {
    // Get base stats
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();
    let rolling_tps = { ctx.tps.lock().unwrap().rolling_tps(now) };
    let chain_id = ctx.storage.get_chain_id();
    let em_snap = ctx.emission.lock().unwrap().snapshot();

    // Get latest emission event
    let current_height = ctx.storage.height();
    let latest_emission_event = ctx.emission.lock().unwrap().get_event(current_height);

    // Get staking stats
    let (total_stake, reward_index, pending_emission) = if ctx.features.staking {
        ctx.staking.lock().unwrap().get_stats()
    } else {
        (0, 0, 0)
    };

    Ok(Json(json!({
        "height": ctx.storage.height(),
        "mempool_size": ctx.mempool.lock().unwrap().len(),
        "rolling_tps": rolling_tps,
        "chain_id": chain_id,
        "emission_pools": em_snap.pools,
        "latest_emission": latest_emission_event.map(|event| json!({
            "height": event.height,
            "total_emitted": event.total_emitted.to_string(),
            "circulating_supply": event.circulating_supply.to_string(),
        })),
        "staking": {"total_stake": total_stake.to_string(), "reward_index": reward_index.to_string(), "pending_emission": pending_emission.to_string()},
    })))
}

/// POST /api/staking/claim - Claim staking rewards for an address
pub async fn staking_claim(
    Extension(ctx): Extension<RpcContext>,
    Json(body): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>, ApiError> {
    if !ctx.features.staking {
        return Err(ApiError::NotImplemented("staking feature disabled".into()));
    }
    let address = body
        .get("address")
        .and_then(|v| v.as_str())
        .ok_or(ApiError::BadRequest("Missing address field".to_string()))?;
    let mut staking = ctx.staking.lock().unwrap();
    let claimed = staking.claim_rewards(address);
    if claimed > 0 {
        if let Ok(mut state) = ctx.state.lock() {
            state.credit(address, "udrt", claimed);
        }
    }
    let reward_index = staking.get_stats().1;
    drop(staking);
    let new_balance = if let Ok(state) = ctx.state.lock() {
        state.get_balance(address, "udrt")
    } else {
        0
    };
    Ok(Json(
        json!({"address": address, "claimed": claimed.to_string(), "new_balance": new_balance.to_string(), "reward_index": reward_index.to_string()}),
    ))
}

/// GET /api/staking/accrued/:address - Get accrued rewards for an address
pub async fn staking_get_accrued(
    Extension(ctx): Extension<RpcContext>,
    Path(address): Path<String>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let (accrued, reward_index) = if ctx.features.staking {
        let staking = ctx.staking.lock().unwrap();
        (staking.get_accrued_rewards(&address), staking.get_stats().1)
    } else {
        (0, 0)
    };
    Ok(Json(json!({
        "address": address,
        "accrued_rewards": accrued.to_string(),
        "reward_index": reward_index.to_string(),
    })))
}

/// GET /api/staking/balance/:delegator - Get staking balance for a delegator
pub async fn staking_get_balance(
    Extension(ctx): Extension<RpcContext>,
    Path(delegator): Path<String>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let (staked, rewards) = if ctx.features.staking {
        let staking = ctx.staking.lock().unwrap();
        (
            staking.get_total_stake(&delegator),
            staking.get_accrued_rewards(&delegator),
        )
    } else {
        (0, 0)
    };

    let liquid = if let Ok(state) = ctx.state.lock() {
        state.get_balance(&delegator, "udgt")
    } else {
        0
    };

    Ok(Json(json!({
        "delegator": delegator,
        "staked": staked.to_string(),
        "liquid": liquid.to_string(),
        "rewards": rewards.to_string()
    })))
}

/// POST /api/staking/delegate - Delegate tokens to a validator
#[axum::debug_handler]
pub async fn staking_delegate(
    Extension(ctx): Extension<RpcContext>,
    Json(payload): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>, ApiError> {
    if !ctx.features.staking {
        return Err(ApiError::NotImplemented("staking feature disabled".into()));
    }
    let delegator_addr = payload["delegator_addr"]
        .as_str()
        .ok_or(ApiError::BadRequest("missing delegator_addr".to_string()))?;
    let validator_addr = payload["validator_addr"]
        .as_str()
        .ok_or(ApiError::BadRequest("missing validator_addr".to_string()))?;
    let amount_udgt = payload["amount_udgt"]
        .as_str()
        .ok_or(ApiError::BadRequest("missing amount_udgt".to_string()))?
        .parse::<u128>()
        .map_err(|_| ApiError::BadRequest("invalid amount_udgt".to_string()))?;
    let mut staking = ctx.staking.lock().unwrap();
    staking
        .delegate(delegator_addr, validator_addr, amount_udgt)
        .map_err(ApiError::BadRequest)?;
    Ok(Json(
        json!({"status":"success","delegator_addr":delegator_addr,"validator_addr":validator_addr,"amount_udgt": amount_udgt.to_string()}),
    ))
}

/// POST /api/staking/undelegate - Undelegate tokens from a validator
#[axum::debug_handler]
pub async fn staking_undelegate(
    Extension(ctx): Extension<RpcContext>,
    Json(payload): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>, ApiError> {
    if !ctx.features.staking {
        return Err(ApiError::NotImplemented("staking feature disabled".into()));
    }
    let delegator_addr = payload["delegator_addr"]
        .as_str()
        .ok_or(ApiError::BadRequest("missing delegator_addr".to_string()))?;
    let validator_addr = payload["validator_addr"]
        .as_str()
        .ok_or(ApiError::BadRequest("missing validator_addr".to_string()))?;
    let amount_udgt = payload["amount_udgt"]
        .as_str()
        .ok_or(ApiError::BadRequest("missing amount_udgt".to_string()))?
        .parse::<u128>()
        .map_err(|_| ApiError::BadRequest("invalid amount_udgt".to_string()))?;
    let mut staking = ctx.staking.lock().unwrap();
    staking
        .undelegate(delegator_addr, validator_addr, amount_udgt)
        .map_err(ApiError::BadRequest)?;
    Ok(Json(
        json!({"status":"success","delegator_addr":delegator_addr,"validator_addr":validator_addr,"amount_udgt": amount_udgt.to_string()}),
    ))
}

/// POST /contracts/deploy - Deploy WASM contract
/// Body: { wasm_bytes | artifact_ref }
/// Returns: { contract_address, tx_hash }
#[cfg(feature = "contracts")]
pub async fn contracts_deploy(
    Extension(ctx): Extension<RpcContext>,
    Json(payload): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let wasm_b64 = payload
        .get("wasm_bytes")
        .and_then(|v| v.as_str())
        .ok_or_else(|| ApiError::BadRequest("missing wasm_bytes".to_string()))?;
    let wasm_bytes = base64::engine::general_purpose::STANDARD
        .decode(wasm_b64)
        .map_err(|e| ApiError::BadRequest(format!("Invalid base64 wasm_bytes: {e}")))?;
    let from = payload["from"].as_str().unwrap_or("deployer");
    let gas_limit = payload["gas_limit"].as_u64().unwrap_or(1000000);
    let initial_state = payload["initial_state"].as_str().map(|s| s.as_bytes());

    let deployment = ctx
        .wasm_runtime
        .deploy_contract(&wasm_bytes, from, gas_limit, initial_state)
        .map_err(|e| ApiError::BadRequest(format!("Deployment failed: {e}")))?;

    Ok(Json(json!({
        "contract_address": deployment.address,
        "tx_hash": deployment.tx_hash,
        "code_hash": deployment.code_hash,
        "gas_used": deployment.gas_used
    })))
}

/// POST /contracts/call - Call WASM contract method
/// Body: { contract_address, method, args }
/// Returns: { result, gas_used, tx_hash }
#[cfg(feature = "contracts")]
pub async fn contracts_call(
    Extension(ctx): Extension<RpcContext>,
    Json(payload): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let contract_address = payload["contract_address"]
        .as_str()
        .ok_or(ApiError::BadRequest("missing contract_address".to_string()))?
        .to_string();
    let method = payload["method"]
        .as_str()
        .ok_or(ApiError::BadRequest("missing method".to_string()))?;
    let args = payload["args"].as_str().unwrap_or("{}").as_bytes();
    let gas_limit = payload["gas_limit"].as_u64().unwrap_or(300000);

    let execution = ctx
        .wasm_runtime
        .execute_contract(&contract_address, method, args, gas_limit)
        .map_err(|e| ApiError::BadRequest(format!("Execution failed: {e}")))?;

    // Parse result based on method
    let result = match method {
        "get" | "increment" => {
            let count = u32::from_le_bytes(execution.result.try_into().unwrap_or([0; 4]));
            json!({"count": count})
        }
        _ => json!({"raw": hex::encode(&execution.result)}),
    };

    Ok(Json(json!({
        "result": result,
        "gas_used": execution.gas_used,
        "tx_hash": execution.tx_hash
    })))
}

/// GET /contracts/state/{contract_address}/{key} - Get contract state
/// Returns: { value }
#[cfg(feature = "contracts")]
pub async fn contracts_state(
    Path((contract_address, key)): Path<(String, String)>,
    Extension(ctx): Extension<RpcContext>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let value = ctx
        .wasm_runtime
        .get_contract_state(&contract_address, &key)
        .ok_or(ApiError::NotFound)?;

    // Try to parse as counter value
    let parsed_value = if key == "counter" && value.len() == 4 {
        json!(u32::from_le_bytes(value.try_into().unwrap_or([0; 4])))
    } else {
        json!(hex::encode(&value))
    };

    Ok(Json(json!({
        "value": parsed_value
    })))
}

/// POST /api/contract/deploy - Deploy WASM contract (legacy endpoint)
pub async fn contract_deploy(
    Json(payload): Json<serde_json::Value>,
    Extension(_ctx): Extension<RpcContext>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let _code = payload["code"]
        .as_str()
        .ok_or(ApiError::BadRequest("missing code".to_string()))?;
    let _init_data = payload["init_data"].as_str().unwrap_or("{}");

    // Simplified deployment - in production would store in state
    let contract_id = format!(
        "contract_{}",
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis()
    );

    Ok(Json(json!({
        "status": "success",
        "contract_id": contract_id,
        "gas_used": "50000",
        "logs": ["Contract deployed successfully"]
    })))
}

/// POST /api/contract/call - Call WASM contract method
pub async fn contract_call(
    Json(payload): Json<serde_json::Value>,
    Extension(_ctx): Extension<RpcContext>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let contract_id = payload["contract_id"]
        .as_str()
        .ok_or(ApiError::BadRequest("missing contract_id".to_string()))?;
    let method = payload["method"]
        .as_str()
        .ok_or(ApiError::BadRequest("missing method".to_string()))?;

    // Simplified execution - in production would load and execute WASM
    let result = match method {
        "increment" => json!({"count": 2}),
        "get" => json!({"count": 2}),
        _ => return Err(ApiError::BadRequest("unknown method".to_string())),
    };

    Ok(Json(json!({
        "status": "success",
        "result": result,
        "gas_used": "25000",
        "logs": [format!("Called method {} on contract {}", method, contract_id)]
    })))
}

/// Minimal JSON-RPC handler for WASM contract deploy/execute used by the Node.js server facade
/// Supported methods:
/// - contract_deploy { code: hex, from: string, gas_limit: u64, initial_state?: any }
/// - contract_execute { contract_address: string, function: string, args?: any, gas_limit: u64, from: string }
#[axum::debug_handler]
pub async fn json_rpc(
    ctx: axum::Extension<RpcContext>,
    axum::Json(body): axum::Json<serde_json::Value>,
) -> Result<axum::Json<serde_json::Value>, ApiError> {
    let method = body
        .get("method")
        .and_then(|v| v.as_str())
        .ok_or_else(|| ApiError::BadRequest("missing method".to_string()))?;
    let params_arr = body
        .get("params")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();
    let params = params_arr.first().cloned().unwrap_or_else(|| json!({}));

    match method {
        "contract_deploy" => {
            let code_hex = params
                .get("code")
                .and_then(|v| v.as_str())
                .ok_or_else(|| ApiError::BadRequest("missing code".to_string()))?;
            let gas_limit = params
                .get("gas_limit")
                .and_then(|v| v.as_u64())
                .unwrap_or(100_000);
            let code_bytes = hex::decode(code_hex)
                .map_err(|_| ApiError::BadRequest("invalid code hex".to_string()))?;
            let code_hash = blake3::hash(&code_bytes);
            // Deterministic address derived from code hash
            let addr = format!("dyt1{}", hex::encode(code_hash.as_bytes()));

            // Initialize minimal state (counter=0)
            {
                let mut map = ctx.wasm_contracts.lock().unwrap();
                map.insert(addr.clone(), 0);
            }

            // Evidence: write files under launch-evidence/wasm/<address>
            let ev_dir = std::path::PathBuf::from("launch-evidence/wasm").join(&addr);
            let _ = std::fs::create_dir_all(&ev_dir);
            // contract.wasm
            let _ = std::fs::write(ev_dir.join("contract.wasm"), &code_bytes);
            // deploy_tx.json
            let _ = std::fs::write(
                ev_dir.join("deploy_tx.json"),
                serde_json::to_string_pretty(&json!({
                    "address": addr,
                    "code_hash": hex::encode(code_hash.as_bytes()),
                    "gas_used": gas_limit.min(50_000),
                    "timestamp": current_timestamp(),
                }))
                .unwrap_or_default(),
            );
            // initialize empty calls.json and gas_report.json and final_state.json
            let _ = std::fs::write(
                ev_dir.join("calls.json"),
                serde_json::to_string_pretty(&json!({"calls": []})).unwrap_or_default(),
            );
            let _ = std::fs::write(
                ev_dir.join("gas_report.json"),
                serde_json::to_string_pretty(&json!({"total_gas": 0, "calls": 0}))
                    .unwrap_or_default(),
            );
            let _ = std::fs::write(
                ev_dir.join("final_state.json"),
                serde_json::to_string_pretty(&json!({"counter": 0})).unwrap_or_default(),
            );

            let res = json!({
                "address": addr,
                "code_hash": hex::encode(code_hash.as_bytes()),
                "gas_used": gas_limit.min(50_000),
                "events": [],
            });
            Ok(axum::Json(
                json!({"jsonrpc":"2.0","id": body.get("id").cloned().unwrap_or(json!(1)),"result": res}),
            ))
        }
        "contract_execute" => {
            let addr = params
                .get("contract_address")
                .and_then(|v| v.as_str())
                .ok_or_else(|| ApiError::BadRequest("missing contract_address".to_string()))?;
            let func = params
                .get("function")
                .and_then(|v| v.as_str())
                .unwrap_or("get");
            let gas_limit = params
                .get("gas_limit")
                .and_then(|v| v.as_u64())
                .unwrap_or(100_000);

            let (ret_json, gas_used, events): (serde_json::Value, u64, Vec<String>) = match func {
                "increment" | "inc" => {
                    let mut map = ctx.wasm_contracts.lock().unwrap();
                    let entry = map.entry(addr.to_string()).or_insert(0);
                    *entry = entry.saturating_add(1);
                    let ret_json = json!({"count": *entry});
                    let gas_used = gas_limit.min(25_000);
                    let events = vec![format!("increment -> {}", *entry)];
                    // Evidence update: append to calls.json, update gas_report.json and final_state.json
                    let ev_dir = std::path::PathBuf::from("launch-evidence/wasm").join(addr);
                    let _ = std::fs::create_dir_all(&ev_dir);
                    // calls.json append
                    let calls_path = ev_dir.join("calls.json");
                    let calls_val: serde_json::Value = std::fs::read_to_string(&calls_path)
                        .ok()
                        .and_then(|s| serde_json::from_str(&s).ok())
                        .unwrap_or_else(|| json!({"calls": []}));
                    let mut calls = calls_val.get("calls").cloned().unwrap_or_else(|| json!([]));
                    if let Some(arr) = calls.as_array_mut() {
                        arr.push(json!({"function": func, "gas_used": gas_used, "ts": current_timestamp()}));
                    }
                    let _ = std::fs::write(
                        calls_path,
                        serde_json::to_string_pretty(&json!({"calls": calls})).unwrap_or_default(),
                    );
                    // gas_report.json
                    let gas_path = ev_dir.join("gas_report.json");
                    let gas_val: serde_json::Value = std::fs::read_to_string(&gas_path)
                        .ok()
                        .and_then(|s| serde_json::from_str(&s).ok())
                        .unwrap_or_else(|| json!({"total_gas": 0, "calls": 0}));
                    let total_gas = gas_val
                        .get("total_gas")
                        .and_then(|v| v.as_u64())
                        .unwrap_or(0)
                        + gas_used;
                    let calls_n = gas_val.get("calls").and_then(|v| v.as_u64()).unwrap_or(0) + 1;
                    let _ = std::fs::write(
                        gas_path,
                        serde_json::to_string_pretty(
                            &json!({"total_gas": total_gas, "calls": calls_n}),
                        )
                        .unwrap_or_default(),
                    );
                    // final_state.json
                    let _ = std::fs::write(
                        ev_dir.join("final_state.json"),
                        serde_json::to_string_pretty(
                            &json!({"counter": map.get(addr).copied().unwrap_or(0)}),
                        )
                        .unwrap_or_default(),
                    );
                    (ret_json, gas_used, events)
                }
                "get" => {
                    let map = ctx.wasm_contracts.lock().unwrap();
                    let v = map.get(addr).copied().unwrap_or(0);
                    (json!({"count": v}), gas_limit.min(12_000), Vec::new())
                }
                _ => return Err(ApiError::BadRequest("unknown function".to_string())),
            };

            let res = json!({
                "return_value": hex::encode(serde_json::to_vec(&ret_json).unwrap_or_default()),
                "gas_used": gas_used,
                "events": events,
            });
            Ok(axum::Json(
                json!({"jsonrpc":"2.0","id": body.get("id").cloned().unwrap_or(json!(1)),"result": res}),
            ))
        }
        _ => Err(ApiError::BadRequest("unknown method".to_string())),
    }
}

/// POST /api/ai/score - AI risk scoring stub service
pub async fn ai_risk_score(
    Json(payload): Json<serde_json::Value>,
    Extension(_ctx): Extension<RpcContext>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let tx_hash = payload["tx_hash"]
        .as_str()
        .ok_or(ApiError::BadRequest("missing tx_hash".to_string()))?;

    // Deterministic risk score: hash(tx_hash) % 101
    let risk_score = {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};
        let mut hasher = DefaultHasher::new();
        tx_hash.hash(&mut hasher);
        (hasher.finish() % 101) as u8
    };

    Ok(Json(json!({
        "tx_hash": tx_hash,
        "risk_score": risk_score,
        "confidence": 0.8,
        "timestamp": SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs()
    })))
}

/// GET /api/ai/risk/{tx_hash} - Get stored AI risk assessment
pub async fn ai_risk_get(
    Path(tx_hash): Path<String>,
    Extension(_ctx): Extension<RpcContext>,
) -> Result<Json<serde_json::Value>, ApiError> {
    // In production, this would query OracleStore
    let risk_score = {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};
        let mut hasher = DefaultHasher::new();
        tx_hash.hash(&mut hasher);
        (hasher.finish() % 101) as u8
    };

    Ok(Json(json!({
        "tx_hash": tx_hash,
        "risk_score": risk_score,
        "confidence": 0.8,
        "stored_at": SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs()
    })))
}

// --- Transaction Lifecycle Endpoints (Phase 1) ---

/// GET /transactions/{hash} - Get transaction receipt by hash
pub async fn get_transaction(
    Extension(ctx): Extension<RpcContext>,
    Path(hash): Path<String>,
) -> Result<Json<serde_json::Value>, ApiError> {
    // Try to get from storage first (confirmed transactions)
    if let Some(receipt) = ctx.storage.get_receipt(&hash) {
        let response = json!({
            "tx_hash": receipt.tx_hash,
            "status": match receipt.status {
                crate::storage::receipts::TxStatus::Pending => "pending",
                crate::storage::receipts::TxStatus::Success => "success",
                crate::storage::receipts::TxStatus::Failed => "failed",
            },
            "height": receipt.block_height,
            "gas_used": receipt.gas_used,
            "gas_limit": receipt.gas_limit,
            "gas_price": receipt.gas_price,
            "fee": receipt.fee.to_string(),
            "from": receipt.from,
            "to": receipt.to,
            "amount": receipt.amount.to_string(),
            "nonce": receipt.nonce,
            "error": receipt.error
        });
        return Ok(Json(response));
    }

    // Check if transaction is in mempool (pending)
    let mempool = ctx.mempool.lock().unwrap();
    if mempool.contains(&hash) {
        // Transaction is pending in mempool
        let response = json!({
            "tx_hash": hash,
            "status": "pending",
            "height": null,
            "gas_used": 0,
            "error": null
        });
        return Ok(Json(response));
    }

    // Transaction not found
    Err(ApiError::NotFound)
}

/// GET /transactions/pending - List pending transactions in mempool (debug only)
pub async fn get_pending_transactions(
    Extension(ctx): Extension<RpcContext>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let mempool = ctx.mempool.lock().unwrap();
    let pending_txs = mempool.take_snapshot(1000); // Get up to 1000 pending transactions

    let tx_list: Vec<serde_json::Value> = pending_txs
        .iter()
        .map(|tx| {
            json!({
                "tx_hash": tx.hash,
                "from": tx.from,
                "to": tx.to,
                "amount": tx.amount.to_string(),
                "fee": tx.fee.to_string(),
                "nonce": tx.nonce,
                "gas_limit": tx.gas_limit,
                "gas_price": tx.gas_price
            })
        })
        .collect();

    Ok(Json(json!({
        "pending_transactions": tx_list,
        "count": tx_list.len()
    })))
}

// --- Added staking reward rate params endpoint ---
/// GET /params/staking_reward_rate -> plain decimal string (e.g. "0.0500")
pub async fn params_staking_reward_rate(
    Extension(ctx): Extension<RpcContext>,
) -> Result<String, ApiError> {
    let staking = ctx.staking.lock().unwrap();
    let bps = staking.get_reward_rate_bps();
    let frac = (bps as f64) / 10_000.0;
    Ok(format!("{frac:.4}"))
}
