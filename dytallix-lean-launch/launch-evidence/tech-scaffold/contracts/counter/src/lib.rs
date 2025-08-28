use cosmwasm_schema::{cw_serde, QueryResponses};
use cosmwasm_std::{
    entry_point, to_binary, Binary, Deps, DepsMut, Env, MessageInfo, Response, StdResult,
    StdError,
};
use cw2::set_contract_version;
use cw_storage_plus::Item;

// Contract metadata
const CONTRACT_NAME: &str = "counter";
const CONTRACT_VERSION: &str = env!("CARGO_PKG_VERSION");

// Storage
const COUNT: Item<i32> = Item::new("count");

// Error types
#[derive(thiserror::Error, Debug)]
pub enum ContractError {
    #[error("{0}")]
    Std(#[from] StdError),

    #[error("Counter cannot be negative")]
    NegativeCount {},

    #[error("Counter overflow")]
    Overflow {},
}

// Messages
#[cw_serde]
pub struct InstantiateMsg {
    pub count: i32,
}

#[cw_serde]
pub enum ExecuteMsg {
    Increment {},
    Decrement {},
    Reset { count: i32 },
}

#[cw_serde]
#[derive(QueryResponses)]
pub enum QueryMsg {
    // GetCount returns the current count as a json-encoded number
    #[returns(GetCountResponse)]
    GetCount {},
}

// Query responses
#[cw_serde]
pub struct GetCountResponse {
    pub count: i32,
}

// Contract entry points
#[cfg_attr(not(feature = "library"), entry_point)]
pub fn instantiate(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    msg: InstantiateMsg,
) -> Result<Response, ContractError> {
    set_contract_version(deps.storage, CONTRACT_NAME, CONTRACT_VERSION)?;

    // Validate initial count
    if msg.count < 0 {
        return Err(ContractError::NegativeCount {});
    }

    // Store initial count
    COUNT.save(deps.storage, &msg.count)?;

    Ok(Response::new()
        .add_attribute("method", "instantiate")
        .add_attribute("owner", info.sender)
        .add_attribute("count", msg.count.to_string()))
}

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn execute(
    deps: DepsMut,
    _env: Env,
    _info: MessageInfo,
    msg: ExecuteMsg,
) -> Result<Response, ContractError> {
    match msg {
        ExecuteMsg::Increment {} => execute_increment(deps),
        ExecuteMsg::Decrement {} => execute_decrement(deps),
        ExecuteMsg::Reset { count } => execute_reset(deps, count),
    }
}

pub fn execute_increment(deps: DepsMut) -> Result<Response, ContractError> {
    let mut count = COUNT.load(deps.storage)?;

    // Check for overflow
    if count == i32::MAX {
        return Err(ContractError::Overflow {});
    }

    count += 1;
    COUNT.save(deps.storage, &count)?;

    Ok(Response::new()
        .add_attribute("method", "increment")
        .add_attribute("count", count.to_string()))
}

pub fn execute_decrement(deps: DepsMut) -> Result<Response, ContractError> {
    let mut count = COUNT.load(deps.storage)?;

    // Prevent negative counts
    if count <= 0 {
        return Err(ContractError::NegativeCount {});
    }

    count -= 1;
    COUNT.save(deps.storage, &count)?;

    Ok(Response::new()
        .add_attribute("method", "decrement")
        .add_attribute("count", count.to_string()))
}

pub fn execute_reset(deps: DepsMut, count: i32) -> Result<Response, ContractError> {
    // Validate new count
    if count < 0 {
        return Err(ContractError::NegativeCount {});
    }

    COUNT.save(deps.storage, &count)?;

    Ok(Response::new()
        .add_attribute("method", "reset")
        .add_attribute("count", count.to_string()))
}

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn query(deps: Deps, _env: Env, msg: QueryMsg) -> StdResult<Binary> {
    match msg {
        QueryMsg::GetCount {} => to_binary(&query_count(deps)?),
    }
}

fn query_count(deps: Deps) -> StdResult<GetCountResponse> {
    let count = COUNT.load(deps.storage)?;
    Ok(GetCountResponse { count })
}

#[cfg(test)]
mod tests {
    use super::*;
    use cosmwasm_std::testing::{mock_dependencies, mock_env, mock_info};
    use cosmwasm_std::{coins, from_binary};

