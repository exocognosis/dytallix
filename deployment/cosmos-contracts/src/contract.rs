use cosmwasm_std::{
    entry_point, to_json_binary, Binary, Deps, DepsMut, Env, MessageInfo, Response, StdResult, Uint128,
    Addr,
};
use cw2::set_contract_version;

use crate::error::ContractError;
use crate::helpers::{is_admin, is_validator, verify_signatures};
use crate::msg::{ExecuteMsg, InstantiateMsg, QueryMsg, ConfigResponse, SupportedAssetsResponse, LockedBalanceResponse, ValidatorsResponse};
use crate::state::{Config, CONFIG, SUPPORTED_ASSETS, LOCKED_BALANCES, PROCESSED_TRANSACTIONS, VALIDATORS};

const CONTRACT_NAME: &str = "dytallix-cosmos-bridge";
const CONTRACT_VERSION: &str = env!("CARGO_PKG_VERSION");

#[entry_point]
pub fn instantiate(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    msg: InstantiateMsg,
) -> Result<Response, ContractError> {
    set_contract_version(deps.storage, CONTRACT_NAME, CONTRACT_VERSION)?;

    let admin = msg.admin
        .map(|addr| deps.api.addr_validate(&addr))
        .transpose()?
        .unwrap_or_else(|| info.sender.clone());

    if msg.bridge_fee_bps > 1000 {
        return Err(ContractError::FeeTooHigh {});
    }

    let config = Config {
        admin: admin.clone(),
        validator_threshold: msg.validator_threshold,
        bridge_fee_bps: msg.bridge_fee_bps,
        paused: false,
        nonce: 1,
    };

    CONFIG.save(deps.storage, &config)?;

    Ok(Response::new()
        .add_attribute("method", "instantiate")
        .add_attribute("admin", admin)
        .add_attribute("validator_threshold", msg.validator_threshold.to_string())
        .add_attribute("bridge_fee_bps", msg.bridge_fee_bps.to_string()))
}

#[entry_point]
pub fn execute(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    msg: ExecuteMsg,
) -> Result<Response, ContractError> {
    match msg {
        ExecuteMsg::LockAsset { asset, amount, destination_chain, recipient } => {
            execute_lock_asset(deps, env, info, asset, amount, destination_chain, recipient)
        }
        ExecuteMsg::UnlockAsset { transaction_id, asset, recipient, amount, signatures } => {
            execute_unlock_asset(deps, env, info, transaction_id, asset, recipient, amount, signatures)
        }
        ExecuteMsg::AddSupportedAsset { asset } => {
            execute_add_supported_asset(deps, env, info, asset)
        }
        ExecuteMsg::RemoveSupportedAsset { asset } => {
            execute_remove_supported_asset(deps, env, info, asset)
        }
        ExecuteMsg::AddValidator { validator } => {
            execute_add_validator(deps, env, info, validator)
        }
        ExecuteMsg::RemoveValidator { validator } => {
            execute_remove_validator(deps, env, info, validator)
        }
        ExecuteMsg::UpdateConfig { validator_threshold, bridge_fee_bps } => {
            execute_update_config(deps, env, info, validator_threshold, bridge_fee_bps)
        }
        ExecuteMsg::Pause {} => execute_pause(deps, env, info),
        ExecuteMsg::Unpause {} => execute_unpause(deps, env, info),
    }
}

fn execute_lock_asset(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    asset: String,
    amount: Uint128,
    destination_chain: String,
    recipient: String,
) -> Result<Response, ContractError> {
    let config = CONFIG.load(deps.storage)?;
    if config.paused {
        return Err(ContractError::ContractPaused {});
    }

    let is_supported = SUPPORTED_ASSETS.load(deps.storage, &asset).unwrap_or(false);
    if !is_supported {
        return Err(ContractError::AssetNotSupported {});
    }

    // Calculate fee
    let fee = amount * Uint128::from(config.bridge_fee_bps) / Uint128::from(10000u128);
    let net_amount = amount.checked_sub(fee)?;

    // Update locked balance
    let current_balance = LOCKED_BALANCES.load(deps.storage, &asset).unwrap_or_default();
    LOCKED_BALANCES.save(deps.storage, &asset, &(current_balance + net_amount))?;

    // Update nonce
    let mut new_config = config;
    new_config.nonce += 1;
    CONFIG.save(deps.storage, &new_config)?;

    Ok(Response::new()
        .add_attribute("method", "lock_asset")
        .add_attribute("asset", asset)
        .add_attribute("amount", net_amount)
        .add_attribute("destination_chain", destination_chain)
        .add_attribute("recipient", recipient)
        .add_attribute("nonce", new_config.nonce.to_string())
        .add_attribute("sender", info.sender))
}

