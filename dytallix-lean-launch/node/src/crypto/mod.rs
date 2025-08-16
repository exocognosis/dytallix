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

#[cfg(feature = "pqc-mock")]
mod mock;
#[cfg(feature = "pqc-mock")]
pub use mock::MockPQC as ActivePQC;

mod hash;
pub use hash::{canonical_json, sha3_256};
