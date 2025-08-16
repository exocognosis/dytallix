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
mod state;
mod storage;
mod ws;
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
        if st.balance_of("dyt1senderdev000000") == 0 {
            st.credit("dyt1senderdev000000", 1_000_000);
        }
    }

    let mempool = Arc::new(Mutex::new(Mempool::new(10_000)));
    let ws_hub = WsHub::new();
    let tps_window = Arc::new(Mutex::new(TpsWindow::new(60)));

    let ctx = RpcContext {
        storage: storage.clone(),
        mempool: mempool.clone(),
        state: state.clone(),
        ws: ws_hub.clone(),
        tps: tps_window.clone(),
    };

    // Block producer task
    let producer_ctx = ctx.clone();
    tokio::spawn(async move {
        let mut ticker = interval(Duration::from_millis(block_interval_ms));
        loop {
            ticker.tick().await;
            let snapshot = { producer_ctx.mempool.lock().unwrap().take_snapshot(max_txs) };
            if snapshot.is_empty() && !empty_blocks {
                continue;
            }
            // apply txs
            let mut receipts: Vec<TxReceipt> = vec![];
            let mut applied: Vec<storage::tx::Transaction> = vec![];
            {
                let mut st = producer_ctx.state.lock().unwrap();
                for tx in snapshot.iter() {
                    // revalidate
                    let bal = st.balance_of(&tx.from);
                    let nonce = st.nonce_of(&tx.from);
                    if nonce != tx.nonce {
                        receipts.push(TxReceipt {
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
                        });
                        continue;
                    }
                    if bal < tx.amount + tx.fee {
                        receipts.push(TxReceipt {
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
                        });
                        continue;
                    }
                    // signature placeholder
                    st.apply_transfer(&tx.from, &tx.to, tx.amount, tx.fee);
                    receipts.push(TxReceipt {
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
                    });
                    applied.push(tx.clone());
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
        .layer(Extension(ctx));
    if ws_enabled {
        app = app.route("/ws", get(ws_handler).layer(Extension(ws_hub)));
    }

    let addr: SocketAddr = "0.0.0.0:3030".parse().unwrap();
    println!("Node listening on {addr}");
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;
    Ok(())
}
