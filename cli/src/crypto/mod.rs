// PQC abstraction layer
// Defines a trait over post-quantum signature schemes. The CLI always uses
// real Dilithium5 implementation; no mock or degraded fallbacks remain.

pub trait PQC {
    fn keypair() -> (Vec<u8>, Vec<u8>); // (sk, pk)
    fn sign(sk: &[u8], msg: &[u8]) -> Vec<u8>;
    fn verify(pk: &[u8], msg: &[u8], sig: &[u8]) -> bool;
    const ALG: &'static str; // algorithm identifier (e.g. "dilithium5")
}

mod dilithium;
pub use dilithium::Dilithium as ActivePQC;

#[path = "kdf.rs"]
mod kdf;
pub use kdf::*;

mod hash;
pub use hash::{canonical_json, sha3_256};
