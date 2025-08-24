use serde::{Deserialize, Serialize};
use crate::error::InferenceError;
use crate::config::FeatureConfig;

#[derive(Debug, Clone)]
pub struct FeatureExtractor {
    config: FeatureConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransactionFeatures {
    // Velocity features
    pub velocity_1h: f64,
    pub velocity_24h: f64,
    pub velocity_7d: f64,
    
    // Amount features
    pub amount_z_score: f64,
    pub amount_percentile: f64,
    pub round_amount_indicator: f64,
    
    // Temporal features
    pub hour_of_day: f64,
    pub day_of_week: f64,
    pub is_weekend: f64,
    pub time_since_last_tx: f64,
    
    // Graph features
    pub in_degree: f64,
    pub out_degree: f64,
    pub clustering_coefficient: f64,
    pub betweenness_centrality: f64,
    pub page_rank: f64,
    
    // Behavioral features
    pub gas_price_z_score: f64,
    pub gas_limit_z_score: f64,
    pub tx_frequency_pattern: f64,
    pub address_age_days: f64,
    pub unique_counterparties: f64,
}

impl FeatureExtractor {
    pub fn new(config: &FeatureConfig) -> Self {
        Self {
            config: config.clone(),
        }
    }

    pub async fn extract(&self, transaction: &crate::blockchain::Transaction) -> Result<TransactionFeatures, InferenceError> {
        let mut features = TransactionFeatures::default();
        
        // Extract velocity features
        if self.config.enable_temporal_features {
            features.velocity_1h = self.calculate_velocity_1h(transaction).await?;
            features.velocity_24h = self.calculate_velocity_24h(transaction).await?;
            features.velocity_7d = self.calculate_velocity_7d(transaction).await?;
        }
        
        // Extract amount features
        features.amount_z_score = self.calculate_amount_z_score(transaction).await?;
        features.amount_percentile = self.calculate_amount_percentile(transaction).await?;
        features.round_amount_indicator = self.is_round_amount(transaction);
        
        // Extract temporal features
        if self.config.enable_temporal_features {
            let (hour, day, weekend) = self.extract_time_features(transaction);
            features.hour_of_day = hour;
            features.day_of_week = day;
            features.is_weekend = weekend;
            features.time_since_last_tx = self.time_since_last_transaction(transaction).await?;
        }
        
        // Extract graph features
        if self.config.enable_graph_features {
            features.in_degree = self.calculate_in_degree(transaction).await?;
            features.out_degree = self.calculate_out_degree(transaction).await?;
            features.clustering_coefficient = self.calculate_clustering_coefficient(transaction).await?;
            features.betweenness_centrality = self.calculate_betweenness_centrality(transaction).await?;
            features.page_rank = self.calculate_page_rank(transaction).await?;
        }
        
        // Extract behavioral features
        if self.config.enable_behavioral_features {
            features.gas_price_z_score = self.calculate_gas_price_z_score(transaction).await?;
            features.gas_limit_z_score = self.calculate_gas_limit_z_score(transaction).await?;
            features.tx_frequency_pattern = self.calculate_tx_frequency_pattern(transaction).await?;
            features.address_age_days = self.calculate_address_age(transaction).await?;
            features.unique_counterparties = self.calculate_unique_counterparties(transaction).await?;
        }
        
        Ok(features)
    }

    async fn calculate_velocity_1h(&self, transaction: &crate::blockchain::Transaction) -> Result<f64, InferenceError> {
        // Simplified implementation - would query database for actual velocity
        Ok(0.5) // Placeholder
    }

    async fn calculate_velocity_24h(&self, _transaction: &crate::blockchain::Transaction) -> Result<f64, InferenceError> {
        Ok(0.3) // Placeholder
    }

    async fn calculate_velocity_7d(&self, _transaction: &crate::blockchain::Transaction) -> Result<f64, InferenceError> {
        Ok(0.1) // Placeholder
    }

    async fn calculate_amount_z_score(&self, transaction: &crate::blockchain::Transaction) -> Result<f64, InferenceError> {
        // Calculate z-score based on historical amount distribution
        let amount = transaction.amount.parse::<f64>().unwrap_or(0.0);
        let mean = 1000.0; // Would be calculated from historical data
        let std_dev = 500.0; // Would be calculated from historical data
        
        Ok((amount - mean) / std_dev)
    }

    async fn calculate_amount_percentile(&self, transaction: &crate::blockchain::Transaction) -> Result<f64, InferenceError> {
        let amount = transaction.amount.parse::<f64>().unwrap_or(0.0);
        // Simplified percentile calculation
        if amount < 100.0 { 0.2 }
        else if amount < 1000.0 { 0.5 }
        else if amount < 10000.0 { 0.8 }
        else { 0.95 };
        
        Ok(0.5) // Placeholder
    }

    fn is_round_amount(&self, transaction: &crate::blockchain::Transaction) -> f64 {
        let amount = transaction.amount.parse::<f64>().unwrap_or(0.0);
        if amount % 1000.0 == 0.0 { 1.0 } else { 0.0 }
    }

    fn extract_time_features(&self, transaction: &crate::blockchain::Transaction) -> (f64, f64, f64) {
        use chrono::{DateTime, Utc, Timelike, Datelike, Weekday};
        
        let datetime = DateTime::from_timestamp(transaction.timestamp as i64, 0)
            .unwrap_or_else(|| Utc::now());
        
        let hour_of_day = datetime.hour() as f64 / 24.0;
        let day_of_week = datetime.weekday().num_days_from_monday() as f64 / 7.0;
        let is_weekend = if matches!(datetime.weekday(), Weekday::Sat | Weekday::Sun) { 1.0 } else { 0.0 };
        
        (hour_of_day, day_of_week, is_weekend)
    }

