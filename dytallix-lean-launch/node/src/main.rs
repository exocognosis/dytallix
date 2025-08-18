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
    pub mod oracle;
    pub mod governance;
} // added emission and governance modules
mod state;
mod storage;
mod ws;
mod util; // added util module declaration
mod metrics; // observability module
use crate::runtime::emission::EmissionEngine;
use crate::runtime::governance::GovernanceModule;
use crate::metrics::{MetricsServer, parse_metrics_config};
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

    let ctx = RpcContext {
        storage: storage.clone(),
        mempool: mempool.clone(),
        state: state.clone(),
        ws: ws_hub.clone(),
        tps: tps_window.clone(),
        emission: Arc::new(EmissionEngine::new(storage.clone(), state.clone())),
        governance: Arc::new(Mutex::new(GovernanceModule::new(storage.clone(), state.clone()))),
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
            producer_ctx.emission.apply_until(next_height);
            let snapshot = { producer_ctx.mempool.lock().unwrap().take_snapshot(max_txs) };
            if snapshot.is_empty() && !empty_blocks {
                continue;
            }
            
            let mut total_gas_used = 0u64;
            // apply txs
            let mut receipts: Vec<TxReceipt> = vec![];
            let mut applied: Vec<storage::tx::Transaction> = vec![];
            {
                let mut st = producer_ctx.state.lock().unwrap();
                for tx in snapshot.iter() {
                    let tx_start_time = SystemTime::now();
                    
                    // revalidate
                    let bal = st.balance_of(&tx.from, "udgt");
                    let nonce = st.nonce_of(&tx.from);
                    if nonce != tx.nonce {
                        receipts.push(TxReceipt {
                            receipt_version: crate::storage::receipts::RECEIPT_FORMAT_VERSION,
                            tx_hash: tx.hash.clone(),
                            status: TxStatus::Failed,
                            block_height: None,
                            index: None,
                            from: tx.from.clone(),
                            to: tx.to.clone(),
                            amount: tx.amount,
                            fee: tx.fee,
                            nonce: tx.nonce,
                            error: Some("InvalidNonce".into()),
                            gas_used: 0,
                            gas_limit: 0,
                            gas_price: 0,
                            gas_refund: 0,
                            success: false,
                        });
                        continue;
                    }
                    if bal < tx.amount + tx.fee {
                        receipts.push(TxReceipt {
                            receipt_version: crate::storage::receipts::RECEIPT_FORMAT_VERSION,
                            tx_hash: tx.hash.clone(),
                            status: TxStatus::Failed,
                            block_height: None,
                            index: None,
                            from: tx.from.clone(),
                            to: tx.to.clone(),
                            amount: tx.amount,
                            fee: tx.fee,
                            nonce: tx.nonce,
                            error: Some("InsufficientBalance".into()),
                            gas_used: 0,
                            gas_limit: 0,
                            gas_price: 0,
                            gas_refund: 0,
                            success: false,
                        });
                        continue;
                    }
                    // signature placeholder
                    st.apply_transfer(&tx.from, &tx.to, "udgt", tx.amount, "udgt", tx.fee);
                    
                    // Gas calculation (simplified - using fee as gas proxy)
                    let gas_used = tx.fee as u64; // Convert to u64 for compatibility
                    total_gas_used += gas_used;
                    
                    receipts.push(TxReceipt {
                        receipt_version: crate::storage::receipts::RECEIPT_FORMAT_VERSION,
                        tx_hash: tx.hash.clone(),
                        status: TxStatus::Success,
                        block_height: None,
                        index: None,
                        from: tx.from.clone(),
                        to: tx.to.clone(),
                        amount: tx.amount,
                        fee: tx.fee,
                        nonce: tx.nonce,
                        error: None,
                        gas_used: gas_used,
                        gas_limit: gas_used, // Simplified
                        gas_price: 1, // Simplified
                        gas_refund: 0,
                        success: true,
                    });
                    applied.push(tx.clone());
                    
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
                    block_processing_time
                );
            }
            producer_ctx.metrics.update_current_block_gas(total_gas_used);
            
            // Update emission pool metrics
            let emission_snapshot = producer_ctx.emission.snapshot();
            let total_emission_pool: u128 = emission_snapshot.pools.values().sum();
            producer_ctx.metrics.update_emission_pool(total_emission_pool as f64);
            
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
        .route("/oracle/ai_risk_batch", post(rpc::oracle::submit_ai_risk_batch))
        .route("/oracle/ai_risk_query_batch", post(rpc::oracle::get_ai_risk_batch))
        .route("/oracle/stats", get(rpc::oracle::oracle_stats))
        .route("/bridge/ingest", post(rpc::bridge_ingest))
        .route("/bridge/halt", post(rpc::bridge_halt))
        .route("/bridge/state", get(rpc::bridge_state))
        .route("/emission/claim", post(rpc::emission_claim))
        .route("/gov/submit", post(rpc::gov_submit_proposal))
        .route("/gov/deposit", post(rpc::gov_deposit))
        .route("/gov/vote", post(rpc::gov_vote))
        .route("/gov/proposal/:id", get(rpc::gov_get_proposal))
        .route("/gov/tally/:id", get(rpc::gov_tally))
        .route("/gov/config", get(rpc::gov_get_config))
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

    let addr: SocketAddr = "0.0.0.0:3030".parse().unwrap();
    println!("Node listening on {addr}");
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;
    Ok(())
}
