use axum::{
    routing::{get, post},
    Extension, Router,
};
use dotenv::dotenv;
use serde_json::json;
use std::{
    net::SocketAddr,
    path::PathBuf,
    sync::{Arc, Mutex},
    time::{Duration, SystemTime, UNIX_EPOCH},
};
use tokio::time::interval;

mod mempool;
mod rpc;
mod runtime {
    pub mod bridge;
    pub mod emission;
    pub mod governance;
    pub mod oracle;
    pub mod staking;
} // added emission, governance, and staking modules
mod alerts; // alerting subsystem
mod execution;
mod gas; // gas accounting system
mod metrics; // observability module
mod state;
mod storage;
mod util; // added util module declaration
mod ws; // deterministic execution engine
use crate::alerts::{load_alerts_config, AlertsEngine, NodeMetricsGatherer};
use crate::execution::execute_transaction;
use crate::gas::GasSchedule;
use crate::metrics::{parse_metrics_config, MetricsServer};
use crate::runtime::emission::EmissionEngine;
use crate::runtime::governance::GovernanceModule;
use crate::runtime::staking::StakingModule;
use mempool::Mempool;
use rpc::RpcContext;
use state::State;
use storage::{
    blocks::{Block, TpsWindow},
    receipts::{TxReceipt, TxStatus},
    state::Storage,
};
use ws::server::{ws_handler, WsHub};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenv().ok();
    let data_dir = std::env::var("DYT_DATA_DIR").unwrap_or("./data".to_string());
    let block_interval_ms: u64 = std::env::var("DYT_BLOCK_INTERVAL_MS")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(2000);
    let empty_blocks = std::env::var("DYT_EMPTY_BLOCKS")
        .map(|v| v == "true" || v == "1")
        .unwrap_or(true);
    let max_txs: usize = std::env::var("BLOCK_MAX_TX")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(100);
    let ws_enabled = std::env::var("DYT_WS_ENABLED")
        .map(|v| v == "true" || v == "1")
        .unwrap_or(true);
    let chain_id = std::env::var("DYT_CHAIN_ID").unwrap_or("dyt-local-1".to_string());

    std::fs::create_dir_all(&data_dir)?;
    let storage = Arc::new(Storage::open(PathBuf::from(format!(
        "{}/node.db",
        data_dir
    )))?);
    // Chain ID persistence
    if let Some(stored) = storage.get_chain_id() {
        if stored != chain_id {
            eprintln!("Chain ID mismatch stored={} env={}", stored, chain_id);
            std::process::exit(1);
        }
    } else {
        storage.set_chain_id(&chain_id)?;
    }
    let state = Arc::new(Mutex::new(State::new(storage.clone())));
    // Prefund dev faucet account if not already
    {
        let mut st = state.lock().unwrap();
        if st.balance_of("dyt1senderdev000000", "udgt") == 0 {
            st.credit("dyt1senderdev000000", "udgt", 1_000_000);
        }
    }

    let mempool = Arc::new(Mutex::new(Mempool::new(10_000)));
    let ws_hub = WsHub::new();
    let tps_window = Arc::new(Mutex::new(TpsWindow::new(60)));

    // Initialize metrics
    let metrics_config = parse_metrics_config();
    let (metrics_server, metrics) = MetricsServer::new(metrics_config.clone())?;

    // Initialize alerting system
    let alerts_config_path =
        std::env::var("DYT_ALERTS_CONFIG").unwrap_or_else(|_| "./configs/alerts.yaml".to_string());
    let alerts_config = load_alerts_config(std::path::Path::new(&alerts_config_path))?;

    #[cfg(feature = "metrics")]
    let mut alerts_engine = {
        // Create a dummy registry for now - in a real implementation this would be shared
        let alerts_registry = prometheus::Registry::new();
        AlertsEngine::new(alerts_config.clone(), &alerts_registry)?
    };

    #[cfg(not(feature = "metrics"))]
    let mut alerts_engine = AlertsEngine::new(alerts_config.clone())?;

    let staking_module = Arc::new(Mutex::new(StakingModule::new(storage.clone())));

    let ctx = RpcContext {
        storage: storage.clone(),
        mempool: mempool.clone(),
        state: state.clone(),
        ws: ws_hub.clone(),
        tps: tps_window.clone(),
        emission: Arc::new(Mutex::new(EmissionEngine::new(
            storage.clone(),
            state.clone(),
        ))),
        governance: Arc::new(Mutex::new(GovernanceModule::new(
            storage.clone(),
            state.clone(),
            staking_module.clone(),
        ))),
        staking: staking_module,
        metrics: metrics.clone(),
    };

    // Initialize bridge validators if provided
    runtime::bridge::ensure_bridge_validators(&storage.db).ok();

    // Block producer task
    let producer_ctx = ctx.clone();
    tokio::spawn(async move {
        let mut ticker = interval(Duration::from_millis(block_interval_ms));
        loop {
            ticker.tick().await;
            let block_start_time = SystemTime::now();

            // Update mempool size metric
            let mempool_size = { producer_ctx.mempool.lock().unwrap().len() };
            producer_ctx.metrics.update_mempool_size(mempool_size);

            // advance emission pools to new height (height+1)
            let next_height = producer_ctx.storage.height() + 1;
            producer_ctx
                .emission
                .lock()
                .unwrap()
                .apply_until(next_height);

            // Apply staking rewards from emission
            let staking_rewards = producer_ctx
                .emission
                .lock()
                .unwrap()
                .get_latest_staking_rewards();
            if staking_rewards > 0 {
                producer_ctx
                    .staking
                    .lock()
                    .unwrap()
                    .apply_external_emission(staking_rewards);
            }
            let snapshot = { producer_ctx.mempool.lock().unwrap().take_snapshot(max_txs) };
            if snapshot.is_empty() && !empty_blocks {
                continue;
            }

            let mut total_gas_used = 0u64;
            let gas_schedule = GasSchedule::default();

            // Execute transactions using deterministic execution engine
            let mut receipts: Vec<TxReceipt> = vec![];
            let mut applied: Vec<storage::tx::Transaction> = vec![];
            {
                let mut st = producer_ctx.state.lock().unwrap();
                for (tx_index, tx) in snapshot.iter().enumerate() {
                    let tx_start_time = SystemTime::now();

                    // Use deterministic execution engine
                    let result = execute_transaction(
                        tx,
                        &mut st,
                        next_height,
                        tx_index as u32,
                        &gas_schedule,
                    );

                    total_gas_used += result.gas_used;
                    receipts.push(result.receipt);

                    // Only include successful transactions in the block
                    if result.success {
                        applied.push(tx.clone());
                    }

                    // Record transaction processing time
                    if let Ok(elapsed) = tx_start_time.elapsed() {
                        producer_ctx.metrics.record_transaction(elapsed);
                    }
                }
            }
            // build block (include only successful txs)
            let height = producer_ctx.storage.height() + 1;
            let parent = producer_ctx.storage.best_hash();
            let ts = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_secs();
            let success_txs: Vec<_> = applied.into_iter().collect();
            if success_txs.is_empty() && !empty_blocks {
                // skip emission if no success and empty blocks disabled
                // remove failed ones from mempool anyway
                producer_ctx
                    .mempool
                    .lock()
                    .unwrap()
                    .drop_hashes(&snapshot.iter().map(|t| t.hash.clone()).collect::<Vec<_>>());
                for r in receipts {
                    let _ = producer_ctx.storage.put_pending_receipt(&r);
                }
                continue;
            }
            let block = Block::new(height, parent, ts, success_txs.clone());
            for (idx, r) in receipts.iter_mut().enumerate() {
                if r.status == TxStatus::Success {
                    r.block_height = Some(height);
                    r.index = Some(idx as u32);
                }
            }
            let _ = producer_ctx.storage.put_block(&block, &receipts);

            // Record metrics
            if let Ok(block_processing_time) = block_start_time.elapsed() {
                producer_ctx.metrics.record_block(
                    height,
                    success_txs.len(),
                    total_gas_used,
                    block_processing_time,
                );
            }
            producer_ctx
                .metrics
                .update_current_block_gas(total_gas_used);

            // Update emission pool metrics
            let emission_snapshot = producer_ctx.emission.snapshot();
            let total_emission_pool: u128 = emission_snapshot.pools.values().sum();
            producer_ctx
                .metrics
                .update_emission_pool(total_emission_pool as f64);

            // Process governance end block
            if let Err(e) = producer_ctx.governance.lock().unwrap().end_block(height) {
                eprintln!("Governance end_block error at height {}: {}", height, e);
            }

            producer_ctx
                .tps
                .lock()
                .unwrap()
                .record_block(ts, block.txs.len() as u32);
            // remove considered hashes
            producer_ctx
                .mempool
                .lock()
                .unwrap()
                .drop_hashes(&snapshot.iter().map(|t| t.hash.clone()).collect::<Vec<_>>());
            if ws_enabled {
                producer_ctx.ws.broadcast_json(&json!({"type":"new_block","height": block.header.height, "hash": block.hash, "txs": block.txs.iter().map(|t| &t.hash).collect::<Vec<_>>() }));
            }
            println!(
                "produced block height={} tx_total={} successes={}",
                block.header.height,
                snapshot.len(),
                block.txs.len()
            );
        }
    });

    // Router
    let mut app = Router::new()
        .route("/submit", post(rpc::submit))
        .route("/blocks", get(rpc::list_blocks))
        .route("/block/:id", get(rpc::get_block))
        .route("/balance/:addr", get(rpc::get_balance))
        .route("/tx/:hash", get(rpc::get_tx))
        .route("/stats", get(rpc::stats))
        .route("/peers", get(rpc::peers))
        .route("/oracle/ai_risk", post(rpc::oracle::submit_ai_risk))
        .route(
            "/oracle/ai_risk_batch",
            post(rpc::oracle::submit_ai_risk_batch),
        )
        .route(
            "/oracle/ai_risk_query_batch",
            post(rpc::oracle::get_ai_risk_batch),
        )
        .route("/oracle/stats", get(rpc::oracle::oracle_stats))
        .route("/bridge/ingest", post(rpc::bridge_ingest))
        .route("/bridge/halt", post(rpc::bridge_halt))
        .route("/bridge/state", get(rpc::bridge_state))
        .route("/emission/claim", post(rpc::emission_claim))
        .route("/api/rewards", get(rpc::get_rewards))
        .route("/api/rewards/:height", get(rpc::get_rewards_by_height))
        .route("/api/stats", get(rpc::stats_with_emission))
        .route("/gov/submit", post(rpc::gov_submit_proposal))
        .route("/gov/deposit", post(rpc::gov_deposit))
        .route("/gov/vote", post(rpc::gov_vote))
        .route("/gov/proposal/:id", get(rpc::gov_get_proposal))
        .route("/gov/tally/:id", get(rpc::gov_tally))
        .route("/gov/config", get(rpc::gov_get_config))
        .route("/api/governance/proposals", get(rpc::gov_list_proposals))
        .route(
            "/api/governance/proposals/:id/votes",
            get(rpc::gov_get_proposal_votes),
        )
        .route(
            "/api/governance/voting-power/:address",
            get(rpc::gov_get_voting_power),
        )
        .route(
            "/api/governance/total-voting-power",
            get(rpc::gov_get_total_voting_power),
        )
        .route("/api/staking/claim", post(rpc::staking_claim))
        .route(
            "/api/staking/accrued/:address",
            get(rpc::staking_get_accrued),
        )
        .layer(Extension(ctx));
    if ws_enabled {
        app = app.route("/ws", get(ws_handler).layer(Extension(ws_hub)));
    }

    // Start metrics server if enabled
    if metrics_config.enabled {
        let metrics_server_task = tokio::spawn(async move {
            if let Err(e) = metrics_server.start().await {
                eprintln!("Metrics server error: {}", e);
            }
        });

        // Don't wait for metrics server, let it run in background
        std::mem::forget(metrics_server_task);
    }

    // Start alerts engine if enabled
    if alerts_config.enabled {
        let metrics_gatherer = Arc::new(NodeMetricsGatherer::new(tps_window.clone()));
        let alerts_task = tokio::spawn(async move {
            if let Err(e) = alerts_engine.start(metrics_gatherer).await {
                eprintln!("Alerts engine error: {}", e);
            }
        });

        // Don't wait for alerts engine, let it run in background
        std::mem::forget(alerts_task);
    }

    let addr: SocketAddr = "0.0.0.0:3030".parse().unwrap();
    println!("Node listening on {addr}");
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;
    Ok(())
}