    #[test]
    fn proper_initialization() {
        let mut deps = mock_dependencies();

        let msg = InstantiateMsg { count: 17 };
        let info = mock_info("creator", &coins(1000, "earth"));

        // We can just call .unwrap() to assert this was a success
        let res = instantiate(deps.as_mut(), mock_env(), info, msg).unwrap();
        assert_eq!(0, res.messages.len());

        // Query the count
        let res = query(deps.as_ref(), mock_env(), QueryMsg::GetCount {}).unwrap();
        let value: GetCountResponse = from_binary(&res).unwrap();
        assert_eq!(17, value.count);
    }

    #[test]
    fn increment() {
        let mut deps = mock_dependencies();

        let msg = InstantiateMsg { count: 17 };
        let info = mock_info("creator", &coins(2, "token"));
        let _res = instantiate(deps.as_mut(), mock_env(), info, msg).unwrap();

        // Beneficiary can increment
        let info = mock_info("anyone", &coins(2, "token"));
        let msg = ExecuteMsg::Increment {};
        let _res = execute(deps.as_mut(), mock_env(), info, msg).unwrap();

        // Should increase counter by 1
        let res = query(deps.as_ref(), mock_env(), QueryMsg::GetCount {}).unwrap();
        let value: GetCountResponse = from_binary(&res).unwrap();
        assert_eq!(18, value.count);
    }

    #[test]
    fn decrement() {
        let mut deps = mock_dependencies();

        let msg = InstantiateMsg { count: 17 };
        let info = mock_info("creator", &coins(2, "token"));
        let _res = instantiate(deps.as_mut(), mock_env(), info, msg).unwrap();

        // Decrement
        let info = mock_info("anyone", &coins(2, "token"));
        let msg = ExecuteMsg::Decrement {};
        let _res = execute(deps.as_mut(), mock_env(), info, msg).unwrap();

        // Should decrease counter by 1
        let res = query(deps.as_ref(), mock_env(), QueryMsg::GetCount {}).unwrap();
        let value: GetCountResponse = from_binary(&res).unwrap();
        assert_eq!(16, value.count);
    }

    #[test]
    fn reset() {
        let mut deps = mock_dependencies();

        let msg = InstantiateMsg { count: 17 };
        let info = mock_info("creator", &coins(2, "token"));
        let _res = instantiate(deps.as_mut(), mock_env(), info, msg).unwrap();

        // Reset to 42
        let info = mock_info("anyone", &coins(2, "token"));
        let msg = ExecuteMsg::Reset { count: 42 };
        let _res = execute(deps.as_mut(), mock_env(), info, msg).unwrap();

        // Should be 42
        let res = query(deps.as_ref(), mock_env(), QueryMsg::GetCount {}).unwrap();
        let value: GetCountResponse = from_binary(&res).unwrap();
        assert_eq!(42, value.count);
    }

    #[test]
    fn negative_count_rejected() {
        let mut deps = mock_dependencies();

        // Try to instantiate with negative count
        let msg = InstantiateMsg { count: -1 };
        let info = mock_info("creator", &coins(2, "token"));
        let res = instantiate(deps.as_mut(), mock_env(), info, msg);
        assert!(res.is_err());

        // Try reset with negative count
        let msg = InstantiateMsg { count: 5 };
        let info = mock_info("creator", &coins(2, "token"));
        let _res = instantiate(deps.as_mut(), mock_env(), info, msg).unwrap();

        let info = mock_info("anyone", &coins(2, "token"));
        let msg = ExecuteMsg::Reset { count: -1 };
        let res = execute(deps.as_mut(), mock_env(), info, msg);
        assert!(res.is_err());
    }

    #[test]
    fn decrement_at_zero() {
        let mut deps = mock_dependencies();

        let msg = InstantiateMsg { count: 0 };
        let info = mock_info("creator", &coins(2, "token"));
        let _res = instantiate(deps.as_mut(), mock_env(), info, msg).unwrap();

        // Try to decrement from 0
        let info = mock_info("anyone", &coins(2, "token"));
        let msg = ExecuteMsg::Decrement {};
        let res = execute(deps.as_mut(), mock_env(), info, msg);
        assert!(res.is_err());
    }

    #[test]
    fn overflow_protection() {
        let mut deps = mock_dependencies();

        let msg = InstantiateMsg { count: i32::MAX };
        let info = mock_info("creator", &coins(2, "token"));
        let _res = instantiate(deps.as_mut(), mock_env(), info, msg).unwrap();

        // Try to increment from MAX
        let info = mock_info("anyone", &coins(2, "token"));
        let msg = ExecuteMsg::Increment {};
        let res = execute(deps.as_mut(), mock_env(), info, msg);
        assert!(res.is_err());
    }
}