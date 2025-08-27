use crate::rpc::errors::ApiError;
use crate::runtime::bridge;
use crate::runtime::emission::EmissionEngine;
use crate::runtime::governance::{GovernanceModule, ProposalType};
use crate::runtime::staking::StakingModule;
use crate::storage::oracle::OracleStore;
use crate::{
    addr,
    crypto::{canonical_json, sha3_256, ActivePQC},
    mempool::{basic_validate, Mempool, MempoolError},
    state::State,
    storage::blocks::TpsWindow,
    storage::{receipts::TxReceipt, state::Storage, tx::Transaction},
    types::{SignedTx, ValidationError},
    ws::server::WsHub,
};
use axum::{
    extract::{Path, Query},
    Extension, Json,
};
use base64::{engine::general_purpose::STANDARD as B64, Engine};
use colored::Colorize; // needed for algorithm.cyan()
use serde::Deserialize;
use serde_json::json;
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};

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
    pub metrics: Arc<crate::metrics::Metrics>,
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
    if let Err(_) = signed_tx.verify() {
        return Err(ValidationError::InvalidSignature);
    }

    // Validate transaction
    if let Err(_) = signed_tx.tx.validate(expected_chain_id) {
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

    // Add amounts from messages
    for msg in &signed_tx.tx.msgs {
        match msg {
            crate::types::Msg::Send { denom, amount, .. } => {
                // Convert DGT/DRT to micro denominations
                let micro_denom = match denom.to_ascii_uppercase().as_str() {
                    "DGT" => "udgt",
                    "DRT" => "udrt",
                    _ => denom.as_str(), // Pass through other denoms
                };

                let current = required_per_denom.get(micro_denom).copied().unwrap_or(0);
                required_per_denom.insert(micro_denom.to_string(), current.saturating_add(*amount));
            }
        }
    }

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

#[axum::debug_handler]
pub async fn submit(
    ctx: Extension<RpcContext>,
    Json(body): Json<SubmitTx>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let signed_tx = body.signed_tx;

    // Get chain ID and first sender address
    let chain_id = ctx.storage.get_chain_id().unwrap_or_default();
    let from = signed_tx.first_from_address().ok_or_else(|| {
        ApiError::Validation(ValidationError::Internal(
            "no sender address found".to_string(),
        ))
    })?;

    // Get current nonce and account state
    let mut state = ctx.state.lock().unwrap();
    let current_nonce = state.nonce_of(from);
    let account_state = state.get_account(from);
    drop(state);

    // Validate the signed transaction
    validate_signed_tx(&signed_tx, &chain_id, current_nonce, &account_state)?;

    // Generate transaction hash
    let tx_hash = signed_tx.tx_hash().map_err(|_| {
        ApiError::Validation(ValidationError::Internal(
            "failed to generate tx hash".to_string(),
        ))
    })?;

    // Check for duplicate transaction
    {
        let mempool = ctx.mempool.lock().unwrap();
        if mempool.contains(&tx_hash) {
            return Err(ApiError::Validation(ValidationError::DuplicateTransaction));
        }
        if mempool.is_full() {
            return Err(ApiError::Validation(ValidationError::MempoolFull));
        }
    }

    // Build legacy Transaction wrapper for storage compatibility
    // TODO: Remove this legacy conversion once storage is updated
    let legacy_tx = Transaction::new(
        tx_hash.clone(),
        from.to_string(),
        from.to_string(),
        0, // value - calculated from msgs
        signed_tx.tx.fee,
        signed_tx.tx.nonce,
        Some(signed_tx.signature.clone()),
    );

    // Additional validation using legacy system
    {
        let state = ctx.state.lock().unwrap();
        if let Err(e) = basic_validate(&state, &legacy_tx) {
            if e.starts_with("InvalidNonce") {
                return Err(ApiError::InvalidNonce {
                    expected: current_nonce,
                    got: signed_tx.tx.nonce,
                });
            }
            if e.contains("InsufficientBalance") {
                return Err(ApiError::InsufficientFunds);
            }
            return Err(ApiError::Internal);
        }
    }

    // Add to mempool
    {
        let mut mempool = ctx.mempool.lock().unwrap();
        // Use add_transaction directly to capture detailed rejection reasons
        if let Err(reason) = mempool.add_transaction(&State::default(), legacy_tx.clone()) {
            return Err(match reason {
                crate::mempool::RejectionReason::InvalidSignature => ApiError::InvalidSignature,
                crate::mempool::RejectionReason::NonceGap { expected, got } => {
                    ApiError::InvalidNonce { expected, got }
                }
                crate::mempool::RejectionReason::InsufficientFunds => ApiError::InsufficientFunds,
                crate::mempool::RejectionReason::UnderpricedGas { .. } => {
                    ApiError::BadRequest("underpriced gas".to_string())
                }
                crate::mempool::RejectionReason::OversizedTx { .. } => {
                    ApiError::BadRequest("oversized transaction".to_string())
                }
                crate::mempool::RejectionReason::Duplicate(_) => ApiError::DuplicateTx,
                crate::mempool::RejectionReason::PolicyViolation(msg) => {
                    ApiError::BadRequest(format!("policy violation: {}", msg))
                }
                crate::mempool::RejectionReason::InternalError(_) => ApiError::Internal,
            });
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

    Ok(Json(json!({
        "hash": tx_hash,
        "status": "pending"
    })))
}

// Remove legacy helper function
// impl SignedTx { fn msgs_first_from(&self) -> Option<String> { self.tx.msgs.get(0).and_then(|v| v.get("from")).and_then(|f| f.as_str()).map(|s| s.to_string()) } }

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
        // Enrich block metadata (signature + algorithm if available)
        let mut obj = json!({
            "hash": b.hash,
            "height": b.header.height,
            "parent": b.header.parent,
            "timestamp": b.header.timestamp,
            "txs": b.txs,
        });
        if let Some(sig) = b.header.signature.as_ref() {
            // placeholder: adapt if Option later
            obj["validator"] = serde_json::json!(b.header.validator);
            obj["state_root"] = serde_json::json!(b.header.state_root);
            obj["pqc_algorithm"] = serde_json::json!(sig.algorithm);
        }
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
        let mut v = serde_json::to_value(&r).unwrap();
        // Attach PQC algorithm placeholder for future (tx signatures currently separate)
        v["pqc_algorithm"] = serde_json::json!("Dilithium5");
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
        let mut v = serde_json::to_value(r).unwrap();
        let store = OracleStore {
            db: &ctx.storage.db,
        };
        if let Some(ai) = store.get_ai_risk(&hash) {
            v["ai_risk_score"] = serde_json::json!(ai.risk_score);
            v["ai_model_id"] = serde_json::json!(ai.model_id);
            if let Some(confidence) = ai.confidence {
                v["ai_confidence"] = serde_json::json!(confidence);
            }
        }
        Ok(Json(v))
    } else if ctx.mempool.lock().unwrap().contains(&hash) {
        let store = OracleStore {
            db: &ctx.storage.db,
        };
        let mut base = serde_json::json!({"status":"pending","hash": hash });
        if let Some(ai) = store.get_ai_risk(&hash) {
            base["ai_risk_score"] = serde_json::json!(ai.risk_score);
            base["ai_model_id"] = serde_json::json!(ai.model_id);
            if let Some(confidence) = ai.confidence {
                base["ai_confidence"] = serde_json::json!(confidence);
            }
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
    let em_snap = ctx.emission.lock().unwrap().snapshot();
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
    match ctx.emission.lock().unwrap().claim(pool, amount, to) {
        Ok(remaining) => Ok(Json(
            json!({"pool": pool, "remaining": remaining.to_string()}),
        )),
        Err(_) => Err(ApiError::Internal),
    }
}

// Governance RPC endpoints
pub async fn gov_submit_proposal(
    Extension(ctx): Extension<RpcContext>,
    Json(body): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>, ApiError> {
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
        Err(e) => {
            eprintln!("Governance submit error: {}", e);
            Err(ApiError::Internal)
        }
    }
}

pub async fn gov_deposit(
    Extension(ctx): Extension<RpcContext>,
    Json(body): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>, ApiError> {
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
            eprintln!("Governance deposit error: {}", e);
            Err(ApiError::Internal)
        }
    }
}

pub async fn gov_vote(
    Extension(ctx): Extension<RpcContext>,
    Json(body): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>, ApiError> {
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
            eprintln!("Governance vote error: {}", e);
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
            eprintln!("Governance get proposal error: {}", e);
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
            eprintln!("Governance tally error: {}", e);
            Err(ApiError::Internal)
        }
    }
}

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
                        ProposalType::ParameterChange { key, .. } => format!("ParameterChange({})", key)
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
            eprintln!("Failed to get proposals: {}", e);
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
            eprintln!("Failed to get proposal votes: {}", e);
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
            eprintln!("Failed to get voting power for {}: {}", address, e);
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
            eprintln!("Failed to get total voting power: {}", e);
            Err(ApiError::Internal)
        }
    }
}

