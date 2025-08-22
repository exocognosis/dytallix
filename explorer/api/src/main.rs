use std::env;
use std::sync::{Arc, Mutex};
use warp::Filter;
use serde::Deserialize;
use anyhow::Result;
use tracing::{info, warn};

mod models;

use dytallix_explorer_indexer::store::Store;
use dytallix_explorer_indexer::models::{Block, Transaction};

#[derive(Debug, Clone)]
pub struct Config {
    pub db_path: String,
    pub port: u16,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            db_path: "explorer.db".to_string(),
            port: 8080,
        }
    }
}

impl Config {
    pub fn from_env() -> Self {
        let mut config = Self::default();
        
        if let Ok(db_path) = env::var("DYT_INDEX_DB") {
            config.db_path = db_path;
        }
        
        if let Ok(port_str) = env::var("DYT_API_PORT") {
            if let Ok(port) = port_str.parse() {
                config.port = port;
            }
        }
        
        config
    }
}

#[derive(Debug, Deserialize)]
struct QueryParams {
    limit: Option<u32>,
    offset: Option<u32>,
}

// Use a thread-safe store wrapper
type SafeStore = Arc<Mutex<Store>>;

fn with_store(store: SafeStore) -> impl Filter<Extract = (SafeStore,), Error = std::convert::Infallible> + Clone {
    warp::any().map(move || store.clone())
}

async fn get_blocks(params: QueryParams, store: SafeStore) -> Result<impl warp::Reply, warp::Rejection> {
    let limit = params.limit.unwrap_or(20).min(100);
    let offset = params.offset.unwrap_or(0);
    
    let store_guard = store.lock().map_err(|_| warp::reject::custom(ApiError::new("Store lock error")))?;
    match store_guard.get_blocks(limit, offset) {
        Ok(blocks) => {
            let response = serde_json::json!({
                "blocks": blocks,
                "limit": limit,
                "offset": offset
            });
            Ok(warp::reply::json(&response))
        }
        Err(e) => {
            warn!("Failed to get blocks: {}", e);
            Err(warp::reject::custom(ApiError::new("Database error")))
        }
    }
}

async fn get_transactions(params: QueryParams, store: SafeStore) -> Result<impl warp::Reply, warp::Rejection> {
    let limit = params.limit.unwrap_or(20).min(100);
    let offset = params.offset.unwrap_or(0);
    
    let store_guard = store.lock().map_err(|_| warp::reject::custom(ApiError::new("Store lock error")))?;
    match store_guard.get_transactions(limit, offset) {
        Ok(txs) => {
            let response = serde_json::json!({
                "transactions": txs,
                "limit": limit,
                "offset": offset
            });
            Ok(warp::reply::json(&response))
        }
        Err(e) => {
            warn!("Failed to get transactions: {}", e);
            Err(warp::reject::custom(ApiError::new("Database error")))
        }
    }
}

async fn get_transaction(hash: String, store: SafeStore) -> Result<impl warp::Reply, warp::Rejection> {
    let store_guard = store.lock().map_err(|_| warp::reject::custom(ApiError::new("Store lock error")))?;
    match store_guard.get_transaction_by_hash(&hash) {
        Ok(Some(tx)) => Ok(warp::reply::json(&tx)),
        Ok(None) => Err(warp::reject::custom(ApiError::new("Not found"))),
        Err(e) => {
            warn!("Failed to get transaction {}: {}", hash, e);
            Err(warp::reject::custom(ApiError::new("Database error")))
        }
    }
}

#[derive(Debug)]
struct ApiError {
    message: String,
}

impl ApiError {
    fn new(message: &str) -> Self {
        Self { message: message.to_string() }
    }
}

impl warp::reject::Reject for ApiError {}

async fn handle_rejection(err: warp::Rejection) -> Result<impl warp::Reply, std::convert::Infallible> {
    let code;
    let message;

    if err.is_not_found() {
        code = warp::http::StatusCode::NOT_FOUND;
        message = "Not Found";
    } else if let Some(api_error) = err.find::<ApiError>() {
        match &api_error.message[..] {
            "Not found" => {
                code = warp::http::StatusCode::NOT_FOUND;
                message = "Not Found";
            }
            _ => {
                code = warp::http::StatusCode::INTERNAL_SERVER_ERROR;
                message = "Internal Server Error";
            }
        }
    } else {
        code = warp::http::StatusCode::INTERNAL_SERVER_ERROR;
        message = "Internal Server Error";
    }

    let json = warp::reply::json(&serde_json::json!({
        "error": message,
    }));

    Ok(warp::reply::with_status(json, code))
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt::init();
    
    let config = Config::from_env();
    info!("Starting API server with config: {:?}", config);
    
    let store = Arc::new(Mutex::new(Store::new(&config.db_path)?));
    
    // CORS configuration
    let cors = warp::cors()
        .allow_any_origin()
        .allow_headers(vec!["content-type"])
        .allow_methods(vec!["GET", "POST", "OPTIONS"]);
    
    // Routes
    let blocks = warp::path!("explorer" / "blocks")
        .and(warp::get())
        .and(warp::query::<QueryParams>())
        .and(with_store(store.clone()))
        .and_then(get_blocks);
    
    let transactions = warp::path!("explorer" / "txs")
        .and(warp::get())
        .and(warp::query::<QueryParams>())
        .and(with_store(store.clone()))
        .and_then(get_transactions);
    
    let transaction = warp::path!("explorer" / "tx" / String)
        .and(warp::get())
        .and(with_store(store.clone()))
        .and_then(get_transaction);
    
    let routes = blocks
        .or(transactions)
        .or(transaction)
        .with(cors)
        .recover(handle_rejection);
    
    info!("API server starting on port {}", config.port);
    warp::serve(routes)
        .run(([0, 0, 0, 0], config.port))
        .await;
    
    Ok(())
}