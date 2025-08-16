use super::PQC;
use pqcrypto_dilithium::dilithium5;
use pqcrypto_traits::sign::{PublicKey as _, SecretKey as _, SignedMessage as _};
use once_cell::sync::Lazy;
use std::collections::HashMap;
use std::sync::RwLock;

static SK_REGISTRY: Lazy<RwLock<HashMap<Vec<u8>, dilithium5::SecretKey>>> = Lazy::new(|| RwLock::new(HashMap::new()));
static PK_REGISTRY: Lazy<RwLock<HashMap<Vec<u8>, dilithium5::PublicKey>>> = Lazy::new(|| RwLock::new(HashMap::new()));

pub struct Dilithium;

impl PQC for Dilithium {
    const ALG: &'static str = "dilithium5";
    fn keypair() -> (Vec<u8>, Vec<u8>) {
        let (pk, sk) = dilithium5::keypair();
        let sk_bytes = sk.as_bytes().to_vec();
        let pk_bytes = pk.as_bytes().to_vec();
        SK_REGISTRY.write().unwrap().insert(sk_bytes.clone(), sk);
        PK_REGISTRY.write().unwrap().insert(pk_bytes.clone(), pk);
        (sk_bytes, pk_bytes)
    }
    fn sign(sk: &[u8], msg: &[u8]) -> Vec<u8> {
        if let Some(sk_obj) = SK_REGISTRY.read().unwrap().get(sk) {
            let sm = dilithium5::sign(msg, sk_obj);
            return sm.as_bytes().to_vec();
        }
        panic!("Unknown Dilithium secret key bytes")
    }
    fn verify(pk: &[u8], msg: &[u8], sig: &[u8]) -> bool {
        if let Some(pk_obj) = PK_REGISTRY.read().unwrap().get(pk) {
            if let Ok(sm) = dilithium5::SignedMessage::from_bytes(sig) {
                return dilithium5::open(&sm, pk_obj).map(|opened| opened == msg).unwrap_or(false);
            }
        }
        false
    }
}