// Rewards API endpoints

#[derive(Deserialize)]
pub struct RewardsQuery {
    pub limit: Option<u32>,
    pub start_height: Option<u64>,
}

/// GET /api/rewards - Get recent emission events with pagination
pub async fn get_rewards(
    Extension(ctx): Extension<RpcContext>,
    Query(params): Query<RewardsQuery>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let limit = params.limit.unwrap_or(50).min(500); // Default 50, max 500
    let current_height = ctx.storage.height();
    let start_height = params.start_height.unwrap_or(current_height);

    let mut events = Vec::new();
    let emission = ctx.emission.lock().unwrap();

    for height in (1..=start_height.min(current_height))
        .rev()
        .take(limit as usize)
    {
        if let Some(event) = emission.get_event(height) {
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
            events.push(formatted_event);
        }
    }

    // Get staking stats
    let (total_stake, reward_index, pending_emission) = ctx.staking.lock().unwrap().get_stats();

    Ok(Json(json!({
        "events": events,
        "pagination": {
            "limit": limit,
            "start_height": start_height,
            "total_available": current_height,
        },
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

/// Enhanced stats endpoint with emission data
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
    let (total_stake, reward_index, pending_emission) = ctx.staking.lock().unwrap().get_stats();

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
        "staking": {
            "total_stake": total_stake.to_string(),
            "reward_index": reward_index.to_string(),
            "pending_emission": pending_emission.to_string(),
        }
    })))
}

