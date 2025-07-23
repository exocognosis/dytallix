#!/usr/bin/env python3
"""
GovSim - Governance Simulation using Bayesian Networks and Agent-Based Modeling
Simplified implementation using basic Python
"""

import json
import math
import random
import os
from datetime import datetime
from typing import Dict, List, Tuple, Any


class SimpleVoter:
    """Simple voter agent"""
    
    def __init__(self, voter_id: str, voter_type: str, config: Dict[str, Any]):
        self.voter_id = voter_id
        self.voter_type = voter_type
        self.stake = random.uniform(
            config["avg_stake"] * 0.1, 
            config["avg_stake"] * 2.0
        )
        self.engagement = config["engagement_level"] + random.gauss(0, 0.1)
        self.technical_knowledge = config["technical_knowledge"] + random.gauss(0, 0.1)
        self.vote_probability = config["vote_probability"]
        self.voting_history = []
        
        # Normalize values
        self.engagement = max(0, min(1, self.engagement))
        self.technical_knowledge = max(0, min(1, self.technical_knowledge))
    
    def will_vote(self, proposal: Dict[str, Any]) -> bool:
        """Determine if voter will participate"""
        base_prob = self.vote_probability
        
        # Adjust based on proposal impact
        impact_factor = proposal.get("impact_score", 0.5)
        engagement_factor = self.engagement
        
        adjusted_prob = base_prob * (1 + impact_factor * engagement_factor)
        return random.random() < min(1.0, adjusted_prob)
    
    def decide_vote(self, proposal: Dict[str, Any], network_context: Dict[str, Any]) -> str:
        """Decide how to vote on proposal"""
        
        # Base voting tendency based on voter type
        type_biases = {
            "retail_holder": 0.4,      # Conservative
            "institutional_investor": 0.6,  # Slightly favorable
            "validator": 0.7,          # Generally supportive
            "developer": 0.8,          # Very supportive
            "delegate": 0.6            # Moderate
        }
        
        base_yes_prob = type_biases.get(self.voter_type, 0.5)
        
        # Adjust based on proposal characteristics
        proposal_type = proposal.get("type", "parameter_change")
        impact_score = proposal.get("impact_score", 0.5)
        
        # Technical voters favor technical proposals
        if proposal_type in ["protocol_upgrade", "parameter_change"]:
            tech_adjustment = self.technical_knowledge * 0.3
        else:
            tech_adjustment = 0
        
        # Economic interest based on stake size
        stake_influence = min(0.2, self.stake / 100000)  # Cap at 200k tokens
        
        # Market conditions influence
        market_sentiment = network_context.get("market_conditions", {}).get("token_price", 10) / 10  # Normalize to 1
        market_adjustment = (market_sentiment - 1) * 0.1
        
        # Calculate final probability
        yes_prob = base_yes_prob + tech_adjustment + stake_influence + market_adjustment
        yes_prob = max(0.1, min(0.9, yes_prob))  # Keep in reasonable bounds
        
        # Decide
        rand = random.random()
        if rand < yes_prob:
            return "yes"
        elif rand < yes_prob + 0.1:  # Small abstain probability
            return "abstain"
        else:
            return "no"


