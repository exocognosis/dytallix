#!/usr/bin/env python3
"""
Genesis Block Validation Script for Dytallix Mainnet

This script validates the genesis block configuration to ensure all
requirements are met before mainnet launch.
"""

import json
import sys
from datetime import datetime, timezone

def load_genesis_config(filename):
    """Load and parse the genesis configuration file."""
    try:
        with open(filename, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"❌ Error: Genesis file '{filename}' not found")
        return None
    except json.JSONDecodeError as e:
        print(f"❌ Error: Invalid JSON in genesis file: {e}")
        return None

def validate_network_config(network):
    """Validate network configuration."""
    print("🌐 Validating Network Configuration...")
    
    errors = []
    
    # Check required fields
    required_fields = ['name', 'chain_id', 'genesis_time']
    for field in required_fields:
        if field not in network:
            errors.append(f"Missing required field: {field}")
    
    # Validate network name
    if network.get('name') != 'dytallix-mainnet':
        errors.append(f"Expected network name 'dytallix-mainnet', got '{network.get('name')}'")
    
    # Validate chain ID
    if network.get('chain_id') != 'dytallix-mainnet-1':
        errors.append(f"Expected chain ID 'dytallix-mainnet-1', got '{network.get('chain_id')}'")
    
    # Validate genesis time
    expected_time = "2025-08-03T19:00:26.000000000Z"
    if network.get('genesis_time') != expected_time:
        errors.append(f"Expected genesis time '{expected_time}', got '{network.get('genesis_time')}'")
    
    if errors:
        for error in errors:
            print(f"  ❌ {error}")
        return False
    else:
        print("  ✅ Network configuration valid")
        return True

def validate_dgt_allocations(allocations):
    """Validate DGT token allocations."""
    print("💰 Validating DGT Token Allocations...")
    
    errors = []
    total_amount = 0
    expected_total = 1_000_000_000_000_000_000_000_000_000  # 1B DGT with 18 decimals
    
    expected_allocations = {
        "0xCommunityTreasury": 400_000_000_000_000_000_000_000_000,
        "0xStakingRewards": 250_000_000_000_000_000_000_000_000,
        "0xDevTeam": 150_000_000_000_000_000_000_000_000,
        "0xValidators": 100_000_000_000_000_000_000_000_000,
        "0xEcosystemFund": 100_000_000_000_000_000_000_000_000,
    }
    
    found_addresses = set()
    
    for i, allocation in enumerate(allocations):
        # Check required fields
        required_fields = ['address', 'amount']
        for field in required_fields:
            if field not in allocation:
                errors.append(f"Allocation {i}: Missing required field '{field}'")
                continue
        
        address = allocation['address']
        amount = allocation['amount']
        
        # Check for duplicates
        if address in found_addresses:
            errors.append(f"Duplicate allocation for address: {address}")
        found_addresses.add(address)
        
        # Validate amount
        if address in expected_allocations:
            if amount != expected_allocations[address]:
                expected = expected_allocations[address]
                errors.append(f"{address}: Expected {expected}, got {amount}")
        else:
            errors.append(f"Unexpected allocation address: {address}")
        
        total_amount += amount
    
    # Check total supply
    if total_amount != expected_total:
        errors.append(f"Total DGT allocation mismatch: expected {expected_total}, got {total_amount}")
    
    # Check all expected addresses are present
    for address in expected_allocations:
        if address not in found_addresses:
            errors.append(f"Missing allocation for address: {address}")
    
    if errors:
        for error in errors:
            print(f"  ❌ {error}")
        return False
    else:
        print(f"  ✅ DGT allocations valid (Total: {total_amount / 1e18:.0f} tokens)")
        return True

def validate_vesting_schedules(allocations):
    """Validate vesting schedules."""
    print("⏰ Validating Vesting Schedules...")
    
    errors = []
    
    vesting_expectations = {
        "0xCommunityTreasury": None,  # No vesting
        "0xStakingRewards": {"cliff": 0, "duration": 4 * 365 * 24 * 60 * 60},  # 4 years
        "0xDevTeam": {"cliff": 365 * 24 * 60 * 60, "duration": 4 * 365 * 24 * 60 * 60},  # 1y cliff + 4y total
        "0xValidators": {"cliff": 6 * 30 * 24 * 60 * 60, "duration": 30 * 30 * 24 * 60 * 60},  # 6m cliff + 2.5y total
        "0xEcosystemFund": {"cliff": 0, "duration": 5 * 365 * 24 * 60 * 60},  # 5 years
    }
    
    for allocation in allocations:
        address = allocation['address']
        vesting = allocation.get('vesting')
        expected = vesting_expectations.get(address)
        
        if expected is None:
            # Should have no vesting
            if vesting is not None:
                errors.append(f"{address}: Expected no vesting, but vesting schedule found")
        else:
            # Should have vesting
            if vesting is None:
                errors.append(f"{address}: Expected vesting schedule, but none found")
                continue
            
            # Check vesting parameters
            if 'cliff_duration' not in vesting:
                errors.append(f"{address}: Missing cliff_duration in vesting")
            elif vesting['cliff_duration'] != expected['cliff']:
                errors.append(f"{address}: Expected cliff {expected['cliff']}, got {vesting['cliff_duration']}")
            
            if 'vesting_duration' not in vesting:
                errors.append(f"{address}: Missing vesting_duration in vesting")
            elif vesting['vesting_duration'] != expected['duration']:
                errors.append(f"{address}: Expected duration {expected['duration']}, got {vesting['vesting_duration']}")
    
    if errors:
        for error in errors:
            print(f"  ❌ {error}")
        return False
    else:
        print("  ✅ Vesting schedules valid")
        return True

