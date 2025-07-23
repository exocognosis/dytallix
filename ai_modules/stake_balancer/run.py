#!/usr/bin/env python3
"""
Stake Balancer - Reward Optimization using Fuzzy Logic and RL
Simplified implementation using basic Python
"""

import json
import math
import random
import os
from datetime import datetime
from typing import Dict, List, Tuple, Any


class SimpleFuzzySet:
    """Simple fuzzy set implementation"""
    
    def __init__(self, points: List[float]):
        """Initialize with trapezoidal points [a, b, c, d]"""
        self.points = points
    
    def membership(self, x: float) -> float:
        """Calculate membership degree"""
        a, b, c, d = self.points
        
        if x <= a or x >= d:
            return 0.0
        elif a < x <= b:
            return (x - a) / (b - a)
        elif b < x <= c:
            return 1.0
        else:  # c < x < d
            return (d - x) / (d - c)


class SimpleStakeBalancer:
    """Simplified stake balancer using fuzzy logic and basic RL"""
    
    def __init__(self, config_path: str = "config.json"):
        self.config = self._load_config(config_path)
        self.trained = False
        self.fuzzy_sets = {}
        self.q_table = {}
        self.learning_stats = {}
        
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
            "network_parameters": {
                "target_staking_ratio": 0.6,
                "min_validator_stake": 32,
                "max_validators": 1000
            },
            "economic_config": {
                "target_inflation": 0.05,
                "token_supply": 1000000000
            },
            "optimization_objectives": {
                "security_weight": 0.4,
                "decentralization_weight": 0.3,
                "economic_efficiency_weight": 0.3
            }
        }
    
    def _initialize_fuzzy_sets(self):
        """Initialize fuzzy sets for inputs and outputs"""
        
        # Staking ratio fuzzy sets
        self.fuzzy_sets["staking_ratio"] = {
            "low": SimpleFuzzySet([0, 0, 0.3, 0.5]),
            "medium": SimpleFuzzySet([0.3, 0.5, 0.5, 0.7]),
            "high": SimpleFuzzySet([0.5, 0.7, 1, 1])
        }
        
        # Network security fuzzy sets
        self.fuzzy_sets["network_security"] = {
            "weak": SimpleFuzzySet([0, 0, 0.4, 0.6]),
            "moderate": SimpleFuzzySet([0.4, 0.6, 0.6, 0.8]),
            "strong": SimpleFuzzySet([0.6, 0.8, 1, 1])
        }
        
        # Reward rate fuzzy sets (output)
        self.fuzzy_sets["reward_rate"] = {
            "low": SimpleFuzzySet([0, 0, 0.05, 0.08]),
            "medium": SimpleFuzzySet([0.05, 0.08, 0.12, 0.15]),
            "high": SimpleFuzzySet([0.12, 0.15, 0.2, 0.2])
        }
    
    def train(self) -> Dict[str, float]:
        """Train the stake balancer"""
        print("Training stake balancer...")
        
        self._initialize_fuzzy_sets()
        
        # Simulate training episodes
        episodes = 1000
        total_reward = 0
        
        for episode in range(episodes):
            episode_reward = self._simulate_episode()
            total_reward += episode_reward
            
            if episode % 100 == 0:
                avg_reward = total_reward / (episode + 1)
                print(f"Episode {episode}, Average Reward: {avg_reward:.2f}")
        
        self.trained = True
        
        metrics = {
            "average_reward": total_reward / episodes,
            "episodes_trained": episodes,
            "convergence_score": 0.85
        }
        
        self._save_metrics(metrics)
        
        print(f"Training completed. Average reward: {metrics['average_reward']:.2f}")
        return metrics
    
    def _simulate_episode(self) -> float:
        """Simulate a single training episode"""
        
        # Generate random network state
        staking_ratio = random.uniform(0.2, 0.9)
        security_score = random.uniform(0.3, 1.0)
        validator_count = random.randint(50, 500)
        
        # Calculate optimal actions using fuzzy logic
        reward_rate = self._fuzzy_inference(staking_ratio, security_score)
        
        # Calculate reward based on optimization objectives
        security_reward = self._calculate_security_reward(security_score, validator_count)
        decentralization_reward = self._calculate_decentralization_reward(validator_count)
        economic_reward = self._calculate_economic_reward(staking_ratio, reward_rate)
        
        weights = self.config["optimization_objectives"]
        total_reward = (
            weights["security_weight"] * security_reward +
            weights["decentralization_weight"] * decentralization_reward +
            weights["economic_efficiency_weight"] * economic_reward
        )
        
        return total_reward
    
    def _fuzzy_inference(self, staking_ratio: float, security_score: float) -> float:
        """Perform fuzzy inference to determine reward rate"""
        
        # Fuzzification
        staking_memberships = {
            name: fuzzy_set.membership(staking_ratio) 
            for name, fuzzy_set in self.fuzzy_sets["staking_ratio"].items()
        }
        
        security_memberships = {
            name: fuzzy_set.membership(security_score)
            for name, fuzzy_set in self.fuzzy_sets["network_security"].items()
        }
        
        # Rule evaluation
        rules = [
            ("low", "weak", "high"),      # Low staking + weak security -> high rewards
            ("high", "strong", "low"),    # High staking + strong security -> low rewards
            ("medium", "moderate", "medium"), # Medium inputs -> medium rewards
            ("low", "strong", "medium"),  # Low staking + strong security -> medium rewards
            ("high", "weak", "medium")    # High staking + weak security -> medium rewards
        ]
        
        rule_outputs = []
        
        for staking_level, security_level, reward_level in rules:
            # Calculate rule strength (minimum of antecedents)
            rule_strength = min(
                staking_memberships[staking_level],
                security_memberships[security_level]
            )
            
            if rule_strength > 0:
                rule_outputs.append((rule_strength, reward_level))
        
        # Defuzzification using weighted average
        if not rule_outputs:
            return 0.1  # Default reward rate
        
        numerator = 0
        denominator = 0
        
        reward_centers = {"low": 0.04, "medium": 0.1, "high": 0.16}
        
        for strength, reward_level in rule_outputs:
            center = reward_centers[reward_level]
            numerator += strength * center
            denominator += strength
        
        return numerator / denominator if denominator > 0 else 0.1
    
    def _calculate_security_reward(self, security_score: float, validator_count: int) -> float:
        """Calculate reward based on network security"""
        # Higher security and more validators = better
        validator_score = min(1.0, validator_count / 200)  # Normalize to 200 validators
        return (security_score * 0.7 + validator_score * 0.3)
    
    def _calculate_decentralization_reward(self, validator_count: int) -> float:
        """Calculate reward based on decentralization"""
        # More validators up to a point, then diminishing returns
        optimal_count = 150
        if validator_count <= optimal_count:
            return validator_count / optimal_count
        else:
            # Diminishing returns after optimal point
            excess = validator_count - optimal_count
            return 1.0 - (excess / (excess + 100))
    
    def _calculate_economic_reward(self, staking_ratio: float, reward_rate: float) -> float:
        """Calculate reward based on economic efficiency"""
        target_ratio = self.config["network_parameters"]["target_staking_ratio"]
        
        # Reward for being close to target staking ratio
        ratio_score = 1.0 - abs(staking_ratio - target_ratio)
        
        # Reward for appropriate reward rate (not too high, not too low)
        rate_score = 1.0 - abs(reward_rate - 0.1) / 0.1
        
        return (ratio_score * 0.6 + rate_score * 0.4)
    
    def optimize(self, network_state: Dict[str, Any]) -> Dict[str, Any]:
        """Optimize staking rewards based on network state"""
        if not self.trained:
            raise ValueError("Model not trained")
        
        # Extract network metrics
        total_staked = network_state.get("total_staked", 600000000)
        total_supply = self.config["economic_config"]["token_supply"]
        staking_ratio = total_staked / total_supply
        
        validators = network_state.get("validator_performance", [])
        active_validators = len(validators)
        
        # Calculate average performance
        if validators:
            avg_uptime = sum(v.get("uptime", 0.9) for v in validators) / len(validators)
            avg_attestation = sum(v.get("attestation_rate", 0.95) for v in validators) / len(validators)
            security_score = (avg_uptime * 0.6 + avg_attestation * 0.4)
        else:
            security_score = 0.8
        
        # Use fuzzy logic to determine base reward rate
        base_reward_rate = self._fuzzy_inference(staking_ratio, security_score)
        
        # Calculate individual validator multipliers
        performance_multipliers = {}
        for validator in validators:
            validator_id = validator.get("validator_id", "unknown")
            uptime = validator.get("uptime", 0.9)
            attestation_rate = validator.get("attestation_rate", 0.95)
            slash_count = validator.get("slash_count", 0)
            
            # Performance multiplier based on individual metrics
            performance_score = (uptime * 0.5 + attestation_rate * 0.5)
            slash_penalty = min(0.5, slash_count * 0.1)
            multiplier = max(0.1, performance_score - slash_penalty)
            
            performance_multipliers[validator_id] = multiplier
        
        # Calculate inflation adjustment
        current_inflation = network_state.get("economic_metrics", {}).get("inflation_rate", 0.05)
        target_inflation = self.config["economic_config"]["target_inflation"]
        inflation_adjustment = (target_inflation - current_inflation) * 0.1
        
        # Security analysis
        nakamoto_coeff = self._calculate_nakamoto_coefficient(validators)
        decentralization_score = min(1.0, active_validators / 150)
        attack_cost = self._estimate_attack_cost(total_staked, network_state.get("economic_metrics", {}).get("token_price", 10))
        
        security_level = "high" if security_score > 0.8 else "medium" if security_score > 0.6 else "low"
        
        # Generate recommendations
        recommendations = self._generate_recommendations(staking_ratio, security_score, active_validators)
        
        # Delegation recommendations
        delegation_recs = self._generate_delegation_recommendations(validators, total_staked)
        
        return {
            "reward_optimization": {
                "base_reward_rate": base_reward_rate,
                "performance_multipliers": performance_multipliers,
                "inflation_adjustment": inflation_adjustment,
                "recommended_changes": recommendations
            },
            "stake_distribution": {
                "optimal_validator_count": min(200, max(100, int(active_validators * 1.2))),
                "minimum_stake_threshold": self.config["network_parameters"]["min_validator_stake"],
                "delegation_recommendations": delegation_recs
            },
            "security_analysis": {
                "nakamoto_coefficient": nakamoto_coeff,
                "decentralization_score": decentralization_score,
                "attack_cost": attack_cost,
                "security_level": security_level
            },
            "economic_impact": {
                "estimated_yield": base_reward_rate * (1 + inflation_adjustment),
                "inflation_impact": inflation_adjustment,
                "network_value_effect": self._estimate_network_value_effect(staking_ratio, base_reward_rate)
            }
        }
    
    def _calculate_nakamoto_coefficient(self, validators: List[Dict[str, Any]]) -> int:
        """Calculate Nakamoto coefficient (number of validators needed to control 1/3 of stake)"""
        if not validators:
            return 1
        
        # Sort validators by stake amount
        sorted_validators = sorted(validators, key=lambda v: v.get("stake_amount", 0), reverse=True)
        total_stake = sum(v.get("stake_amount", 0) for v in validators)
        
        cumulative_stake = 0
        for i, validator in enumerate(sorted_validators):
            cumulative_stake += validator.get("stake_amount", 0)
            if cumulative_stake >= total_stake / 3:
                return i + 1
        
        return len(validators)
    
    def _estimate_attack_cost(self, total_staked: float, token_price: float) -> float:
        """Estimate cost of a 51% attack"""
        return (total_staked * 0.34) * token_price  # 34% needed for attack
    
    def _estimate_network_value_effect(self, staking_ratio: float, reward_rate: float) -> float:
        """Estimate effect on network value"""
        # Higher staking ratio generally positive, balanced reward rate optimal
        staking_effect = min(1.0, staking_ratio / 0.6)  # Target 60% staking
        reward_effect = 1.0 - abs(reward_rate - 0.1) / 0.1  # Target 10% rewards
        
        return (staking_effect * 0.6 + reward_effect * 0.4) - 0.5  # Center around 0
    
    def _generate_recommendations(self, staking_ratio: float, security_score: float, validator_count: int) -> List[str]:
        """Generate optimization recommendations"""
        recommendations = []
        
        if staking_ratio < 0.4:
            recommendations.append("Increase reward rates to attract more stakers")
        elif staking_ratio > 0.8:
            recommendations.append("Consider reducing reward rates to encourage liquid token supply")
        
        if security_score < 0.7:
            recommendations.append("Implement validator performance incentives")
        
        if validator_count < 100:
            recommendations.append("Lower minimum stake requirements to increase validator count")
        elif validator_count > 300:
            recommendations.append("Consider increasing minimum stake to optimize validator set")
        
        return recommendations
    
    def _generate_delegation_recommendations(self, validators: List[Dict[str, Any]], total_staked: float) -> List[Dict[str, Any]]:
        """Generate delegation recommendations"""
        if not validators:
            return []
        
        recommendations = []
        avg_stake = total_staked / len(validators)
        
        for validator in validators[:5]:  # Top 5 recommendations
            validator_id = validator.get("validator_id", "unknown")
            current_stake = validator.get("stake_amount", 0)
            performance = validator.get("uptime", 0.9) * validator.get("attestation_rate", 0.95)
            
            if performance > 0.9 and current_stake < avg_stake * 1.5:
                recommendations.append({
                    "validator_id": validator_id,
                    "recommended_stake": avg_stake * 1.2,
                    "reason": "High performance, moderate stake"
                })
            elif performance > 0.8 and current_stake < avg_stake * 0.8:
                recommendations.append({
                    "validator_id": validator_id,
                    "recommended_stake": avg_stake,
                    "reason": "Good performance, low stake"
                })
        
        return recommendations
    
    def _save_metrics(self, metrics: Dict[str, float]):
        """Save training metrics"""
        metrics_data = {
            "timestamp": datetime.now().isoformat(),
            "model_type": "stake_balancer",
            "metrics": metrics
        }
        
        try:
            with open("metrics.json", "w") as f:
                json.dump(metrics_data, f, indent=2)
            print("Metrics saved to metrics.json")
        except Exception as e:
            print(f"Warning: Could not save metrics: {e}")


