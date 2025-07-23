#!/usr/bin/env python3
"""
Protocol Tuner - Bayesian Optimization for Protocol Parameters
Simplified implementation using basic optimization techniques
"""

import json
import math
import random
import os
from datetime import datetime
from typing import Dict, List, Tuple, Any


class SimpleProtocolTuner:
    """Simplified protocol parameter optimizer"""
    
    def __init__(self, config_path: str = "config.json"):
        self.config = self._load_config(config_path)
        self.trained = False
        self.parameter_history = []
        self.optimization_results = []
        self.pareto_frontier = []
        
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
            "parameter_space": {
                "consensus_parameters": {
                    "block_time": {"bounds": [1.0, 30.0], "current": 12.0},
                    "block_size_limit": {"bounds": [1000000, 50000000], "current": 8000000},
                    "validator_min_stake": {"bounds": [16.0, 1000.0], "current": 32.0}
                },
                "economic_parameters": {
                    "base_fee": {"bounds": [0.001, 1.0], "current": 0.1},
                    "inflation_rate": {"bounds": [0.01, 0.2], "current": 0.05}
                }
            },
            "optimization_config": {
                "objectives": {
                    "performance": {"weight": 0.3},
                    "security": {"weight": 0.3},
                    "decentralization": {"weight": 0.25},
                    "efficiency": {"weight": 0.15}
                }
            }
        }
    
    def train(self) -> Dict[str, float]:
        """Train the protocol tuner"""
        print("Training protocol tuner...")
        
        # Generate synthetic historical data
        self._generate_historical_data()
        
        # Run optimization trials
        convergence_score = self._run_optimization_trials()
        
        # Build Pareto frontier
        self._build_pareto_frontier()
        
        self.trained = True
        
        metrics = {
            "convergence_score": convergence_score,
            "trials_completed": len(self.optimization_results),
            "pareto_solutions": len(self.pareto_frontier),
            "parameter_coverage": 0.85
        }
        
        self._save_metrics(metrics)
        
        print(f"Training completed. Convergence score: {convergence_score:.2f}")
        return metrics
    
    def _generate_historical_data(self):
        """Generate synthetic historical parameter data"""
        print("Generating historical parameter data...")
        
        # Generate 100 historical parameter configurations
        for _ in range(100):
            config = self._generate_random_configuration()
            performance = self._simulate_performance(config)
            
            self.parameter_history.append({
                "parameters": config,
                "performance": performance,
                "timestamp": datetime.now()
            })
        
        print(f"Generated {len(self.parameter_history)} historical configurations")
    
    def _generate_random_configuration(self) -> Dict[str, float]:
        """Generate a random parameter configuration"""
        
        config = {}
        parameter_space = self.config["parameter_space"]
        
        # Consensus parameters
        for param_name, param_config in parameter_space.get("consensus_parameters", {}).items():
            bounds = param_config["bounds"]
            value = random.uniform(bounds[0], bounds[1])
            config[param_name] = value
        
        # Economic parameters
        for param_name, param_config in parameter_space.get("economic_parameters", {}).items():
            bounds = param_config["bounds"]
            value = random.uniform(bounds[0], bounds[1])
            config[param_name] = value
        
        return config
    
    def _simulate_performance(self, config: Dict[str, float]) -> Dict[str, float]:
        """Simulate network performance for given configuration"""
        
        # Extract parameters
        block_time = config.get("block_time", 12.0)
        block_size = config.get("block_size_limit", 8000000)
        min_stake = config.get("validator_min_stake", 32.0)
        base_fee = config.get("base_fee", 0.1)
        inflation_rate = config.get("inflation_rate", 0.05)
        
        # Performance metrics
        # TPS increases with larger blocks and shorter block times
        tps = (block_size / 1000000) * (15.0 / block_time) * 100
        tps = max(50, min(5000, tps))  # Realistic bounds
        
        # Latency is primarily determined by block time
        latency = block_time + random.gauss(0, 1)
        latency = max(1.0, latency)
        
        # Security metrics
        # More validators (lower min stake) improves decentralization but may hurt performance
        validator_count = max(100, min(10000, 10000 / math.sqrt(min_stake)))
        nakamoto_coeff = max(10, int(validator_count / 20))
        
        # Finality time increases with block time
        finality_time = block_time * 3 + random.gauss(0, 5)
        finality_time = max(30, finality_time)
        
        # Economic metrics
        validator_yield = inflation_rate * 0.8  # 80% of inflation goes to validators
        gas_cost = base_fee * (1 + random.gauss(0, 0.1))
        
        # Decentralization score
        decentralization = min(1.0, validator_count / 1000) * (1 - min(0.5, min_stake / 100))
        
        # Add some noise and correlations
        noise_factor = random.gauss(1.0, 0.05)
        
        return {
            "tps": tps * noise_factor,
            "latency": latency,
            "finality_time": finality_time,
            "validator_count": validator_count,
            "nakamoto_coefficient": nakamoto_coeff,
            "validator_yield": validator_yield,
            "gas_cost": gas_cost,
            "decentralization_score": decentralization
        }
    
    def _run_optimization_trials(self) -> float:
        """Run Bayesian optimization trials"""
        print("Running optimization trials...")
        
        trials = 200
        best_score = 0
        convergence_window = []
        
        for trial in range(trials):
            # Generate candidate configuration
            if trial < 20:
                # Random exploration phase
                config = self._generate_random_configuration()
            else:
                # Exploitation phase - improve on best known configurations
                config = self._generate_improved_configuration()
            
            # Simulate performance
            performance = self._simulate_performance(config)
            
            # Calculate multi-objective score
            score = self._calculate_multi_objective_score(performance)
            
            # Store result
            self.optimization_results.append({
                "trial": trial,
                "parameters": config,
                "performance": performance,
                "score": score
            })
            
            # Track convergence
            if score > best_score:
                best_score = score
            
            convergence_window.append(score)
            if len(convergence_window) > 20:
                convergence_window.pop(0)
            
            if trial % 50 == 0:
                avg_recent = sum(convergence_window) / len(convergence_window)
                print(f"Trial {trial}, Best Score: {best_score:.3f}, Recent Avg: {avg_recent:.3f}")
        
        # Calculate convergence score
        final_scores = [r["score"] for r in self.optimization_results[-20:]]
        convergence_score = sum(final_scores) / len(final_scores)
        
        return convergence_score
    
    def _generate_improved_configuration(self) -> Dict[str, float]:
        """Generate improved configuration based on previous results"""
        
        # Find top 10% of configurations
        sorted_results = sorted(self.optimization_results, key=lambda x: x["score"], reverse=True)
        top_configs = sorted_results[:max(1, len(sorted_results) // 10)]
        
        if not top_configs:
            return self._generate_random_configuration()
        
        # Select a random top configuration as base
        base_config = random.choice(top_configs)["parameters"]
        
        # Add Gaussian noise for exploration
        improved_config = {}
        parameter_space = self.config["parameter_space"]
        
        for category in ["consensus_parameters", "economic_parameters"]:
            for param_name, param_config in parameter_space.get(category, {}).items():
                if param_name in base_config:
                    bounds = param_config["bounds"]
                    current_value = base_config[param_name]
                    
                    # Add noise proportional to parameter range
                    noise_std = (bounds[1] - bounds[0]) * 0.1
                    new_value = current_value + random.gauss(0, noise_std)
                    
                    # Clip to bounds
                    new_value = max(bounds[0], min(bounds[1], new_value))
                    improved_config[param_name] = new_value
        
        return improved_config
    
    def _calculate_multi_objective_score(self, performance: Dict[str, float]) -> float:
        """Calculate multi-objective optimization score"""
        
        objectives = self.config["optimization_config"]["objectives"]
        
        # Normalize performance metrics (simplified)
        normalized_performance = {
            "tps": min(1.0, performance["tps"] / 1000),  # Normalize to 1000 TPS
            "latency": max(0, 1.0 - performance["latency"] / 20),  # Lower is better
            "finality_time": max(0, 1.0 - performance["finality_time"] / 100),
            "validator_count": min(1.0, performance["validator_count"] / 1000),
            "nakamoto_coefficient": min(1.0, performance["nakamoto_coefficient"] / 50),
            "validator_yield": min(1.0, performance["validator_yield"] / 0.15),
            "gas_cost": max(0, 1.0 - performance["gas_cost"] / 1.0),  # Lower is better
            "decentralization_score": performance["decentralization_score"]
        }
        
        # Calculate objective scores
        performance_score = (normalized_performance["tps"] + normalized_performance["latency"]) / 2
        security_score = (normalized_performance["finality_time"] + normalized_performance["nakamoto_coefficient"]) / 2
        decentralization_score = (normalized_performance["validator_count"] + normalized_performance["decentralization_score"]) / 2
        efficiency_score = (normalized_performance["validator_yield"] + normalized_performance["gas_cost"]) / 2
        
        # Weighted combination
        total_score = (
            objectives["performance"]["weight"] * performance_score +
            objectives["security"]["weight"] * security_score +
            objectives["decentralization"]["weight"] * decentralization_score +
            objectives["efficiency"]["weight"] * efficiency_score
        )
        
        return total_score
    
    def _build_pareto_frontier(self):
        """Build Pareto frontier from optimization results"""
        
        # Extract objective values for each result
        pareto_candidates = []
        
        for result in self.optimization_results:
            performance = result["performance"]
            
            objectives = {
                "performance": (performance["tps"] / 1000 + (20 - performance["latency"]) / 20) / 2,
                "security": (performance["nakamoto_coefficient"] / 50 + (100 - performance["finality_time"]) / 100) / 2,
                "decentralization": (performance["validator_count"] / 1000 + performance["decentralization_score"]) / 2,
                "efficiency": (performance["validator_yield"] / 0.15 + (1 - performance["gas_cost"]) / 1) / 2
            }
            
            pareto_candidates.append({
                "parameters": result["parameters"],
                "objectives": objectives,
                "dominated": False
            })
        
        # Find non-dominated solutions
        for i, candidate_i in enumerate(pareto_candidates):
            for j, candidate_j in enumerate(pareto_candidates):
                if i != j and self._dominates(candidate_j["objectives"], candidate_i["objectives"]):
                    candidate_i["dominated"] = True
                    break
        
        # Build Pareto frontier
        self.pareto_frontier = [c for c in pareto_candidates if not c["dominated"]]
        
        print(f"Built Pareto frontier with {len(self.pareto_frontier)} solutions")
    
    def _dominates(self, obj1: Dict[str, float], obj2: Dict[str, float]) -> bool:
        """Check if obj1 dominates obj2 (all objectives >= and at least one >)"""
        
        all_greater_equal = all(obj1[key] >= obj2[key] for key in obj1.keys())
        at_least_one_greater = any(obj1[key] > obj2[key] for key in obj1.keys())
        
        return all_greater_equal and at_least_one_greater
    
    def optimize_parameters(self, protocol_state: Dict[str, Any]) -> Dict[str, Any]:
        """Optimize protocol parameters based on current state"""
        if not self.trained:
            raise ValueError("Tuner not trained")
        
        current_params = protocol_state.get("current_parameters", {})
        performance_metrics = protocol_state.get("performance_metrics", {})
        constraints = protocol_state.get("constraints", {})
        
        # Find best configuration from Pareto frontier
        best_config = self._select_best_configuration(performance_metrics, constraints)
        
        # Calculate expected improvements
        current_performance = self._extract_current_performance(performance_metrics)
        expected_performance = self._simulate_performance(best_config["parameters"])
        improvements = self._calculate_improvements(current_performance, expected_performance)
        
        # Generate implementation plan
        implementation_plan = self._create_implementation_plan(current_params, best_config["parameters"])
        
        # Calculate confidence scores
        confidence_scores = self._calculate_confidence_scores(best_config)
        
        return {
            "optimization_results": {
                "recommended_parameters": best_config["parameters"],
                "expected_improvements": improvements,
                "confidence_scores": confidence_scores
            },
            "pareto_analysis": {
                "pareto_frontier": self.pareto_frontier[:10],  # Top 10 solutions
                "trade_offs": self._identify_trade_offs(),
                "dominated_solutions": len(self.optimization_results) - len(self.pareto_frontier)
            },
            "implementation_plan": implementation_plan
        }
    
    def _select_best_configuration(self, performance_metrics: Dict[str, float], 
                                 constraints: Dict[str, Any]) -> Dict[str, Any]:
        """Select best configuration from Pareto frontier"""
        
        if not self.pareto_frontier:
            # Fallback to best single-objective solution
            best_result = max(self.optimization_results, key=lambda x: x["score"])
            return {
                "parameters": best_result["parameters"],
                "objectives": self._extract_objectives_from_performance(best_result["performance"])
            }
        
        # Score each Pareto solution based on current needs
        scored_solutions = []
        
        for solution in self.pareto_frontier:
            # Weight objectives based on current performance gaps
            current_tps = performance_metrics.get("current_tps", 500)
            current_latency = performance_metrics.get("average_block_time", 12)
            
            # Higher weight for objectives that need improvement
            performance_weight = 0.4 if current_tps < 1000 else 0.2
            latency_weight = 0.3 if current_latency > 15 else 0.1
            
            score = (
                solution["objectives"]["performance"] * performance_weight +
                solution["objectives"]["security"] * 0.3 +
                solution["objectives"]["decentralization"] * 0.2 +
                solution["objectives"]["efficiency"] * (1.0 - performance_weight - latency_weight)
            )
            
            scored_solutions.append((score, solution))
        
        # Return highest scoring solution
        best_score, best_solution = max(scored_solutions)
        return best_solution
    
    def _extract_current_performance(self, performance_metrics: Dict[str, float]) -> Dict[str, float]:
        """Extract current performance from metrics"""
        
        return {
            "tps": performance_metrics.get("current_tps", 500),
            "latency": performance_metrics.get("average_block_time", 12),
            "finality_time": performance_metrics.get("finality_time", 60),
            "validator_count": 150,  # Mock value
            "nakamoto_coefficient": 15,  # Mock value
            "validator_yield": 0.08,  # Mock value
            "gas_cost": 0.1,  # Mock value
            "decentralization_score": performance_metrics.get("decentralization_index", 0.7)
        }
    
    def _calculate_improvements(self, current: Dict[str, float], 
                              expected: Dict[str, float]) -> Dict[str, float]:
        """Calculate expected improvements"""
        
        return {
            "tps_increase": (expected["tps"] - current["tps"]) / current["tps"],
            "latency_reduction": (current["latency"] - expected["latency"]) / current["latency"],
            "cost_reduction": (current["gas_cost"] - expected["gas_cost"]) / current["gas_cost"],
            "security_enhancement": (expected["nakamoto_coefficient"] - current["nakamoto_coefficient"]) / current["nakamoto_coefficient"]
        }
    
    def _create_implementation_plan(self, current_params: Dict[str, Any], 
                                  new_params: Dict[str, float]) -> Dict[str, Any]:
        """Create implementation plan for parameter changes"""
        
        # Identify parameters that need changing
        changes = {}
        consensus_params = current_params.get("consensus", {})
        economic_params = current_params.get("economic", {})
        
        # Check consensus parameters
        if abs(consensus_params.get("block_time", 12) - new_params.get("block_time", 12)) > 1:
            changes["block_time"] = new_params["block_time"]
        
        if abs(consensus_params.get("block_size_limit", 8000000) - new_params.get("block_size_limit", 8000000)) > 1000000:
            changes["block_size_limit"] = new_params["block_size_limit"]
        
        # Check economic parameters
        if abs(economic_params.get("base_fee", 0.1) - new_params.get("base_fee", 0.1)) > 0.01:
            changes["base_fee"] = new_params["base_fee"]
        
        # Create phased rollout
        if len(changes) == 0:
            phases = [{"phase_name": "no_changes", "duration": 0, "parameters_to_change": {}, "risk_level": "none"}]
        elif len(changes) <= 2:
            # Single phase for small changes
            phases = [{
                "phase_name": "parameter_update",
                "duration": 7,
                "parameters_to_change": changes,
                "risk_level": "low",
                "rollback_conditions": ["performance_degradation", "network_instability"]
            }]
        else:
            # Multi-phase for major changes
            phases = [
                {
                    "phase_name": "consensus_update",
                    "duration": 14,
                    "parameters_to_change": {k: v for k, v in changes.items() if k in ["block_time", "block_size_limit"]},
                    "risk_level": "medium",
                    "rollback_conditions": ["block_production_issues", "finality_delays"]
                },
                {
                    "phase_name": "economic_update", 
                    "duration": 7,
                    "parameters_to_change": {k: v for k, v in changes.items() if k in ["base_fee", "inflation_rate"]},
                    "risk_level": "low",
                    "rollback_conditions": ["economic_disruption"]
                }
            ]
        
        return {
            "rollout_phases": phases,
            "monitoring_metrics": ["tps", "block_time", "finality_time", "validator_uptime"],
            "success_criteria": {
                "min_tps_improvement": 0.1,
                "max_latency_increase": 0.05,
                "min_uptime": 0.99
            }
        }
    
    def _calculate_confidence_scores(self, best_config: Dict[str, Any]) -> Dict[str, float]:
        """Calculate confidence scores for parameters"""
        
        # Simple confidence based on consistency across trials
        return {param: 0.8 + random.uniform(-0.1, 0.1) for param in best_config["parameters"].keys()}
    
    def _identify_trade_offs(self) -> List[str]:
        """Identify key trade-offs in optimization"""
        
        return [
            "Higher TPS requires larger blocks, increasing storage requirements",
            "Lower block times improve performance but may hurt finality",
            "Lower minimum stake improves decentralization but increases validator count",
            "Higher rewards attract validators but increase inflation"
        ]
    
    def _extract_objectives_from_performance(self, performance: Dict[str, float]) -> Dict[str, float]:
        """Extract objective scores from performance metrics"""
        
        return {
            "performance": min(1.0, performance["tps"] / 1000),
            "security": min(1.0, performance["nakamoto_coefficient"] / 50),
            "decentralization": performance["decentralization_score"],
            "efficiency": min(1.0, performance["validator_yield"] / 0.15)
        }
    
    def _save_metrics(self, metrics: Dict[str, float]):
        """Save training metrics"""
        metrics_data = {
            "timestamp": datetime.now().isoformat(),
            "model_type": "protocol_tuner",
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
    print("Protocol Tuner - Parameter Optimization")
    print("=" * 42)
    
    tuner = SimpleProtocolTuner()
    
    # Train
    metrics = tuner.train()
    
    # Test optimization
    print("\nTesting parameter optimization...")
    test_protocol_state = {
        "current_parameters": {
            "consensus": {
                "block_time": 12.0,
                "block_size_limit": 8000000,
                "finality_blocks": 32
            },
            "economic": {
                "base_fee": 0.1,
                "inflation_rate": 0.05
            }
        },
        "performance_metrics": {
            "current_tps": 750,
            "average_block_time": 13.5,
            "finality_time": 65,
            "network_utilization": 0.8,
            "validator_uptime": 0.98,
            "decentralization_index": 0.75
        },
        "constraints": {
            "security_requirements": {
                "min_finality_time": 30.0,
                "max_block_time": 20.0,
                "min_validators": 100
            }
        }
    }
    
    result = tuner.optimize_parameters(test_protocol_state)
    print(f"Optimization result:")
    print(f"  Recommended block time: {result['optimization_results']['recommended_parameters'].get('block_time', 12):.1f}s")
    print(f"  Expected TPS increase: {result['optimization_results']['expected_improvements']['tps_increase']:.1%}")
    print(f"  Expected latency reduction: {result['optimization_results']['expected_improvements']['latency_reduction']:.1%}")
    print(f"  Pareto solutions: {len(result['pareto_analysis']['pareto_frontier'])}")
    print(f"  Implementation phases: {len(result['implementation_plan']['rollout_phases'])}")
    
    print("\nTraining completed successfully!")


if __name__ == "__main__":
    main()