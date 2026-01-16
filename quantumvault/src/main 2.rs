use axum::{
    middleware,
    routing::{get, post, patch},
    Router,
};
use sqlx::postgres::PgPoolOptions;
use std::net::SocketAddr;
use std::sync::Arc;
use std::time::Duration;
use tower_http::trace::TraceLayer;
use tower_http::cors::{CorsLayer, Any};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use quantumvault::{
    api::*,
    application::{AuditService, JobEngine, ScanService, AttestationService, WrappingService},
    infrastructure::{
        CryptoEngine,
        PostgresAssetRepository, PostgresPolicyRepository, 
        PostgresJobRepository, PostgresAuditRepository,
    },
    Config,
};

// Import risk handlers specifically
use quantumvault::api::risk_handlers;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "quantumvault=info,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    let config = Config::from_env()?;
    tracing::info!("Starting QuantumVault server on {}:{}", config.server_host, config.server_port);

    let pool = PgPoolOptions::new()
        .max_connections(20)
        .connect(&config.database_url)
        .await?;

    tracing::info!("Running database migrations...");
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await?;
    tracing::info!("Database migrations completed");

    let master_key = config.master_key_bytes()?;
    let crypto_engine = Arc::new(CryptoEngine::new(master_key)?);

    let asset_repo = Arc::new(PostgresAssetRepository::new(pool.clone())) as Arc<dyn quantumvault::infrastructure::AssetRepository>;
    let policy_repo = Arc::new(PostgresPolicyRepository::new(pool.clone())) as Arc<dyn quantumvault::infrastructure::PolicyRepository>;
    let job_repo = Arc::new(PostgresJobRepository::new(pool.clone())) as Arc<dyn quantumvault::infrastructure::JobRepository>;
    let audit_repo = Arc::new(PostgresAuditRepository::new(pool.clone())) as Arc<dyn quantumvault::infrastructure::AuditRepository>;

    let audit_service = Arc::new(AuditService::new(audit_repo.clone()));
    let scan_service = Arc::new(ScanService::new(asset_repo.clone()));
    let attestation_service = Arc::new(AttestationService::new(Some(config.blockchain_rpc_url.clone().unwrap_or_default())));
    let wrapping_service = Arc::new(WrappingService::new(crypto_engine.clone()));

    let job_engine = Arc::new(JobEngine::new(
        job_repo.clone(),
        asset_repo.clone(),
        policy_repo.clone(),
        crypto_engine.clone(),
        audit_service.clone(),
        Duration::from_secs(config.job_poll_interval_secs),
        config.job_batch_size,
        pool.clone(),
    ));

    let job_engine_clone = job_engine.clone();
    tokio::spawn(async move {
        job_engine_clone.start().await;
    });

    let asset_handlers = Arc::new(AssetHandlers::new(asset_repo.clone(), audit_service.clone()));
    let policy_handlers = Arc::new(PolicyHandlers::new(policy_repo.clone(), audit_service.clone()));
    let job_handlers = Arc::new(JobHandlers::new(job_repo.clone(), asset_repo.clone(), policy_repo.clone()));
    let audit_handlers = Arc::new(AuditHandlers::new(audit_repo.clone()));
    let risk_handlers = Arc::new(RiskHandlers::new(asset_repo.clone()));

    let api_key_auth = ApiKeyAuth {
        api_key: config.api_key.clone(),
    };

    // Asset routes
    let asset_routes = Router::new()
        .route("/api/assets/manual", post(asset_handlers::create_asset_handler))
        .route("/api/assets/discover/tls", post(asset_handlers::discover_tls_asset_handler))
        .route("/api/assets", get(asset_handlers::list_assets_handler))
        .route("/api/assets/:id", get(asset_handlers::get_asset_handler))
        .route("/api/assets/:id/classification", patch(asset_handlers::update_classification_handler))
        .with_state(asset_handlers);

    // Policy routes
    let policy_routes = Router::new()
        .route("/api/policies", get(policy_handlers::list_policies_handler))
        .route("/api/policies", post(policy_handlers::create_policy_handler))
        .route("/api/policies/:id", get(policy_handlers::get_policy_handler))
        .with_state(policy_handlers);

    // Job routes
    let job_routes = Router::new()
        .route("/api/assets/:id/apply-policy", post(job_handlers::apply_policy_handler))
        .route("/api/jobs", get(job_handlers::list_jobs_handler))
        .route("/api/jobs/:id", get(job_handlers::get_job_handler))
        .with_state(job_handlers);

    // Audit routes
    let audit_routes = Router::new()
        .route("/api/audit", get(audit_handlers::query_audit_handler))
        .route("/api/audit/chain/verify", get(audit_handlers::verify_audit_chain_handler))
        .with_state(audit_handlers);

    // Scan routes
    let scan_routes = Router::new()
        .route("/api/scans", post(scan_handlers::create_scan))
        .route("/api/scans", get(scan_handlers::get_scans))
        .route("/api/scans/:id", get(scan_handlers::get_scan))
        .with_state(scan_service);

    // Attestation routes
    let attestation_routes = Router::new()
        .route("/api/attestations/jobs", post(attestation_handlers::create_attestation_job))
        .with_state(attestation_service);

    // PQC Risk routes
    let risk_routes = Router::new()
        .route("/api/risk/assets", get(risk_handlers::list_risk_assets_handler))
        .route("/api/risk/assets/:id", get(risk_handlers::get_risk_asset_handler))
        .route("/api/risk/assets/:id", patch(risk_handlers::update_asset_risk_fields_handler))
        .route("/api/risk/summary", get(risk_handlers::get_risk_summary_handler))
        .route("/api/risk/weights", get(risk_handlers::get_risk_weights_handler))
        .route("/api/risk/evaluate", post(risk_handlers::bulk_evaluate_risk_handler))
        .route("/api/risk/evaluate/all", post(risk_handlers::force_evaluate_all_handler))
        .route("/api/risk/presets", get(risk_handlers::list_presets_handler))
        .route("/api/risk/questionnaire", get(risk_handlers::get_questionnaire_handler))
        .route("/api/risk/preview", post(risk_handlers::preview_asset_inference_handler))
        .with_state(risk_handlers);

    // Combine all protected routes
    let protected_routes = Router::new()
        .merge(asset_routes)
        .merge(policy_routes)
        .merge(job_routes)
        .merge(audit_routes)
        .merge(scan_routes)
        .merge(attestation_routes)
        .merge(risk_routes)
        .layer(middleware::from_fn_with_state(api_key_auth.clone(), auth_middleware));

    let health_route = Router::new()
        .route("/health", get(|| async { "OK" }));

    // Configure CORS to allow frontend requests - must be before auth middleware
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any)
        .allow_credentials(false);

    let app = Router::new()
        .merge(health_route)
        .merge(protected_routes)
        .layer(cors)  // CORS must be outermost layer
        .layer(TraceLayer::new_for_http());

    let addr = SocketAddr::from(([0, 0, 0, 0], config.server_port));
    let listener = tokio::net::TcpListener::bind(&addr).await?;
    
    tracing::info!("Server listening on {}", addr);
    tracing::info!("API Key authentication enabled");
    tracing::info!("Job engine started with poll interval: {}s", config.job_poll_interval_secs);

    axum::serve(listener, app).await?;

    Ok(())
}
