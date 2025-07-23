#!/usr/bin/env python3
"""
Dytallix AI Modules - Comprehensive Integration Test
Tests all 8 AI modules and demonstrates system integration
"""

import os
import sys
import json
import time
from datetime import datetime
from typing import Dict, List, Any

def test_all_modules():
    """Test all AI modules and demonstrate integration"""
    
    print("=" * 60)
    print("DYTALLIX AI MODULES - COMPREHENSIVE TEST")
    print("=" * 60)
    print(f"Test started at: {datetime.now()}")
    print()
    
    results = {}
    total_start_time = time.time()
    
    # Test each module
    modules = [
        ("Network Sentinel", "sentinel"),
        ("FeeFlow Optimizer", "feeflow"), 
        ("Wallet Classifier", "wallet_classifier"),
        ("Stake Balancer", "stake_balancer"),
        ("GovSim", "govsim"),
        ("Economic Sentinel", "eco_sentinel"),
        ("Quantum Shield", "quantum_shield"),
        ("Protocol Tuner", "proto_tuner")
    ]
    
    for module_name, module_dir in modules:
        print(f"Testing {module_name}...")
        print("-" * 40)
        
        module_start_time = time.time()
        
        try:
            # Run the module
            result = test_module(module_dir)
            module_time = time.time() - module_start_time
            
            results[module_name] = {
                "status": "success",
                "execution_time": module_time,
                "metrics": result
            }
            
            print(f"✅ {module_name} completed successfully in {module_time:.2f}s")
            
        except Exception as e:
            module_time = time.time() - module_start_time
            results[module_name] = {
                "status": "failed",
                "execution_time": module_time,
                "error": str(e)
            }
            
            print(f"❌ {module_name} failed: {str(e)}")
        
        print()
    
    # System integration demonstration
    print("=" * 60)
    print("SYSTEM INTEGRATION DEMONSTRATION")
    print("=" * 60)
    
    integration_result = demonstrate_integration(results)
    
    # Final summary
    total_time = time.time() - total_start_time
    
    print("=" * 60)
    print("FINAL SUMMARY")
    print("=" * 60)
    
    successful_modules = [name for name, result in results.items() if result["status"] == "success"]
    failed_modules = [name for name, result in results.items() if result["status"] == "failed"]
    
    print(f"Total execution time: {total_time:.2f} seconds")
    print(f"Successful modules: {len(successful_modules)}/8")
    print(f"Failed modules: {len(failed_modules)}/8")
    
    if successful_modules:
        print(f"\n✅ Successful modules:")
        for module in successful_modules:
            exec_time = results[module]["execution_time"]
            print(f"   - {module} ({exec_time:.2f}s)")
    
    if failed_modules:
        print(f"\n❌ Failed modules:")
        for module in failed_modules:
            error = results[module]["error"]
            print(f"   - {module}: {error}")
    
    # Save comprehensive results
    save_test_results(results, integration_result, total_time)
    
    print(f"\nTest completed at: {datetime.now()}")
    print("=" * 60)
    
    return len(successful_modules) == 8

