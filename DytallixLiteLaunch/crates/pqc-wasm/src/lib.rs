use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};
use sha2::{Digest, Sha256};
use bech32::{ToBase32, Variant, encode as bech32_encode};

use pqcrypto_dilithium::dilithium3;
use pqcrypto_traits::sign::{DetachedSignature, PublicKey, SecretKey};
use base64::engine::general_purpose::STANDARD as B64;
use base64::Engine as _;
use zeroize::Zeroize;

#[derive(Serialize, Deserialize)]
struct KeypairOut { algo: String, pk: String, sk: String, address: String }

fn b64(x: &[u8]) -> String { B64.encode(x) }
fn b64d(s: &str) -> Vec<u8> { B64.decode(s).expect("b64") }

fn bech32_from_pk(pk: &[u8], hrp: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(pk);
    let digest = hasher.finalize();
    let payload = &digest[..20];
    bech32_encode(hrp, payload.to_base32(), Variant::Bech32).expect("bech32")
}

#[wasm_bindgen]
pub fn version() -> String { "pqc-wasm 0.1.0".to_string() }

/*
  TODO (WASM PQC): Replace the non-wasm-only PQC with a WASM-compatible Dilithium implementation.
  Options: pure-Rust Dilithium that compiles to wasm32-unknown-unknown, or JS/WASM binding.
  Keep feature flags and cfg guards so native builds continue to use pqcrypto-dilithium.
*/

#[wasm_bindgen]
pub fn dilithium_available() -> bool {
    true
}

#[wasm_bindgen]
pub fn keygen() -> JsValue {
    let (pk, sk) = dilithium3::keypair();
    let addr = bech32_from_pk(pk.as_bytes(), "dyt");
    let out = KeypairOut {
        algo: "pqc/dilithium3".into(),
        pk: b64(pk.as_bytes()),
        sk: b64(sk.as_bytes()),
        address: addr,
    };
    JsValue::from_str(&serde_json::to_string(&out).unwrap())
}

#[wasm_bindgen(js_name = "sign")]
pub fn sign(message: &[u8], sk_b64: &str) -> String {
    let mut sk_bytes = b64d(sk_b64);
    let sk = dilithium3::SecretKey::from_bytes(&sk_bytes).expect("sk");
    let sig: DetachedSignature = dilithium3::detached_sign(message, &sk);
    // Zeroize temporary secret buffer ASAP
    sk_bytes.zeroize();
    b64(sig.as_bytes())
}

#[wasm_bindgen]
pub fn verify(message: &[u8], sig_b64: &str, pk_b64: &str) -> bool {
    let pk = match dilithium3::PublicKey::from_bytes(&b64d(pk_b64)) { Ok(v)=>v, Err(_)=> return false };
    let sig = match dilithium3::DetachedSignature::from_bytes(&b64d(sig_b64)) { Ok(v)=>v, Err(_)=> return false };
    dilithium3::verify_detached_signature(&sig, message, &pk).is_ok()
}

#[wasm_bindgen]
pub fn pubkey_to_address(pk_b64: &str, hrp: &str) -> String {
    let pk = b64d(pk_b64);
    bech32_from_pk(&pk, hrp)
}

#[wasm_bindgen]
pub fn dilithium_sign(message: &[u8], sk_b64: &str) -> String {
    sign(message, sk_b64)
}

#[wasm_bindgen]
pub fn verify_sm(signed_message_b64: &str, pk_b64: &str) -> bool {
    let pk = match dilithium3::PublicKey::from_bytes(&b64d(pk_b64)) { Ok(v)=>v, Err(_)=> return false };
    let sm_bytes = b64d(signed_message_b64);
    let sm = match dilithium3::SignedMessage::from_bytes(&sm_bytes) { Ok(v)=>v, Err(_)=> return false };
    dilithium3::open(&sm, &pk).map(|_| ()).is_ok()
}

#[cfg(test)]
mod tests {
    use super::*;
    use wasm_bindgen_test::*;

    wasm_bindgen_test_configure!(run_in_browser);

    #[wasm_bindgen_test]
    fn roundtrip() {
        let (pk, sk) = dilithium3::keypair();
        let msg = b"hello pqc";
        let sig = dilithium3::detached_sign(msg, &sk);
        assert!(dilithium3::verify_detached_signature(&sig, msg, &pk).is_ok());
    }

    #[wasm_bindgen_test]
    fn wasm_api_roundtrip() {
        let kp = keygen();
        let v: serde_json::Value = serde_json::from_str(&kp.as_string().unwrap()).unwrap();
        let pk = v["pk"].as_str().unwrap().to_string();
        let sk = v["sk"].as_str().unwrap().to_string();
        let msg = b"browser-kat-smoke";
        let sig = sign(msg, &sk);
        assert!(verify(msg, &sig, &pk));
    }
}
