use crate::crypto::PQCManager;
use bytes; // add bytes crate usage
use futures_util::{SinkExt, StreamExt};
use log::{error, info, warn};
use once_cell::sync::Lazy;
use rand;
use regex::Regex;
use serde::{Deserialize, Serialize};
use serde_json;
use std::sync::Arc;
use tokio::sync::broadcast;
use tokio_tungstenite::{accept_async, tungstenite::Message};
use warp::reply::Reply;
use warp::Filter; // ensure accessible

#[derive(Debug, Deserialize)]
struct TransferRequest {
    from: String,
    to: String,
    amount: u64,
    fee: Option<u64>,
    nonce: Option<u64>,
    signature: Option<TransferSignature>,
}

#[derive(Debug, Deserialize)]
struct TransferSignature {
    algorithm: String,
    public_key: String,
    data: String,
}

#[derive(Debug, Serialize)]
struct ApiResponse<T> {
    success: bool,
    data: Option<T>,
    error: Option<String>,
}

#[derive(Debug, Serialize)]
struct BlockchainStats {
    current_block: u64,
    total_transactions: usize,
    network_peers: usize,
    mempool_size: usize,
}

#[derive(Debug, Serialize)]
struct BlockInfo {
    number: u64,
    hash: String,
    parent_hash: String,
    timestamp: u64,
    transactions: Vec<String>,
    size: usize,
    gas_used: u64,
    gas_limit: u64,
}

#[derive(Debug, Serialize)]
struct PeerInfo {
    id: String,
    address: String,
    status: String,
    last_seen: u64,
    block_height: u64,
    protocol_version: String,
}

#[derive(Debug, Serialize)]
struct SystemStatus {
    version: String,
    uptime: u64,
    block_height: u64,
    peer_count: usize,
    mempool_size: usize,
    sync_status: String,
    chain_id: String,
}

#[derive(Debug, Serialize, Clone)]
struct WebSocketMessage {
    message_type: String,
    timestamp: u64,
    data: serde_json::Value,
}

impl WebSocketMessage {
    fn new_block(block: &BlockInfo) -> Self {
        Self {
            message_type: "new_block".to_string(),
            timestamp: chrono::Utc::now().timestamp() as u64,
            data: serde_json::to_value(block).unwrap_or_default(),
        }
    }

    fn new_transaction(tx: &TransactionDetails) -> Self {
        Self {
            message_type: "new_transaction".to_string(),
            timestamp: chrono::Utc::now().timestamp() as u64,
            data: serde_json::to_value(tx).unwrap_or_default(),
        }
    }

    fn status_update(status: &SystemStatus) -> Self {
        Self {
            message_type: "status_update".to_string(),
            timestamp: chrono::Utc::now().timestamp() as u64,
            data: serde_json::to_value(status).unwrap_or_default(),
        }
    }
}

#[derive(Debug, Serialize)]
struct TransactionResponse {
    hash: String,
    status: String,
    block_number: Option<u64>,
}

#[derive(Debug, Serialize)]
struct TransactionDetails {
    hash: String,
    from: String,
    to: String,
    amount: u64,
    fee: u64,
    nonce: u64,
    status: String,
    block_number: Option<u64>,
    timestamp: u64,
    confirmations: u64,
}

#[derive(Debug, Serialize)]
struct ErrorResponse {
    error: String,
    message: String,
}

impl<T> ApiResponse<T> {
    fn success(data: T) -> Self {
        Self {
            success: true,
            data: Some(data),
            error: None,
        }
    }

    fn error(message: String) -> Self {
        Self {
            success: false,
            data: None,
            error: Some(message),
        }
    }
}

// Address validation regex (dyt1 + 10+ lowercase alphanumerics)
static ADDRESS_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"^dyt1[0-9a-z]{10,}$").unwrap());
const MIN_FEE: u64 = 1;
const MAX_TX_BODY: usize = 8192;

fn runtime_mocks() -> bool {
    std::env::var("RUNTIME_MOCKS")
        .map(|v| v == "true" || v == "1")
        .unwrap_or(false)
}

