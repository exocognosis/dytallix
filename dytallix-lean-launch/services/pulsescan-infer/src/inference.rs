use serde::{Deserialize, Serialize};
use ndarray::{Array1, Array2};
use crate::error::InferenceError;
use crate::config::Config;

#[derive(Debug, Clone)]
pub struct InferenceEngine {
    model: AnomalyModel,
    config: Config,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InferenceResult {
    pub score: f64,
    pub reasons: Vec<String>,
    pub confidence: f64,
    pub metadata: InferenceMetadata,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InferenceMetadata {
    pub model_version: String,
    pub feature_count: usize,
    pub processing_time_ms: u64,
    pub top_features: Vec<(String, f64)>,
}

#[derive(Debug, Clone)]
pub struct AnomalyModel {
    // Simplified model representation
    weights: Array2<f32>,
    bias: Array1<f32>,
    feature_names: Vec<String>,
    thresholds: Vec<f64>,
}

impl InferenceEngine {
    pub async fn new(model_path: &str, config: &Config) -> Result<Self, InferenceError> {
        let model = AnomalyModel::load(model_path).await?;
        
        Ok(Self {
            model,
            config: config.clone(),
        })
    }

    pub async fn extract_features(&self, transaction: &crate::blockchain::Transaction) -> Result<Vec<f64>, InferenceError> {
        use crate::features::{FeatureExtractor, TransactionFeatures};
        
        let extractor = FeatureExtractor::new(&self.config.features);
        let features = extractor.extract(transaction).await?;
        
        Ok(features.to_vector())
    }

    pub async fn infer(&self, features: &[f64]) -> Result<InferenceResult, InferenceError> {
        let start_time = std::time::Instant::now();
        
        // Convert to ndarray
        let input = Array1::from_vec(features.to_vec());
        
        // Run inference
        let output = self.model.predict(&input)?;
        
        // Calculate anomaly score
        let score = self.calculate_anomaly_score(&output)?;
        
        // Determine reasons based on feature importance
        let reasons = self.determine_reasons(features, &output)?;
        
        // Calculate confidence
        let confidence = self.calculate_confidence(&output)?;
        
        let processing_time = start_time.elapsed().as_millis() as u64;
        
        Ok(InferenceResult {
            score,
            reasons,
            confidence,
            metadata: InferenceMetadata {
                model_version: "1.0.0".to_string(),
                feature_count: features.len(),
                processing_time_ms: processing_time,
                top_features: self.get_top_features(features)?,
            },
        })
    }

    fn calculate_anomaly_score(&self, output: &Array1<f32>) -> Result<f64, InferenceError> {
        // Simplified scoring - in practice this would be more sophisticated
        let raw_score = output[0] as f64;
        let normalized_score = (raw_score + 1.0) / 2.0; // Normalize to [0, 1]
        Ok(normalized_score.clamp(0.0, 1.0))
    }

    fn determine_reasons(&self, features: &[f64], _output: &Array1<f32>) -> Result<Vec<String>, InferenceError> {
        let mut reasons = Vec::new();
        
        // Simplified rule-based reasoning
        // In practice, this would use SHAP values or similar explainability techniques
        
        if features.len() > 0 && features[0] > 0.8 {
            reasons.push("high_velocity_pattern".to_string());
        }
        
        if features.len() > 1 && features[1] > 0.7 {
            reasons.push("suspicious_amount_distribution".to_string());
        }
        
        if features.len() > 2 && features[2] > 0.9 {
            reasons.push("unusual_timing_pattern".to_string());
        }
        
        if features.len() > 3 && features[3] > 0.6 {
            reasons.push("graph_centrality_anomaly".to_string());
        }
        
        if reasons.is_empty() {
            reasons.push("general_anomaly_pattern".to_string());
        }
        
        Ok(reasons)
    }

    fn calculate_confidence(&self, output: &Array1<f32>) -> Result<f64, InferenceError> {
        // Simplified confidence calculation
        let variance = output.iter().map(|&x| (x as f64).powi(2)).sum::<f64>() / output.len() as f64;
        let confidence = 1.0 - variance.min(1.0);
        Ok(confidence.max(0.1)) // Minimum confidence of 0.1
    }

    fn get_top_features(&self, features: &[f64]) -> Result<Vec<(String, f64)>, InferenceError> {
        let mut feature_importance: Vec<_> = features
            .iter()
            .enumerate()
            .map(|(i, &value)| {
                let name = self.model.feature_names
                    .get(i)
                    .cloned()
                    .unwrap_or_else(|| format!("feature_{}", i));
                (name, value)
            })
            .collect();

        // Sort by absolute value, descending
        feature_importance.sort_by(|a, b| b.1.abs().partial_cmp(&a.1.abs()).unwrap());
        
        // Return top 5 features
        Ok(feature_importance.into_iter().take(5).collect())
    }
}

impl AnomalyModel {
    pub async fn load(model_path: &str) -> Result<Self, InferenceError> {
        // In a real implementation, this would load from a serialized model file
        // For now, we'll create a simple dummy model
        
        let feature_count = 20;
        let weights = Array2::from_shape_fn((1, feature_count), |(_, j)| {
            // Simple synthetic weights
            (j as f32) * 0.1 - 1.0
        });
        
        let bias = Array1::from_vec(vec![0.0]);
        
        let feature_names = (0..feature_count)
            .map(|i| format!("feature_{}", i))
            .collect();
        
        let thresholds = vec![0.5, 0.7, 0.9]; // Low, medium, high thresholds
        
        Ok(Self {
            weights,
            bias,
            feature_names,
            thresholds,
        })
    }

    pub fn predict(&self, input: &Array1<f64>) -> Result<Array1<f32>, InferenceError> {
        // Convert f64 to f32 for computation
        let input_f32: Array1<f32> = input.mapv(|x| x as f32);
        
        // Simple linear model prediction: Wx + b
        let output = self.weights.dot(&input_f32) + &self.bias;
        
        Ok(output)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::Config;

    #[tokio::test]
    async fn test_model_loading() {
        let model = AnomalyModel::load("./test_models").await.unwrap();
        assert_eq!(model.feature_names.len(), 20);
    }

    #[tokio::test]
    async fn test_inference() {
        let config = Config::default();
        let engine = InferenceEngine::new("./test_models", &config).await.unwrap();
        
        let features = vec![0.5; 20];
        let result = engine.infer(&features).await.unwrap();
        
        assert!(result.score >= 0.0 && result.score <= 1.0);
        assert!(!result.reasons.is_empty());
        assert!(result.confidence > 0.0);
    }

    #[test]
    fn test_model_prediction() {
        let model = AnomalyModel {
            weights: Array2::from_shape_vec((1, 3), vec![0.5, -0.3, 0.8]).unwrap(),
            bias: Array1::from_vec(vec![0.1]),
            feature_names: vec!["a".to_string(), "b".to_string(), "c".to_string()],
            thresholds: vec![0.5],
        };
        
        let input = Array1::from_vec(vec![1.0, 2.0, 3.0]);
        let output = model.predict(&input).unwrap();
        
        // Expected: 0.5*1.0 + (-0.3)*2.0 + 0.8*3.0 + 0.1 = 0.5 - 0.6 + 2.4 + 0.1 = 2.4
        assert!((output[0] - 2.4).abs() < 1e-6);
    }
}