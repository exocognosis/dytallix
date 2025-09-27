use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Serialize, Deserialize, Clone)]
pub struct TokenState {
    pub name: String,
    pub symbol: String,
    pub total_supply: u64,
    pub balances: HashMap<String, u64>,
    pub allowances: HashMap<String, HashMap<String, u64>>,
    pub owner: String,
}

#[derive(Serialize, Deserialize)]
pub struct InitMsg {
    pub name: String,
    pub symbol: String,
    pub initial_supply: u64,
    pub owner: String,
}

#[derive(Serialize, Deserialize)]
pub struct TransferMsg {
    pub to: String,
    pub amount: u64,
}

// Global state storage simulation (in real implementation this would be handled by the runtime)
static mut STATE: Option<TokenState> = None;

#[no_mangle]
pub extern "C" fn init(msg_ptr: *const u8, msg_len: usize) -> *const u8 {
    let msg_slice = unsafe { std::slice::from_raw_parts(msg_ptr, msg_len) };
    let init_msg: InitMsg = serde_json::from_slice(msg_slice).unwrap();
    
    let mut balances = HashMap::new();
    balances.insert(init_msg.owner.clone(), init_msg.initial_supply);
    
    let state = TokenState {
        name: init_msg.name,
        symbol: init_msg.symbol,
        total_supply: init_msg.initial_supply,
        balances,
        allowances: HashMap::new(),
        owner: init_msg.owner,
    };
    
    unsafe {
        STATE = Some(state);
    }
    
    let response = serde_json::to_string(&"initialized").unwrap();
    let ptr = response.as_ptr();
    std::mem::forget(response);
    ptr
}

#[no_mangle]
pub extern "C" fn transfer(msg_ptr: *const u8, msg_len: usize, sender_ptr: *const u8, sender_len: usize) -> *const u8 {
    let msg_slice = unsafe { std::slice::from_raw_parts(msg_ptr, msg_len) };
    let sender_slice = unsafe { std::slice::from_raw_parts(sender_ptr, sender_len) };
    
    let transfer_msg: TransferMsg = serde_json::from_slice(msg_slice).unwrap();
    let sender = String::from_utf8(sender_slice.to_vec()).unwrap();
    
    let state = unsafe { STATE.as_mut().unwrap() };
    
    let sender_balance = state.balances.get(&sender).copied().unwrap_or(0);
    if sender_balance < transfer_msg.amount {
        let error = serde_json::to_string(&"insufficient_balance").unwrap();
        let ptr = error.as_ptr();
        std::mem::forget(error);
        return ptr;
    }
    
    state.balances.insert(sender.clone(), sender_balance - transfer_msg.amount);
    let recipient_balance = state.balances.get(&transfer_msg.to).copied().unwrap_or(0);
    state.balances.insert(transfer_msg.to, recipient_balance + transfer_msg.amount);
    
    let response = serde_json::to_string(&"success").unwrap();
    let ptr = response.as_ptr();
    std::mem::forget(response);
    ptr
}

#[no_mangle]
pub extern "C" fn balance_of(query_ptr: *const u8, query_len: usize) -> *const u8 {
    let query_slice = unsafe { std::slice::from_raw_parts(query_ptr, query_len) };
    let address = String::from_utf8(query_slice.to_vec()).unwrap();
    
    let state = unsafe { STATE.as_ref().unwrap() };
    let balance = state.balances.get(&address).copied().unwrap_or(0);
    
    let response = serde_json::to_string(&balance).unwrap();
    let ptr = response.as_ptr();
    std::mem::forget(response);
    ptr
}

#[no_mangle]
pub extern "C" fn total_supply() -> *const u8 {
    let state = unsafe { STATE.as_ref().unwrap() };
    let response = serde_json::to_string(&state.total_supply).unwrap();
    let ptr = response.as_ptr();
    std::mem::forget(response);
    ptr
}