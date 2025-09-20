// PQC abstraction layer
// Defines a trait over post-quantum signature schemes so the CLI can swap
// between a real Dilithium5 implementation and a deterministic mock for tests.

pub trait PQC {
    fn keypair() -> (Vec<u8>, Vec<u8>); // (sk, pk)
    fn sign(sk: &[u8], msg: &[u8]) -> Vec<u8>;
    fn verify(pk: &[u8], msg: &[u8], sig: &[u8]) -> bool;
    const ALG: &'static str; // algorithm identifier (e.g. "dilithium5")
}

// When both pqc-real and pqc-mock are enabled, prefer real implementation without failing compile.
// We emit a doc comment instead of a hard error to allow `--all-features` clippy runs.
#[cfg(all(feature = "pqc-real", feature = "pqc-mock"))]
#[allow(dead_code)]
const _PQC_FEATURE_NOTE: &str =
    "Both 'pqc-real' and 'pqc-mock' enabled; using real Dilithium implementation";

#[cfg(feature = "pqc-real")]
mod dilithium;
#[cfg(feature = "pqc-real")]
pub use dilithium::Dilithium as ActivePQC;

// If real not selected, fall back to mock
#[cfg(all(not(feature = "pqc-real"), feature = "pqc-mock"))]
mod mock;
#[cfg(all(not(feature = "pqc-real"), feature = "pqc-mock"))]
pub use mock::MockPQC as ActivePQC;

// If neither feature set, default to mock for minimal builds.
#[cfg(all(not(feature = "pqc-real"), not(feature = "pqc-mock")))]
mod mock;
#[cfg(all(not(feature = "pqc-real"), not(feature = "pqc-mock")))]
pub use mock::MockPQC as ActivePQC;

#[path = "kdf.rs"]
mod kdf;
pub use kdf::*;

mod hash;
pub use hash::{canonical_json, sha3_256};