// Temporarily implementing basic API server for testing
pub async fn start_api_server() -> Result<(), Box<dyn std::error::Error>> {
    info!("Initializing Dytallix API server...");
    // Create broadcast channel for WebSocket messages
    let (ws_tx, _) = broadcast::channel::<WebSocketMessage>(1000);
    let ws_tx = Arc::new(ws_tx);

    // Shared state placeholders (TODO: wire real storage & pools)
    let storage = Arc::new(crate::storage::StorageManager::new().await?);
    let tx_pool = Arc::new(crate::types::TransactionPool::new(10_000));

    // Simulate events only if mocks enabled
    if runtime_mocks() {
        let ws_tx_clone = ws_tx.clone();
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(30));
            let mut block_height = 1u64;
            loop {
                interval.tick().await;
                let block = BlockInfo {
                    number: block_height,
                    hash: format!("0x{:064x}", rand::random::<u64>()),
                    parent_hash: format!("0x{:064x}", rand::random::<u64>()),
                    timestamp: chrono::Utc::now().timestamp() as u64,
                    transactions: vec![],
                    size: 0,
                    gas_used: 0,
                    gas_limit: 0,
                };
                let _ = ws_tx_clone.send(WebSocketMessage::new_block(&block));
                block_height += 1;
            }
        });
    }

    // WebSocket endpoint
    let ws_tx_root = ws_tx.clone();
    let websocket = warp::path("ws")
        .and(warp::ws())
        .and(warp::any().map(move || ws_tx_root.clone()))
        .map(
            |ws: warp::ws::Ws, ws_tx: Arc<broadcast::Sender<WebSocketMessage>>| {
                ws.on_upgrade(move |websocket| handle_websocket(websocket, ws_tx))
            },
        );

    // Peers route (returns empty list until networking integrated)
    let peers = warp::path("peers")
        .and(warp::get())
        .map(|| {
            warp::reply::with_status(
                warp::reply::json(&ApiResponse::success(Vec::<String>::new())),
                warp::http::StatusCode::OK,
            )
            .into_response()
        })
        .boxed();

    // Health
    let health = warp::path("health")
        .and(warp::get())
        .map(|| {
            warp::reply::with_status(
                warp::reply::json(&serde_json::json!({"status":"ok","service":"dytallix-node"})),
                warp::http::StatusCode::OK,
            )
            .into_response()
        })
        .boxed();

    // Balance (state-backed)
    let storage_balance = storage.clone();
    let balance = warp::path("balance")
        .and(warp::path::param::<String>())
        .and(warp::get())
        .and(warp::any().map(move || storage_balance.clone()))
        .and_then(
            |address: String, storage: Arc<crate::storage::StorageManager>| async move {
                if !ADDRESS_RE.is_match(&address) {
                    return Ok::<_, warp::Rejection>(
                        warp::reply::with_status(
                            warp::reply::json(&ApiResponse::<()> {
                                success: false,
                                data: None,
                                error: Some("invalid_address".into()),
                            }),
                            warp::http::StatusCode::BAD_REQUEST,
                        )
                        .into_response(),
                    );
                }
                match storage.get_address_balance(&address).await {
                    Ok(bal) => Ok(warp::reply::with_status(
                        warp::reply::json(&ApiResponse::success(bal)),
                        warp::http::StatusCode::OK,
                    )
                    .into_response()),
                    Err(e) => {
                        error!("balance error: {}", e);
                        Ok(warp::reply::with_status(
                            warp::reply::json(&ApiResponse::<()> {
                                success: false,
                                data: None,
                                error: Some("internal_error".into()),
                            }),
                            warp::http::StatusCode::INTERNAL_SERVER_ERROR,
                        )
                        .into_response())
                    }
                }
            },
        )
        .boxed();

    // Submit TX (transfer only for MV(T))
    let storage_submit = storage.clone();
    let tx_pool_submit = tx_pool.clone();
    let ws_tx_submit = ws_tx.clone();
    let submit_tx = warp::path("submit")
        .and(warp::post())
        .and(warp::header::optional::<String>("content-length"))
        .and(warp::body::bytes())
        .and(warp::any().map(move || {
            (
                storage_submit.clone(),
                tx_pool_submit.clone(),
                ws_tx_submit.clone(),
            )
        }))
        .and_then(
            |content_length: Option<String>,
             body: bytes::Bytes,
             ctx: (
                Arc<crate::storage::StorageManager>,
                Arc<crate::types::TransactionPool>,
                Arc<broadcast::Sender<WebSocketMessage>>,
            )| async move {
                if let Some(len_str) = content_length {
                    if let Ok(len) = len_str.parse::<usize>() {
                        if len > MAX_TX_BODY {
                            return Ok::<_, warp::Rejection>(
                                warp::reply::with_status(
                                    warp::reply::json(&ApiResponse::<()> {
                                        success: false,
                                        data: None,
                                        error: Some("invalid_body".into()),
                                    }),
                                    warp::http::StatusCode::PAYLOAD_TOO_LARGE,
                                )
                                .into_response(),
                            );
                        }
                    }
                }
                if body.len() > MAX_TX_BODY {
                    return Ok(warp::reply::with_status(
                        warp::reply::json(&ApiResponse::<()> {
                            success: false,
                            data: None,
                            error: Some("invalid_body".into()),
                        }),
                        warp::http::StatusCode::PAYLOAD_TOO_LARGE,
                    )
                    .into_response());
                }
                let parsed: serde_json::Value = match serde_json::from_slice(&body) {
                    Ok(v) => v,
                    Err(_) => {
                        return Ok(warp::reply::with_status(
                            warp::reply::json(&ApiResponse::<()> {
                                success: false,
                                data: None,
                                error: Some("invalid_body".into()),
                            }),
                            warp::http::StatusCode::BAD_REQUEST,
                        )
                        .into_response())
                    }
                };
                if parsed.get("type").and_then(|v| v.as_str()) != Some("transfer") {
                    return Ok(warp::reply::with_status(
                        warp::reply::json(&ApiResponse::<()> {
                            success: false,
                            data: None,
                            error: Some("invalid_body".into()),
                        }),
                        warp::http::StatusCode::BAD_REQUEST,
                    )
                    .into_response());
                }
                let req: TransferRequest = match serde_json::from_value(parsed.clone()) {
                    Ok(r) => r,
                    Err(_) => {
                        return Ok(warp::reply::with_status(
                            warp::reply::json(&ApiResponse::<()> {
                                success: false,
                                data: None,
                                error: Some("invalid_body".into()),
                            }),
                            warp::http::StatusCode::BAD_REQUEST,
                        )
                        .into_response())
                    }
                };
                if !ADDRESS_RE.is_match(&req.from) || !ADDRESS_RE.is_match(&req.to) {
                    return Ok(warp::reply::with_status(
                        warp::reply::json(&ApiResponse::<()> {
                            success: false,
                            data: None,
                            error: Some("invalid_address".into()),
                        }),
                        warp::http::StatusCode::BAD_REQUEST,
                    )
                    .into_response());
                }
                if req.amount == 0 || req.fee.unwrap_or(0) < MIN_FEE {
                    return Ok(warp::reply::with_status(
                        warp::reply::json(&ApiResponse::<()> {
                            success: false,
                            data: None,
                            error: Some("invalid_body".into()),
                        }),
                        warp::http::StatusCode::BAD_REQUEST,
                    )
                    .into_response());
                }
                // Balance & nonce check via storage
                let (storage, pool, ws_tx) = ctx;
                let sender_balance = storage.get_address_balance(&req.from).await.unwrap_or(0);
                let sender_nonce = storage.get_address_nonce(&req.from).await.unwrap_or(0);
                // Nonce rule
                let effective_nonce = match req.nonce {
                    None => sender_nonce,
                    Some(n) => {
                        if n != sender_nonce {
                            return Ok(warp::reply::with_status(
                                warp::reply::json(&ApiResponse::<()> {
                                    success: false,
                                    data: None,
                                    error: Some(format!(
                                        "invalid_nonce:expected:{}:got:{}",
                                        sender_nonce, n
                                    )),
                                }),
                                warp::http::StatusCode::UNPROCESSABLE_ENTITY,
                            )
                            .into_response());
                        }
                        n
                    }
                };
                if sender_balance < req.amount + req.fee.unwrap_or(MIN_FEE) {
                    return Ok(warp::reply::with_status(
                        warp::reply::json(&ApiResponse::<()> {
                            success: false,
                            data: None,
                            error: Some("insufficient_balance".into()),
                        }),
                        warp::http::StatusCode::BAD_REQUEST,
                    )
                    .into_response());
                }
                // Build transaction
                let mut tx = crate::types::TransferTransaction::new(
                    req.from.clone(),
                    req.to.clone(),
                    req.amount,
                    req.fee.unwrap_or(MIN_FEE),
                    effective_nonce,
                );
                // Signature verification skipped if mocks enabled OR signature absent (dev only)
                if let Some(sig) = req.signature {
                    if !runtime_mocks() {
                        let sig_bytes = match hex::decode(sig.data) {
                            Ok(b) => b,
                            Err(_) => {
                                return Ok::<_, warp::Rejection>(
                                    warp::reply::with_status(
                                        warp::reply::json(&ApiResponse::<()> {
                                            success: false,
                                            data: None,
                                            error: Some("signature_invalid".into()),
                                        }),
                                        warp::http::StatusCode::BAD_REQUEST,
                                    )
                                    .into_response(),
                                )
                            }
                        };
                        let pk_bytes = match hex::decode(sig.public_key) {
                            Ok(b) => b,
                            Err(_) => {
                                return Ok(warp::reply::with_status(
                                    warp::reply::json(&ApiResponse::<()> {
                                        success: false,
                                        data: None,
                                        error: Some("signature_invalid".into()),
                                    }),
                                    warp::http::StatusCode::BAD_REQUEST,
                                )
                                .into_response())
                            }
                        };
                        let pqc = crate::crypto::PQCManager::new().map_err(|_| ()).unwrap();
                        let sig_wrapper = crate::crypto::PQCSignature {
                            signature: sig_bytes.clone(),
                            algorithm: sig.algorithm.clone(),
                            nonce: 0,
                            timestamp: 0,
                        };
                        match pqc.verify_signature(
                            tx.signing_message().as_slice(),
                            &sig_wrapper,
                            &pk_bytes,
                        ) {
                            Ok(valid) if valid => {}
                            _ => {
                                return Ok(warp::reply::with_status(
                                    warp::reply::json(&ApiResponse::<()> {
                                        success: false,
                                        data: None,
                                        error: Some("signature_invalid".into()),
                                    }),
                                    warp::http::StatusCode::BAD_REQUEST,
                                )
                                .into_response());
                            }
                        }
                    }
                }
                let hash = tx.hash.clone();
                // Add to mempool
                if let Err(e) = pool
                    .add_transaction(crate::types::Transaction::Transfer(tx.clone()))
                    .await
                {
                    return Ok(warp::reply::with_status(
                        warp::reply::json(&ApiResponse::<()> {
                            success: false,
                            data: None,
                            error: Some(match e.as_str() {
                                "Transaction already in pool" => "duplicate_tx".into(),
                                _ => "mempool_error".into(),
                            }),
                        }),
                        warp::http::StatusCode::CONFLICT,
                    )
                    .into_response());
                }
                if ws_tx.receiver_count() > 0 {
                    let _ = ws_tx.send(WebSocketMessage {
                        message_type: "new_transaction".into(),
                        timestamp: chrono::Utc::now().timestamp() as u64,
                        data: serde_json::json!({"hash": hash}),
                    });
                }
                // Persist pending transaction (optional to allow /tx lookup before inclusion)
                if let Err(e) = storage
                    .store_transaction(&crate::types::Transaction::Transfer(tx.clone()))
                    .await
                {
                    error!("store tx err: {}", e);
                }
                Ok::<_, warp::Rejection>(
                    warp::reply::with_status(
                        warp::reply::json(&ApiResponse::success(
                            serde_json::json!({"hash": hash, "status":"pending"}),
                        )),
                        warp::http::StatusCode::OK,
                    )
                    .into_response(),
                )
            },
        )
        .boxed();

    // Blocks list (persistent)
    let storage_blocks = storage.clone();
    let blocks = {
        let base = warp::path("blocks").and(warp::get());
        // Accept optional raw query string; if absent supply empty string
        let with_query = base.and(
            warp::query::raw()
                .map(Some)
                .or(warp::any().map(|| None))
                .unify(),
        );
        with_query
            .and(warp::any().map(move || storage_blocks.clone()))
            .and_then(|query_opt: Option<String>, storage: Arc<crate::storage::StorageManager>| async move {
                let query = query_opt.unwrap_or_default();
                let qs: Vec<(String,String)> = url::form_urlencoded::parse(query.as_bytes()).into_owned().collect();
                let mut limit = 10usize; let mut from: Option<u64> = None;
                for (k,v) in qs { if k=="limit" { if let Ok(l)= v.parse::<usize>() { limit = l.min(100);} } else if k=="from" { if let Ok(h)= v.parse::<u64>() { from = Some(h); } } }
                match storage.list_blocks_desc(limit, from).await { Ok(list) => { let out: Vec<_> = list.into_iter().map(|b| serde_json::json!({"number": b.header.number, "hash": b.hash(), "parent_hash": b.header.parent_hash, "timestamp": b.header.timestamp, "tx_count": b.transactions.len()})).collect(); Ok::<_, warp::Rejection>(warp::reply::with_status(warp::reply::json(&ApiResponse::success(out)), warp::http::StatusCode::OK).into_response()) }, Err(e)=> { error!("blocks err: {}", e); Ok(warp::reply::with_status(warp::reply::json(&ApiResponse::<()> { success:false, data:None, error:Some("internal_error".into()) }), warp::http::StatusCode::INTERNAL_SERVER_ERROR).into_response()) } }
            })
            .map(|reply: warp::reply::Response| reply) // identity
            .boxed()
    };

    // Single block (by number or hash or latest)
    let storage_block = storage.clone();
    let get_block = warp::path("block")
        .and(warp::path::param::<String>())
        .and(warp::get())
        .and(warp::any().map(move || storage_block.clone()))
        .and_then(|id: String, storage: Arc<crate::storage::StorageManager>| async move {
            let res = if id == "latest" { let h = storage.get_height().unwrap_or(0); storage.get_block_by_height(h).await } else if id.starts_with("0x") { storage.get_block_by_hash(&id).await } else if let Ok(num) = id.parse::<u64>() { storage.get_block_by_height(num).await } else { Ok(None) };
            match res { Ok(Some(block)) => { let resp = serde_json::json!({"number": block.header.number, "hash": block.hash(), "parent_hash": block.header.parent_hash, "timestamp": block.header.timestamp, "transactions": block.transactions.iter().map(|t| t.hash()).collect::<Vec<_>>()}); Ok::<_, warp::Rejection>(warp::reply::with_status(warp::reply::json(&ApiResponse::success(resp)), warp::http::StatusCode::OK).into_response()) }, Ok(None)=> Ok(warp::reply::with_status(warp::reply::json(&ApiResponse::<()> { success:false, data:None, error:Some("not_found".into()) }), warp::http::StatusCode::NOT_FOUND).into_response()), Err(e)=> { error!("block err: {}", e); Ok(warp::reply::with_status(warp::reply::json(&ApiResponse::<()> { success:false, data:None, error:Some("internal_error".into()) }), warp::http::StatusCode::INTERNAL_SERVER_ERROR).into_response()) } }
        })
        .boxed();

    // Stats (augment with height & mempool size)
    let storage_stats = storage.clone();
    let tx_pool_stats = tx_pool.clone();
    let stats = warp::path("stats")
        .and(warp::get())
        .and(warp::any().map(move || (tx_pool_stats.clone(), storage_stats.clone())))
        .and_then(|ctx: (Arc<crate::types::TransactionPool>, Arc<crate::storage::StorageManager>)| async move {
            let (pool, storage) = ctx; let pool_stats = pool.get_stats().await; let height = storage.get_height().unwrap_or(0); Ok::<_, warp::Rejection>(warp::reply::with_status(warp::reply::json(&ApiResponse::success(serde_json::json!({"height": height, "mempool_size": pool_stats.total_transactions, "fee_levels": pool_stats.fee_levels, "max_mempool": pool_stats.max_size}))), warp::http::StatusCode::OK).into_response())
        })
        .boxed();

    // Get transaction
    let storage_tx = storage.clone();
    let tx_pool_lookup = tx_pool.clone();
    let get_tx = warp::path("tx")
        .and(warp::path::param::<String>())
        .and(warp::get())
        .and(warp::any().map(move || (storage_tx.clone(), tx_pool_lookup.clone())))
        .and_then(|hash: String, ctx: (Arc<crate::storage::StorageManager>, Arc<crate::types::TransactionPool>)| async move {
            let (storage, pool) = ctx;
            if let Ok(Some(r)) = storage.get_receipt(&hash).await {
                return Ok::<_, warp::Rejection>(warp::reply::with_status(warp::reply::json(&serde_json::json!({
                    "tx_hash": r.tx_hash,
                    "status": match r.status { crate::types::TxStatus::Pending => "pending", crate::types::TxStatus::Success => "success", crate::types::TxStatus::Failed => "failed" },
                    "block_number": r.block_number,
                    "gas_used": r.gas_used.to_string(),
                    "fee_paid": r.fee_paid.to_string(),
                    "timestamp": r.timestamp,
                    "index": r.index,
                    "error": r.error
                })), warp::http::StatusCode::OK).into_response());
            }
            if let Ok(Some(_tx)) = storage.get_transaction_by_hash(&hash).await {
                return Ok(warp::reply::with_status(warp::reply::json(&serde_json::json!({"tx_hash": hash, "status": "pending"})), warp::http::StatusCode::OK).into_response());
            }
            Ok(warp::reply::with_status(warp::reply::json(&ErrorResponse { error: "NotFound".into(), message: "Transaction not found".into() }), warp::http::StatusCode::NOT_FOUND).into_response())
        })
        .boxed();

    // CORS
    let cors = {
        let origin = std::env::var("FRONTEND_ORIGIN").ok();
        let mut c = warp::cors()
            .allow_headers(vec!["content-type"])
            .allow_methods(vec!["GET", "POST", "OPTIONS"]);
        if let Some(o) = origin {
            c = c.allow_origin(o.as_str());
        } else {
            c = c.allow_any_origin();
        }
        c
    };

    let json_routes = health
        .or(balance)
        .or(submit_tx)
        .or(get_tx)
        .or(blocks)
        .or(get_block)
        .or(peers)
        .or(stats)
        .with(cors)
        .with(warp::log("api"));

    let routes = json_routes.or(websocket);

    info!(
        "API server listening on 0.0.0.0:3030 (mocks: {})",
        runtime_mocks()
    );
    warp::serve(routes).run(([0, 0, 0, 0], 3030)).await;
    Ok(())
}

