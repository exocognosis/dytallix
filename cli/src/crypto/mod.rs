// PQC abstraction layer
// Defines a trait over post-quantum signature schemes so the CLI can swap
// between a real Dilithium5 implementation and a deterministic mock for tests.

pub trait PQC {
    fn keypair() -> (Vec<u8>, Vec<u8>); // (sk, pk)
    fn sign(sk: &[u8], msg: &[u8]) -> Vec<u8>;
    fn verify(pk: &[u8], msg: &[u8], sig: &[u8]) -> bool;
}

#[cfg(feature = "pqc-real")]
mod dilithium;
#[cfg(feature = "pqc-real")]
pub use dilithium::Dilithium as ActivePQC;

#[cfg(feature = "pqc-mock")]
mod mock;
#[cfg(feature = "pqc-mock")]
pub use mock::MockPQC as ActivePQC;
