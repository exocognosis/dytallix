#![no_std]

use core::panic::PanicInfo;

static mut COUNTER: i32 = 0;

#[panic_handler]
fn panic(_info: &PanicInfo) -> ! {
    loop {}
}

#[no_mangle]
pub extern "C" fn increment() { 
    unsafe { COUNTER += 1; } 
}

#[no_mangle]
pub extern "C" fn get() -> i32 { 
    unsafe { COUNTER } 
}