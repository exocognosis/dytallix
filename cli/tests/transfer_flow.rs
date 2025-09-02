use dcli::crypto::{ActivePQC, PQC};
use dcli::tx::{Msg, SignedTx, Tx};

#[test]
fn build_and_sign_transfer() {
    let (sk, pk) = ActivePQC::keypair();
    let from_addr = "dyt1fromaddrplaceholder000000000000000000000000".to_string();
    let to_addr = "dyt1toaddrplaceholder00000000000000000000000000".to_string();
    let msg = Msg::Send {
        from: from_addr,
        to: to_addr,
        denom: "DGT".into(),
        amount: 123456789u128,
    };
    let tx = Tx::new("chain-test", 7, vec![msg], 10u128, "memo").unwrap();
    let h1 = tx.tx_hash().unwrap();
    // Provide gas parameters for signing
    let signed = SignedTx::sign(tx.clone(), &sk, &pk, 200_000, 1_000).unwrap();
    signed.verify().unwrap();
    let h2 = tx.tx_hash().unwrap();
    assert_eq!(h1, h2); // canonical stability
}

#[tokio::test]
async fn optional_broadcast_integration() {
    if std::env::var("DX_INT_RPC").is_err() {
        return;
    }
    let rpc = std::env::var("DX_INT_RPC").unwrap();
    // This requires an unlocked key workflow; here we just ensure endpoint presence
    let client = reqwest::Client::new();
    let res = client.get(format!("{rpc}/stats")).send().await;
    assert!(res.is_ok());
}