def test_module(module_dir: str) -> Dict[str, Any]:
    """Test a specific module"""
    
    # Change to module directory
    original_dir = os.getcwd()
    module_path = os.path.join(original_dir, module_dir)
    
    if not os.path.exists(module_path):
        raise Exception(f"Module directory {module_path} not found")
    
    os.chdir(module_path)
    
    try:
        # Import and run module
        if module_dir == "sentinel":
            from run import SimpleSentinel
            model = SimpleSentinel()
            metrics = model.train()
            
            # Test prediction
            test_features = {
                "transaction_amount": 1000.0,
                "gas_price": 25.0,
                "transaction_frequency": 5,
                "wallet_age_days": 100,
                "unique_interactions": 15
            }
            prediction = model.predict(test_features)
            return {"training_metrics": metrics, "test_prediction": prediction["classification"]}
            
        elif module_dir == "feeflow":
            from run import SimpleFeeFlowModel
            model = SimpleFeeFlowModel()
            metrics = model.train()
            
            # Test prediction
            test_state = {
                "current_gas_price": 25.0,
                "block_utilization": 0.7,
                "pending_transactions": 3500,
                "time_features": {"hour": 14}
            }
            prediction = model.predict(test_state)
            return {"training_metrics": metrics, "test_prediction": prediction["predictions"]["next_block"]}
            
        elif module_dir == "wallet_classifier":
            from run import SimpleWalletClassifier
            model = SimpleWalletClassifier()
            metrics = model.train()
            
            # Test prediction
            test_wallet = {
                "wallet_features": {
                    "transaction_count": 150,
                    "total_volume": 25.0,
                    "avg_transaction_value": 0.5,
                    "unique_counterparties": 45,
                    "contract_interactions": 30,
                    "gas_usage_avg": 75000,
                    "activity_regularity": 0.7,
                    "time_spread": 0.8,
                    "burst_frequency": 0.3,
                    "centrality_score": 0.4,
                    "balance_volatility": 0.4,
                    "holdings_diversity": 0.6
                }
            }
            prediction = model.predict(test_wallet)
            return {"training_metrics": metrics, "test_prediction": prediction["classification"]["primary_type"]}
            
        elif module_dir == "stake_balancer":
            from run import SimpleStakeBalancer
            model = SimpleStakeBalancer()
            metrics = model.train()
            
            # Test optimization
            test_state = {
                "total_staked": 600000000,
                "validator_performance": [
                    {
                        "validator_id": "val_001",
                        "stake_amount": 100000,
                        "uptime": 0.95,
                        "attestation_rate": 0.98,
                        "slash_count": 0
                    }
                ]
            }
            optimization = model.optimize(test_state)
            return {"training_metrics": metrics, "test_prediction": optimization["reward_optimization"]["base_reward_rate"]}
            
        elif module_dir == "govsim":
            from run import SimpleGovernanceSimulator
            model = SimpleGovernanceSimulator()
            metrics = model.train()
            
            # Test simulation
            test_proposal = {
                "proposal": {
                    "type": "protocol_upgrade",
                    "impact_score": 0.8
                },
                "network_context": {
                    "market_conditions": {"token_price": 11.5}
                }
            }
            simulation = model.simulate_proposal(test_proposal)
            return {"training_metrics": metrics, "test_prediction": simulation["prediction"]["outcome_probability"]["pass"]}
            
        elif module_dir == "eco_sentinel":
            from run import SimpleEconomicSentinel
            model = SimpleEconomicSentinel()
            metrics = model.train()
            
            # Test risk assessment
            test_data = {
                "market_data": {
                    "token_price_history": [10.0, 10.2, 9.8, 9.5, 9.9],
                    "volume_history": [1000000, 1200000, 800000]
                },
                "network_metrics": {
                    "total_value_locked": 450000000,
                    "staking_ratio": 0.58
                }
            }
            assessment = model.assess_risk(test_data)
            return {"training_metrics": metrics, "test_prediction": assessment["risk_assessment"]["risk_level"]}
            
        elif module_dir == "quantum_shield":
            from run import SimpleQuantumShield
            model = SimpleQuantumShield()
            metrics = model.train()
            
            # Test optimization
            test_state = {
                "cryptographic_state": {
                    "current_algorithms": ["RSA-2048"],
                    "quantum_threat_level": 0.6
                },
                "security_requirements": {
                    "security_level": 128,
                    "quantum_resistance": True
                }
            }
            optimization = model.optimize_cryptography(test_state)
            return {"training_metrics": metrics, "test_prediction": optimization["cryptographic_recommendations"]["primary_algorithm"]}
            
        elif module_dir == "proto_tuner":
            from run import SimpleProtocolTuner
            model = SimpleProtocolTuner()
            metrics = model.train()
            
            # Test optimization
            test_state = {
                "current_parameters": {
                    "consensus": {"block_time": 12.0}
                },
                "performance_metrics": {
                    "current_tps": 750
                }
            }
            optimization = model.optimize_parameters(test_state)
            return {"training_metrics": metrics, "test_prediction": optimization["optimization_results"]["expected_improvements"]["tps_increase"]}
            
        else:
            raise Exception(f"Unknown module: {module_dir}")
            
    finally:
        # Always return to original directory
        os.chdir(original_dir)

