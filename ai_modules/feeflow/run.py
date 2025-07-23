#!/usr/bin/env python3
"""
FeeFlow Optimizer - Gas Fee Prediction and Optimization
Simplified implementation using basic Python
"""

import json
import math
import random
import os
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Any


class SimpleFeeFlowModel:
    """Simplified FeeFlow model using basic statistics and heuristics"""
    
    def __init__(self, config_path: str = "config.json"):
        self.config = self._load_config(config_path)
        self.trained = False
        self.historical_data = []
        self.model_parameters = {}
        
    def _load_config(self, config_path: str) -> Dict[str, Any]:
        """Load configuration"""
        try:
            with open(config_path, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            return self._default_config()
    
    def _default_config(self) -> Dict[str, Any]:
        """Default configuration"""
        return {
            "data_config": {
                "synthetic_data": {
                    "days_of_history": 30,
                    "blocks_per_day": 7200,
                    "base_gas_price": 20.0,
                    "volatility": 0.3
                }
            },
            "prediction_config": {
                "horizons": {"immediate": 1, "short_term": 5, "medium_term": 20}
            },
            "optimization_config": {
                "congestion_thresholds": {"low": 0.3, "medium": 0.6, "high": 0.8}
            }
        }
    
    def generate_synthetic_data(self) -> List[Dict[str, Any]]:
        """Generate synthetic gas price and network data"""
        print("Generating synthetic gas price data...")
        
        config = self.config["data_config"]["synthetic_data"]
        days = config["days_of_history"]
        blocks_per_day = config["blocks_per_day"]
        base_price = config["base_gas_price"]
        volatility = config["volatility"]
        
        data = []
        current_time = datetime.now() - timedelta(days=days)
        
        # Generate daily patterns
        for day in range(days):
            daily_multiplier = 1.0 + 0.3 * math.sin(2 * math.pi * day / 7)  # Weekly pattern
            
            for block in range(blocks_per_day):
                hour = (block * 24) // blocks_per_day
                
                # Hourly patterns (higher during business hours)
                hourly_multiplier = 1.0 + 0.2 * math.sin(2 * math.pi * hour / 24)
                
                # Random volatility
                noise = random.gauss(0, volatility)
                
                # Calculate gas price
                gas_price = base_price * daily_multiplier * hourly_multiplier * (1 + noise)
                gas_price = max(1.0, gas_price)  # Minimum 1 gwei
                
                # Generate related metrics
                utilization = min(1.0, max(0.1, 0.5 + 0.3 * (gas_price / base_price - 1) + random.gauss(0, 0.1)))
                pending_txs = int(1000 * utilization + random.gauss(0, 200))
                mempool_size = int(5000 * utilization + random.gauss(0, 1000))
                
                data_point = {
                    "timestamp": current_time + timedelta(days=day, hours=hour, minutes=(block % 300) * 5),
                    "gas_price": gas_price,
                    "block_utilization": utilization,
                    "pending_transactions": max(0, pending_txs),
                    "mempool_size": max(0, mempool_size),
                    "hour_of_day": hour,
                    "day_of_week": (day % 7),
                    "is_weekend": (day % 7) >= 5
                }
                
                data.append(data_point)
        
        print(f"Generated {len(data)} data points covering {days} days")
        return data
    
    def train(self) -> Dict[str, float]:
        """Train the fee prediction model"""
        print("Training FeeFlow model...")
        
        # Generate synthetic data
        self.historical_data = self.generate_synthetic_data()
        
        # Extract gas prices for trend analysis
        gas_prices = [d["gas_price"] for d in self.historical_data]
        utilizations = [d["block_utilization"] for d in self.historical_data]
        hours = [d["hour_of_day"] for d in self.historical_data]
        
        # Calculate basic statistics
        mean_price = sum(gas_prices) / len(gas_prices)
        price_variance = sum((p - mean_price) ** 2 for p in gas_prices) / len(gas_prices)
        price_std = math.sqrt(price_variance)
        
        # Calculate hourly patterns
        hourly_averages = {}
        for hour in range(24):
            hour_prices = [p for p, h in zip(gas_prices, hours) if h == hour]
            if hour_prices:
                hourly_averages[hour] = sum(hour_prices) / len(hour_prices)
            else:
                hourly_averages[hour] = mean_price
        
        # Calculate correlation between utilization and price
        mean_util = sum(utilizations) / len(utilizations)
        correlation = self._calculate_correlation(gas_prices, utilizations)
        
        self.model_parameters = {
            "mean_price": mean_price,
            "price_std": price_std,
            "hourly_patterns": hourly_averages,
            "utilization_correlation": correlation,
            "recent_trend": self._calculate_recent_trend(gas_prices[-100:])
        }
        
        self.trained = True
        
        # Calculate evaluation metrics
        mse = self._evaluate_predictions()
        
        metrics = {
            "mse": mse,
            "mean_price": mean_price,
            "price_volatility": price_std / mean_price,
            "correlation_util_price": correlation,
            "data_points": len(self.historical_data)
        }
        
        self._save_metrics(metrics)
        
        print(f"Training completed. MSE: {mse:.2f}")
        return metrics
    
    def _calculate_correlation(self, x: List[float], y: List[float]) -> float:
        """Calculate correlation coefficient"""
        if len(x) != len(y) or len(x) == 0:
            return 0.0
        
        mean_x = sum(x) / len(x)
        mean_y = sum(y) / len(y)
        
        numerator = sum((xi - mean_x) * (yi - mean_y) for xi, yi in zip(x, y))
        sum_sq_x = sum((xi - mean_x) ** 2 for xi in x)
        sum_sq_y = sum((yi - mean_y) ** 2 for yi in y)
        
        denominator = math.sqrt(sum_sq_x * sum_sq_y)
        
        return numerator / denominator if denominator > 0 else 0.0
    
    def _calculate_recent_trend(self, recent_prices: List[float]) -> float:
        """Calculate recent price trend"""
        if len(recent_prices) < 2:
            return 0.0
        
        # Simple linear trend
        n = len(recent_prices)
        x_mean = (n - 1) / 2
        y_mean = sum(recent_prices) / n
        
        numerator = sum(i * (price - y_mean) for i, price in enumerate(recent_prices))
        denominator = sum((i - x_mean) ** 2 for i in range(n))
        
        return numerator / denominator if denominator > 0 else 0.0
    
    def _evaluate_predictions(self) -> float:
        """Evaluate prediction accuracy using simple method"""
        if len(self.historical_data) < 10:
            return 0.0
        
        errors = []
        for i in range(10, len(self.historical_data)):
            # Use last 10 points to predict next
            recent_prices = [self.historical_data[j]["gas_price"] for j in range(i-10, i)]
            actual_price = self.historical_data[i]["gas_price"]
            
            # Simple prediction: weighted average with trend
            predicted_price = sum(recent_prices) / len(recent_prices)
            trend = (recent_prices[-1] - recent_prices[0]) / len(recent_prices)
            predicted_price += trend
            
            error = (predicted_price - actual_price) ** 2
            errors.append(error)
        
        return sum(errors) / len(errors) if errors else 0.0
    
    def predict(self, network_state: Dict[str, Any]) -> Dict[str, Any]:
        """Predict gas fees and provide optimization recommendations"""
        if not self.trained:
            raise ValueError("Model not trained")
        
        current_price = network_state.get("current_gas_price", self.model_parameters["mean_price"])
        utilization = network_state.get("block_utilization", 0.5)
        hour = network_state.get("time_features", {}).get("hour", 12)
        pending_txs = network_state.get("pending_transactions", 1000)
        
        # Predict next block price
        base_prediction = self.model_parameters["hourly_patterns"].get(hour, self.model_parameters["mean_price"])
        
        # Adjust for current utilization
        util_adjustment = self.model_parameters["utilization_correlation"] * (utilization - 0.5)
        
        # Add trend component
        trend_adjustment = self.model_parameters["recent_trend"]
        
        next_block_price = base_prediction * (1 + util_adjustment) + trend_adjustment
        next_block_price = max(1.0, next_block_price)
        
        # Predict multiple horizons
        horizons = self.config["prediction_config"]["horizons"]
        predictions = {
            "next_block": next_block_price,
            "next_5_blocks": [next_block_price * (1 + random.gauss(0, 0.1)) for _ in range(5)],
            "next_hour": base_prediction * 1.05,
            "confidence_interval": [next_block_price * 0.9, next_block_price * 1.1]
        }
        
        # Optimization recommendations
        congestion_level = self._assess_congestion(utilization, pending_txs)
        recommended_fee = self._calculate_recommended_fee(next_block_price, congestion_level)
        
        optimization = {
            "recommended_fee": recommended_fee,
            "urgency_multiplier": self._get_urgency_multiplier(congestion_level),
            "congestion_level": congestion_level,
            "optimal_timing": self._get_optimal_timing(congestion_level, utilization)
        }
        
        # Market insights
        volatility = self.model_parameters["price_std"] / self.model_parameters["mean_price"]
        trend = "increasing" if trend_adjustment > 0 else "decreasing" if trend_adjustment < 0 else "stable"
        
        market_insights = {
            "trend": trend,
            "volatility": volatility,
            "seasonal_factor": base_prediction / self.model_parameters["mean_price"]
        }
        
        return {
            "predictions": predictions,
            "optimization": optimization,
            "market_insights": market_insights
        }
    
    def _assess_congestion(self, utilization: float, pending_txs: int) -> str:
        """Assess network congestion level"""
        thresholds = self.config["optimization_config"]["congestion_thresholds"]
        
        # Combine utilization and pending transactions
        congestion_score = 0.7 * utilization + 0.3 * min(1.0, pending_txs / 5000)
        
        if congestion_score >= thresholds.get("high", 0.8):
            return "critical" if congestion_score >= 0.9 else "high"
        elif congestion_score >= thresholds.get("medium", 0.6):
            return "medium"
        else:
            return "low"
    
    def _calculate_recommended_fee(self, base_fee: float, congestion_level: str) -> float:
        """Calculate recommended fee based on congestion"""
        multipliers = {
            "low": 0.9,
            "medium": 1.0,
            "high": 1.3,
            "critical": 1.8
        }
        
        return base_fee * multipliers.get(congestion_level, 1.0)
    
    def _get_urgency_multiplier(self, congestion_level: str) -> float:
        """Get urgency multiplier for fees"""
        multipliers = {
            "low": 1.0,
            "medium": 1.2,
            "high": 1.5,
            "critical": 2.0
        }
        
        return multipliers.get(congestion_level, 1.0)
    
    def _get_optimal_timing(self, congestion_level: str, utilization: float) -> str:
        """Get optimal timing recommendation"""
        if congestion_level in ["high", "critical"]:
            return "delay_30min" if utilization > 0.85 else "delay_5min"
        else:
            return "immediate"
    
    def _save_metrics(self, metrics: Dict[str, float]):
        """Save training metrics"""
        metrics_data = {
            "timestamp": datetime.now().isoformat(),
            "model_type": "feeflow_optimizer",
            "metrics": metrics,
            "config_summary": {
                "data_points": len(self.historical_data),
                "prediction_horizons": list(self.config["prediction_config"]["horizons"].keys())
            }
        }
        
        try:
            with open("metrics.json", "w") as f:
                json.dump(metrics_data, f, indent=2)
            print("Metrics saved to metrics.json")
        except Exception as e:
            print(f"Warning: Could not save metrics: {e}")


def main():
    """Main function"""
    print("FeeFlow Optimizer - Gas Fee Prediction")
    print("=" * 45)
    
    model = SimpleFeeFlowModel()
    
    # Train
    metrics = model.train()
    
    # Test prediction
    print("\nTesting prediction...")
    test_network_state = {
        "current_gas_price": 25.0,
        "block_utilization": 0.7,
        "pending_transactions": 3500,
        "mempool_size": 15000,
        "time_features": {
            "hour": 14,
            "day_of_week": 2,
            "is_weekend": False
        }
    }
    
    result = model.predict(test_network_state)
    print(f"Prediction result:")
    print(f"  Next block price: {result['predictions']['next_block']:.2f} gwei")
    print(f"  Recommended fee: {result['optimization']['recommended_fee']:.2f} gwei")
    print(f"  Congestion level: {result['optimization']['congestion_level']}")
    print(f"  Optimal timing: {result['optimization']['optimal_timing']}")
    print(f"  Market trend: {result['market_insights']['trend']}")
    
    print("\nTraining completed successfully!")


if __name__ == "__main__":
    main()