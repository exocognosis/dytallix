use crate::domain::{Asset, AssetType, SensitivityLevel, ExposureLevel};
use async_trait::async_trait;
use sqlx::PgPool;
use anyhow::Result;
use uuid::Uuid;

#[async_trait]
pub trait AssetRepository: Send + Sync {
    async fn create(&self, asset: &Asset) -> Result<Asset>;
    async fn update(&self, asset: &Asset) -> Result<Asset>;
    async fn find_by_id(&self, id: Uuid) -> Result<Option<Asset>>;
    async fn list_all(&self) -> Result<Vec<Asset>>;
    async fn search(&self, filter: AssetFilter) -> Result<Vec<Asset>>;
}

#[derive(Debug, Clone, Default)]
pub struct AssetFilter {
    pub asset_type: Option<AssetType>,
    pub owner: Option<String>,
    pub sensitivity: Option<SensitivityLevel>,
    pub min_risk_score: Option<i32>,
    pub max_risk_score: Option<i32>,
    pub exposure_level: Option<ExposureLevel>,
}

pub struct PostgresAssetRepository {
    pool: PgPool,
}

impl PostgresAssetRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl AssetRepository for PostgresAssetRepository {
    async fn create(&self, asset: &Asset) -> Result<Asset> {
        let regulatory_tags: Vec<String> = asset.regulatory_tags.clone();
        let classical_issues: Vec<String> = asset.classical_issues.clone().unwrap_or_default();
        
        sqlx::query_as::<_, Asset>(
            r#"
            INSERT INTO assets (
                id, name, asset_type, endpoint_or_path, owner, sensitivity, 
                regulatory_tags, exposure_level, data_lifetime_days, risk_score, 
                encryption_profile, created_at, updated_at,
                environment, service_role, business_criticality, crypto_usage,
                algo_pk, pk_key_bits, algo_sym, sym_key_bits,
                hash_algo, protocol_version, exposure_type, stores_long_lived_data,
                data_sensitivity, crypto_agility, classical_issues,
                aqv, dlv, imp, exp, agi, ccw, pqc_risk_score, risk_class
            )
            VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
                $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25,
                $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36
            )
            RETURNING *
            "#,
        )
        .bind(asset.id)
        .bind(&asset.name)
        .bind(&asset.asset_type)
        .bind(&asset.endpoint_or_path)
        .bind(&asset.owner)
        .bind(&asset.sensitivity)
        .bind(&regulatory_tags)
        .bind(&asset.exposure_level)
        .bind(asset.data_lifetime_days)
        .bind(asset.risk_score)
        .bind(&asset.encryption_profile)
        .bind(asset.created_at)
        .bind(asset.updated_at)
        // PQC risk fields
        .bind(&asset.environment)
        .bind(&asset.service_role)
        .bind(&asset.business_criticality)
        .bind(&asset.crypto_usage)
        .bind(&asset.algo_pk)
        .bind(asset.pk_key_bits)
        .bind(&asset.algo_sym)
        .bind(asset.sym_key_bits)
        .bind(&asset.hash_algo)
        .bind(&asset.protocol_version)
        .bind(&asset.exposure_level)
        .bind(asset.stores_long_lived_data)
        .bind(&asset.sensitivity)
        .bind(&asset.crypto_agility)
        .bind(&classical_issues)
        .bind(asset.aqv)
        .bind(asset.dlv)
        .bind(asset.imp)
        .bind(asset.exp)
        .bind(asset.agi)
        .bind(asset.ccw)
        .bind(asset.pqc_risk_score)
        .bind(&asset.risk_class)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| e.into())
    }

    async fn update(&self, asset: &Asset) -> Result<Asset> {
        let regulatory_tags: Vec<String> = asset.regulatory_tags.clone();
        let classical_issues: Vec<String> = asset.classical_issues.clone().unwrap_or_default();
        
        sqlx::query_as::<_, Asset>(
            r#"
            UPDATE assets 
            SET name = $2, asset_type = $3, endpoint_or_path = $4, owner = $5, 
                sensitivity = $6, regulatory_tags = $7, exposure_level = $8, 
                data_lifetime_days = $9, risk_score = $10, encryption_profile = $11, 
                updated_at = $12,
                environment = $13, service_role = $14, business_criticality = $15,
                crypto_usage = $16, algo_pk = $17, pk_key_bits = $18,
                algo_sym = $19, sym_key_bits = $20, hash_algo = $21,
                protocol_version = $22, exposure_type = $23, stores_long_lived_data = $24,
                data_sensitivity = $25, crypto_agility = $26, classical_issues = $27,
                aqv = $28, dlv = $29, imp = $30, exp = $31, agi = $32, ccw = $33,
                pqc_risk_score = $34, risk_class = $35
            WHERE id = $1
            RETURNING *
            "#,
        )
        .bind(asset.id)
        .bind(&asset.name)
        .bind(&asset.asset_type)
        .bind(&asset.endpoint_or_path)
        .bind(&asset.owner)
        .bind(&asset.sensitivity)
        .bind(&regulatory_tags)
        .bind(&asset.exposure_level)
        .bind(asset.data_lifetime_days)
        .bind(asset.risk_score)
        .bind(&asset.encryption_profile)
        .bind(asset.updated_at)
        // PQC risk fields
        .bind(&asset.environment)
        .bind(&asset.service_role)
        .bind(&asset.business_criticality)
        .bind(&asset.crypto_usage)
        .bind(&asset.algo_pk)
        .bind(asset.pk_key_bits)
        .bind(&asset.algo_sym)
        .bind(asset.sym_key_bits)
        .bind(&asset.hash_algo)
        .bind(&asset.protocol_version)
        .bind(&asset.exposure_level)
        .bind(asset.stores_long_lived_data)
        .bind(&asset.sensitivity)
        .bind(&asset.crypto_agility)
        .bind(&classical_issues)
        .bind(asset.aqv)
        .bind(asset.dlv)
        .bind(asset.imp)
        .bind(asset.exp)
        .bind(asset.agi)
        .bind(asset.ccw)
        .bind(asset.pqc_risk_score)
        .bind(&asset.risk_class)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| e.into())
    }

    async fn find_by_id(&self, id: Uuid) -> Result<Option<Asset>> {
        sqlx::query_as::<_, Asset>("SELECT * FROM assets WHERE id = $1")
            .bind(id)
            .fetch_optional(&self.pool)
            .await
        .map_err(|e| e.into())
            
    }

    async fn list_all(&self) -> Result<Vec<Asset>> {
        sqlx::query_as::<_, Asset>("SELECT * FROM assets ORDER BY created_at DESC")
            .fetch_all(&self.pool)
            .await
        .map_err(|e| e.into())
            
    }

    async fn search(&self, filter: AssetFilter) -> Result<Vec<Asset>> {
        let mut query = String::from("SELECT * FROM assets WHERE 1=1");
        
        if filter.asset_type.is_some() {
            query.push_str(" AND asset_type = $1");
        }
        if filter.owner.is_some() {
            query.push_str(" AND owner = $2");
        }
        if filter.sensitivity.is_some() {
            query.push_str(" AND sensitivity = $3");
        }
        if filter.min_risk_score.is_some() {
            query.push_str(" AND risk_score >= $4");
        }
        if filter.max_risk_score.is_some() {
            query.push_str(" AND risk_score <= $5");
        }
        if filter.exposure_level.is_some() {
            query.push_str(" AND exposure_level = $6");
        }
        query.push_str(" ORDER BY risk_score DESC, created_at DESC");

        let mut q = sqlx::query_as::<_, Asset>(&query);
        
        if let Some(ref at) = filter.asset_type {
            q = q.bind(at);
        }
        if let Some(ref owner) = filter.owner {
            q = q.bind(owner);
        }
        if let Some(ref sens) = filter.sensitivity {
            q = q.bind(sens);
        }
        if let Some(min) = filter.min_risk_score {
            q = q.bind(min);
        }
        if let Some(max) = filter.max_risk_score {
            q = q.bind(max);
        }
        if let Some(ref exp) = filter.exposure_level {
            q = q.bind(exp);
        }

        q.fetch_all(&self.pool)
            .await
        .map_err(|e| e.into())
            
    }
}
