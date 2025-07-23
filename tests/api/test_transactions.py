#!/usr/bin/env python3
"""
API Testing Suite for Dytallix - Transactions Endpoint
Tests the /transactions and /transaction/{hash} endpoints
"""

import requests
import json
import time
import logging
from datetime import datetime
from typing import Dict, List, Any, Optional

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class TransactionsAPITester:
    def __init__(self, base_url: str = "http://localhost:3030"):
        self.base_url = base_url
        self.test_results = []
        self.start_time = None
        
    def log_test_result(self, test_name: str, passed: bool, response_time: float, 
                       status_code: int, error_message: str = ""):
        """Log test results for later reporting"""
        result = {
            "test_name": test_name,
            "passed": passed,
            "response_time_ms": response_time * 1000,
            "status_code": status_code,
            "error_message": error_message,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "PASS" if passed else "FAIL"
        logger.info(f"[{status}] {test_name} - {response_time*1000:.2f}ms - Status: {status_code}")
        if error_message:
            logger.error(f"Error: {error_message}")
    
    def test_transactions_list_endpoint(self) -> bool:
        """Test GET /transactions endpoint for listing transactions"""
        test_name = "transactions_list_basic"
        try:
            start_time = time.time()
            response = requests.get(f"{self.base_url}/transactions", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code != 200:
                self.log_test_result(test_name, False, response_time, response.status_code)
                return False
            
            data = response.json()
            if not isinstance(data, dict) or "success" not in data:
                self.log_test_result(test_name, False, response_time, response.status_code, 
                                   "Invalid response structure")
                return False
            
            if not data["success"]:
                self.log_test_result(test_name, False, response_time, response.status_code, 
                                   f"API returned error: {data.get('error', 'Unknown')}")
                return False
            
            if "data" not in data or not isinstance(data["data"], list):
                self.log_test_result(test_name, False, response_time, response.status_code, 
                                   "Invalid transactions data")
                return False
            
            # Validate transaction structures
            for i, tx in enumerate(data["data"]):
                if not self.validate_transaction_structure(tx):
                    self.log_test_result(test_name, False, response_time, response.status_code, 
                                       f"Invalid transaction structure at index {i}")
                    return False
            
            self.log_test_result(test_name, True, response_time, response.status_code)
            return True
            
        except Exception as e:
            self.log_test_result(test_name, False, 0, 0, f"Test failed: {e}")
            return False
    
    def test_transactions_pagination(self) -> bool:
        """Test GET /transactions with pagination parameters"""
        test_name = "transactions_pagination"
        try:
            params = {"limit": "5"}
            start_time = time.time()
            response = requests.get(f"{self.base_url}/transactions", params=params, timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code != 200:
                self.log_test_result(test_name, False, response_time, response.status_code)
                return False
            
            data = response.json()
            if not data["success"] or "data" not in data:
                self.log_test_result(test_name, False, response_time, response.status_code, 
                                   "Invalid response structure")
                return False
            
            transactions = data["data"]
            if len(transactions) > 5:
                self.log_test_result(test_name, False, response_time, response.status_code, 
                                   f"Expected max 5 transactions, got {len(transactions)}")
                return False
            
            self.log_test_result(test_name, True, response_time, response.status_code)
            return True
            
        except Exception as e:
            self.log_test_result(test_name, False, 0, 0, f"Test failed: {e}")
            return False
    
    def test_transactions_by_account(self) -> bool:
        """Test GET /transactions with account filter"""
        test_name = "transactions_by_account"
        try:
            params = {"account": "dyt1sender123", "limit": "10"}
            start_time = time.time()
            response = requests.get(f"{self.base_url}/transactions", params=params, timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code != 200:
                self.log_test_result(test_name, False, response_time, response.status_code)
                return False
            
            data = response.json()
            if not data["success"] or "data" not in data:
                self.log_test_result(test_name, False, response_time, response.status_code, 
                                   "Invalid response structure")
                return False
            
            self.log_test_result(test_name, True, response_time, response.status_code)
            return True
            
        except Exception as e:
            self.log_test_result(test_name, False, 0, 0, f"Test failed: {e}")
            return False
    
    def test_single_transaction_endpoint(self) -> bool:
        """Test GET /transaction/{hash} endpoint"""
        test_name = "single_transaction_retrieval"
        try:
            # Use a sample transaction hash
            tx_hash = "0x1234567890abcdef"
            start_time = time.time()
            response = requests.get(f"{self.base_url}/transaction/{tx_hash}", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code != 200:
                self.log_test_result(test_name, False, response_time, response.status_code)
                return False
            
            data = response.json()
            if not data["success"] or "data" not in data:
                self.log_test_result(test_name, False, response_time, response.status_code, 
                                   "Invalid response structure")
                return False
            
            transaction = data["data"]
            if not self.validate_transaction_structure(transaction):
                self.log_test_result(test_name, False, response_time, response.status_code, 
                                   "Invalid transaction structure")
                return False
            
            self.log_test_result(test_name, True, response_time, response.status_code)
            return True
            
        except Exception as e:
            self.log_test_result(test_name, False, 0, 0, f"Test failed: {e}")
            return False
    
    def test_transaction_submission(self) -> bool:
        """Test POST /submit endpoint for transaction submission"""
        test_name = "transaction_submission"
        try:
            tx_data = {
                "from": "dyt1test_sender",
                "to": "dyt1test_receiver", 
                "amount": 1000000,
                "fee": 1000,
                "nonce": 42
            }
            
            start_time = time.time()
            response = requests.post(f"{self.base_url}/submit", json=tx_data, timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code != 200:
                self.log_test_result(test_name, False, response_time, response.status_code)
                return False
            
            data = response.json()
            if not data["success"] or "data" not in data:
                self.log_test_result(test_name, False, response_time, response.status_code, 
                                   "Invalid response structure")
                return False
            
            tx_response = data["data"]
            required_fields = ["hash", "status"]
            for field in required_fields:
                if field not in tx_response:
                    self.log_test_result(test_name, False, response_time, response.status_code, 
                                       f"Missing field in response: {field}")
                    return False
            
            self.log_test_result(test_name, True, response_time, response.status_code)
            return True
            
        except Exception as e:
            self.log_test_result(test_name, False, 0, 0, f"Test failed: {e}")
            return False
    
    def test_invalid_transaction_hash(self) -> bool:
        """Test error handling for invalid transaction hash"""
        test_name = "invalid_transaction_hash"
        try:
            start_time = time.time()
            response = requests.get(f"{self.base_url}/transaction/invalid_hash", timeout=10)
            response_time = time.time() - start_time
            
            # Should handle gracefully
            if response.status_code in [200, 400, 404]:
                self.log_test_result(test_name, True, response_time, response.status_code)
                return True
            else:
                self.log_test_result(test_name, False, response_time, response.status_code, 
                                   "Unexpected status code for invalid hash")
                return False
            
        except Exception as e:
            self.log_test_result(test_name, False, 0, 0, f"Test failed: {e}")
            return False
    
    def test_malformed_transaction_submission(self) -> bool:
        """Test error handling for malformed transaction submission"""
        test_name = "malformed_transaction_submission"
        try:
            # Submit transaction with missing required fields
            tx_data = {
                "from": "dyt1test_sender",
                # Missing 'to', 'amount', etc.
            }
            
            start_time = time.time()
            response = requests.post(f"{self.base_url}/submit", json=tx_data, timeout=10)
            response_time = time.time() - start_time
            
            # Should return error (400 or 422) or success=false
            if response.status_code in [400, 422]:
                self.log_test_result(test_name, True, response_time, response.status_code)
                return True
            elif response.status_code == 200:
                data = response.json()
                if not data.get("success", True):  # success=false is acceptable
                    self.log_test_result(test_name, True, response_time, response.status_code)
                    return True
            
            self.log_test_result(test_name, False, response_time, response.status_code, 
                               "Malformed transaction was accepted")
            return False
            
        except Exception as e:
            self.log_test_result(test_name, False, 0, 0, f"Test failed: {e}")
            return False
    
    def validate_transaction_structure(self, transaction: Dict[str, Any]) -> bool:
        """Validate that a transaction has the expected structure"""
        required_fields = ["hash", "from", "to", "amount", "fee", "nonce", "status", "timestamp"]
        
        for field in required_fields:
            if field not in transaction:
                logger.error(f"Missing required field: {field}")
                return False
        
        # Validate data types
        if not isinstance(transaction["hash"], str):
            logger.error("Transaction hash should be string")
            return False
        
        if not isinstance(transaction["amount"], int) or transaction["amount"] < 0:
            logger.error("Amount should be non-negative integer")
            return False
        
        if not isinstance(transaction["fee"], int) or transaction["fee"] < 0:
            logger.error("Fee should be non-negative integer")
            return False
        
        if transaction["status"] not in ["pending", "confirmed", "failed"]:
            logger.error(f"Invalid transaction status: {transaction['status']}")
            return False
        
        return True
    
    def run_all_tests(self) -> Dict[str, Any]:
        """Run all transactions endpoint tests"""
        logger.info("Starting Transactions API test suite")
        self.start_time = time.time()
        
        tests = [
            self.test_transactions_list_endpoint,
            self.test_transactions_pagination,
            self.test_transactions_by_account,
            self.test_single_transaction_endpoint,
            self.test_transaction_submission,
            self.test_invalid_transaction_hash,
            self.test_malformed_transaction_submission
        ]
        
        passed = 0
        total = len(tests)
        
        for test in tests:
            if test():
                passed += 1
        
        total_time = time.time() - self.start_time
        
        summary = {
            "suite_name": "Transactions API Tests",
            "total_tests": total,
            "passed": passed,
            "failed": total - passed,
            "pass_rate": (passed / total) * 100,
            "total_time_seconds": total_time,
            "results": self.test_results
        }
        
        logger.info(f"Transactions API tests completed: {passed}/{total} passed ({summary['pass_rate']:.1f}%)")
        return summary

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Test Dytallix Transactions API")
    parser.add_argument("--url", default="http://localhost:3030", help="Base URL for API")
    parser.add_argument("--output", help="JSON output file for results")
    
    args = parser.parse_args()
    
    tester = TransactionsAPITester(args.url)
    results = tester.run_all_tests()
    
    if args.output:
        with open(args.output, 'w') as f:
            json.dump(results, f, indent=2)
        print(f"Results saved to {args.output}")
    else:
        print(json.dumps(results, indent=2))