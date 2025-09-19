#[allow(clippy::upper_case_acronyms)]
pub trait PQC {
    fn keypair() -> (Vec<u8>, Vec<u8>); // (sk, pk)
    fn sign(sk: &[u8], msg: &[u8]) -> Vec<u8>;
    fn verify(pk: &[u8], msg: &[u8], sig: &[u8]) -> bool;
    const ALG: &'static str;
}

#[cfg(feature = "pqc-real")]
mod dilithium;
#[cfg(feature = "pqc-real")]
pub use dilithium::Dilithium as ActivePQC;

#[cfg(all(feature = "pqc-mock", not(feature = "pqc-real")))]
mod mock;
#[cfg(all(feature = "pqc-mock", not(feature = "pqc-real")))]
pub use mock::MockPQC as ActivePQC;

// New multi-algorithm PQC verification module
pub mod pqc_verify;
pub use pqc_verify::{verify, verify_default, PQCAlgorithm, PQCVerifyError};

mod hash;
pub use hash::{canonical_json, sha3_256};
