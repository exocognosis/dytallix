//! Simple Hello World contract for Dytallix
//! 
//! This contract demonstrates basic WASM contract functionality:
//! - Reading input from the host
//! - Writing output to the host
//! - Simple storage operations

// Host functions provided by Dytallix runtime (in "env" module)
#[link(wasm_import_module = "env")]
extern "C" {
    fn read_input(ptr: *mut u8, len: i32) -> i32;
    fn write_output(ptr: *const u8, len: i32);
    fn debug_log(ptr: *const u8, len: i32) -> i32;
    fn storage_get(key_ptr: *const u8, key_len: i32, val_ptr: *mut u8, max_len: i32) -> i32;
    fn storage_set(key_ptr: *const u8, key_len: i32, val_ptr: *const u8, val_len: i32) -> i32;
}

// Helper to log a message
fn log(msg: &str) {
    unsafe {
        debug_log(msg.as_ptr(), msg.len() as i32);
    }
}

// Helper to set output
fn set_output(data: &[u8]) {
    unsafe {
        write_output(data.as_ptr(), data.len() as i32);
    }
}

// Helper to get input
fn get_input() -> Vec<u8> {
    let mut buffer = vec![0u8; 1024];
    let len = unsafe { read_input(buffer.as_mut_ptr(), buffer.len() as i32) };
    if len < 0 {
        return Vec::new();
    }
    buffer.truncate(len as usize);
    buffer
}

// Storage helpers
fn storage_get_value(key: &[u8]) -> Option<Vec<u8>> {
    let mut buffer = vec![0u8; 1024];
    let len = unsafe { 
        storage_get(key.as_ptr(), key.len() as i32, buffer.as_mut_ptr(), buffer.len() as i32) 
    };
    if len < 0 {
        None
    } else {
        buffer.truncate(len as usize);
        Some(buffer)
    }
}

fn storage_set_value(key: &[u8], value: &[u8]) {
    unsafe {
        storage_set(key.as_ptr(), key.len() as i32, value.as_ptr(), value.len() as i32);
    }
}

/// Initialize the contract
#[no_mangle]
pub extern "C" fn init() {
    log("Hello World contract initialized!");
    storage_set_value(b"counter", &0u64.to_le_bytes());
    set_output(b"initialized");
}

/// Say hello - returns a greeting
#[no_mangle]
pub extern "C" fn hello() {
    log("hello() called");
    let input = get_input();
    
    let name = if input.is_empty() {
        "World".to_string()
    } else {
        String::from_utf8_lossy(&input).to_string()
    };
    
    let greeting = format!("Hello, {}! Welcome to Dytallix.", name);
    set_output(greeting.as_bytes());
}

/// Increment counter and return new value
#[no_mangle]
pub extern "C" fn increment() {
    log("increment() called");
    
    let current = storage_get_value(b"counter")
        .map(|v| {
            if v.len() >= 8 {
                u64::from_le_bytes(v[..8].try_into().unwrap_or([0; 8]))
            } else {
                0
            }
        })
        .unwrap_or(0);
    
    let new_value = current + 1;
    storage_set_value(b"counter", &new_value.to_le_bytes());
    
    let msg = format!("Counter: {}", new_value);
    set_output(msg.as_bytes());
}

/// Get current counter value
#[no_mangle]
pub extern "C" fn get_counter() {
    log("get_counter() called");
    
    let current = storage_get_value(b"counter")
        .map(|v| {
            if v.len() >= 8 {
                u64::from_le_bytes(v[..8].try_into().unwrap_or([0; 8]))
            } else {
                0
            }
        })
        .unwrap_or(0);
    
    let msg = format!("{}", current);
    set_output(msg.as_bytes());
}

/// Echo back the input
#[no_mangle]
pub extern "C" fn echo() {
    log("echo() called");
    let input = get_input();
    set_output(&input);
}