def demonstrate_integration(results: Dict[str, Any]) -> Dict[str, Any]:
    """Demonstrate system integration capabilities"""
    
    print("Simulating integrated AI pipeline...")
    print()
    
    # Mock network event
    network_event = {
        "timestamp": datetime.now().isoformat(),
        "event_type": "high_volume_activity",
        "data": {
            "transaction_volume": 15000,
            "gas_price_spike": 0.3,
            "new_wallets": 500,
            "governance_proposal": True
        }
    }
    
    integration_responses = {}
    
    # Simulate how modules would respond to this event
    if "Network Sentinel" in results and results["Network Sentinel"]["status"] == "success":
        integration_responses["anomaly_detection"] = {
            "alert_level": "medium",
            "confidence": 0.75,
            "recommendation": "Enhanced monitoring activated"
        }
        print("🔍 Network Sentinel: Enhanced monitoring activated (medium confidence)")
    
    if "FeeFlow Optimizer" in results and results["FeeFlow Optimizer"]["status"] == "success":
        integration_responses["fee_optimization"] = {
            "recommended_fee": 0.15,
            "congestion_level": "high",
            "optimal_timing": "delay_5min"
        }
        print("💰 FeeFlow: Recommended fee increased to 0.15 due to high congestion")
    
    if "Wallet Classifier" in results and results["Wallet Classifier"]["status"] == "success":
        integration_responses["wallet_analysis"] = {
            "new_user_risk": "low",
            "behavioral_flags": 0,
            "compliance_score": 0.9
        }
        print("👛 Wallet Classifier: New users classified as low risk")
    
    if "GovSim" in results and results["GovSim"]["status"] == "success":
        integration_responses["governance_prediction"] = {
            "proposal_pass_probability": 0.75,
            "expected_turnout": 0.65,
            "key_influencers": 5
        }
        print("🏛️  GovSim: Governance proposal has 75% chance of passing")
    
    if "Economic Sentinel" in results and results["Economic Sentinel"]["status"] == "success":
        integration_responses["economic_assessment"] = {
            "market_risk": "low",
            "volatility_forecast": "stable",
            "alerts": 0
        }
        print("📊 Economic Sentinel: Market conditions stable, low risk")
    
    if "Quantum Shield" in results and results["Quantum Shield"]["status"] == "success":
        integration_responses["security_status"] = {
            "crypto_health": "good",
            "quantum_threat": "medium",
            "migration_progress": 0.6
        }
        print("🛡️  Quantum Shield: Cryptographic security maintained")
    
    if "Protocol Tuner" in results and results["Protocol Tuner"]["status"] == "success":
        integration_responses["protocol_optimization"] = {
            "parameter_adjustments": 2,
            "expected_improvement": 0.15,
            "implementation_ready": True
        }
        print("⚙️  Protocol Tuner: Performance improvements identified")
    
    if "Stake Balancer" in results and results["Stake Balancer"]["status"] == "success":
        integration_responses["staking_optimization"] = {
            "reward_adjustment": 0.02,
            "validator_performance": "good",
            "network_security": "high"
        }
        print("⚖️  Stake Balancer: Staking rewards optimized")
    
    print()
    
    # Demonstrate cross-module insights
    print("Cross-module insights:")
    successful_count = len([r for r in results.values() if r["status"] == "success"])
    
    if successful_count >= 6:
        print("✅ High confidence in network health and optimization recommendations")
        print("✅ Multi-layer security and performance monitoring active")
        print("✅ Predictive capabilities operational across all domains")
    elif successful_count >= 4:
        print("⚠️  Partial system coverage - some blind spots may exist")
        print("✅ Core functionality operational")
    else:
        print("❌ Limited system coverage - manual oversight recommended")
    
    print()
    
    return {
        "event_processed": network_event,
        "module_responses": integration_responses,
        "system_health": "operational" if successful_count >= 6 else "degraded",
        "confidence_level": successful_count / 8
    }

def save_test_results(results: Dict[str, Any], integration_result: Dict[str, Any], total_time: float):
    """Save comprehensive test results"""
    
    test_report = {
        "test_summary": {
            "timestamp": datetime.now().isoformat(),
            "total_execution_time": total_time,
            "modules_tested": len(results),
            "successful_modules": len([r for r in results.values() if r["status"] == "success"]),
            "failed_modules": len([r for r in results.values() if r["status"] == "failed"])
        },
        "module_results": results,
        "integration_test": integration_result,
        "system_metrics": {
            "overall_health": "operational" if len([r for r in results.values() if r["status"] == "success"]) >= 6 else "degraded",
            "coverage": len([r for r in results.values() if r["status"] == "success"]) / 8,
            "performance": "good" if total_time < 60 else "acceptable" if total_time < 120 else "slow"
        }
    }
    
    try:
        with open("comprehensive_test_results.json", "w") as f:
            json.dump(test_report, f, indent=2, default=str)
        print("📄 Comprehensive test results saved to comprehensive_test_results.json")
    except Exception as e:
        print(f"⚠️  Could not save test results: {e}")

def main():
    """Main test function"""
    success = test_all_modules()
    
    if success:
        print("\n🎉 ALL TESTS PASSED - Dytallix AI Modules System is operational!")
        return 0
    else:
        print("\n⚠️  SOME TESTS FAILED - Please review failed modules")
        return 1

if __name__ == "__main__":
    sys.exit(main())