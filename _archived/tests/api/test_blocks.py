#!/usr/bin/env python3
"""
API Testing Suite for Dytallix - Blocks Endpoint
Tests the /blocks endpoint for block data retrieval and structure validation
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

class BlocksAPITester:
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
    
    def test_blocks_list_endpoint(self) -> bool:
        """Test GET /blocks endpoint for listing blocks"""
        test_name = "blocks_list_basic"
        try:
            start_time = time.time()
            response = requests.get(f"{self.base_url}/blocks", timeout=10)
            response_time = time.time() - start_time
            
            # Check status code
            if response.status_code != 200:
                self.log_test_result(test_name, False, response_time, response.status_code, 
                                   f"Expected 200, got {response.status_code}")
                return False
            
            # Parse JSON response
            try:
                data = response.json()
            except json.JSONDecodeError as e:
                self.log_test_result(test_name, False, response_time, response.status_code, 
                                   f"Invalid JSON response: {e}")
                return False
            
            # Validate response structure
            if not isinstance(data, dict):
                self.log_test_result(test_name, False, response_time, response.status_code, 
                                   "Response is not a dictionary")
                return False
            
            if "success" not in data:
                self.log_test_result(test_name, False, response_time, response.status_code, 
                                   "Missing 'success' field")
                return False
            
            if not data["success"]:
                self.log_test_result(test_name, False, response_time, response.status_code, 
                                   f"API returned success=false: {data.get('error', 'Unknown error')}")
                return False
            
            if "data" not in data:
                self.log_test_result(test_name, False, response_time, response.status_code, 
                                   "Missing 'data' field")
                return False
            
            blocks = data["data"]
            if not isinstance(blocks, list):
                self.log_test_result(test_name, False, response_time, response.status_code, 
                                   "Blocks data is not a list")
                return False
            
            # Validate block structure
            for i, block in enumerate(blocks):
                if not self.validate_block_structure(block):
                    self.log_test_result(test_name, False, response_time, response.status_code, 
                                       f"Invalid block structure at index {i}")
                    return False
            
            self.log_test_result(test_name, True, response_time, response.status_code)
            return True
            
        except requests.exceptions.RequestException as e:
            self.log_test_result(test_name, False, 0, 0, f"Request failed: {e}")
            return False
    
    def test_blocks_with_pagination(self) -> bool:
        """Test GET /blocks with pagination parameters"""
        test_name = "blocks_pagination"
        try:
            params = {"limit": "5", "from": "1234"}
            start_time = time.time()
            response = requests.get(f"{self.base_url}/blocks", params=params, timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code != 200:
                self.log_test_result(test_name, False, response_time, response.status_code)
                return False
            
            data = response.json()
            if not data["success"] or "data" not in data:
                self.log_test_result(test_name, False, response_time, response.status_code, 
                                   "Invalid response structure")
                return False
            
            blocks = data["data"]
            if len(blocks) > 5:
                self.log_test_result(test_name, False, response_time, response.status_code, 
                                   f"Expected max 5 blocks, got {len(blocks)}")
                return False
            
            self.log_test_result(test_name, True, response_time, response.status_code)
            return True
            
        except Exception as e:
            self.log_test_result(test_name, False, 0, 0, f"Test failed: {e}")
            return False
    
    def test_single_block_endpoint(self) -> bool:
        """Test GET /blocks/{id} endpoint for single block retrieval"""
        test_name = "single_block_retrieval"
        try:
            # Test with block number
            start_time = time.time()
            response = requests.get(f"{self.base_url}/blocks/1234", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code != 200:
                self.log_test_result(test_name, False, response_time, response.status_code)
                return False
            
            data = response.json()
            if not data["success"] or "data" not in data:
                self.log_test_result(test_name, False, response_time, response.status_code, 
                                   "Invalid response structure")
                return False
            
            block = data["data"]
            if not self.validate_block_structure(block):
                self.log_test_result(test_name, False, response_time, response.status_code, 
                                   "Invalid block structure")
                return False
            
            self.log_test_result(test_name, True, response_time, response.status_code)
            return True
            
        except Exception as e:
            self.log_test_result(test_name, False, 0, 0, f"Test failed: {e}")
            return False
    
    def test_latest_block_endpoint(self) -> bool:
        """Test GET /blocks/latest endpoint"""
        test_name = "latest_block_retrieval"
        try:
            start_time = time.time()
            response = requests.get(f"{self.base_url}/blocks/latest", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code != 200:
                self.log_test_result(test_name, False, response_time, response.status_code)
                return False
            
            data = response.json()
            if not data["success"] or "data" not in data:
                self.log_test_result(test_name, False, response_time, response.status_code, 
                                   "Invalid response structure")
                return False
            
            block = data["data"]
            if not self.validate_block_structure(block):
                self.log_test_result(test_name, False, response_time, response.status_code, 
                                   "Invalid block structure")
                return False
            
            self.log_test_result(test_name, True, response_time, response.status_code)
            return True
            
        except Exception as e:
            self.log_test_result(test_name, False, 0, 0, f"Test failed: {e}")
            return False
    
    def validate_block_structure(self, block: Dict[str, Any]) -> bool:
        """Validate that a block has the expected structure"""
        required_fields = ["number", "hash", "parent_hash", "timestamp", "transactions", "size", "gas_used", "gas_limit"]
        
        for field in required_fields:
            if field not in block:
                logger.error(f"Missing required field: {field}")
                return False
        
        # Validate data types
        if not isinstance(block["number"], int):
            logger.error("Block number should be integer")
            return False
        
        if not isinstance(block["hash"], str) or not block["hash"].startswith("0x"):
            logger.error("Block hash should be hex string")
            return False
        
        if not isinstance(block["transactions"], list):
            logger.error("Transactions should be a list")
            return False
        
        if not isinstance(block["size"], int) or block["size"] <= 0:
            logger.error("Block size should be positive integer")
            return False
        
        return True
    
    def test_invalid_block_id(self) -> bool:
        """Test error handling for invalid block IDs"""
        test_name = "invalid_block_id_handling"
        try:
            start_time = time.time()
            response = requests.get(f"{self.base_url}/blocks/invalid_id", timeout=10)
            response_time = time.time() - start_time
            
            # Should handle gracefully - either 404 or return error in JSON
            if response.status_code in [200, 400, 404]:
                self.log_test_result(test_name, True, response_time, response.status_code)
                return True
            else:
                self.log_test_result(test_name, False, response_time, response.status_code, 
                                   "Unexpected status code for invalid block ID")
                return False
            
        except Exception as e:
            self.log_test_result(test_name, False, 0, 0, f"Test failed: {e}")
            return False
    
    def run_all_tests(self) -> Dict[str, Any]:
        """Run all blocks endpoint tests"""
        logger.info("Starting Blocks API test suite")
        self.start_time = time.time()
        
        tests = [
            self.test_blocks_list_endpoint,
            self.test_blocks_with_pagination,
            self.test_single_block_endpoint,
            self.test_latest_block_endpoint,
            self.test_invalid_block_id
        ]
        
        passed = 0
        total = len(tests)
        
        for test in tests:
            if test():
                passed += 1
        
        total_time = time.time() - self.start_time
        
        summary = {
            "suite_name": "Blocks API Tests",
            "total_tests": total,
            "passed": passed,
            "failed": total - passed,
            "pass_rate": (passed / total) * 100,
            "total_time_seconds": total_time,
            "results": self.test_results
        }
        
        logger.info(f"Blocks API tests completed: {passed}/{total} passed ({summary['pass_rate']:.1f}%)")
        return summary

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Test Dytallix Blocks API")
    parser.add_argument("--url", default="http://localhost:3030", help="Base URL for API")
    parser.add_argument("--output", help="JSON output file for results")
    
    args = parser.parse_args()
    
    tester = BlocksAPITester(args.url)
    results = tester.run_all_tests()
    
    if args.output:
        with open(args.output, 'w') as f:
            json.dump(results, f, indent=2)
        print(f"Results saved to {args.output}")
    else:
        print(json.dumps(results, indent=2))