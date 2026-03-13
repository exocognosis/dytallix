// Minimal counter contract matching node wasm.rs expectations
// ABI: export functions `init`, `increment`, `get`
// - All functions return a pointer to a JSON-encoded result in linear memory.
// - For this MVP demo, we keep internal state within the node host env.
//   Contract provides pure entrypoints; node runtime stores `counter` key.

#[no_mangle]
pub extern "C" fn init() -> *const u8 {
    // Return an empty JSON object for init success
    let json = String::from("{\"ok\":true}");
    let ptr = json.as_ptr();
    std::mem::forget(json);
    ptr
}

#[no_mangle]
pub extern "C" fn increment() -> *const u8 {
    // Node runtime will handle state increment; contract just signals intent
    let json = String::from("{\"method\":\"increment\"}");
    let ptr = json.as_ptr();
    std::mem::forget(json);
    ptr
}

#[no_mangle]
pub extern "C" fn get() -> *const u8 {
    // Node runtime returns the state; here return a placeholder
    let json = String::from("{\"method\":\"get\"}");
    let ptr = json.as_ptr();
    std::mem::forget(json);
    ptr
}
