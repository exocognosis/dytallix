//! Minimal contract for Dytallix - no heap allocation
#![no_std]
#![no_main]

use core::panic::PanicInfo;

// Host functions provided by Dytallix runtime
#[link(wasm_import_module = "env")]
extern "C" {
    fn write_output(ptr: *const u8, len: i32);
    fn storage_get(key_ptr: *const u8, key_len: i32, val_ptr: *mut u8, max_len: i32) -> i32;
    fn storage_set(key_ptr: *const u8, key_len: i32, val_ptr: *const u8, val_len: i32) -> i32;
}

#[panic_handler]
fn panic(_info: &PanicInfo) -> ! {
    loop {}
}

/// Initialize - set counter to 0
#[no_mangle]
pub extern "C" fn init() {
    let counter: u64 = 0;
    unsafe {
        storage_set(
            b"counter".as_ptr(), 7,
            counter.to_le_bytes().as_ptr(), 8
        );
        write_output(b"ok".as_ptr(), 2);
    }
}

/// Increment counter
#[no_mangle]
pub extern "C" fn increment() {
    let mut buffer = [0u8; 8];
    let current: u64 = unsafe {
        let len = storage_get(b"counter".as_ptr(), 7, buffer.as_mut_ptr(), 8);
        if len == 8 {
            u64::from_le_bytes(buffer)
        } else {
            0
        }
    };
    
    let new_value = current + 1;
    unsafe {
        storage_set(
            b"counter".as_ptr(), 7,
            new_value.to_le_bytes().as_ptr(), 8
        );
        write_output(new_value.to_le_bytes().as_ptr(), 8);
    }
}

/// Get counter value
#[no_mangle]
pub extern "C" fn get_counter() {
    let mut buffer = [0u8; 8];
    unsafe {
        let len = storage_get(b"counter".as_ptr(), 7, buffer.as_mut_ptr(), 8);
        if len >= 0 {
            write_output(buffer.as_ptr(), 8);
        }
    }
}
