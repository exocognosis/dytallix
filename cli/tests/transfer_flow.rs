use dcli::tx::{Tx, Msg, SignedTx};
use dcli::crypto::{ActivePQC, PQC};

#[test]
fn build_and_sign_transfer() {
    let (sk, pk) = ActivePQC::keypair();
    let from_addr = "dyt1fromaddrplaceholder000000000000000000000000".to_string();
    let to_addr = "dyt1toaddrplaceholder00000000000000000000000000".to_string();
    let msg = Msg::Send { from: from_addr, to: to_addr, denom: "DGT".into(), amount: 123456789u128 };
    let tx = Tx::new("chain-test", 7, vec![msg], 10u128, "memo").unwrap();
    let h1 = tx.hash().unwrap();
    let signed = SignedTx::sign(tx.clone(), &sk, &pk).unwrap();
    signed.verify().unwrap();
    let h2 = tx.hash().unwrap();
    assert_eq!(h1, h2); // canonical stability
}

#[tokio::test]
async fn optional_broadcast_integration() {
    if std::env::var("DX_INT_RPC").is_err() { return; }
    let rpc = std::env::var("DX_INT_RPC").unwrap();
    // This requires an unlocked key workflow; here we just ensure endpoint presence
    let client = reqwest::Client::new();
    let res = client.get(format!("{}/stats", rpc)).send().await;
    assert!(res.is_ok());
}
