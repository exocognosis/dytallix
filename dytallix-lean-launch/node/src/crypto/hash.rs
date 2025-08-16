use sha3::{Digest, Sha3_256};
use serde::Serialize;

pub fn canonical_json<T: Serialize>(value: &T) -> serde_json::Result<Vec<u8>> { serde_json::to_vec(value) }

pub fn sha3_256(bytes: &[u8]) -> [u8;32] { let mut h = Sha3_256::new(); h.update(bytes); let out = h.finalize(); let mut arr=[0u8;32]; arr.copy_from_slice(&out); arr }
