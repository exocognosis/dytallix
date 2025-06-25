#!/usr/bin/env python3
"""
Test script for the advanced risk scoring module
"""

import asyncio
import json
import random
from datetime import datetime, timedelta
from src.risk_scoring import AdvancedRiskScorer

def generate_test_transaction(amount=None, from_addr=None, to_addr=None, timestamp=None):
    """Generate a test transaction"""
    if amount is None:
        amount = random.uniform(10, 100000)
    if from_addr is None:
        from_addr = f"addr_{random.randint(1000, 9999)}"
    if to_addr is None:
        to_addr = f"addr_{random.randint(1000, 9999)}"
    if timestamp is None:
        timestamp = datetime.now().timestamp()
    
    return {
        "transaction_id": f"tx_{random.randint(100000, 999999)}",
        "from_address": from_addr,
        "to_address": to_addr,
        "amount": amount,
        "timestamp": timestamp
    }

def generate_address_history(address, num_txs=20):
    """Generate historical transactions for an address"""
    history = []
    base_time = datetime.now() - timedelta(days=30)
    
    for i in range(num_txs):
        # Generate varied amounts with some patterns
        if i % 5 == 0:  # Every 5th transaction is round number
            amount = random.choice([1000, 5000, 10000, 50000])
        else:
            amount = random.uniform(50, 5000)
        
        # Generate timestamps with realistic intervals
        time_offset = timedelta(
            hours=random.uniform(1, 48),
            minutes=random.uniform(0, 59)
        )
        base_time += time_offset
        
        tx = {
            "transaction_id": f"hist_tx_{i}",
            "from_address": address,
            "to_address": f"addr_{random.randint(2000, 8000)}",
            "amount": amount,
            "timestamp": base_time.timestamp()
        }
        history.append(tx)
    
    return history

async def test_basic_risk_calculation():
    """Test basic risk calculation functionality"""
    print("🧪 Testing basic risk calculation...")
    
    scorer = AdvancedRiskScorer()
    
    # Test normal transaction
    normal_tx = generate_test_transaction(amount=1000)
    normal_history = generate_address_history(normal_tx["from_address"], 15)
    
    result = await scorer.calculate_comprehensive_risk(normal_tx, normal_history)
    
    print(f"✅ Normal transaction risk: {result.score:.3f} ({result.level})")
    print(f"   Confidence: {result.confidence:.2f}")
    print(f"   Factors: {', '.join(result.factors)}")
    
    return result

async def test_suspicious_patterns():
    """Test detection of suspicious patterns"""
    print("\n🔍 Testing suspicious pattern detection...")
    
    scorer = AdvancedRiskScorer()
    
    # Test cases for different suspicious patterns
    test_cases = [
        {
            "name": "Large unusual amount",
            "transaction": generate_test_transaction(amount=500000),
            "description": "Transaction much larger than historical average"
        },
        {
            "name": "Self-transaction", 
            "transaction": generate_test_transaction(
                from_addr="suspicious_addr", 
                to_addr="suspicious_addr"
            ),
            "description": "Transaction to same address"
        },
        {
            "name": "Night transaction",
            "transaction": generate_test_transaction(
                timestamp=datetime.now().replace(hour=3).timestamp()
            ),
            "description": "Transaction at 3 AM"
        },
        {
            "name": "Round amount pattern",
            "transaction": generate_test_transaction(amount=10000),
            "description": "Exact round number amount"
        }
    ]
    
    for case in test_cases:
        tx = case["transaction"]
        history = generate_address_history(tx["from_address"], 10)
        
        result = await scorer.calculate_comprehensive_risk(tx, history)
        
        print(f"   {case['name']}: {result.score:.3f} ({result.level})")
        print(f"      {case['description']}")
        print(f"      Top factors: {', '.join(result.factors[:3])}")

async def test_behavioral_analysis():
    """Test behavioral pattern analysis"""
    print("\n🎯 Testing behavioral analysis...")
    
    scorer = AdvancedRiskScorer()
    
    # Create address with established pattern
    established_addr = "established_user_123"
    
    # Generate consistent historical pattern (business hours, similar amounts)
    history = []
    base_time = datetime.now() - timedelta(days=20)
    
    for i in range(30):
        # Business hours transactions
        business_hour = random.randint(9, 17)
        amount = random.uniform(800, 1200)  # Consistent range
        
        time_offset = timedelta(days=random.randint(0, 2), hours=business_hour)
        tx_time = base_time + time_offset
        
        tx = {
            "transaction_id": f"pattern_tx_{i}",
            "from_address": established_addr,
            "to_address": f"business_addr_{i % 5}",  # Limited counterparties
            "amount": amount,
            "timestamp": tx_time.timestamp()
        }
        history.append(tx)
    
    # Test deviation from pattern
    deviation_tx = generate_test_transaction(
        amount=50000,  # Much larger than usual
        from_addr=established_addr,
        to_addr="new_unknown_address",  # New counterparty
        timestamp=datetime.now().replace(hour=2).timestamp()  # Night time
    )
    
    result = await scorer.calculate_comprehensive_risk(deviation_tx, history)
    
    print(f"   Behavioral deviation score: {result.score:.3f} ({result.level})")
    print(f"   Behavioral analysis: {json.dumps(result.behavioral_profile, indent=2)}")

async def test_statistical_analysis():
    """Test statistical anomaly detection"""
    print("\n📊 Testing statistical analysis...")
    
    scorer = AdvancedRiskScorer()
    
    # Create address with normal distribution of amounts
    normal_addr = "statistical_test_addr"
    
    # Generate amounts following normal distribution
    amounts = [random.gauss(1000, 200) for _ in range(50)]  # Mean=1000, std=200
    amounts = [max(10, amt) for amt in amounts]  # Ensure positive
    
    history = []
    base_time = datetime.now() - timedelta(days=25)
    
    for i, amount in enumerate(amounts):
        tx = {
            "transaction_id": f"stat_tx_{i}",
            "from_address": normal_addr,
            "to_address": f"addr_{i % 10}",
            "amount": amount,
            "timestamp": (base_time + timedelta(hours=i*12)).timestamp()
        }
        history.append(tx)
    
    # Test outlier transaction (6 standard deviations from mean)
    outlier_tx = generate_test_transaction(
        amount=2200,  # 6 std deviations from mean
        from_addr=normal_addr
    )
    
    result = await scorer.calculate_comprehensive_risk(outlier_tx, history)
    
    print(f"   Statistical outlier score: {result.score:.3f} ({result.level})")
    print(f"   Statistical analysis: {json.dumps(result.statistical_analysis, indent=2)}")

async def test_model_statistics():
    """Test model statistics tracking"""
    print("\n📈 Testing model statistics...")
    
    scorer = AdvancedRiskScorer()
    
    # Generate several risk assessments
    for _ in range(10):
        tx = generate_test_transaction()
        history = generate_address_history(tx["from_address"], 5)
        await scorer.calculate_comprehensive_risk(tx, history)
    
    stats = scorer.get_statistics()
    print(f"   Model statistics: {json.dumps(stats, indent=2)}")

async def main():
    """Run all tests"""
    print("🚀 Starting Advanced Risk Scoring Tests")
    print("=" * 50)
    
    try:
        await test_basic_risk_calculation()
        await test_suspicious_patterns()
        await test_behavioral_analysis()
        await test_statistical_analysis()
        await test_model_statistics()
        
        print("\n✅ All tests completed successfully!")
        print("=" * 50)
        
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