async fn handle_websocket(
    websocket: warp::ws::WebSocket,
    ws_tx: Arc<broadcast::Sender<WebSocketMessage>>,
) {
    info!("New WebSocket connection established");

    let (mut ws_sink, mut ws_stream) = websocket.split();
    let mut ws_rx = ws_tx.subscribe();

    // Handle incoming messages from client
    let ws_tx_clone = ws_tx.clone();
    let incoming_task = tokio::spawn(async move {
        while let Some(result) = ws_stream.next().await {
            match result {
                Ok(msg) => {
                    if msg.is_text() {
                        if let Ok(text) = msg.to_str() {
                            info!("Received WebSocket message: {}", text);

                            // Handle subscription requests
                            if text.contains("subscribe") {
                                let response = WebSocketMessage {
                                    message_type: "subscription_confirmed".to_string(),
                                    timestamp: chrono::Utc::now().timestamp() as u64,
                                    data: serde_json::json!({"status": "subscribed"}),
                                };
                                let _ = ws_tx_clone.send(response);
                            }
                        }
                    } else if msg.is_close() {
                        info!("WebSocket connection closed by client");
                        break;
                    }
                }
                Err(e) => {
                    error!("WebSocket error: {}", e);
                    break;
                }
            }
        }
    });

    // Handle outgoing messages to client
    let outgoing_task = tokio::spawn(async move {
        while let Ok(message) = ws_rx.recv().await {
            let json_msg = serde_json::to_string(&message).unwrap_or_default();
            if let Err(e) = ws_sink.send(warp::ws::Message::text(json_msg)).await {
                error!("Failed to send WebSocket message: {}", e);
                break;
            }
        }
    });

    // Wait for either task to complete
    tokio::select! {
        _ = incoming_task => info!("WebSocket incoming task completed"),
        _ = outgoing_task => info!("WebSocket outgoing task completed"),
    }

    info!("WebSocket connection closed");
}
