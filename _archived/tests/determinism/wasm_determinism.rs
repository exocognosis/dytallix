use blake3::Hasher;
use dytallix_contracts::runtime::{ContractCall, ContractDeployment, ContractRuntime};

// Helper: minimal valid WASM module bytes (header only is sufficient for our runtime stubs)
fn minimal_wasm() -> Vec<u8> {
    vec![
        0x00, 0x61, 0x73, 0x6d, // \0asm
        0x01, 0x00, 0x00, 0x00, // version 1
        0x01, 0x00, // type section (empty)
        0x03, 0x00, // function section (empty)
        0x07, 0x00, // export section (empty)
        0x0a, 0x00, // code section (empty)
    ]
}

// Compute a deterministic state "root" by hashing persisted contract state bytes
async fn state_root_hex(rt: &ContractRuntime, addr: &str) -> String {
    let state = rt
        .persist_contract_state(addr)
        .expect("persist_contract_state should succeed");
    let mut h = Hasher::new();
    h.update(&state);
    format!("{:x}", h.finalize())
}

#[tokio::test]
async fn wasm_determinism_same_txset_twice() {
    // Two independent runtimes
    let rt1 = ContractRuntime::new(1_000_000, 16).expect("runtime1");
    let rt2 = ContractRuntime::new(1_000_000, 16).expect("runtime2");

    // Same deployment
    let deployment = ContractDeployment {
        address: "dyt1det_wasm".to_string(),
        code: minimal_wasm(),
        initial_state: vec![1, 2, 3],
        gas_limit: 100_000,
        deployer: "dyt1alice".to_string(),
        timestamp: 1_640_995_200,
        ai_audit_score: None,
    };

    let addr1 = rt1
        .deploy_contract(deployment.clone())
        .await
        .expect("deploy1");
    let addr2 = rt2.deploy_contract(deployment).await.expect("deploy2");
    assert_eq!(addr1, addr2);

    // Define a fixed tx set (3 identical calls)
    let txset: Vec<ContractCall> = vec![
        ContractCall {
            contract_address: addr1.clone(),
            caller: "dyt1bob".to_string(),
            method: "inc".to_string(),
            input_data: vec![0x01],
            gas_limit: 50_000,
            value: 0,
            timestamp: 1_640_995_300,
        },
        ContractCall {
            contract_address: addr1.clone(),
            caller: "dyt1bob".to_string(),
            method: "inc".to_string(),
            input_data: vec![0x02],
            gas_limit: 50_000,
            value: 0,
            timestamp: 1_640_995_301,
        },
        ContractCall {
            contract_address: addr1.clone(),
            caller: "dyt1bob".to_string(),
            method: "get".to_string(),
            input_data: vec![],
            gas_limit: 50_000,
            value: 0,
            timestamp: 1_640_995_302,
        },
    ];

    // Run on rt1
    let mut gas1: u64 = 0;
    for call in txset.iter() {
        let mut c = call.clone();
        c.contract_address = addr1.clone();
        let res = rt1.call_contract(c).await.expect("call rt1");
        gas1 = gas1.saturating_add(res.gas_used);
    }
    let state1 = state_root_hex(&rt1, &addr1).await;

    // Run the exact same tx set on rt2
    let mut gas2: u64 = 0;
    for call in txset.iter() {
        let mut c = call.clone();
        c.contract_address = addr2.clone();
        let res = rt2.call_contract(c).await.expect("call rt2");
        gas2 = gas2.saturating_add(res.gas_used);
    }
    let state2 = state_root_hex(&rt2, &addr2).await;

    // Determinism assertions
    assert_eq!(gas1, gas2, "Total gas_used must be identical");
    assert_eq!(state1, state2, "state_root must be identical");
}

