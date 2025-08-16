use dyt::crypto::{ActivePQC, PQC}; // ensure trait in scope

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
    let addr = dyt::addr::address_from_pk(&pk);
    assert!(addr.starts_with("dyt1"));
    assert_eq!(addr.len(), 48);
}
