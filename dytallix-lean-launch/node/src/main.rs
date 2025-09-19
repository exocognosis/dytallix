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

// Replace crate:: module imports with library crate path so binary can access lib modules
use dytallix_lean_node::alerts::{load_alerts_config, AlertsEngine, NodeMetricsGatherer};
use dytallix_lean_node::execution::execute_transaction;
use dytallix_lean_node::gas::GasSchedule;
use dytallix_lean_node::mempool::Mempool;
use dytallix_lean_node::metrics::{parse_metrics_config, MetricsServer};
use dytallix_lean_node::rpc::{self, RpcContext};
use dytallix_lean_node::runtime::bridge; // import bridge module for validator init
use dytallix_lean_node::runtime::emission::EmissionEngine;
use dytallix_lean_node::runtime::governance::GovernanceModule;
use dytallix_lean_node::runtime::staking::StakingModule;
use dytallix_lean_node::state::State;
use dytallix_lean_node::storage::{
    blocks::{Block, TpsWindow},
    receipts::{TxReceipt, TxStatus},
    state::Storage,
};
use dytallix_lean_node::ws::server::{ws_handler, WsHub};
use dytallix_lean_node::secrets; // validator key providers (Vault / sealed keystore)
use std::sync::atomic::Ordering;

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
    let storage = Arc::new(Storage::open(PathBuf::from(format!("{data_dir}/node.db")))?);
    // Chain ID persistence
    if let Some(stored) = storage.get_chain_id() {
        if stored != chain_id {
            eprintln!("Chain ID mismatch stored={stored} env={chain_id}");
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

    let mempool = Arc::new(Mutex::new(Mempool::new()));
    let ws_hub = WsHub::new();
    let tps_window = Arc::new(Mutex::new(TpsWindow::new(60)));

    // Decide and log secrets mode (without leaking secrets)
    let vault_url = std::env::var("DYTALLIX_VAULT_URL")
        .ok()
        .or_else(|| std::env::var("VAULT_URL").ok());
    let vault_token_present = std::env::var("DYTALLIX_VAULT_TOKEN").is_ok()
        || std::env::var("VAULT_TOKEN").is_ok();
    if let (Some(url), true) = (vault_url.clone(), vault_token_present) {
        let mount = std::env::var("DYTALLIX_VAULT_KV_MOUNT").unwrap_or_else(|_| "secret".to_string());
        let base = std::env::var("DYTALLIX_VAULT_PATH_BASE")
            .unwrap_or_else(|_| "dytallix/validators".to_string());
        // Redact token; show only host portion of URL
        let host = url
            .split("//")
            .nth(1)
            .unwrap_or(&url)
            .split('/')
            .next()
            .unwrap_or(&url);
        println!(
            "Secrets mode: Vault (KV v2) url_host={host} mount={mount} base={base}"
        );
    } else {
        let dir = std::env::var("DYT_KEYSTORE_DIR").unwrap_or_else(|_| {
            let home = std::env::var("HOME").unwrap_or_else(|_| ".".into());
            format!("{home}/.dytallix/keystore")
        });
        println!(
            "Secrets mode: Plain Keystore (dev) path={dir} — no passphrase required"
        );
    }

    // Load validator private key securely (Vault preferred, sealed keystore fallback)
    match secrets::init_validator_key().await {
        Ok(Some(len)) => {
            println!("Validator key loaded ({len} bytes) via secure provider");
        }
        Ok(None) => {
            println!("No validator key configured; running without signing capability");
        }
        Err(e) => {
            eprintln!("Validator key initialization failed: {e}");
            // Non-fatal in dev; fatal in production if VAULT is set but failing
            if std::env::var("DYTALLIX_VAULT_URL").is_ok() || std::env::var("VAULT_URL").is_ok() {
                std::process::exit(1);
            }
        }
    }

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

    // Runtime feature flags (default disabled)
    let enable_governance = std::env::var("DYT_ENABLE_GOVERNANCE")
        .map(|v| v == "1" || v.to_lowercase() == "true")
        .unwrap_or(false);
    let enable_staking = std::env::var("DYT_ENABLE_STAKING")
        .map(|v| v == "1" || v.to_lowercase() == "true")
        .unwrap_or(false);

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
        staking: staking_module.clone(),
        metrics: metrics.clone(),
        features: dytallix_lean_node::rpc::FeatureFlags {
            governance: enable_governance,
            staking: enable_staking,
        },
        wasm_contracts: Arc::new(Mutex::new(std::collections::HashMap::new())),
        #[cfg(feature = "contracts")]
        wasm_runtime: Arc::new(dytallix_lean_node::runtime::wasm::WasmRuntime::new()),
    };

    // Initialize bridge validators if provided
    bridge::ensure_bridge_validators(&storage.db).ok();

    // Block producer task
    let producer_ctx = ctx.clone();
    tokio::spawn(async move {
        let mut ticker = interval(Duration::from_millis(block_interval_ms));
        loop {
            ticker.tick().await;
            // Allow ops to pause block production to simulate stalls
            if dytallix_lean_node::rpc::PAUSE_PRODUCER.load(Ordering::Relaxed) {
                continue;
            }
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

            // Apply staking rewards from emission (only if staking enabled)
            if producer_ctx.features.staking {
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
            }
            let snapshot = { producer_ctx.mempool.lock().unwrap().take_snapshot(max_txs) };
            if snapshot.is_empty() && !empty_blocks {
                continue;
            }

            let mut total_gas_used = 0u64;
            let gas_schedule = GasSchedule::default();

            // Execute transactions using deterministic execution engine
            let mut receipts: Vec<TxReceipt> = vec![];
            let mut applied: Vec<dytallix_lean_node::storage::tx::Transaction> = vec![];
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
            let emission_snapshot = producer_ctx.emission.lock().unwrap().snapshot();
            let total_emission_pool: u128 = emission_snapshot.pools.values().sum();
            producer_ctx
                .metrics
                .update_emission_pool(total_emission_pool as f64);
            // Update emissions ops metrics (height, pending uDRT total, last apply ts)
            let now_ts = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_else(|_| Duration::from_secs(0))
                .as_secs();
            producer_ctx.metrics.update_emission_apply(
                emission_snapshot.height,
                total_emission_pool,
                now_ts,
            );

            // Process governance end block if feature enabled
            if producer_ctx.features.governance {
                if let Err(e) = producer_ctx.governance.lock().unwrap().end_block(height) {
                    eprintln!("Governance end_block error at height {height}: {e}");
                }
                // Clear governance events after processing
                producer_ctx.governance.lock().unwrap().clear_events();
            }

            producer_ctx
                .tps
                .lock()
                .unwrap()
                .record_block(ts, block.txs.len() as u32);
            // Update TPS gauge when metrics are enabled
            #[cfg(feature = "metrics")]
            {
                let now = SystemTime::now()
                    .duration_since(UNIX_EPOCH)
                    .unwrap_or_else(|_| Duration::from_secs(0))
                    .as_secs();
                let tps = producer_ctx.tps.lock().unwrap().rolling_tps(now);
                producer_ctx.metrics.dyt_tps.set(tps);
                producer_ctx.metrics.tps.set(tps);
            }
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
        .route("/transactions/submit", post(rpc::submit)) // Standard endpoint path
        .route("/blocks", get(rpc::list_blocks))
        .route("/block/:id", get(rpc::get_block))
        .route("/balance/:addr", get(rpc::get_balance))
        .route("/account/:addr", get(rpc::get_account))
        .route("/tx/:hash", get(rpc::get_tx))
        .route("/transactions/:hash", get(rpc::get_tx)) // Standard endpoint path
        // Minimal JSON-RPC endpoint used by the dashboard server for WASM demos
        .route("/rpc", post(rpc::json_rpc))
        // AI risk utility routes
        .route("/ai/score", post(rpc::ai::ai_score))
        .route("/ai/risk/:hash", get(rpc::ai::ai_risk_get))
        .route("/ai/latency", get(rpc::ai::ai_latency))
        .route("/metrics", get(rpc::metrics_export))
        .route("/stats", get(rpc::stats))
        .route("/status", get(rpc::status))
        .route("/peers", get(rpc::peers))
        .route("/bridge/ingest", post(rpc::bridge_ingest))
        .route("/bridge/halt", post(rpc::bridge_halt))
        .route("/bridge/state", get(rpc::bridge_state))
        .route("/emission/claim", post(rpc::emission_claim))
        .route("/api/rewards", get(rpc::get_rewards))
        .route("/api/rewards/:height", get(rpc::get_rewards_by_height))
        .route("/api/stats", get(rpc::stats_with_emission))
        .route("/api/contracts", get(rpc::list_contracts))
        // Dev faucet (credits balances directly; for local E2E only)
        .route("/dev/faucet", post(rpc::dev_faucet))
        // Ops simulation endpoints (pause/resume producer)
        .route("/ops/pause", post(rpc::ops_pause))
        .route("/ops/resume", post(rpc::ops_resume));

    // WASM contract routes
    #[cfg(feature = "contracts")]
    {
        app = app
            .route("/contracts/deploy", post(rpc::contracts_deploy))
            .route("/contracts/call", post(rpc::contracts_call))
            .route("/contracts/state/:contract_address/:key", get(rpc::contracts_state));
    }

    // Oracle routes
    #[cfg(feature = "oracle")]
    {
        app = app
            .route("/oracle/ai_risk", post(rpc::oracle::submit_ai_risk))
            .route(
                "/oracle/ai_risk_batch",
                post(rpc::oracle::submit_ai_risk_batch),
            )
            .route(
                "/oracle/ai_risk_query_batch",
                post(rpc::oracle::get_ai_risk_batch),
            )
            .route("/oracle/stats", get(rpc::oracle::oracle_stats));
    }

    // Governance routes (always exposed; tx endpoints return 501 if disabled)
    app = app
        .route("/gov/submit", post(rpc::gov_submit_proposal))
        .route("/gov/deposit", post(rpc::gov_deposit))
        .route("/gov/vote", post(rpc::gov_vote))
        .route("/gov/execute", post(rpc::gov_execute))
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
        );

    // Staking routes (always exposed; tx endpoints return 501 if disabled)
    app = app
        .route("/api/staking/claim", post(rpc::staking_claim))
        .route("/api/staking/delegate", post(rpc::staking_delegate))
        .route("/api/staking/undelegate", post(rpc::staking_undelegate))
        .route(
            "/api/staking/accrued/:address",
            get(rpc::staking_get_accrued),
        )
        .route(
            "/api/staking/balance/:delegator",
            get(rpc::staking_get_balance),
        );

    app = app.layer(Extension(ctx));
    if ws_enabled {
        app = app.route("/ws", get(ws_handler).layer(Extension(ws_hub)));
    }

    // Start metrics server if enabled
    if metrics_config.enabled {
        let metrics_server_task = tokio::spawn(async move {
            if let Err(e) = metrics_server.start().await {
                eprintln!("Metrics server error: {e}");
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
                eprintln!("Alerts engine error: {e}");
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
