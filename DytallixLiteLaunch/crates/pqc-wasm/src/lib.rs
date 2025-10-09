use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};
use sha2::{Digest, Sha256};
use bech32::{ToBase32, Variant, encode as bech32_encode};

use fips204::ml_dsa_65; // ML-DSA-65 is equivalent to Dilithium3
use fips204::traits::{SerDes, Signer, Verifier};
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
pub fn version() -> String { "pqc-wasm 0.1.0 (FIPS 204 ML-DSA-65)".to_string() }

#[wasm_bindgen]
pub fn dilithium_available() -> bool {
    true
}

#[wasm_bindgen]
pub fn keygen() -> JsValue {
    let (pk, sk) = ml_dsa_65::try_keygen().expect("keygen failed");
    let pk_bytes = pk.clone().into_bytes();
    let sk_bytes = sk.into_bytes();
    let addr = bech32_from_pk(&pk_bytes, "dyt");
    
    let out = KeypairOut {
        algo: "fips204/ml-dsa-65".into(),
        pk: b64(&pk_bytes),
        sk: b64(&sk_bytes),
        address: addr,
    };
    JsValue::from_str(&serde_json::to_string(&out).unwrap())
}

#[wasm_bindgen(js_name = "sign")]
pub fn sign(message: &[u8], sk_b64: &str) -> String {
    let mut sk_bytes = b64d(sk_b64);
    
    // ML-DSA-65 (Dilithium3) secret key size is 4032 bytes
    if sk_bytes.len() != 4032 {
        sk_bytes.zeroize();
        panic!("Invalid secret key length: {} (expected 4032)", sk_bytes.len());
    }
    
    let sk_array: [u8; 4032] = sk_bytes[..4032].try_into().expect("sk size");
    let sk = ml_dsa_65::PrivateKey::try_from_bytes(sk_array)
        .expect("invalid secret key");
    
    let sig_bytes = sk.try_sign(message, &[]).expect("signing failed");
    
    // Zeroize temporary secret buffer ASAP
    sk_bytes.zeroize();
    b64(&sig_bytes)
}

#[wasm_bindgen]
pub fn verify(message: &[u8], sig_b64: &str, pk_b64: &str) -> bool {
    let pk_bytes = b64d(pk_b64);
    let sig_bytes = b64d(sig_b64);
    
    // ML-DSA-65 public key is 1952 bytes, signature is 3309 bytes
    if pk_bytes.len() != 1952 || sig_bytes.len() != 3309 {
        return false;
    }
    
    let pk_array: [u8; 1952] = match pk_bytes.try_into() {
        Ok(arr) => arr,
        Err(_) => return false,
    };
    let sig_array: [u8; 3309] = match sig_bytes.try_into() {
        Ok(arr) => arr,
        Err(_) => return false,
    };
    
    let pk = match ml_dsa_65::PublicKey::try_from_bytes(pk_array) {
        Ok(key) => key,
        Err(_) => return false,
    };
    
    pk.verify(message, &sig_array, &[])
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

#[cfg(test)]
mod tests {
    use super::*;
    use wasm_bindgen_test::*;

    wasm_bindgen_test_configure!(run_in_browser);

    #[wasm_bindgen_test]
    fn roundtrip() {
        let (pk, sk) = ml_dsa_65::try_keygen().expect("keygen");
        let msg = b"hello pqc";
        let sig = sk.try_sign(msg, &[]).expect("sign");
        assert!(pk.verify(msg, &sig, &[]).is_ok());
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
