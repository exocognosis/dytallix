#!/usr/bin/env python3
"""
Test script for AI Oracle Response Signing

This script tests the PQC signing functionality without requiring pytest.
"""

import sys
import os
import time
import json

# Add the src directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

try:
    from pqc_signer import PQCManager, SignatureAlgorithm
    from signing_service import SigningService
    
    print("✓ Successfully imported signing modules")
except ImportError as e:
    print(f"✗ Failed to import modules: {e}")
    sys.exit(1)

def test_pqc_manager():
    """Test PQC Manager functionality"""
    print("\n--- Testing PQC Manager ---")
    
    try:
        # Test initialization
        manager = PQCManager("test_oracle", "Test Oracle")
        print("✓ PQC Manager initialized successfully")
        
        # Test key generation
        assert manager.keypair is not None
        assert manager.oracle_identity is not None
        print("✓ Keys and identity generated successfully")
        
        # Test message signing
        message = b"Test message for signing"
        signature = manager.sign_message(message)
        assert len(signature.data) > 0
        print("✓ Message signing works")
        
        # Test certificate generation
        certificate = manager.generate_certificate()
        assert certificate.subject_oracle_id == "test_oracle"
        print("✓ Certificate generation works")
        
        # Test signed response creation
        response_data = {
            "id": "test_response_001",
            "request_id": "test_request_001",
            "service_type": "FraudDetection",
            "response_data": {"fraud_score": 0.85},
            "timestamp": int(time.time()),
            "processing_time_ms": 150,
            "status": "Success"
        }
        
        signed_response = manager.create_signed_response(response_data)
        assert signed_response.nonce > 0
        assert signed_response.expires_at > int(time.time())
        print("✓ Signed response creation works")
        
        print("✓ All PQC Manager tests passed!")
        
    except Exception as e:
        print(f"✗ PQC Manager test failed: {e}")
        return False
    
    return True

def test_signing_service():
    """Test Signing Service functionality"""
    print("\n--- Testing Signing Service ---")
    
    try:
        # Test initialization
        service = SigningService("test_oracle", "Test Oracle Service")
        assert service.is_initialized is True
        print("✓ Signing Service initialized successfully")
        
        # Test fraud detection signing
        fraud_response = service.sign_fraud_detection_response(
            request_id="test_request_001",
            fraud_score=0.85,
            risk_factors=["high_amount", "suspicious_pattern"],
            processing_time_ms=150
        )
        assert "response" in fraud_response
        assert "signature" in fraud_response
        print("✓ Fraud detection response signing works")
        
        # Test risk scoring signing
        risk_response = service.sign_risk_scoring_response(
            request_id="test_request_002",
            risk_score=7.5,
            risk_category="HIGH",
            contributing_factors=["new_address", "large_amount"],
            processing_time_ms=200
        )
        assert "response" in risk_response
        assert "signature" in risk_response
        print("✓ Risk scoring response signing works")
        
        # Test contract analysis signing
        analysis_result = {
            "contract_code": "pragma solidity ^0.8.0; contract Test {}",
            "language": "solidity",
            "security_analysis": {"issues": [], "score": 10},
            "estimated_gas": 50000
        }
        
        contract_response = service.sign_contract_analysis_response(
            request_id="test_request_003",
            analysis_result=analysis_result,
            processing_time_ms=500
        )
        assert "response" in contract_response
        assert "signature" in contract_response
        print("✓ Contract analysis response signing works")
        
        # Test error response signing
        error_response = service.sign_error_response(
            request_id="test_request_004",
            error_code="PROCESSING_ERROR",
            error_message="Failed to process request",
            processing_time_ms=50
        )
        assert "response" in error_response
        assert error_response["response"]["status"] == "Failure"
        print("✓ Error response signing works")
        
        # Test oracle info retrieval
        oracle_info = service.get_oracle_info()
        assert oracle_info["oracle_id"] == "test_oracle"
        print("✓ Oracle info retrieval works")
        
        # Test certificate chain retrieval
        cert_chain = service.get_certificate_chain()
        assert len(cert_chain) > 0
        print("✓ Certificate chain retrieval works")
        
        # Test signing statistics
        stats = service.get_signing_statistics()
        assert stats["oracle_id"] == "test_oracle"
        assert stats["is_initialized"] is True
        print("✓ Signing statistics works")
        
        print("✓ All Signing Service tests passed!")
        
    except Exception as e:
        print(f"✗ Signing Service test failed: {e}")
        return False
    
    return True

def test_integration():
    """Test end-to-end integration"""
    print("\n--- Testing Integration ---")
    
    try:
        service = SigningService("integration_oracle", "Integration Test Oracle")
        
        # Test a complete fraud detection workflow
        request_id = "integration_test_001"
        fraud_score = 0.92
        risk_factors = ["high_amount", "new_address", "suspicious_pattern"]
        processing_time_ms = 180
        
        # Sign the response
        signed_response = service.sign_fraud_detection_response(
            request_id=request_id,
            fraud_score=fraud_score,
            risk_factors=risk_factors,
            processing_time_ms=processing_time_ms
        )
        
        # Verify the complete response structure
        assert signed_response["response"]["request_id"] == request_id
        assert signed_response["response"]["service_type"] == "FraudDetection"
        assert signed_response["response"]["response_data"]["fraud_score"] == fraud_score
        assert signed_response["response"]["response_data"]["risk_factors"] == risk_factors
        assert signed_response["response"]["processing_time_ms"] == processing_time_ms
        
        # Verify signature structure
        signature = signed_response["signature"]
        assert signature["algorithm"] == "Dilithium5"
        assert len(signature["signature"]) > 0
        assert len(signature["public_key"]) > 0
        assert signature["signature_version"] == 1
        
        # Verify oracle identity
        oracle_identity = signed_response["oracle_identity"]
        assert oracle_identity["oracle_id"] == "integration_oracle"
        assert oracle_identity["name"] == "Integration Test Oracle"
        assert oracle_identity["is_active"] is True
        
        # Verify response freshness
        assert signed_response["expires_at"] > int(time.time())
        assert signed_response["nonce"] > 0
        
        print("✓ End-to-end integration test passed!")
        
        # Print sample signed response for inspection
        print("\n--- Sample Signed Response ---")
        print(json.dumps(signed_response, indent=2, default=str)[:500] + "...")
        
    except Exception as e:
        print(f"✗ Integration test failed: {e}")
        return False
    
    return True

def main():
    """Run all tests"""
    print("Starting AI Oracle Response Signing Tests...")
    
    tests = [
        ("PQC Manager", test_pqc_manager),
        ("Signing Service", test_signing_service),
        ("Integration", test_integration)
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        print(f"\n{'='*50}")
        print(f"Running {test_name} Tests")
        print('='*50)
        
        if test_func():
            passed += 1
        else:
            print(f"✗ {test_name} tests failed")
    
    print(f"\n{'='*50}")
    print(f"Test Results: {passed}/{total} test suites passed")
    print('='*50)
    
    if passed == total:
        print("🎉 All tests passed! AI Oracle Response Signing is working correctly.")
        return 0
    else:
        print("❌ Some tests failed. Please check the implementation.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