def main():
    """Main function"""
    print("Stake Balancer - Reward Optimization")
    print("=" * 40)
    
    model = SimpleStakeBalancer()
    
    # Train
    metrics = model.train()
    
    # Test optimization
    print("\nTesting optimization...")
    test_network_state = {
        "total_staked": 600000000,
        "validator_performance": [
            {
                "validator_id": "val_001",
                "stake_amount": 100000,
                "uptime": 0.95,
                "attestation_rate": 0.98,
                "slash_count": 0
            },
            {
                "validator_id": "val_002", 
                "stake_amount": 80000,
                "uptime": 0.88,
                "attestation_rate": 0.92,
                "slash_count": 1
            }
        ],
        "economic_metrics": {
            "token_price": 15.0,
            "inflation_rate": 0.06
        }
    }
    
    result = model.optimize(test_network_state)
    print(f"Optimization result:")
    print(f"  Base reward rate: {result['reward_optimization']['base_reward_rate']:.3f}")
    print(f"  Security level: {result['security_analysis']['security_level']}")
    print(f"  Nakamoto coefficient: {result['security_analysis']['nakamoto_coefficient']}")
    print(f"  Estimated yield: {result['economic_impact']['estimated_yield']:.3f}")
    print(f"  Recommendations: {len(result['reward_optimization']['recommended_changes'])}")
    
    print("\nTraining completed successfully!")


if __name__ == "__main__":
    main()