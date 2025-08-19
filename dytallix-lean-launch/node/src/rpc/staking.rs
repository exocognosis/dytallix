use crate::rpc::errors::ApiError;
use crate::rpc::RpcContext;
use crate::runtime::staking::{Validator, StakingStats};
use axum::{
    extract::{Path, Query},
    Extension, Json,
};
use serde::{Deserialize, Serialize};
use serde_json::json;

/// GET /staking/validators - list all validators
pub async fn get_validators(
    Extension(ctx): Extension<RpcContext>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let state = ctx.state.lock().unwrap();
    let validators: Vec<&Validator> = state.staking.validators.values().collect();
    
    let validator_list: Vec<serde_json::Value> = validators
        .iter()
        .map(|v| {
            json!({
                "address": v.address,
                "consensus_pk": hex::encode(&v.consensus_pk),
                "stake": v.stake.to_string(),
                "status": format!("{:?}", v.status)
            })
        })
        .collect();
    
    Ok(Json(json!({
        "validators": validator_list
    })))
}

/// GET /staking/validator/{address} - get single validator
pub async fn get_validator(
    Path(address): Path<String>,
    Extension(ctx): Extension<RpcContext>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let state = ctx.state.lock().unwrap();
    
    match state.staking.get_validator(&address) {
        Some(validator) => Ok(Json(json!({
            "address": validator.address,
            "consensus_pk": hex::encode(&validator.consensus_pk),
            "stake": validator.stake.to_string(),
            "status": format!("{:?}", validator.status)
        }))),
        None => Err(ApiError::NotFound("Validator not found".to_string())),
    }
}

/// GET /staking/delegations/{delegator} - get delegations for a delegator
pub async fn get_delegations(
    Path(delegator): Path<String>,
    Extension(ctx): Extension<RpcContext>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let state = ctx.state.lock().unwrap();
    let delegations = state.staking.get_delegations(&delegator);
    
    let delegation_list: Vec<serde_json::Value> = delegations
        .iter()
        .map(|d| {
            json!({
                "validator": d.validator,
                "amount": d.amount.to_string()
            })
        })
        .collect();
    
    Ok(Json(json!({
        "delegations": delegation_list
    })))
}

/// GET /staking/delegation/{delegator}/{validator} - get specific delegation
pub async fn get_delegation(
    Path((delegator, validator)): Path<(String, String)>,
    Extension(ctx): Extension<RpcContext>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let state = ctx.state.lock().unwrap();
    
    match state.staking.get_delegation(&delegator, &validator) {
        Some(amount) => Ok(Json(json!({
            "delegator": delegator,
            "validator": validator,
            "amount": amount.to_string()
        }))),
        None => Err(ApiError::NotFound("Delegation not found".to_string())),
    }
}

/// GET /staking/validator_set_hash - get current validator set hash
pub async fn get_validator_set_hash(
    Extension(ctx): Extension<RpcContext>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let state = ctx.state.lock().unwrap();
    let hash = state.staking.compute_validator_set_hash();
    
    Ok(Json(json!({
        "validator_set_hash": hex::encode(hash)
    })))
}

/// GET /staking/params - get staking parameters
pub async fn get_staking_params(
    Extension(ctx): Extension<RpcContext>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let state = ctx.state.lock().unwrap();
    let params = &state.staking.params;
    
    Ok(Json(json!({
        "max_validators": params.max_validators,
        "drt_block_reward": params.drt_block_reward.to_string()
    })))
}

/// GET /staking/stats - get staking statistics
pub async fn get_staking_stats(
    Extension(ctx): Extension<RpcContext>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let state = ctx.state.lock().unwrap();
    let stats = state.staking.get_stats();
    
    Ok(Json(json!({
        "total_stake": stats.total_stake.to_string(),
        "validator_count": stats.validator_count,
        "active_validator_count": stats.active_validator_count,
        "drt_emitted": stats.drt_emitted.to_string()
    })))
}

/// GET /staking/active_validators - get current active validator set
pub async fn get_active_validators(
    Extension(ctx): Extension<RpcContext>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let state = ctx.state.lock().unwrap();
    let active_validators = state.staking.get_active_validator_set();
    
    let validator_list: Vec<serde_json::Value> = active_validators
        .iter()
        .map(|v| {
            json!({
                "address": v.address,
                "consensus_pk": hex::encode(&v.consensus_pk),
                "stake": v.stake.to_string(),
                "status": format!("{:?}", v.status)
            })
        })
        .collect();
    
    Ok(Json(json!({
        "validators": validator_list,
        "count": validator_list.len()
    })))
}