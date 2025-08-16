use dytallix_lean_node::storage::oracle::{AiRiskRecord};
use dytallix_lean_node::storage::state::Storage;
use tempfile::tempdir;

#[test]
fn oracle_store_roundtrip() {
    let dir = tempdir().unwrap();
    let store = Storage::open(dir.path().join("node.db")).unwrap();
    let rec = AiRiskRecord { tx_hash: "0xabc".into(), score: 0.55, signature: None, oracle_pubkey: None };
    store.db.put("oracle:ai:0xabc", serde_json::to_vec(&rec).unwrap()).unwrap();
    let raw = store.db.get("oracle:ai:0xabc").unwrap().unwrap();
    let got: AiRiskRecord = serde_json::from_slice(&raw).unwrap();
    assert_eq!(got.score, 0.55);
}