fn execute_unlock_asset(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    transaction_id: String,
    asset: String,
    recipient: String,
    amount: Uint128,
    signatures: Vec<String>,
) -> Result<Response, ContractError> {
    let config = CONFIG.load(deps.storage)?;
    if config.paused {
        return Err(ContractError::ContractPaused {});
    }

    if !is_validator(deps.as_ref(), &info.sender.to_string())? {
        return Err(ContractError::Unauthorized {});
    }

    let is_processed = PROCESSED_TRANSACTIONS.load(deps.storage, &transaction_id).unwrap_or(false);
    if is_processed {
        return Err(ContractError::TransactionAlreadyProcessed {});
    }

    let is_supported = SUPPORTED_ASSETS.load(deps.storage, &asset).unwrap_or(false);
    if !is_supported {
        return Err(ContractError::AssetNotSupported {});
    }

    if !verify_signatures(&signatures, config.validator_threshold) {
        return Err(ContractError::InvalidSignatures {});
    }

    // Check locked balance
    let current_balance = LOCKED_BALANCES.load(deps.storage, &asset).unwrap_or_default();
    if current_balance < amount {
        return Err(ContractError::InsufficientBalance {});
    }

    // Mark as processed
    PROCESSED_TRANSACTIONS.save(deps.storage, &transaction_id, &true)?;

    // Update locked balance
    LOCKED_BALANCES.save(deps.storage, &asset, &(current_balance - amount))?;

    Ok(Response::new()
        .add_attribute("method", "unlock_asset")
        .add_attribute("transaction_id", transaction_id)
        .add_attribute("asset", asset)
        .add_attribute("recipient", recipient)
        .add_attribute("amount", amount))
}

fn execute_add_supported_asset(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    asset: String,
) -> Result<Response, ContractError> {
    if !is_admin(deps.as_ref(), &info.sender.to_string())? {
        return Err(ContractError::Unauthorized {});
    }

    SUPPORTED_ASSETS.save(deps.storage, &asset, &true)?;

    Ok(Response::new()
        .add_attribute("method", "add_supported_asset")
        .add_attribute("asset", asset))
}

fn execute_remove_supported_asset(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    asset: String,
) -> Result<Response, ContractError> {
    if !is_admin(deps.as_ref(), &info.sender.to_string())? {
        return Err(ContractError::Unauthorized {});
    }

    SUPPORTED_ASSETS.save(deps.storage, &asset, &false)?;

    Ok(Response::new()
        .add_attribute("method", "remove_supported_asset")
        .add_attribute("asset", asset))
}

fn execute_add_validator(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    validator: String,
) -> Result<Response, ContractError> {
    if !is_admin(deps.as_ref(), &info.sender.to_string())? {
        return Err(ContractError::Unauthorized {});
    }

    let validator_addr = deps.api.addr_validate(&validator)?;
    VALIDATORS.save(deps.storage, &validator_addr, &true)?;

    Ok(Response::new()
        .add_attribute("method", "add_validator")
        .add_attribute("validator", validator))
}

fn execute_remove_validator(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    validator: String,
) -> Result<Response, ContractError> {
    if !is_admin(deps.as_ref(), &info.sender.to_string())? {
        return Err(ContractError::Unauthorized {});
    }

    let validator_addr = deps.api.addr_validate(&validator)?;
    VALIDATORS.save(deps.storage, &validator_addr, &false)?;

    Ok(Response::new()
        .add_attribute("method", "remove_validator")
        .add_attribute("validator", validator))
}

