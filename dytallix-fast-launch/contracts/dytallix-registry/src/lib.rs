use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// Host functions
extern "C" {
    fn read_input(out_ptr: *mut u8, max_len: i32) -> i32;
    fn write_output(ptr: *const u8, len: i32);
    fn storage_get(key_ptr: *const u8, key_len: i32, val_ptr: *mut u8, max_len: i32) -> i32;
    fn storage_set(key_ptr: *const u8, key_len: i32, val_ptr: *const u8, val_len: i32) -> i32;
    fn debug_log(msg_ptr: *const u8, msg_len: i32);
}

// Helper wrappers
fn get_input() -> Vec<u8> {
    let mut buf = vec![0u8; 1024 * 64]; // 64KB max input
    let len = unsafe { read_input(buf.as_mut_ptr(), buf.len() as i32) };
    if len < 0 {
        return Vec::new();
    }
    buf.truncate(len as usize);
    buf
}

fn set_output(data: &[u8]) {
    unsafe { write_output(data.as_ptr(), data.len() as i32) };
}

fn store_read(key: &[u8]) -> Option<Vec<u8>> {
    let mut buf = vec![0u8; 1024 * 64];
    let len = unsafe { storage_get(key.as_ptr(), key.len() as i32, buf.as_mut_ptr(), buf.len() as i32) };
    if len < 0 {
        return None;
    }
    buf.truncate(len as usize);
    Some(buf)
}

fn store_write(key: &[u8], value: &[u8]) {
    unsafe { storage_set(key.as_ptr(), key.len() as i32, value.as_ptr(), value.len() as i32) };
}

fn log(msg: &str) {
    unsafe { debug_log(msg.as_ptr(), msg.len() as i32) };
}

// Contract Types
#[derive(Serialize, Deserialize, Debug)]
enum Method {
    RegisterAsset { hash: String, uri: String },
    UpdateUri { id: u64, uri: String },
    GetAsset { id: u64 },
    VerifyAsset { id: u64, hash: String },
}

#[derive(Serialize, Deserialize, Debug, Clone)]
struct Asset {
    id: u64,
    owner: String, // Placeholder, real contract would use caller
    hash: String,
    uri: String,
}

// State Keys
const NEXT_ID_KEY: &[u8] = b"next_id";
fn asset_key(id: u64) -> Vec<u8> {
    format!("asset:{}", id).into_bytes()
}

// Entrypoint
#[no_mangle]
pub extern "C" fn handle() {
    log("Hello from WASM!");
    let input = get_input();
    log(&format!("Received input len: {}", input.len()));
    let method: Method = match serde_json::from_slice(&input) {
        Ok(m) => {
            log(&format!("Parsed method: {:?}", m));
            m
        },
        Err(e) => {
            log(&format!("Failed to parse method: {}", e));
            return;
        }
    };

    match method {
        Method::RegisterAsset { hash, uri } => {
            let next_id = store_read(NEXT_ID_KEY)
                .and_then(|v| serde_json::from_slice::<u64>(&v).ok())
                .unwrap_or(1);
            
            let asset = Asset {
                id: next_id,
                owner: "sender_placeholder".to_string(),
                hash,
                uri,
            };
            
            let asset_bytes = serde_json::to_vec(&asset).unwrap();
            store_write(&asset_key(next_id), &asset_bytes);
            
            let next_id_bytes = serde_json::to_vec(&(next_id + 1)).unwrap();
            store_write(NEXT_ID_KEY, &next_id_bytes);
            
            let out = serde_json::to_vec(&next_id).unwrap();
            set_output(&out);
        }
        Method::UpdateUri { id, uri } => {
            if let Some(mut asset_bytes) = store_read(&asset_key(id)) {
                if let Ok(mut asset) = serde_json::from_slice::<Asset>(&asset_bytes) {
                    asset.uri = uri;
                    let new_bytes = serde_json::to_vec(&asset).unwrap();
                    store_write(&asset_key(id), &new_bytes);
                    set_output(b"true");
                }
            }
        }
        Method::GetAsset { id } => {
            if let Some(asset_bytes) = store_read(&asset_key(id)) {
                set_output(&asset_bytes);
            }
        }
        Method::VerifyAsset { id, hash } => {
            let mut valid = false;
            if let Some(asset_bytes) = store_read(&asset_key(id)) {
                if let Ok(asset) = serde_json::from_slice::<Asset>(&asset_bytes) {
                    if asset.hash == hash {
                        valid = true;
                    }
                }
            }
            let out = serde_json::to_vec(&valid).unwrap();
            set_output(&out);
        }
    }
}