def validate_drt_emission(drt_emission):
    """Validate DRT emission configuration."""
    print("⚡ Validating DRT Emission Configuration...")
    
    errors = []
    
    # Check required fields
    required_fields = ['annual_inflation_rate', 'initial_supply', 'emission_breakdown']
    for field in required_fields:
        if field not in drt_emission:
            errors.append(f"Missing required field: {field}")
    
    # Validate inflation rate (should be 500 basis points = 5%)
    if drt_emission.get('annual_inflation_rate') != 500:
        errors.append(f"Expected inflation rate 500, got {drt_emission.get('annual_inflation_rate')}")
    
    # Validate initial supply (should be 0)
    if drt_emission.get('initial_supply') != 0:
        errors.append(f"Expected initial supply 0, got {drt_emission.get('initial_supply')}")
    
    # Validate emission breakdown
    breakdown = drt_emission.get('emission_breakdown', {})
    expected_breakdown = {
        'block_rewards': 60,
        'staking_rewards': 25,
        'ai_module_incentives': 10,
        'bridge_operations': 5
    }
    
    total_percentage = 0
    for category, expected_pct in expected_breakdown.items():
        if category not in breakdown:
            errors.append(f"Missing emission category: {category}")
        elif breakdown[category] != expected_pct:
            errors.append(f"Expected {category}: {expected_pct}%, got {breakdown[category]}%")
        else:
            total_percentage += breakdown[category]
    
    # Check total adds up to 100%
    if total_percentage != 100:
        errors.append(f"Emission breakdown total: {total_percentage}%, expected 100%")
    
    if errors:
        for error in errors:
            print(f"  ❌ {error}")
        return False
    else:
        print("  ✅ DRT emission configuration valid")
        return True

def validate_burn_rules(burn_rules):
    """Validate burn rules configuration."""
    print("🔥 Validating Burn Rules...")
    
    errors = []
    
    expected_rules = {
        'transaction_fee_burn_rate': 100,
        'ai_service_fee_burn_rate': 50,
        'bridge_fee_burn_rate': 75
    }
    
    for rule, expected_rate in expected_rules.items():
        if rule not in burn_rules:
            errors.append(f"Missing burn rule: {rule}")
        elif burn_rules[rule] != expected_rate:
            errors.append(f"Expected {rule}: {expected_rate}%, got {burn_rules[rule]}%")
        elif burn_rules[rule] > 100:
            errors.append(f"Burn rate {rule} cannot exceed 100%")
    
    if errors:
        for error in errors:
            print(f"  ❌ {error}")
        return False
    else:
        print("  ✅ Burn rules valid")
        return True

def validate_governance(governance):
    """Validate governance parameters."""
    print("🏛️ Validating Governance Parameters...")
    
    errors = []
    
    expected_params = {
        'proposal_threshold': 1_000_000_000_000_000_000_000_000,  # 1M DGT
        'voting_period': 50_400,  # ~7 days
        'quorum_threshold': 3_333,  # 33.33%
        'pass_threshold': 5_000  # 50%
    }
    
    for param, expected_value in expected_params.items():
        if param not in governance:
            errors.append(f"Missing governance parameter: {param}")
        elif governance[param] != expected_value:
            errors.append(f"Expected {param}: {expected_value}, got {governance[param]}")
    
    if errors:
        for error in errors:
            print(f"  ❌ {error}")
        return False
    else:
        print("  ✅ Governance parameters valid")
        return True

def main():
    """Main validation function."""
    print("🚀 Dytallix Genesis Block Validation")
    print("=" * 50)
    
    # Load genesis configuration
    genesis = load_genesis_config('genesisBlock.json')
    if genesis is None:
        sys.exit(1)
    
    # Run all validations
    validations = [
        validate_network_config(genesis.get('network', {})),
        validate_dgt_allocations(genesis.get('dgt_allocations', [])),
        validate_vesting_schedules(genesis.get('dgt_allocations', [])),
        validate_drt_emission(genesis.get('drt_emission', {})),
        validate_burn_rules(genesis.get('burn_rules', {})),
        validate_governance(genesis.get('governance', {})),
    ]
    
    print("\n" + "=" * 50)
    if all(validations):
        print("✅ ALL VALIDATIONS PASSED")
        print("🎉 Genesis configuration is ready for mainnet launch!")
        sys.exit(0)
    else:
        print("❌ VALIDATION FAILED")
        print("⚠️  Please fix the errors above before mainnet launch.")
        sys.exit(1)

if __name__ == "__main__":
    main()