fn execute_update_config(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    validator_threshold: Option<u64>,
    bridge_fee_bps: Option<u64>,
) -> Result<Response, ContractError> {
    if !is_admin(deps.as_ref(), &info.sender.to_string())? {
        return Err(ContractError::Unauthorized {});
    }

    let mut config = CONFIG.load(deps.storage)?;

    if let Some(threshold) = validator_threshold {
        if threshold == 0 {
            return Err(ContractError::InvalidThreshold {});
        }
        config.validator_threshold = threshold;
    }

    if let Some(fee_bps) = bridge_fee_bps {
        if fee_bps > 1000 {
            return Err(ContractError::FeeTooHigh {});
        }
        config.bridge_fee_bps = fee_bps;
    }

    CONFIG.save(deps.storage, &config)?;

    Ok(Response::new()
        .add_attribute("method", "update_config")
        .add_attribute("validator_threshold", config.validator_threshold.to_string())
        .add_attribute("bridge_fee_bps", config.bridge_fee_bps.to_string()))
}

fn execute_pause(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
) -> Result<Response, ContractError> {
    if !is_admin(deps.as_ref(), &info.sender.to_string())? {
        return Err(ContractError::Unauthorized {});
    }

    let mut config = CONFIG.load(deps.storage)?;
    config.paused = true;
    CONFIG.save(deps.storage, &config)?;

    Ok(Response::new().add_attribute("method", "pause"))
}

fn execute_unpause(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
) -> Result<Response, ContractError> {
    if !is_admin(deps.as_ref(), &info.sender.to_string())? {
        return Err(ContractError::Unauthorized {});
    }

    let mut config = CONFIG.load(deps.storage)?;
    config.paused = false;
    CONFIG.save(deps.storage, &config)?;

    Ok(Response::new().add_attribute("method", "unpause"))
}

#[entry_point]
pub fn query(deps: Deps, _env: Env, msg: QueryMsg) -> StdResult<Binary> {
    match msg {
        QueryMsg::Config {} => to_json_binary(&query_config(deps)?),
        QueryMsg::SupportedAssets {} => to_json_binary(&query_supported_assets(deps)?),
        QueryMsg::LockedBalance { asset } => to_json_binary(&query_locked_balance(deps, asset)?),
        QueryMsg::IsTransactionProcessed { transaction_id } => {
            to_json_binary(&query_is_transaction_processed(deps, transaction_id)?)
        }
        QueryMsg::Validators {} => to_json_binary(&query_validators(deps)?),
    }
}

fn query_config(deps: Deps) -> StdResult<ConfigResponse> {
    let config = CONFIG.load(deps.storage)?;
    Ok(ConfigResponse {
        admin: config.admin,
        validator_threshold: config.validator_threshold,
        bridge_fee_bps: config.bridge_fee_bps,
        paused: config.paused,
        nonce: config.nonce,
    })
}

fn query_supported_assets(deps: Deps) -> StdResult<SupportedAssetsResponse> {
    let assets: Vec<String> = SUPPORTED_ASSETS
        .range(deps.storage, None, None, cosmwasm_std::Order::Ascending)
        .filter_map(|item| {
            item.ok().and_then(|(key, supported)| {
                if supported {
                    Some(key)
                } else {
                    None
                }
            })
        })
        .collect();

    Ok(SupportedAssetsResponse { assets })
}

fn query_locked_balance(deps: Deps, asset: String) -> StdResult<LockedBalanceResponse> {
    let balance = LOCKED_BALANCES.load(deps.storage, &asset).unwrap_or_default();
    Ok(LockedBalanceResponse { balance })
}

fn query_is_transaction_processed(deps: Deps, transaction_id: String) -> StdResult<bool> {
    Ok(PROCESSED_TRANSACTIONS.load(deps.storage, &transaction_id).unwrap_or(false))
}

fn query_validators(deps: Deps) -> StdResult<ValidatorsResponse> {
    let validators: Vec<Addr> = VALIDATORS
        .range(deps.storage, None, None, cosmwasm_std::Order::Ascending)
        .filter_map(|item| {
            item.ok().and_then(|(addr, is_validator)| {
                if is_validator {
                    Some(addr)
                } else {
                    None
                }
            })
        })
        .collect();

    Ok(ValidatorsResponse { validators })
}
