use dcli::addr;
use dcli::crypto::{ActivePQC, PQC}; // ensure trait in scope

#[test]
fn keygen_sign_verify_roundtrip() {
    // generate keypair
    let (sk, pk) = ActivePQC::keypair();
    let msg = b"hello pqc";
    let sig = ActivePQC::sign(&sk, msg);
    assert!(ActivePQC::verify(&pk, msg, &sig));
}

#[test]
fn address_derivation_stable() {
    // For deterministic test use fixed pk bytes pattern
    let pk = [1u8; 64];
    let addr = addr::address_from_pk(&pk);
    assert!(addr.starts_with("dytallix"));
    assert_eq!(addr.len(), "dytallix".len() + 40); // prefix + 20 bytes hex
}
