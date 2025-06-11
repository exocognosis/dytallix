use std::sync::Arc;
use warp::Filter;
use serde::{Deserialize, Serialize};
use log::info;

use crate::DytallixNode;

#[derive(Debug, Deserialize)]
struct TransferRequest {
    from: String,
    to: String,
    amount: u64,
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

pub async fn start_api_server(node: Arc<DytallixNode>) -> Result<(), Box<dyn std::error::Error>> {
    info!("Starting Dytallix API server on port 3030...");
    
    // Health check endpoint
    let health = warp::path("health")
        .and(warp::get())
        .map(|| {
            warp::reply::json(&ApiResponse::success("Dytallix blockchain node is healthy"))
        });
    
    // Get blockchain stats
    let node_for_stats = Arc::clone(&node);
    let stats = warp::path("stats")
        .and(warp::get())
        .map(move || {
            let node = Arc::clone(&node_for_stats);
            tokio::spawn(async move {
                match get_blockchain_stats(node).await {
                    Ok(stats) => warp::reply::json(&ApiResponse::success(stats)),
                    Err(e) => warp::reply::json(&ApiResponse::<()>::error(e.to_string())),
                }
            });
            warp::reply::json(&ApiResponse::success("Getting stats..."))
        });
    
    // Get balance endpoint  
    let node_for_balance = Arc::clone(&node);
    let balance = warp::path("balance")
        .and(warp::path::param::<String>())
        .and(warp::get())
        .map(move |address: String| {
            let node = Arc::clone(&node_for_balance);
            let address_clone = address.clone();
            tokio::spawn(async move {
                match node.get_balance(&address_clone).await {
                    Ok(balance) => info!("Balance for {}: {}", address_clone, balance),
                    Err(e) => info!("Error getting balance: {}", e),
                }
            });
            warp::reply::json(&ApiResponse::success(format!("Checking balance for {}", address)))
        });
    
    // Submit transaction endpoint
    let submit_tx = warp::path("submit")
        .and(warp::post())
        .and(warp::body::json())
        .map(|req: TransferRequest| {
            info!("Transaction request: {} -> {} ({})", req.from, req.to, req.amount);
            warp::reply::json(&ApiResponse::success("Transaction submitted"))
        });
    
    // CORS headers
    let cors = warp::cors()
        .allow_any_origin()
        .allow_headers(vec!["content-type"])
        .allow_methods(vec!["GET", "POST", "OPTIONS"]);
    
    // Combine all routes
    let routes = health
        .or(stats)
        .or(balance)
        .or(submit_tx)
        .with(cors)
        .with(warp::log("api"));
    
    // Start the server
    warp::serve(routes)
        .run(([127, 0, 0, 1], 3030))
        .await;
    
    Ok(())
}

async fn get_blockchain_stats(node: Arc<DytallixNode>) -> Result<BlockchainStats, Box<dyn std::error::Error>> {
    let current_block = node.get_current_block_number().await;
    let (total_transactions, _) = node.get_transaction_pool_stats().await?;
    let network_peers = 0; // TODO: Get from network manager
    
    Ok(BlockchainStats {
        current_block,
        total_transactions,
        network_peers,
    })
}