/// POST /api/staking/claim - Claim staking rewards for an address
pub async fn staking_claim(
    Extension(ctx): Extension<RpcContext>,
    Json(body): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let address = body
        .get("address")
        .and_then(|v| v.as_str())
        .ok_or(ApiError::BadRequest("Missing address field".to_string()))?;

    let mut staking = ctx.staking.lock().unwrap();
    let claimed = staking.claim_rewards(address);

    if claimed > 0 {
        // Credit DRT tokens to the address
        if let Ok(mut state) = ctx.state.lock() {
            state.credit(address, "udrt", claimed);
        }
    }

    // Get current reward index and new balance for response
    let reward_index = staking.get_stats().1;
    drop(staking); // Release lock before getting balance

    let new_balance = if let Ok(state) = ctx.state.lock() {
        state.get_balance(address, "udrt")
    } else {
        0
    };

    Ok(Json(json!({
        "address": address,
        "claimed": claimed.to_string(),
        "new_balance": new_balance.to_string(),
        "reward_index": reward_index.to_string(),
    })))
}

/// GET /api/staking/accrued/:address - Get accrued rewards for an address
pub async fn staking_get_accrued(
    Extension(ctx): Extension<RpcContext>,
    Path(address): Path<String>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let staking = ctx.staking.lock().unwrap();
    let accrued = staking.get_accrued_rewards(&address);

    Ok(Json(json!({
        "address": address,
        "accrued_rewards": accrued.to_string(),
        "reward_index": staking.get_stats().1.to_string(),
    })))
}

pub mod errors;
pub mod oracle;
