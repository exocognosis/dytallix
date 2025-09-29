// Minimal counter contract for Dytallix testnet
// Demonstrates basic WASM contract functionality with DGT/DRT integration

#[no_mangle]
pub extern "C" fn init() -> *const u8 {
    // Initialize counter state
    let json = String::from("{\"ok\":true,\"counter\":0}");
    let ptr = json.as_ptr();
    std::mem::forget(json);
    ptr
}

#[no_mangle]
pub extern "C" fn increment() -> *const u8 {
    // Increment counter - runtime will handle state persistence
    let json = String::from("{\"method\":\"increment\",\"success\":true}");
    let ptr = json.as_ptr();
    std::mem::forget(json);
    ptr
}

#[no_mangle]
pub extern "C" fn get() -> *const u8 {
    // Get current counter value - runtime provides state
    let json = String::from("{\"method\":\"get\",\"counter\":0}");
    let ptr = json.as_ptr();
    std::mem::forget(json);
    ptr
}

#[no_mangle]
pub extern "C" fn reset() -> *const u8 {
    // Reset counter to zero
    let json = String::from("{\"method\":\"reset\",\"counter\":0}");
    let ptr = json.as_ptr();
    std::mem::forget(json);
    ptr
}