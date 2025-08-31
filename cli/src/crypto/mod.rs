// PQC abstraction layer
// Defines a trait over post-quantum signature schemes so the CLI can swap
// between a real Dilithium5 implementation and a deterministic mock for tests.

pub trait PQC {
    fn keypair() -> (Vec<u8>, Vec<u8>); // (sk, pk)
    fn sign(sk: &[u8], msg: &[u8]) -> Vec<u8>;
    fn verify(pk: &[u8], msg: &[u8], sig: &[u8]) -> bool;
    const ALG: &'static str; // algorithm identifier (e.g. "dilithium5")
}

#[cfg(all(feature = "pqc-real", feature = "pqc-mock"))]
compile_error!("Features 'pqc-real' and 'pqc-mock' cannot both be enabled.");

#[cfg(all(feature = "pqc-real", not(feature = "pqc-mock")))]
mod dilithium;
#[cfg(all(feature = "pqc-real", not(feature = "pqc-mock")))]
pub use dilithium::Dilithium as ActivePQC;

#[cfg(all(feature = "pqc-mock", not(feature = "pqc-real")))]
mod mock;
#[cfg(all(feature = "pqc-mock", not(feature = "pqc-real")))]
pub use mock::MockPQC as ActivePQC;

// Fallback: if neither feature is set, enable mock for compilation
#[cfg(all(not(feature = "pqc-real"), not(feature = "pqc-mock")))]
mod mock;
#[cfg(all(not(feature = "pqc-real"), not(feature = "pqc-mock")))]
pub use mock::MockPQC as ActivePQC;

#[path = "kdf.rs"]
mod kdf;
pub use kdf::*;

mod hash;
pub use hash::{canonical_json, sha3_256};
