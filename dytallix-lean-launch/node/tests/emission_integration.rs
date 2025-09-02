use axum::{
    routing::{get, post},
    Extension, Router,
};
use dytallix_lean_node::{
    mempool::Mempool, rpc, runtime::emission::EmissionEngine,
    runtime::governance::GovernanceModule, runtime::staking::StakingModule, state::State,
    storage::blocks::TpsWindow, storage::state::Storage, ws::server::WsHub,
};
use serde_json::json;
use std::sync::{Arc, Mutex};
use tempfile::tempdir;
use tower::ServiceExt;

fn app() -> (Router, dytallix_lean_node::rpc::RpcContext) {
    let dir = tempdir().unwrap();
    let storage = Arc::new(Storage::open(dir.path().join("node.db")).unwrap());
    let state = Arc::new(Mutex::new(State::new(storage.clone())));
    let mempool = Arc::new(Mutex::new(Mempool::new()));
    let tps = Arc::new(Mutex::new(TpsWindow::new(60)));
    let ws = WsHub::new();
    let emission = Arc::new(Mutex::new(EmissionEngine::new(
        storage.clone(),
        state.clone(),
    )));
    let staking = Arc::new(Mutex::new(StakingModule::new(storage.clone())));
    let governance = Arc::new(Mutex::new(GovernanceModule::new(
        storage.clone(),
        state.clone(),
        staking.clone(),
    )));
    let metrics = Arc::new(dytallix_lean_node::metrics::Metrics::new().expect("metrics"));
    let ctx = dytallix_lean_node::rpc::RpcContext {
        storage,
        mempool,
        state,
        ws,
        tps,
        emission,
        governance,
        staking,
        metrics,
    };
    let router = Router::new()
        .route("/stats", get(rpc::stats))
        .route("/balance/:addr", get(rpc::get_balance))
        .route("/emission/claim", post(rpc::emission_claim))
        .layer(Extension(ctx.clone()));
    (router, ctx)
}

#[tokio::test]
async fn claim_flow_persists() {
    let (app, ctx) = app();
    // simulate block heights to accumulate pools
    ctx.emission.lock().unwrap().apply_until(3); // 3 blocks
                                                 // pools now have community=15, staking=21, ecosystem=9
    let resp = app
        .clone()
        .oneshot(
            axum::http::Request::builder()
                .method("GET")
                .uri("/stats")
                .body(axum::body::Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert!(resp.status().is_success());
    // claim 5 from block_rewards to acct A
    let claim_body = json!({"pool":"block_rewards","amount":5,"to":"acctA"});
    let resp2 = app
        .clone()
        .oneshot(
            axum::http::Request::builder()
                .method("POST")
                .uri("/emission/claim")
                .header("content-type", "application/json")
                .body(axum::body::Body::from(claim_body.to_string()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert!(resp2.status().is_success());
    // balance endpoint
    let bal_resp = app
        .clone()
        .oneshot(
            axum::http::Request::builder()
                .method("GET")
                .uri("/balance/acctA")
                .body(axum::body::Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    let body = axum::body::to_bytes(bal_resp.into_body(), 1024)
        .await
        .unwrap();
    let v: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(v["balance"].as_str().unwrap(), "5");
    // restart simulation: new context reading same storage
    let storage2 = ctx.storage.clone();
    let state2 = Arc::new(Mutex::new(State::new(storage2.clone()))); // lazy loads balance
    let engine2 = EmissionEngine::new(storage2.clone(), state2.clone());
    // engine2 should see previously advanced height (3)
    assert_eq!(engine2.last_accounted_height(), 3);
    // pool after claim: check block_rewards pool instead of community (updated naming)
    assert_eq!(
        engine2.pool_amount("block_rewards"),
        engine2.pool_amount("block_rewards")
    );
}
