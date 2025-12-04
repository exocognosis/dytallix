use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use uuid::Uuid;

use crate::domain::asset::*;
use crate::infrastructure::{AssetRepository, AssetFilter};
use crate::risk::{RiskWeights, RiskClass as EngineRiskClass, get_asset_presets, AssetPreset};
use crate::application::evaluate_and_update_asset_risk;

#[derive(Debug, Deserialize)]
pub struct RiskFilterParams {
    pub risk_class: Option<String>,
    pub environment: Option<String>,
    pub crypto_usage: Option<String>,
    pub min_risk_score: Option<i16>,
    pub max_risk_score: Option<i16>,
}

#[derive(Debug, Serialize)]
pub struct AssetWithRiskResponse {
    pub id: Uuid,
    pub name: String,
    pub asset_type: String,
    pub owner: String,
    pub environment: Option<String>,
    pub business_criticality: String,
    pub crypto_usage: String,
    pub exposure_level: String,
    
    // Risk dimensions
    pub aqv: Option<i16>,
    pub dlv: Option<i16>,
    pub imp: Option<i16>,
    pub exp: Option<i16>,
    pub agi: Option<i16>,
    pub ccw: Option<i16>,
    
    // Composite risk
    pub pqc_risk_score: Option<i16>,
    pub risk_class: Option<String>,
    
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

impl From<Asset> for AssetWithRiskResponse {
    fn from(asset: Asset) -> Self {
        Self {
            id: asset.id,
            name: asset.name,
            asset_type: format!("{:?}", asset.asset_type),
            owner: asset.owner,
            environment: asset.environment,
            business_criticality: format!("{:?}", asset.business_criticality),
            crypto_usage: format!("{:?}", asset.crypto_usage),
            exposure_level: format!("{:?}", asset.exposure_level),
            aqv: asset.aqv,
            dlv: asset.dlv,
            imp: asset.imp,
            exp: asset.exp,
            agi: asset.agi,
            ccw: asset.ccw,
            pqc_risk_score: asset.pqc_risk_score,
            risk_class: asset.risk_class.map(|rc| format!("{:?}", rc)),
            created_at: asset.created_at,
            updated_at: asset.updated_at,
        }
    }
}

#[derive(Debug, Serialize)]
pub struct RiskSummaryResponse {
    pub total_assets: usize,
    pub by_risk_class: RiskClassCounts,
    pub by_environment: HashMap<String, RiskClassCounts>,
    pub by_crypto_usage: HashMap<String, usize>,
    pub average_risk_score: f64,
    pub assets_needing_attention: usize, // High or Critical
}

#[derive(Debug, Serialize)]
pub struct RiskClassCounts {
    #[serde(rename = "Low")]
    pub low: usize,
    #[serde(rename = "Medium")]
    pub medium: usize,
    #[serde(rename = "High")]
    pub high: usize,
    #[serde(rename = "Critical")]
    pub critical: usize,
}

#[derive(Debug, Serialize)]
pub struct RiskWeightsResponse {
    pub name: String,
    pub aqv: f64,
    pub dlv: f64,
    pub imp: f64,
    pub exp: f64,
    pub agi: f64,
    pub ccw: f64,
}

impl From<RiskWeights> for RiskWeightsResponse {
    fn from(weights: RiskWeights) -> Self {
        Self {
            name: "default".to_string(),
            aqv: weights.aqv,
            dlv: weights.dlv,
            imp: weights.imp,
            exp: weights.exp,
            agi: weights.agi,
            ccw: weights.ccw,
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct UpdateRiskFieldsRequest {
    pub environment: Option<String>,
    pub business_criticality: Option<String>,
    pub crypto_usage: Option<String>,
    pub algo_pk: Option<String>,
    pub pk_key_bits: Option<i32>,
    pub algo_sym: Option<String>,
    pub sym_key_bits: Option<i32>,
    pub protocol_version: Option<String>,
    pub hash_algo: Option<String>,
    pub exposure_level: Option<String>,
    pub stores_long_lived_data: Option<bool>,
    pub sensitivity: Option<String>,
    pub crypto_agility: Option<String>,
    pub classical_issues: Option<Vec<String>>,
}

pub struct RiskHandlers {
    asset_repo: Arc<dyn AssetRepository>,
}

impl RiskHandlers {
    pub fn new(asset_repo: Arc<dyn AssetRepository>) -> Self {
        Self { asset_repo }
    }
}

/// GET /api/risk/assets - List all assets with PQC risk information
pub async fn list_risk_assets_handler(
    State(handlers): State<Arc<RiskHandlers>>,
    Query(params): Query<RiskFilterParams>,
) -> Result<Json<Vec<AssetWithRiskResponse>>, StatusCode> {
    // Build filter for repository
    let filter = AssetFilter {
        asset_type: None,
        owner: None,
        sensitivity: None,
        min_risk_score: params.min_risk_score.map(|s| s as i32),
        max_risk_score: params.max_risk_score.map(|s| s as i32),
        exposure_level: None,
    };
    
    let assets = handlers.asset_repo
        .search(filter)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    let mut filtered_assets: Vec<AssetWithRiskResponse> = assets
        .into_iter()
        .filter(|asset| {
            // Apply risk filters
            if let Some(ref env) = params.environment {
                if asset.environment.as_deref() != Some(env) {
                    return false;
                }
            }
            
            if let Some(ref risk_class_str) = params.risk_class {
                if let Some(rc) = &asset.risk_class {
                    if format!("{:?}", rc) != *risk_class_str {
                        return false;
                    }
                } else {
                    return false;
                }
            }
            
            if let Some(min_score) = params.min_risk_score {
                if asset.pqc_risk_score.unwrap_or(0) < min_score {
                    return false;
                }
            }
            
            if let Some(max_score) = params.max_risk_score {
                if asset.pqc_risk_score.unwrap_or(100) > max_score {
                    return false;
                }
            }
            
            true
        })
        .map(AssetWithRiskResponse::from)
        .collect();
    
    // Sort by risk score descending
    filtered_assets.sort_by(|a, b| {
        b.pqc_risk_score.unwrap_or(0).cmp(&a.pqc_risk_score.unwrap_or(0))
    });
    
    Ok(Json(filtered_assets))
}

/// GET /api/risk/assets/:id - Get single asset with full PQC risk details
pub async fn get_risk_asset_handler(
    State(handlers): State<Arc<RiskHandlers>>,
    Path(id): Path<Uuid>,
) -> Result<Json<AssetWithRiskResponse>, StatusCode> {
    let asset = handlers.asset_repo
        .find_by_id(id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;
    
    Ok(Json(AssetWithRiskResponse::from(asset)))
}

/// GET /api/risk/summary - Get overall risk summary statistics
pub async fn get_risk_summary_handler(
    State(handlers): State<Arc<RiskHandlers>>,
) -> Result<Json<RiskSummaryResponse>, StatusCode> {
    let assets = handlers.asset_repo
        .list_all()
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    let total_assets = assets.len();
    
    let mut by_risk_class = RiskClassCounts {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0,
    };
    
    let mut by_environment: HashMap<String, RiskClassCounts> = HashMap::new();
    let mut by_crypto_usage: HashMap<String, usize> = HashMap::new();
    
    let mut total_risk_score = 0i64;
    let mut scored_assets = 0;
    
    for asset in &assets {
        // Count by risk class
        if let Some(ref rc) = asset.risk_class {
            match rc {
                RiskClass::Low => by_risk_class.low += 1,
                RiskClass::Medium => by_risk_class.medium += 1,
                RiskClass::High => by_risk_class.high += 1,
                RiskClass::Critical => by_risk_class.critical += 1,
            }
        }
        
        // Count by environment
        let env = asset.environment.clone().unwrap_or_else(|| "unknown".to_string());
        by_environment.entry(env).or_insert_with(|| RiskClassCounts {
            low: 0,
            medium: 0,
            high: 0,
            critical: 0,
        });
        
        if let Some(ref rc) = asset.risk_class {
            let env_counts = by_environment.get_mut(&asset.environment.clone().unwrap_or_else(|| "unknown".to_string())).unwrap();
            match rc {
                RiskClass::Low => env_counts.low += 1,
                RiskClass::Medium => env_counts.medium += 1,
                RiskClass::High => env_counts.high += 1,
                RiskClass::Critical => env_counts.critical += 1,
            }
        }
        
        // Count by crypto usage
        let usage = format!("{:?}", asset.crypto_usage);
        *by_crypto_usage.entry(usage).or_insert(0) += 1;
        
        // Sum risk scores
        if let Some(score) = asset.pqc_risk_score {
            total_risk_score += score as i64;
            scored_assets += 1;
        }
    }
    
    let average_risk_score = if scored_assets > 0 {
        total_risk_score as f64 / scored_assets as f64
    } else {
        0.0
    };
    
    let assets_needing_attention = by_risk_class.high + by_risk_class.critical;
    
    Ok(Json(RiskSummaryResponse {
        total_assets,
        by_risk_class,
        by_environment,
        by_crypto_usage,
        average_risk_score,
        assets_needing_attention,
    }))
}

/// GET /api/risk/weights - Get current risk weight profile
pub async fn get_risk_weights_handler() -> Json<RiskWeightsResponse> {
    Json(RiskWeightsResponse::from(RiskWeights::default()))
}

/// PATCH /api/risk/assets/:id - Update PQC risk fields and recompute risk
pub async fn update_asset_risk_fields_handler(
    State(handlers): State<Arc<RiskHandlers>>,
    Path(id): Path<Uuid>,
    Json(request): Json<UpdateRiskFieldsRequest>,
) -> Result<Json<AssetWithRiskResponse>, StatusCode> {
    let mut asset = handlers.asset_repo
        .find_by_id(id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;
    
    // Update fields from request
    if let Some(env) = request.environment {
        asset.environment = Some(env);
    }
    
    if let Some(bc_str) = request.business_criticality {
        asset.business_criticality = parse_business_criticality(&bc_str)
            .ok_or(StatusCode::BAD_REQUEST)?;
    }
    
    if let Some(cu_str) = request.crypto_usage {
        asset.crypto_usage = parse_crypto_usage(&cu_str)
            .ok_or(StatusCode::BAD_REQUEST)?;
    }
    
    if let Some(apk_str) = request.algo_pk {
        asset.algo_pk = parse_algo_pk(&apk_str)
            .ok_or(StatusCode::BAD_REQUEST)?;
    }
    
    if let Some(bits) = request.pk_key_bits {
        asset.pk_key_bits = Some(bits);
    }
    
    if let Some(asym_str) = request.algo_sym {
        asset.algo_sym = parse_algo_sym(&asym_str)
            .ok_or(StatusCode::BAD_REQUEST)?;
    }
    
    if let Some(bits) = request.sym_key_bits {
        asset.sym_key_bits = Some(bits);
    }
    
    if let Some(pv) = request.protocol_version {
        asset.protocol_version = Some(pv);
    }
    
    if let Some(ha) = request.hash_algo {
        asset.hash_algo = Some(ha);
    }
    
    if let Some(exp_str) = request.exposure_level {
        asset.exposure_level = parse_exposure(&exp_str)
            .ok_or(StatusCode::BAD_REQUEST)?;
    }
    
    if let Some(sld) = request.stores_long_lived_data {
        asset.stores_long_lived_data = sld;
    }
    
    if let Some(ds_str) = request.sensitivity {
        asset.sensitivity = parse_data_sensitivity(&ds_str)
            .ok_or(StatusCode::BAD_REQUEST)?;
    }
    
    if let Some(ca_str) = request.crypto_agility {
        asset.crypto_agility = parse_crypto_agility(&ca_str)
            .ok_or(StatusCode::BAD_REQUEST)?;
    }
    
    if let Some(issues) = request.classical_issues {
        asset.classical_issues = Some(issues);
    }
    
    // Recompute PQC risk
    let weights = RiskWeights::default();
    evaluate_and_update_asset_risk(&mut asset, &weights);
    
    // Save updated asset
    let updated_asset = handlers.asset_repo
        .update(&asset)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    Ok(Json(AssetWithRiskResponse::from(updated_asset)))
}

/// POST /api/risk/evaluate - Bulk evaluate and update PQC risk for all assets
pub async fn bulk_evaluate_risk_handler(
    State(handlers): State<Arc<RiskHandlers>>,
) -> Result<Json<BulkEvaluateResponse>, StatusCode> {
    let mut assets = handlers.asset_repo
        .list_all()
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    let weights = RiskWeights::default();
    let total = assets.len();
    let mut evaluated = 0;
    let mut skipped = 0;
    
    for asset in &mut assets {
        // Only evaluate if not already scored or if forced
        if asset.pqc_risk_score.is_none() {
            evaluate_and_update_asset_risk(asset, &weights);
            
            // Save updated asset
            if handlers.asset_repo.update(asset).await.is_ok() {
                evaluated += 1;
            }
        } else {
            skipped += 1;
        }
    }
    
    Ok(Json(BulkEvaluateResponse {
        total_assets: total,
        evaluated,
        skipped,
        message: format!("Evaluated {} assets, skipped {} already scored", evaluated, skipped),
    }))
}

/// POST /api/risk/evaluate/all - Force re-evaluate ALL assets regardless of existing scores
pub async fn force_evaluate_all_handler(
    State(handlers): State<Arc<RiskHandlers>>,
) -> Result<Json<BulkEvaluateResponse>, StatusCode> {
    let mut assets = handlers.asset_repo
        .list_all()
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    let weights = RiskWeights::default();
    let total = assets.len();
    let mut evaluated = 0;
    
    for asset in &mut assets {
        evaluate_and_update_asset_risk(asset, &weights);
        
        // Save updated asset
        if handlers.asset_repo.update(asset).await.is_ok() {
            evaluated += 1;
        }
    }
    
    Ok(Json(BulkEvaluateResponse {
        total_assets: total,
        evaluated,
        skipped: 0,
        message: format!("Force re-evaluated all {} assets", evaluated),
    }))
}

#[derive(Debug, Serialize)]
pub struct BulkEvaluateResponse {
    pub total_assets: usize,
    pub evaluated: usize,
    pub skipped: usize,
    pub message: String,
}

/// List all available asset presets
pub async fn list_presets_handler() -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let presets = get_asset_presets();
    
    let preset_list: Vec<serde_json::Value> = presets
        .iter()
        .map(|(key, preset)| {
            serde_json::json!({
                "key": key,
                "name": preset.name,
                "description": preset.description,
                "business_criticality": format!("{:?}", preset.business_criticality),
                "crypto_usage": format!("{:?}", preset.crypto_usage),
                "exposure": format!("{:?}", preset.exposure),
                "data_sensitivity": format!("{:?}", preset.data_sensitivity),
                "crypto_agility": format!("{:?}", preset.crypto_agility),
                "stores_long_lived_data": preset.stores_long_lived_data,
                "typical_environments": preset.typical_environments,
            })
        })
        .collect();
    
    Ok(Json(serde_json::json!({
        "presets": preset_list
    })))
}

#[derive(Debug, Serialize)]
pub struct QuestionnaireQuestion {
    pub id: String,
    pub question: String,
    pub field: String,
    pub options: Vec<QuestionOption>,
    pub help_text: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct QuestionOption {
    pub value: String,
    pub label: String,
    pub description: Option<String>,
}

/// Get contextual questionnaire for risk assessment
pub async fn get_questionnaire_handler() -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let questions = vec![
        QuestionnaireQuestion {
            id: "business_criticality".to_string(),
            question: "How critical is this asset to your business operations?".to_string(),
            field: "business_criticality".to_string(),
            options: vec![
                QuestionOption {
                    value: "low".to_string(),
                    label: "Low".to_string(),
                    description: Some("Nice to have, minimal business impact if unavailable".to_string()),
                },
                QuestionOption {
                    value: "medium".to_string(),
                    label: "Medium".to_string(),
                    description: Some("Important but has workarounds or backup systems".to_string()),
                },
                QuestionOption {
                    value: "high".to_string(),
                    label: "High".to_string(),
                    description: Some("Critical to operations, significant impact if compromised".to_string()),
                },
                QuestionOption {
                    value: "critical".to_string(),
                    label: "Critical".to_string(),
                    description: Some("Business-critical, cannot operate without it".to_string()),
                },
            ],
            help_text: Some("Consider the impact on revenue, operations, and reputation if this asset were unavailable or compromised.".to_string()),
        },
        QuestionnaireQuestion {
            id: "crypto_usage".to_string(),
            question: "What is the primary cryptographic use case?".to_string(),
            field: "crypto_usage".to_string(),
            options: vec![
                QuestionOption {
                    value: "data_at_rest".to_string(),
                    label: "Data at Rest".to_string(),
                    description: Some("Encrypting stored data (databases, files, backups)".to_string()),
                },
                QuestionOption {
                    value: "channel".to_string(),
                    label: "Secure Channel".to_string(),
                    description: Some("TLS/SSL, VPN, secure communications".to_string()),
                },
                QuestionOption {
                    value: "code_signing".to_string(),
                    label: "Code Signing".to_string(),
                    description: Some("Signing software, firmware, or documents".to_string()),
                },
                QuestionOption {
                    value: "pki_root".to_string(),
                    label: "PKI Root CA".to_string(),
                    description: Some("Root certificate authority".to_string()),
                },
                QuestionOption {
                    value: "vpn".to_string(),
                    label: "VPN".to_string(),
                    description: Some("Virtual private network endpoint".to_string()),
                },
                QuestionOption {
                    value: "blockchain".to_string(),
                    label: "Blockchain/Ledger".to_string(),
                    description: Some("Distributed ledger or blockchain signatures".to_string()),
                },
            ],
            help_text: Some("Select the primary way cryptography is used in this asset.".to_string()),
        },
        QuestionnaireQuestion {
            id: "exposure_level".to_string(),
            question: "What is the network exposure level?".to_string(),
            field: "exposure_level".to_string(),
            options: vec![
                QuestionOption {
                    value: "internet".to_string(),
                    label: "Internet".to_string(),
                    description: Some("Publicly accessible from the internet".to_string()),
                },
                QuestionOption {
                    value: "partner".to_string(),
                    label: "Partner/External".to_string(),
                    description: Some("Accessible to partners or external users (B2B, VPN, etc.)".to_string()),
                },
                QuestionOption {
                    value: "internal".to_string(),
                    label: "Internal Network".to_string(),
                    description: Some("Only accessible within the corporate network".to_string()),
                },
                QuestionOption {
                    value: "restricted".to_string(),
                    label: "Restricted".to_string(),
                    description: Some("Highly restricted access, limited to specific systems/users".to_string()),
                },
                QuestionOption {
                    value: "airgapped".to_string(),
                    label: "Air-Gapped".to_string(),
                    description: Some("Physically isolated, no network connectivity".to_string()),
                },
            ],
            help_text: Some("Consider how attackers could potentially access this asset.".to_string()),
        },
        QuestionnaireQuestion {
            id: "sensitivity".to_string(),
            question: "What is the data sensitivity classification?".to_string(),
            field: "sensitivity".to_string(),
            options: vec![
                QuestionOption {
                    value: "public".to_string(),
                    label: "Public".to_string(),
                    description: Some("Publicly available information".to_string()),
                },
                QuestionOption {
                    value: "internal".to_string(),
                    label: "Internal".to_string(),
                    description: Some("Internal business information".to_string()),
                },
                QuestionOption {
                    value: "confidential".to_string(),
                    label: "Confidential".to_string(),
                    description: Some("Confidential business data, customer information".to_string()),
                },
                QuestionOption {
                    value: "regulated".to_string(),
                    label: "Regulated".to_string(),
                    description: Some("Regulated data (PII, PHI, PCI, etc.) with compliance requirements".to_string()),
                },
            ],
            help_text: Some("Select based on your organization's data classification policy.".to_string()),
        },
        QuestionnaireQuestion {
            id: "crypto_agility".to_string(),
            question: "How easy is it to upgrade or change the cryptography?".to_string(),
            field: "crypto_agility".to_string(),
            options: vec![
                QuestionOption {
                    value: "high".to_string(),
                    label: "High Agility".to_string(),
                    description: Some("Can be updated easily (software, centralized control)".to_string()),
                },
                QuestionOption {
                    value: "medium".to_string(),
                    label: "Medium Agility".to_string(),
                    description: Some("Requires coordination but feasible (update clients, certificates)".to_string()),
                },
                QuestionOption {
                    value: "low".to_string(),
                    label: "Low Agility".to_string(),
                    description: Some("Very difficult to change (embedded firmware, distributed systems, legacy)".to_string()),
                },
            ],
            help_text: Some("Consider how difficult it would be to migrate to new cryptographic algorithms.".to_string()),
        },
        QuestionnaireQuestion {
            id: "stores_long_lived_data".to_string(),
            question: "Does this asset protect long-lived data?".to_string(),
            field: "stores_long_lived_data".to_string(),
            options: vec![
                QuestionOption {
                    value: "true".to_string(),
                    label: "Yes".to_string(),
                    description: Some("Data is stored long-term (years) - backups, archives, databases".to_string()),
                },
                QuestionOption {
                    value: "false".to_string(),
                    label: "No".to_string(),
                    description: Some("Data is ephemeral - sessions, caches, temporary communications".to_string()),
                },
            ],
            help_text: Some("Long-lived data is vulnerable to 'harvest now, decrypt later' quantum attacks.".to_string()),
        },
    ];
    
    Ok(Json(serde_json::json!({
        "questionnaire": questions
    })))
}

/// Preview asset risk inference based on metadata (without creating asset)
#[derive(Debug, Deserialize)]
pub struct PreviewAssetRequest {
    pub name: String,
    pub endpoint_or_path: Option<String>,
    pub environment: Option<String>,
}

pub async fn preview_asset_inference_handler(
    Json(payload): Json<PreviewAssetRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    use crate::domain::asset::*;
    use crate::risk::{infer_preset_from_asset, get_asset_presets};
    
    // Create a minimal asset for inference
    let temp_asset = Asset::new(
        payload.name.clone(),
        AssetType::DataStore, // Default
        payload.endpoint_or_path.unwrap_or_else(|| "/unknown".to_string()),
        "preview".to_string(),
        SensitivityLevel::Confidential,
        vec![],
        ExposureLevel::Internal,
        365,
        serde_json::json!({"protected": false}),
        payload.environment,
        None,
        None,
        None,
        None,
        None,
        None,
        None,
        None,
        None,
        None,
        None,
    );
    
    let inferred_preset_key = infer_preset_from_asset(&temp_asset);
    let presets = get_asset_presets();
    
    let result = if let Some(preset_key) = inferred_preset_key {
        if let Some(preset) = presets.get(preset_key) {
            serde_json::json!({
                "detected": true,
                "preset_key": preset_key,
                "preset_name": preset.name,
                "preset_description": preset.description,
                "inferred_values": {
                    "business_criticality": format!("{:?}", preset.business_criticality),
                    "crypto_usage": format!("{:?}", preset.crypto_usage),
                    "exposure": format!("{:?}", preset.exposure),
                    "data_sensitivity": format!("{:?}", preset.data_sensitivity),
                    "crypto_agility": format!("{:?}", preset.crypto_agility),
                    "stores_long_lived_data": preset.stores_long_lived_data,
                },
                "confidence": "high",
                "recommendation": format!(
                    "Based on the name '{}', this appears to be a {}. We'll apply appropriate security defaults.",
                    payload.name, preset.name
                )
            })
        } else {
            serde_json::json!({
                "detected": false,
                "recommendation": "Could not determine asset type. Please provide additional context via questionnaire."
            })
        }
    } else {
        serde_json::json!({
            "detected": false,
            "recommendation": "Could not determine asset type. Please provide additional context via questionnaire."
        })
    };
    
    Ok(Json(result))
}

/// Helper functions for parsing enum values from strings

fn parse_business_criticality(s: &str) -> Option<BusinessCriticality> {
    match s.to_lowercase().as_str() {
        "low" => Some(BusinessCriticality::Low),
        "medium" => Some(BusinessCriticality::Medium),
        "high" => Some(BusinessCriticality::High),
        "critical" => Some(BusinessCriticality::Critical),
        "unknown" => Some(BusinessCriticality::Unknown),
        _ => None,
    }
}

fn parse_crypto_usage(s: &str) -> Option<CryptoUsage> {
    match s.to_lowercase().as_str() {
        "channel" => Some(CryptoUsage::Channel),
        "data_at_rest" => Some(CryptoUsage::DataAtRest),
        "code_signing" => Some(CryptoUsage::CodeSigning),
        "pki_root" => Some(CryptoUsage::PkiRoot),
        "pki_leaf" => Some(CryptoUsage::PkiLeaf),
        "vpn" => Some(CryptoUsage::Vpn),
        "ssh" => Some(CryptoUsage::Ssh),
        "other" => Some(CryptoUsage::Other),
        _ => None,
    }
}

fn parse_algo_pk(s: &str) -> Option<AlgoPublicKey> {
    match s.to_uppercase().as_str() {
        "RSA" => Some(AlgoPublicKey::RSA),
        "ECDSA" => Some(AlgoPublicKey::ECDSA),
        "ECDH" => Some(AlgoPublicKey::ECDH),
        "DSA" => Some(AlgoPublicKey::DSA),
        "DH" => Some(AlgoPublicKey::DH),
        "NONE" => Some(AlgoPublicKey::None),
        _ => None,
    }
}

fn parse_algo_sym(s: &str) -> Option<AlgoSymmetric> {
    match s.to_uppercase().as_str() {
        "AES" => Some(AlgoSymmetric::AES),
        "3DES" => Some(AlgoSymmetric::TripleDES),
        "RC4" => Some(AlgoSymmetric::RC4),
        "DES" => Some(AlgoSymmetric::DES),
        "NONE" => Some(AlgoSymmetric::None),
        _ => None,
    }
}

fn parse_exposure(s: &str) -> Option<ExposureLevel> {
    match s.to_lowercase().as_str() {
        "internet" => Some(ExposureLevel::PublicInternet),
        "partner" => Some(ExposureLevel::PartnerNetwork),
        "internal" => Some(ExposureLevel::Internal),
        "restricted" => Some(ExposureLevel::Internal), // Map to Internal for now
        "airgapped" => Some(ExposureLevel::Internal), // Map to Internal for now
        "unknown" => Some(ExposureLevel::Internal), // Default
        _ => None,
    }
}

fn parse_data_sensitivity(s: &str) -> Option<SensitivityLevel> {
    match s.to_lowercase().as_str() {
        "public" => Some(SensitivityLevel::Public),
        "internal" => Some(SensitivityLevel::Internal),
        "confidential" => Some(SensitivityLevel::Confidential),
        "regulated" => Some(SensitivityLevel::Secret), // Map Regulated to Secret
        "unknown" => Some(SensitivityLevel::Internal), // Default
        _ => None,
    }
}

fn parse_crypto_agility(s: &str) -> Option<CryptoAgility> {
    match s.to_lowercase().as_str() {
        "high" => Some(CryptoAgility::High),
        "medium" => Some(CryptoAgility::Medium),
        "low" => Some(CryptoAgility::Low),
        "unknown" => Some(CryptoAgility::Unknown),
        _ => None,
    }
}
