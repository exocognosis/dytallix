#![no_std]

use core::slice;

/// Get random bytes; exposed for PQClean implementations.
///
/// # Safety
/// Assumes inputs are valid and may panic over FFI boundary if rng failed.
///
/// # Example
/// ```rust
/// use pqcrypto_internals::*;
/// let mut buf = [0u8;10];
/// unsafe {
///   PQCRYPTO_RUST_randombytes(buf.as_mut_ptr(), buf.len());
/// }
/// ```
#[no_mangle]
pub unsafe extern "C" fn PQCRYPTO_RUST_randombytes(buf: *mut u8, len: libc::size_t) -> libc::c_int {
    let buf = slice::from_raw_parts_mut(buf, len);
    // Use getrandom 0.2 API to fill the buffer in-place
    if let Err(_e) = getrandom::getrandom(buf) {
        // Preserve previous panic behavior on RNG failure
        panic!("RNG Failed");
    }
    0
}
