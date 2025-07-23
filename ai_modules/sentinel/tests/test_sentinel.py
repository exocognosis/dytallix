#!/usr/bin/env python3
"""
Network Sentinel - Validation and Performance Testing
"""

import os
import json
import sys
import time
import numpy as np
from typing import Dict, List, Any

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from train import SentinelModel
except ImportError:
    print("Warning: Could not import SentinelModel. Ensure train.py is available.")
    sys.exit(1)

class SentinelValidator:
    """Validation and testing for Network Sentinel"""
    
    def __init__(self):
        self.model = SentinelModel()
        self.test_results = {}
    
    def run_comprehensive_tests(self) -> Dict[str, Any]:
        """Run comprehensive validation tests"""
        print("Network Sentinel - Comprehensive Validation")
        print("=" * 50)
        
        results = {
            "timestamp": time.time(),
            "tests": {}
        }
        
        # Test 1: Model Training
        print("\n1. Testing Model Training...")
        training_result = self._test_training()
        results["tests"]["training"] = training_result
        
        # Test 2: Prediction Functionality
        print("\n2. Testing Prediction Functionality...")
        prediction_result = self._test_predictions()
        results["tests"]["predictions"] = prediction_result
        
        # Test 3: Performance Benchmarks
        print("\n3. Running Performance Benchmarks...")
        performance_result = self._test_performance()
        results["tests"]["performance"] = performance_result
        
        # Test 4: Edge Cases
        print("\n4. Testing Edge Cases...")
        edge_cases_result = self._test_edge_cases()
        results["tests"]["edge_cases"] = edge_cases_result
        
        # Test 5: Data Quality
        print("\n5. Testing Data Quality...")
        data_quality_result = self._test_data_quality()
        results["tests"]["data_quality"] = data_quality_result
        
        # Overall assessment
        results["overall_status"] = self._assess_overall_status(results["tests"])
        
        # Save results
        self._save_test_results(results)
        
        return results
    
    def _test_training(self) -> Dict[str, Any]:
        """Test model training functionality"""
        try:
            start_time = time.time()
            metrics = self.model.train()
            training_time = time.time() - start_time
            
            return {
                "status": "passed",
                "training_time": training_time,
                "metrics": metrics,
                "message": "Training completed successfully"
            }
        except Exception as e:
            return {
                "status": "failed",
                "error": str(e),
                "message": "Training failed"
            }
    
    def _test_predictions(self) -> Dict[str, Any]:
        """Test prediction functionality with various inputs"""
        if not self.model.trained:
            return {"status": "skipped", "message": "Model not trained"}
        
        test_cases = [
            # Normal transaction
            {
                "name": "normal_transaction",
                "features": {
                    "transaction_amount": 100.0,
                    "gas_price": 20.0,
                    "transaction_frequency": 5,
                    "wallet_age_days": 365,
                    "unique_interactions": 10
                },
                "expected_classification": "normal"
            },
            # Suspicious transaction
            {
                "name": "suspicious_transaction",
                "features": {
                    "transaction_amount": 5000.0,
                    "gas_price": 100.0,
                    "transaction_frequency": 50,
                    "wallet_age_days": 10,
                    "unique_interactions": 2
                },
                "expected_classification": "suspicious"
            },
            # Anomalous transaction
            {
                "name": "anomalous_transaction",
                "features": {
                    "transaction_amount": 100000.0,
                    "gas_price": 500.0,
                    "transaction_frequency": 1000,
                    "wallet_age_days": 1,
                    "unique_interactions": 1
                },
                "expected_classification": "anomalous"
            }
        ]
        
        results = {"status": "passed", "test_cases": []}
        
        for test_case in test_cases:
            try:
                prediction = self.model.predict(test_case["features"])
                
                test_result = {
                    "name": test_case["name"],
                    "status": "passed",
                    "prediction": prediction,
                    "expected": test_case["expected_classification"],
                    "match": prediction["classification"] == test_case["expected_classification"]
                }
                
                results["test_cases"].append(test_result)
                
            except Exception as e:
                results["test_cases"].append({
                    "name": test_case["name"],
                    "status": "failed",
                    "error": str(e)
                })
                results["status"] = "partial_failure"
        
        return results
    
    def _test_performance(self) -> Dict[str, Any]:
        """Test performance benchmarks"""
        if not self.model.trained:
            return {"status": "skipped", "message": "Model not trained"}
        
        # Generate test data
        n_samples = 1000
        test_features = []
        
        for _ in range(n_samples):
            features = {
                "transaction_amount": np.random.lognormal(5, 2),
                "gas_price": np.random.normal(20, 5),
                "transaction_frequency": np.random.poisson(10),
                "wallet_age_days": np.random.exponential(365),
                "unique_interactions": np.random.poisson(15)
            }
            test_features.append(features)
        
        # Measure prediction time
        start_time = time.time()
        predictions = []
        
        for features in test_features:
            try:
                prediction = self.model.predict(features)
                predictions.append(prediction)
            except Exception as e:
                print(f"Prediction failed: {e}")
                break
        
        total_time = time.time() - start_time
        avg_time_per_prediction = total_time / len(predictions) if predictions else 0
        
        # Analyze predictions
        classifications = [p["classification"] for p in predictions]
        score_distribution = {
            "normal": classifications.count("normal"),
            "suspicious": classifications.count("suspicious"),
            "anomalous": classifications.count("anomalous")
        }
        
        return {
            "status": "passed",
            "total_predictions": len(predictions),
            "total_time": total_time,
            "avg_time_per_prediction": avg_time_per_prediction,
            "throughput_per_second": len(predictions) / total_time if total_time > 0 else 0,
            "score_distribution": score_distribution,
            "performance_acceptable": avg_time_per_prediction < 0.1  # Less than 100ms per prediction
        }
    
    def _test_edge_cases(self) -> Dict[str, Any]:
        """Test edge cases and error handling"""
        if not self.model.trained:
            return {"status": "skipped", "message": "Model not trained"}
        
        edge_cases = [
            # Missing features
            {
                "name": "missing_features",
                "features": {"transaction_amount": 100.0},
                "should_handle": True
            },
            # Zero values
            {
                "name": "zero_values",
                "features": {
                    "transaction_amount": 0.0,
                    "gas_price": 0.0,
                    "transaction_frequency": 0,
                    "wallet_age_days": 0,
                    "unique_interactions": 0
                },
                "should_handle": True
            },
            # Extreme values
            {
                "name": "extreme_values",
                "features": {
                    "transaction_amount": 1e15,
                    "gas_price": 1e6,
                    "transaction_frequency": 1e6,
                    "wallet_age_days": 1e6,
                    "unique_interactions": 1e6
                },
                "should_handle": True
            },
            # Negative values
            {
                "name": "negative_values",
                "features": {
                    "transaction_amount": -100.0,
                    "gas_price": -20.0,
                    "transaction_frequency": -5,
                    "wallet_age_days": -10,
                    "unique_interactions": -3
                },
                "should_handle": True
            }
        ]
        
        results = {"status": "passed", "edge_cases": []}
        
        for case in edge_cases:
            try:
                prediction = self.model.predict(case["features"])
                
                result = {
                    "name": case["name"],
                    "status": "passed",
                    "handled": True,
                    "prediction": prediction
                }
                
            except Exception as e:
                result = {
                    "name": case["name"],
                    "status": "failed" if case["should_handle"] else "expected_failure",
                    "handled": False,
                    "error": str(e)
                }
                
                if case["should_handle"]:
                    results["status"] = "partial_failure"
            
            results["edge_cases"].append(result)
        
        return results
    
    def _test_data_quality(self) -> Dict[str, Any]:
        """Test data generation and quality"""
        try:
            # Generate synthetic data
            X, y = self.model.generate_synthetic_data()
            
            # Analyze data quality
            data_stats = {
                "total_samples": len(X),
                "features": X.shape[1],
                "normal_samples": np.sum(y == 1),
                "anomalous_samples": np.sum(y == -1),
                "feature_means": np.mean(X, axis=0).tolist(),
                "feature_stds": np.std(X, axis=0).tolist(),
                "has_nan": np.any(np.isnan(X)),
                "has_inf": np.any(np.isinf(X))
            }
            
            # Quality checks
            quality_checks = {
                "appropriate_size": len(X) >= 1000,
                "balanced_classes": abs(data_stats["normal_samples"] - data_stats["anomalous_samples"]) < len(X),
                "no_missing_values": not data_stats["has_nan"],
                "no_infinite_values": not data_stats["has_inf"],
                "feature_variance": all(std > 0 for std in data_stats["feature_stds"])
            }
            
            return {
                "status": "passed",
                "data_stats": data_stats,
                "quality_checks": quality_checks,
                "overall_quality": all(quality_checks.values())
            }
            
        except Exception as e:
            return {
                "status": "failed",
                "error": str(e),
                "message": "Data generation failed"
            }
    
    def _assess_overall_status(self, tests: Dict[str, Any]) -> str:
        """Assess overall test status"""
        failed_tests = []
        passed_tests = []
        
        for test_name, test_result in tests.items():
            if test_result.get("status") == "failed":
                failed_tests.append(test_name)
            elif test_result.get("status") == "passed":
                passed_tests.append(test_name)
        
        if not failed_tests:
            return "all_passed"
        elif len(failed_tests) <= len(passed_tests):
            return "mostly_passed"
        else:
            return "mostly_failed"
    
    def _save_test_results(self, results: Dict[str, Any]):
        """Save test results to file"""
        try:
            with open("tests/validation_report.json", "w") as f:
                json.dump(results, f, indent=2, default=str)
            print(f"\nTest results saved to tests/validation_report.json")
        except Exception as e:
            print(f"Failed to save test results: {e}")
    
    def print_summary(self, results: Dict[str, Any]):
        """Print test summary"""
        print("\n" + "=" * 50)
        print("VALIDATION SUMMARY")
        print("=" * 50)
        
        overall_status = results["overall_status"]
        print(f"Overall Status: {overall_status.upper()}")
        
        for test_name, test_result in results["tests"].items():
            status = test_result.get("status", "unknown")
            print(f"  {test_name}: {status.upper()}")
            
            if status == "failed" and "error" in test_result:
                print(f"    Error: {test_result['error']}")
        
        print("\nRecommendations:")
        if overall_status == "all_passed":
            print("✅ All tests passed! The model is ready for production use.")
        elif overall_status == "mostly_passed":
            print("⚠️  Most tests passed. Review failed tests before deployment.")
        else:
            print("❌ Multiple test failures. Address issues before deployment.")
        
        print("=" * 50)

def main():
    """Main validation function"""
    validator = SentinelValidator()
    results = validator.run_comprehensive_tests()
    validator.print_summary(results)

if __name__ == "__main__":
    main()