use cosmwasm_std::{Deps, StdResult};
use crate::state::{VALIDATORS, CONFIG};

pub fn is_validator(deps: Deps, validator: &str) -> StdResult<bool> {
    let validator_addr = deps.api.addr_validate(validator)?;
    Ok(VALIDATORS.may_load(deps.storage, &validator_addr)?.unwrap_or(false))
}

pub fn is_admin(deps: Deps, address: &str) -> StdResult<bool> {
    let config = CONFIG.load(deps.storage)?;
    let addr = deps.api.addr_validate(address)?;
    Ok(config.admin == addr)
}

pub fn verify_signatures(signatures: &[String], threshold: u64) -> bool {
    // Simplified signature verification
    // In production, this would verify actual cryptographic signatures
    signatures.len() as u64 >= threshold
}