class SimpleGovernanceSimulator:
    """Simplified governance simulator"""
    
    def __init__(self, config_path: str = "config.json"):
        self.config = self._load_config(config_path)
        self.trained = False
        self.voters = []
        self.historical_accuracy = 0.0
        
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
            "agent_config": {
                "voter_types": {
                    "retail_holder": {"proportion": 0.7, "avg_stake": 1000, "engagement_level": 0.3, "technical_knowledge": 0.2, "vote_probability": 0.4},
                    "institutional_investor": {"proportion": 0.1, "avg_stake": 100000, "engagement_level": 0.8, "technical_knowledge": 0.6, "vote_probability": 0.9},
                    "validator": {"proportion": 0.05, "avg_stake": 50000, "engagement_level": 0.9, "technical_knowledge": 0.8, "vote_probability": 0.95},
                    "developer": {"proportion": 0.1, "avg_stake": 5000, "engagement_level": 0.7, "technical_knowledge": 0.9, "vote_probability": 0.8},
                    "delegate": {"proportion": 0.05, "avg_stake": 20000, "engagement_level": 0.85, "technical_knowledge": 0.7, "vote_probability": 0.9}
                }
            },
            "simulation_config": {
                "monte_carlo_iterations": 100
            }
        }
    
    def train(self) -> Dict[str, float]:
        """Train the governance simulator"""
        print("Training governance simulator...")
        
        # Generate voter population
        self._create_voter_population()
        
        # Set trained flag before calibration
        self.trained = True
        
        # Simulate historical proposals to calibrate model
        historical_accuracy = self._calibrate_with_historical_data()
        
        metrics = {
            "historical_accuracy": historical_accuracy,
            "voter_population": len(self.voters),
            "voter_types": len(self.config["agent_config"]["voter_types"])
        }
        
        self._save_metrics(metrics)
        
        print(f"Training completed. Historical accuracy: {historical_accuracy:.2f}")
        return metrics
    
    def _create_voter_population(self, total_voters: int = 1000):
        """Create simulated voter population"""
        print("Creating voter population...")
        
        self.voters = []
        voter_types = self.config["agent_config"]["voter_types"]
        
        for voter_type, config in voter_types.items():
            count = int(total_voters * config["proportion"])
            
            for i in range(count):
                voter_id = f"{voter_type}_{i:04d}"
                voter = SimpleVoter(voter_id, voter_type, config)
                self.voters.append(voter)
        
        print(f"Created {len(self.voters)} voters across {len(voter_types)} types")
    
    def _calibrate_with_historical_data(self) -> float:
        """Calibrate model using simulated historical data"""
        
        # Generate some synthetic historical proposals
        historical_proposals = [
            {"type": "parameter_change", "impact_score": 0.3, "actual_result": "pass"},
            {"type": "protocol_upgrade", "impact_score": 0.8, "actual_result": "pass"},
            {"type": "treasury_allocation", "impact_score": 0.4, "actual_result": "fail"},
            {"type": "parameter_change", "impact_score": 0.2, "actual_result": "pass"},
            {"type": "emergency_action", "impact_score": 0.9, "actual_result": "pass"}
        ]
        
        correct_predictions = 0
        
        for proposal in historical_proposals:
            # Simulate the proposal
            network_context = {
                "market_conditions": {"token_price": random.uniform(8, 12)}
            }
            
            result = self.simulate_proposal({
                "proposal": proposal,
                "network_context": network_context
            })
            
            # Check if prediction matches actual result
            predicted_result = "pass" if result["prediction"]["outcome_probability"]["pass"] > 0.5 else "fail"
            
            if predicted_result == proposal["actual_result"]:
                correct_predictions += 1
        
        return correct_predictions / len(historical_proposals)
    
    def simulate_proposal(self, governance_data: Dict[str, Any]) -> Dict[str, Any]:
        """Simulate a governance proposal"""
        if not self.trained:
            raise ValueError("Simulator not trained")
        
        proposal = governance_data["proposal"]
        network_context = governance_data.get("network_context", {})
        
        # Monte Carlo simulation
        iterations = self.config["simulation_config"]["monte_carlo_iterations"]
        results = []
        
        for _ in range(iterations):
            iteration_result = self._simulate_single_vote(proposal, network_context)
            results.append(iteration_result)
        
        # Aggregate results
        pass_count = sum(1 for r in results if r["outcome"] == "pass")
        fail_count = sum(1 for r in results if r["outcome"] == "fail")
        no_quorum_count = sum(1 for r in results if r["outcome"] == "no_quorum")
        
        total_iterations = len(results)
        
        # Calculate averages
        avg_turnout = sum(r["turnout"] for r in results) / total_iterations
        avg_yes_votes = sum(r["yes_votes"] for r in results) / total_iterations
        avg_no_votes = sum(r["no_votes"] for r in results) / total_iterations
        avg_abstain_votes = sum(r["abstain_votes"] for r in results) / total_iterations
        
        # Identify key influencers (high stake voters)
        key_influencers = sorted(self.voters, key=lambda v: v.stake, reverse=True)[:5]
        
        influencer_analysis = []
        for voter in key_influencers:
            # Predict this voter's likely behavior
            will_vote_prob = voter.vote_probability
            
            if will_vote_prob > 0.7:
                predicted_vote = voter.decide_vote(proposal, network_context)
                certainty = will_vote_prob
            else:
                predicted_vote = "abstain"
                certainty = 1 - will_vote_prob
            
            influencer_analysis.append({
                "voter_id": voter.voter_id,
                "influence_score": voter.stake / 100000,  # Normalize
                "predicted_vote": predicted_vote,
                "certainty": certainty
            })
        
        # Analyze voting blocs
        voting_blocs = self._analyze_voting_blocs(proposal, network_context)
        
        # Generate optimization suggestions
        optimization_suggestions = self._generate_optimization_suggestions(
            proposal, network_context, pass_count / total_iterations
        )
        
        return {
            "prediction": {
                "outcome_probability": {
                    "pass": pass_count / total_iterations,
                    "fail": fail_count / total_iterations,
                    "insufficient_quorum": no_quorum_count / total_iterations
                },
                "expected_turnout": avg_turnout,
                "estimated_votes": {
                    "yes": int(avg_yes_votes),
                    "no": int(avg_no_votes),
                    "abstain": int(avg_abstain_votes)
                },
                "confidence_interval": [
                    max(0, (pass_count / total_iterations) - 0.1),
                    min(1, (pass_count / total_iterations) + 0.1)
                ]
            },
            "voter_analysis": {
                "key_influencers": influencer_analysis,
                "voting_blocs": voting_blocs,
                "participation_factors": [
                    "Proposal impact level", 
                    "Voter engagement", 
                    "Market conditions",
                    "Technical complexity"
                ]
            },
            "optimization_suggestions": optimization_suggestions
        }
    
    def _simulate_single_vote(self, proposal: Dict[str, Any], network_context: Dict[str, Any]) -> Dict[str, Any]:
        """Simulate a single voting iteration"""
        
        yes_votes = 0
        no_votes = 0
        abstain_votes = 0
        total_participants = 0
        total_stake_voted = 0
        
        for voter in self.voters:
            if voter.will_vote(proposal):
                total_participants += 1
                total_stake_voted += voter.stake
                
                vote_decision = voter.decide_vote(proposal, network_context)
                
                if vote_decision == "yes":
                    yes_votes += 1
                elif vote_decision == "no":
                    no_votes += 1
                else:
                    abstain_votes += 1
        
        total_votes = yes_votes + no_votes + abstain_votes
        turnout = total_participants / len(self.voters)
        
        # Determine outcome
        if turnout < 0.3:  # Minimum quorum
            outcome = "no_quorum"
        elif yes_votes > no_votes:
            outcome = "pass"
        else:
            outcome = "fail"
        
        return {
            "outcome": outcome,
            "turnout": turnout,
            "yes_votes": yes_votes,
            "no_votes": no_votes,
            "abstain_votes": abstain_votes,
            "total_stake_voted": total_stake_voted
        }
    
    def _analyze_voting_blocs(self, proposal: Dict[str, Any], network_context: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Analyze voting behavior by voter type"""
        
        blocs = []
        voter_types = self.config["agent_config"]["voter_types"]
        
        for voter_type in voter_types.keys():
            type_voters = [v for v in self.voters if v.voter_type == voter_type]
            
            if type_voters:
                # Sample voting behavior
                sample_votes = []
                for voter in type_voters[:10]:  # Sample first 10
                    if voter.will_vote(proposal):
                        vote = voter.decide_vote(proposal, network_context)
                        sample_votes.append(vote)
                
                if sample_votes:
                    yes_ratio = sample_votes.count("yes") / len(sample_votes)
                    
                    if yes_ratio > 0.7:
                        predicted_stance = "strongly_support"
                    elif yes_ratio > 0.5:
                        predicted_stance = "support"
                    elif yes_ratio > 0.3:
                        predicted_stance = "mixed"
                    else:
                        predicted_stance = "oppose"
                    
                    cohesion_score = max(yes_ratio, 1 - yes_ratio)  # How unified the bloc is
                    
                    blocs.append({
                        "bloc_name": voter_type,
                        "size": len(type_voters),
                        "cohesion_score": cohesion_score,
                        "predicted_stance": predicted_stance
                    })
        
        return blocs
    
    def _generate_optimization_suggestions(self, proposal: Dict[str, Any], network_context: Dict[str, Any], pass_probability: float) -> Dict[str, Any]:
        """Generate suggestions to optimize proposal success"""
        
        suggestions = {
            "timing_recommendations": "",
            "messaging_strategy": [],
            "coalition_building": [],
            "parameter_adjustments": {}
        }
        
        # Timing recommendations
        market_price = network_context.get("market_conditions", {}).get("token_price", 10)
        if market_price < 8:
            suggestions["timing_recommendations"] = "Consider delaying until market conditions improve"
        elif market_price > 12:
            suggestions["timing_recommendations"] = "Good timing with favorable market conditions"
        else:
            suggestions["timing_recommendations"] = "Neutral market timing"
        
        # Messaging strategy
        proposal_type = proposal.get("type", "parameter_change")
        impact_score = proposal.get("impact_score", 0.5)
        
        if proposal_type == "protocol_upgrade":
            suggestions["messaging_strategy"].extend([
                "Emphasize technical benefits and security improvements",
                "Provide detailed technical documentation",
                "Engage with developer community early"
            ])
        elif proposal_type == "treasury_allocation":
            suggestions["messaging_strategy"].extend([
                "Clearly demonstrate value to token holders",
                "Provide transparent budget breakdown",
                "Show alignment with community priorities"
            ])
        
        # Coalition building
        if pass_probability < 0.6:
            suggestions["coalition_building"].extend([
                "Engage with institutional investors",
                "Build validator support through technical calls",
                "Address concerns of retail holders"
            ])
        
        # Parameter adjustments
        if pass_probability < 0.5:
            if proposal.get("required_threshold", 0.6) > 0.6:
                suggestions["parameter_adjustments"]["required_threshold"] = 0.55
            
            if impact_score > 0.7:
                suggestions["parameter_adjustments"]["phased_rollout"] = True
        
        return suggestions
    
    def _save_metrics(self, metrics: Dict[str, float]):
        """Save training metrics"""
        metrics_data = {
            "timestamp": datetime.now().isoformat(),
            "model_type": "governance_simulator",
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
    print("GovSim - Governance Simulation")
    print("=" * 35)
    
    simulator = SimpleGovernanceSimulator()
    
    # Train
    metrics = simulator.train()
    
    # Test simulation
    print("\nTesting proposal simulation...")
    test_governance_data = {
        "proposal": {
            "id": "PROP_001",
            "type": "protocol_upgrade",
            "description": "Implement new consensus mechanism",
            "impact_score": 0.8,
            "required_threshold": 0.67,
            "voting_period": 7
        },
        "network_context": {
            "current_parameters": {"block_time": 12, "gas_limit": 8000000},
            "market_conditions": {
                "token_price": 11.5,
                "volatility": 0.3,
                "network_usage": 0.7
            }
        }
    }
    
    result = simulator.simulate_proposal(test_governance_data)
    print(f"Simulation result:")
    print(f"  Pass probability: {result['prediction']['outcome_probability']['pass']:.2f}")
    print(f"  Expected turnout: {result['prediction']['expected_turnout']:.2f}")
    print(f"  Estimated yes votes: {result['prediction']['estimated_votes']['yes']}")
    print(f"  Key influencers: {len(result['voter_analysis']['key_influencers'])}")
    print(f"  Voting blocs: {len(result['voter_analysis']['voting_blocs'])}")
    
    print("\nTraining completed successfully!")


if __name__ == "__main__":
    main()