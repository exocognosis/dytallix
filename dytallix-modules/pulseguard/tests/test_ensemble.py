"""Test ensemble model and ML components."""
import pytest
import numpy as np
import pandas as pd
from ..models.isolation_forest import IsolationForestModel
from ..models.ensemble import EnsembleModel, combine_scores


class TestIsolationForest:
    """Test IsolationForest model."""
    
    def test_training_basic(self):
        """Test basic training functionality."""
        model = IsolationForestModel(n_estimators=10, contamination=0.1)
        
        # Create synthetic training data
        np.random.seed(42)
        data = {
            "feature1": np.random.normal(0, 1, 100),
            "feature2": np.random.normal(0, 1, 100),
            "feature3": np.random.exponential(1, 100)
        }
        df = pd.DataFrame(data)
        
        # Train model
        metrics = model.train(df)
        
        assert "n_samples" in metrics
        assert "n_features" in metrics
        assert metrics["n_samples"] == 100
        assert metrics["n_features"] == 3
        
    def test_prediction_scores(self):
        """Test prediction functionality."""
        model = IsolationForestModel(n_estimators=10)
        
        # Training data
        np.random.seed(42)
        train_data = pd.DataFrame({
            "x": np.random.normal(0, 1, 100),
            "y": np.random.normal(0, 1, 100)
        })
        model.train(train_data)
        
        # Test data (including some outliers)
        test_data = pd.DataFrame({
            "x": [0, 0, 5, -5],  # Last two are outliers
            "y": [0, 0, 5, -5]
        })
        
        scores = model.predict_scores(test_data)
        
        assert len(scores) == 4
        assert all(0 <= score <= 1 for score in scores)
        # Outliers should have higher scores
        assert scores[2] > scores[0]
        assert scores[3] > scores[1]


class TestEnsembleModel:
    """Test ensemble model."""
    
    def test_ensemble_initialization(self):
        """Test ensemble initialization."""
        ensemble = EnsembleModel(
            isolation_forest_weight=0.6,
            gbdt_weight=0.4
        )
        
        assert ensemble.if_weight == 0.6
        assert ensemble.gbdt_weight == 0.4
        assert not ensemble.is_trained
        
    def test_ensemble_training(self):
        """Test ensemble training."""
        ensemble = EnsembleModel(
            iforest_params={"n_estimators": 10},
            gbdt_params={"n_estimators": 10}
        )
        
        # Create training data
        np.random.seed(42)
        features = pd.DataFrame({
            "feature1": np.random.normal(0, 1, 100),
            "feature2": np.random.normal(0, 1, 100),
            "feature3": np.random.exponential(1, 100)
        })
        
        # Create labels (binary classification)
        labels = np.random.choice([0, 1], size=100)
        
        # Train ensemble
        metrics = ensemble.train(features, labels)
        
        assert "isolation_forest" in metrics
        assert "gbdt" in metrics
        assert "ensemble" in metrics
        assert ensemble.is_trained
        
    def test_ensemble_prediction(self):
        """Test ensemble prediction."""
        # Skip if LightGBM not available
        pytest.importorskip("lightgbm")
        
        ensemble = EnsembleModel(
            iforest_params={"n_estimators": 10},
            gbdt_params={"n_estimators": 10}
        )
        
        # Training data
        np.random.seed(42)
        features = pd.DataFrame({
            "x": np.random.normal(0, 1, 50),
            "y": np.random.normal(0, 1, 50)
        })
        labels = np.random.choice([0, 1], size=50)
        
        ensemble.train(features, labels)
        
        # Test data
        test_features = pd.DataFrame({
            "x": [0, 3],  # Normal and outlier
            "y": [0, 3]
        })
        
        scores, explanations = ensemble.predict_scores(test_features)
        
        assert len(scores) == 2
        assert all(0 <= score <= 1 for score in scores)
        assert "sub_scores" in explanations
        assert "weights" in explanations
        
    def test_reason_codes_generation(self):
        """Test reason code generation."""
        ensemble = EnsembleModel(
            iforest_params={"n_estimators": 10}
        )
        
        # Simple training
        features = pd.DataFrame({
            "burstiness": [0.1, 0.2, 0.9, 0.8],  # High values should trigger
            "in_cycle": [0, 0, 1, 0],
            "k1_neighbors": [1, 2, 15, 20]  # High values should trigger
        })
        
        ensemble.train(features)
        
        # Test with high anomaly scores
        scores = np.array([0.9, 0.8])
        
        reason_codes = ensemble.get_reason_codes(scores, features.iloc[:2])
        
        assert len(reason_codes) == 2
        # High scores should generate reason codes
        assert len(reason_codes[0]) > 0
        assert len(reason_codes[1]) > 0


class TestScoreCombination:
    """Test score combination logic."""
    
    def test_combine_scores_basic(self):
        """Test basic score combination."""
        anomaly_scores = [0.8, 0.6]
        clf_scores = [0.7, 0.9]
        graph_score = 0.5
        
        final_score, reasons = combine_scores(anomaly_scores, clf_scores, graph_score)
        
        assert 0 <= final_score <= 1
        assert isinstance(reasons, list)
        
        # High scores should generate reasons
        if final_score > 0.7:
            assert len(reasons) > 0
            
    def test_combine_scores_with_weights(self):
        """Test score combination with custom weights."""
        anomaly_scores = [0.9]
        clf_scores = [0.1]
        graph_score = 0.1
        
        # Weight heavily toward anomaly
        weights = {"anomaly": 0.8, "classifier": 0.1, "graph": 0.1}
        
        final_score, reasons = combine_scores(
            anomaly_scores, clf_scores, graph_score, weights
        )
        
        # Should be closer to anomaly score
        assert final_score > 0.5
        assert "ANOMALY.HIGH" in " ".join(reasons)
        
    def test_empty_scores(self):
        """Test handling of empty score lists."""
        final_score, reasons = combine_scores([], [], 0.0)
        
        assert final_score == 0.0
        assert len(reasons) == 0
        
    def test_high_scores_generate_reasons(self):
        """Test that high scores generate appropriate reasons."""
        # All high scores
        final_score, reasons = combine_scores([0.9], [0.8], 0.9)
        
        assert len(reasons) >= 2  # Should have multiple reasons
        assert any("ANOMALY" in reason for reason in reasons)
        assert any("CLASSIFIER" in reason for reason in reasons)
        assert any("GRAPH" in reason for reason in reasons)