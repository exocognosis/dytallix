use dcli::batch::{Batch, BatchMsg};
use dcli::tx::NonceSpec;
use serde_json::json;

#[test]
fn batch_validation_errors() {
    // invalid denom
    let data = json!({
        "chain_id":"dyt-localnet","from":"alice","nonce":"auto","fee":"10","messages":[{"type":"send","to":"addr2","denom":"XXX","amount":"1"}]});
    let mut b: Batch = serde_json::from_value(data).unwrap();
    assert!(b.validate().is_err());
}

#[test]
fn batch_zero_amount_error() {
    let data = json!({
        "chain_id":"dyt-localnet","from":"alice","nonce":"auto","fee":"10","messages":[{"type":"send","to":"addr2","denom":"DGT","amount":"0"}]});
    let mut b: Batch = serde_json::from_value(data).unwrap();
    assert!(b.validate().is_err());
}

#[test]
fn batch_ok() {
    let data = json!({
        "chain_id":"dyt-localnet","from":"alice","nonce":"auto","fee":"10","messages":[{"type":"send","to":"addr2","denom":"DGT","amount":"1"}]});
    let mut b: Batch = serde_json::from_value(data).unwrap();
    b.validate().unwrap();
    match b.nonce {
        NonceSpec::Auto => {}
        _ => panic!("nonce"),
    }
    if let BatchMsg::Send { denom, amount, .. } = &b.messages[0] {
        assert_eq!(denom, "DGT");
        assert_eq!(*amount, 1);
    } else {
        panic!()
    }
}
