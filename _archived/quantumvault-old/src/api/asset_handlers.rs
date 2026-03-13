use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::{IntoResponse, Json},
    Extension,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::sync::Arc;
use uuid::Uuid;

use crate::application::AuditService;
use crate::domain::{
    Asset, AssetType, SensitivityLevel, ExposureLevel,
    asset::{BusinessCriticality, CryptoUsage, AlgoPublicKey, AlgoSymmetric,
            CryptoAgility}
};
use crate::infrastructure::{AssetRepository, AssetFilter};
use crate::risk::{infer_preset_from_asset, apply_preset, RiskWeights};
use crate::application::evaluate_and_update_asset_risk;

pub struct AssetHandlers {
    asset_repo: Arc<dyn AssetRepository>,
    audit_service: Arc<AuditService>,
}

impl AssetHandlers {
    pub fn new(asset_repo: Arc<dyn AssetRepository>, audit_service: Arc<AuditService>) -> Self {
        Self {
            asset_repo,
            audit_service,
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct CreateAssetRequest {
    pub name: String,
    pub asset_type: AssetType,
    pub endpoint_or_path: String,
    pub owner: String,
    pub sensitivity: SensitivityLevel,
    pub regulatory_tags: Vec<String>,
    pub exposure_level: ExposureLevel,
    pub data_lifetime_days: i32,
    #[serde(default = "default_encryption_profile")]
    pub encryption_profile: serde_json::Value,
    
    // PQC Risk Assessment Fields
    pub environment: Option<String>,
    pub service_role: Option<String>,
    #[serde(default)]
    pub business_criticality: Option<BusinessCriticality>,
    #[serde(default)]
    pub crypto_usage: Option<CryptoUsage>,
    #[serde(default)]
    pub algo_pk: Option<AlgoPublicKey>,
    pub pk_key_bits: Option<i32>,
    #[serde(default)]
    pub algo_sym: Option<AlgoSymmetric>,
    pub sym_key_bits: Option<i32>,
    pub hash_algo: Option<String>,
    pub protocol_version: Option<String>,
    #[serde(default)]
    pub crypto_agility: Option<CryptoAgility>,
    #[serde(default)]
    pub stores_long_lived_data: Option<bool>,
}

fn default_encryption_profile() -> serde_json::Value {
    serde_json::json!({ "protected": false })
}

#[derive(Debug, Deserialize)]
pub struct UpdateClassificationRequest {
    pub owner: String,
    pub sensitivity: SensitivityLevel,
    pub regulatory_tags: Vec<String>,
    pub exposure_level: ExposureLevel,
    pub data_lifetime_days: i32,
    pub business_criticality: BusinessCriticality,
}

#[derive(Debug, Deserialize)]
pub struct AssetSearchQuery {
    pub asset_type: Option<AssetType>,
    pub owner: Option<String>,
    pub sensitivity: Option<SensitivityLevel>,
    pub min_risk_score: Option<i32>,
    pub max_risk_score: Option<i32>,
    pub exposure_level: Option<ExposureLevel>,
}

pub async fn create_asset_handler(
    State(handlers): State<Arc<AssetHandlers>>,
    Extension(actor): Extension<String>,
    Json(payload): Json<CreateAssetRequest>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let mut asset = Asset::new(
        payload.name,
        payload.asset_type,
        payload.endpoint_or_path,
        payload.owner,
        payload.sensitivity,
        payload.regulatory_tags,
        payload.exposure_level,
        payload.data_lifetime_days,
        payload.encryption_profile,
        payload.environment,
        payload.business_criticality,
        // PQC fields
        payload.service_role,
        payload.crypto_usage,
        payload.algo_pk,
        payload.pk_key_bits,
        payload.algo_sym,
        payload.sym_key_bits,
        payload.hash_algo,
        payload.protocol_version,
        payload.crypto_agility,
        payload.stores_long_lived_data,
    );

    // Apply preset if applicable (fills in missing risk fields with intelligent defaults)
    if let Some(preset_key) = infer_preset_from_asset(&asset) {
        apply_preset(&mut asset, preset_key);
    }

    // Evaluate PQC risk inline with default weights
    let weights = RiskWeights::default();
    evaluate_and_update_asset_risk(&mut asset, &weights);

    let created = handlers.asset_repo.create(&asset).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    handlers.audit_service.log_asset_created(&created, &actor).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok((StatusCode::CREATED, Json(json!(created))))
}

pub async fn list_assets_handler(
    State(handlers): State<Arc<AssetHandlers>>,
    Query(query): Query<AssetSearchQuery>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let filter = AssetFilter {
        asset_type: query.asset_type,
        owner: query.owner,
        sensitivity: query.sensitivity,
        min_risk_score: query.min_risk_score,
        max_risk_score: query.max_risk_score,
        exposure_level: query.exposure_level,
    };

    let assets = if filter.asset_type.is_none() && filter.owner.is_none() && 
                     filter.sensitivity.is_none() && filter.min_risk_score.is_none() &&
                     filter.max_risk_score.is_none() && filter.exposure_level.is_none() {
        handlers.asset_repo.list_all().await
    } else {
        handlers.asset_repo.search(filter).await
    }.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(json!({ "assets": assets })))
}

pub async fn get_asset_handler(
    State(handlers): State<Arc<AssetHandlers>>,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let asset = handlers.asset_repo.find_by_id(id).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .ok_or((StatusCode::NOT_FOUND, "Asset not found".to_string()))?;

    Ok(Json(json!(asset)))
}

pub async fn update_classification_handler(
    State(handlers): State<Arc<AssetHandlers>>,
    Extension(actor): Extension<String>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateClassificationRequest>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let mut asset = handlers.asset_repo.find_by_id(id).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .ok_or((StatusCode::NOT_FOUND, "Asset not found".to_string()))?;

    asset.update_classification(
        payload.sensitivity,
        payload.regulatory_tags,
        payload.exposure_level,
        payload.data_lifetime_days,
        payload.owner,
        payload.business_criticality,
    );

    let updated = handlers.asset_repo.update(&asset).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    handlers.audit_service.log_asset_classified(&updated, &actor).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(json!(updated)))
}

#[derive(Debug, Deserialize)]
pub struct DiscoverTlsRequest {
    pub hostname: String,
    pub port: u16,
    pub name: String,
    pub owner: String,
    pub sensitivity: SensitivityLevel,
}

pub async fn discover_tls_asset_handler(
    State(handlers): State<Arc<AssetHandlers>>,
    Extension(actor): Extension<String>,
    Json(payload): Json<DiscoverTlsRequest>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let endpoint = format!("{}:{}", payload.hostname, payload.port);
    
    let encryption_profile = serde_json::json!({
        "discovered": true,
        "hostname": payload.hostname,
        "port": payload.port,
        "discovery_method": "tls_probe",
        "discovered_at": chrono::Utc::now().to_rfc3339(),
    });

    let asset = Asset::new(
        payload.name,
        AssetType::TlsEndpoint,
        endpoint,
        payload.owner,
        payload.sensitivity,
        vec![],
        ExposureLevel::PublicInternet,
        365,
        encryption_profile,
        None, // environment
        None, // business_criticality
        // PQC fields
        None, // service_role
        None, // crypto_usage
        None, // algo_pk
        None, // pk_key_bits
        None, // algo_sym
        None, // sym_key_bits
        None, // hash_algo
        None, // protocol_version
        None, // crypto_agility
        None, // stores_long_lived_data
    );

    let created = handlers.asset_repo.create(&asset).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    handlers.audit_service.log_asset_created(&created, &actor).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok((StatusCode::CREATED, Json(json!(created))))
}
