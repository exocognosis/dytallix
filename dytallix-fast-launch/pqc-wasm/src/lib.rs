use wasm_bindgen::prelude::*;
use js_sys;

// ML-DSA-65 implementation (FIPS 204)
use fips204::ml_dsa_65;
use fips204::traits::{SerDes, Signer, Verifier};

/// Generate a new ML-DSA-65 keypair
#[wasm_bindgen]
pub fn generate_keypair() -> Result<JsValue, JsValue> {
    let mut rng = rand::thread_rng();
    
    let (pk, sk) = ml_dsa_65::try_keygen_with_rng(&mut rng)
        .map_err(|e| JsValue::from_str(&format!("Key generation failed: {}", e)))?;
    
    let result = js_sys::Object::new();
    js_sys::Reflect::set(
        &result,
        &JsValue::from_str("publicKey"),
        &js_sys::Uint8Array::from(&pk.into_bytes()[..]),
    )?;
    js_sys::Reflect::set(
        &result,
        &JsValue::from_str("privateKey"),
        &js_sys::Uint8Array::from(&sk.into_bytes()[..]),
    )?;
    
    Ok(result.into())
}

/// Sign a message with ML-DSA-65
#[wasm_bindgen]
pub fn sign(private_key: &[u8], message: &[u8]) -> Result<Vec<u8>, JsValue> {
    // Convert slice to fixed array
    let sk_array: [u8; 4032] = private_key.try_into()
        .map_err(|_| JsValue::from_str("Invalid private key length (expected 4032 bytes)"))?;
    
    let sk = ml_dsa_65::PrivateKey::try_from_bytes(sk_array)
        .map_err(|e| JsValue::from_str(&format!("Invalid private key: {}", e)))?;
    
    let sig = sk.try_sign(message, &[])
        .map_err(|e| JsValue::from_str(&format!("Signing failed: {}", e)))?;
    
    Ok(sig.to_vec())
}

/// Verify an ML-DSA-65 signature
#[wasm_bindgen]
pub fn verify(public_key: &[u8], message: &[u8], signature: &[u8]) -> Result<bool, JsValue> {
    // Convert slices to fixed arrays
    let pk_array: [u8; 1952] = public_key.try_into()
        .map_err(|_| JsValue::from_str("Invalid public key length (expected 1952 bytes)"))?;
    
    let sig_array: [u8; 3309] = signature.try_into()
        .map_err(|_| JsValue::from_str("Invalid signature length (expected 3309 bytes)"))?;
    
    let pk = ml_dsa_65::PublicKey::try_from_bytes(pk_array)
        .map_err(|e| JsValue::from_str(&format!("Invalid public key: {}", e)))?;
    
    Ok(pk.verify(message, &sig_array, &[]))
}

/// Convert public key to Dytallix bech32 address
#[wasm_bindgen]
pub fn public_key_to_address(public_key: &[u8]) -> Result<String, JsValue> {
    use sha2::{Digest, Sha256};
    use bech32::ToBase32;
    
    // Hash the public key
    let hash = Sha256::digest(public_key);
    
    // Take first 20 bytes
    let addr_bytes = &hash[..20];
    
    // Encode as bech32 with 'dyt' prefix
    bech32::encode("dyt", addr_bytes.to_base32(), bech32::Variant::Bech32)
        .map_err(|e| JsValue::from_str(&format!("Address encoding failed: {}", e)))
}

/// Derive public key from private key
#[wasm_bindgen]
pub fn derive_public_key(private_key: &[u8]) -> Result<Vec<u8>, JsValue> {
    // ML-DSA private key format includes the public key in the first 1952 bytes
    if private_key.len() < 1952 {
        return Err(JsValue::from_str("Private key too short"));
    }
    
    Ok(private_key[..1952].to_vec())
}