    async fn time_since_last_transaction(&self, _transaction: &crate::blockchain::Transaction) -> Result<f64, InferenceError> {
        // Would query database for last transaction timestamp
        Ok(0.5) // Placeholder normalized value
    }

    async fn calculate_in_degree(&self, _transaction: &crate::blockchain::Transaction) -> Result<f64, InferenceError> {
        // Would calculate from transaction graph
        Ok(0.3) // Placeholder
    }

    async fn calculate_out_degree(&self, _transaction: &crate::blockchain::Transaction) -> Result<f64, InferenceError> {
        Ok(0.4) // Placeholder
    }

    async fn calculate_clustering_coefficient(&self, _transaction: &crate::blockchain::Transaction) -> Result<f64, InferenceError> {
        Ok(0.2) // Placeholder
    }

    async fn calculate_betweenness_centrality(&self, _transaction: &crate::blockchain::Transaction) -> Result<f64, InferenceError> {
        Ok(0.1) // Placeholder
    }

    async fn calculate_page_rank(&self, _transaction: &crate::blockchain::Transaction) -> Result<f64, InferenceError> {
        Ok(0.15) // Placeholder
    }

    async fn calculate_gas_price_z_score(&self, transaction: &crate::blockchain::Transaction) -> Result<f64, InferenceError> {
        let gas_price = transaction.gas_price.parse::<f64>().unwrap_or(0.0);
        let mean = 20.0; // Would be calculated from historical data
        let std_dev = 5.0;
        
        Ok((gas_price - mean) / std_dev)
    }

    async fn calculate_gas_limit_z_score(&self, transaction: &crate::blockchain::Transaction) -> Result<f64, InferenceError> {
        let gas_limit = transaction.gas_limit.parse::<f64>().unwrap_or(0.0);
        let mean = 21000.0; // Standard ETH transfer
        let std_dev = 10000.0;
        
        Ok((gas_limit - mean) / std_dev)
    }

    async fn calculate_tx_frequency_pattern(&self, _transaction: &crate::blockchain::Transaction) -> Result<f64, InferenceError> {
        // Would analyze transaction timing patterns
        Ok(0.6) // Placeholder
    }

    async fn calculate_address_age(&self, _transaction: &crate::blockchain::Transaction) -> Result<f64, InferenceError> {
        // Would calculate days since first transaction
        Ok(365.0) // Placeholder: 1 year old address
    }

    async fn calculate_unique_counterparties(&self, _transaction: &crate::blockchain::Transaction) -> Result<f64, InferenceError> {
        // Would count unique addresses interacted with
        Ok(10.0) // Placeholder
    }
}

impl TransactionFeatures {
    pub fn to_vector(&self) -> Vec<f64> {
        vec![
            self.velocity_1h,
            self.velocity_24h,
            self.velocity_7d,
            self.amount_z_score,
            self.amount_percentile,
            self.round_amount_indicator,
            self.hour_of_day,
            self.day_of_week,
            self.is_weekend,
            self.time_since_last_tx,
            self.in_degree,
            self.out_degree,
            self.clustering_coefficient,
            self.betweenness_centrality,
            self.page_rank,
            self.gas_price_z_score,
            self.gas_limit_z_score,
            self.tx_frequency_pattern,
            self.address_age_days,
            self.unique_counterparties,
        ]
    }
}

impl Default for TransactionFeatures {
    fn default() -> Self {
        Self {
            velocity_1h: 0.0,
            velocity_24h: 0.0,
            velocity_7d: 0.0,
            amount_z_score: 0.0,
            amount_percentile: 0.0,
            round_amount_indicator: 0.0,
            hour_of_day: 0.0,
            day_of_week: 0.0,
            is_weekend: 0.0,
            time_since_last_tx: 0.0,
            in_degree: 0.0,
            out_degree: 0.0,
            clustering_coefficient: 0.0,
            betweenness_centrality: 0.0,
            page_rank: 0.0,
            gas_price_z_score: 0.0,
            gas_limit_z_score: 0.0,
            tx_frequency_pattern: 0.0,
            address_age_days: 0.0,
            unique_counterparties: 0.0,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::FeatureConfig;
    use crate::blockchain::Transaction;

    #[tokio::test]
    async fn test_feature_extraction() {
        let config = FeatureConfig {
            enable_graph_features: true,
            enable_temporal_features: true,
            enable_behavioral_features: true,
            lookback_window_hours: 24,
            velocity_window_minutes: 60,
        };
        
        let extractor = FeatureExtractor::new(&config);
        
        let transaction = Transaction {
            hash: "test_hash".to_string(),
            from: "dytallix1test".to_string(),
            to: "dytallix1other".to_string(),
            amount: "1000".to_string(),
            gas_price: "20".to_string(),
            gas_limit: "21000".to_string(),
            timestamp: 1234567890,
            block_height: 12345,
        };
        
        let features = extractor.extract(&transaction).await.unwrap();
        let vector = features.to_vector();
        
        assert_eq!(vector.len(), 20);
        assert!(vector.iter().all(|&x| x.is_finite()));
    }

    #[test]
    fn test_round_amount_detection() {
        let config = FeatureConfig::default();
        let extractor = FeatureExtractor::new(&config);
        
        let transaction1 = crate::blockchain::Transaction {
            amount: "1000".to_string(),
            ..Default::default()
        };
        
        let transaction2 = crate::blockchain::Transaction {
            amount: "1234.56".to_string(),
            ..Default::default()
        };
        
        assert_eq!(extractor.is_round_amount(&transaction1), 1.0);
        assert_eq!(extractor.is_round_amount(&transaction2), 0.0);
    }
}