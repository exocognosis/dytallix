#!/usr/bin/env python3
"""
API Testing Suite for Dytallix - Status Endpoint
Tests the /status endpoint for system status and health metrics
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

class StatusAPITester:
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
    
    def test_status_endpoint_basic(self) -> bool:
        """Test GET /status endpoint for basic functionality"""
        test_name = "status_basic_retrieval"
        try:
            start_time = time.time()
            response = requests.get(f"{self.base_url}/status", timeout=10)
            response_time = time.time() - start_time
            
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
            
            status_data = data["data"]
            if not self.validate_status_structure(status_data):
                self.log_test_result(test_name, False, response_time, response.status_code, 
                                   "Invalid status structure")
                return False
            
            self.log_test_result(test_name, True, response_time, response.status_code)
            return True
            
        except requests.exceptions.RequestException as e:
            self.log_test_result(test_name, False, 0, 0, f"Request failed: {e}")
            return False
    
    def test_health_endpoint_compatibility(self) -> bool:
        """Test GET /health endpoint (should exist for basic health checks)"""
        test_name = "health_endpoint_compatibility"
        try:
            start_time = time.time()
            response = requests.get(f"{self.base_url}/health", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code != 200:
                self.log_test_result(test_name, False, response_time, response.status_code, 
                                   "Health endpoint should return 200")
                return False
            
            # Should return some form of health indication
            try:
                data = response.json()
                if "status" in data and data["status"] == "ok":
                    self.log_test_result(test_name, True, response_time, response.status_code)
                    return True
            except:
                pass
            
            # Even if not JSON, 200 response is acceptable for health check
            self.log_test_result(test_name, True, response_time, response.status_code)
            return True
            
        except Exception as e:
            self.log_test_result(test_name, False, 0, 0, f"Test failed: {e}")
            return False
    
    def test_status_response_time(self) -> bool:
        """Test that status endpoint responds quickly (important for monitoring)"""
        test_name = "status_response_time"
        max_response_time = 1.0  # 1 second max for status endpoint
        
        try:
            start_time = time.time()
            response = requests.get(f"{self.base_url}/status", timeout=10)
            response_time = time.time() - start_time
            
            if response_time > max_response_time:
                self.log_test_result(test_name, False, response_time, response.status_code, 
                                   f"Response time {response_time:.3f}s exceeds {max_response_time}s limit")
                return False
            
            if response.status_code != 200:
                self.log_test_result(test_name, False, response_time, response.status_code, 
                                   "Non-200 status code")
                return False
            
            self.log_test_result(test_name, True, response_time, response.status_code)
            return True
            
        except Exception as e:
            self.log_test_result(test_name, False, 0, 0, f"Test failed: {e}")
            return False
    
    def test_status_metrics_validity(self) -> bool:
        """Test that status metrics provide valid and reasonable values"""
        test_name = "status_metrics_validity"
        try:
            start_time = time.time()
            response = requests.get(f"{self.base_url}/status", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code != 200:
                self.log_test_result(test_name, False, response_time, response.status_code)
                return False
            
            data = response.json()
            if not data["success"] or "data" not in data:
                self.log_test_result(test_name, False, response_time, response.status_code, 
                                   "Invalid response structure")
                return False
            
            status_data = data["data"]
            
            # Check uptime is reasonable (not negative, not impossibly high)
            if "uptime" in status_data:
                uptime = status_data["uptime"]
                if uptime < 0:
                    self.log_test_result(test_name, False, response_time, response.status_code, 
                                       "Negative uptime value")
                    return False
                if uptime > 365 * 24 * 3600:  # More than a year seems suspicious
                    logger.warning(f"Very high uptime reported: {uptime} seconds")
            
            # Check block height is reasonable
            if "block_height" in status_data:
                block_height = status_data["block_height"]
                if block_height < 0:
                    self.log_test_result(test_name, False, response_time, response.status_code, 
                                       "Negative block height")
                    return False
            
            # Check peer count is reasonable
            if "peer_count" in status_data:
                peer_count = status_data["peer_count"]
                if peer_count < 0:
                    self.log_test_result(test_name, False, response_time, response.status_code, 
                                       "Negative peer count")
                    return False
                if peer_count > 10000:  # Suspiciously high
                    logger.warning(f"Very high peer count: {peer_count}")
            
            # Check mempool size
            if "mempool_size" in status_data:
                mempool_size = status_data["mempool_size"]
                if mempool_size < 0:
                    self.log_test_result(test_name, False, response_time, response.status_code, 
                                       "Negative mempool size")
                    return False
            
            # Check sync status is valid
            if "sync_status" in status_data:
                sync_status = status_data["sync_status"]
                valid_statuses = ["synced", "syncing", "behind", "ahead", "disconnected"]
                if sync_status not in valid_statuses:
                    logger.warning(f"Unusual sync status: {sync_status}")
            
            self.log_test_result(test_name, True, response_time, response.status_code)
            return True
            
        except Exception as e:
            self.log_test_result(test_name, False, 0, 0, f"Test failed: {e}")
            return False
    
    def test_status_consistency(self) -> bool:
        """Test status endpoint consistency across multiple calls"""
        test_name = "status_consistency"
        try:
            # Make multiple requests and check for consistency
            responses = []
            for i in range(3):
                start_time = time.time()
                response = requests.get(f"{self.base_url}/status", timeout=10)
                response_time = time.time() - start_time
                
                if response.status_code != 200:
                    self.log_test_result(test_name, False, response_time, response.status_code, 
                                       f"Request {i+1} failed")
                    return False
                
                data = response.json()
                if not data["success"] or "data" not in data:
                    self.log_test_result(test_name, False, response_time, response.status_code, 
                                       f"Invalid response structure in request {i+1}")
                    return False
                
                responses.append(data["data"])
                time.sleep(0.1)  # Small delay between requests
            
            # Check that version and chain_id remain consistent
            versions = [r.get("version") for r in responses if "version" in r]
            chain_ids = [r.get("chain_id") for r in responses if "chain_id" in r]
            
            if len(set(versions)) > 1:
                self.log_test_result(test_name, False, 0, 200, 
                                   f"Version inconsistency: {versions}")
                return False
            
            if len(set(chain_ids)) > 1:
                self.log_test_result(test_name, False, 0, 200, 
                                   f"Chain ID inconsistency: {chain_ids}")
                return False
            
            # Check that block_height doesn't decrease (should stay same or increase)
            block_heights = [r.get("block_height") for r in responses if "block_height" in r]
            for i in range(1, len(block_heights)):
                if block_heights[i] < block_heights[i-1]:
                    self.log_test_result(test_name, False, 0, 200, 
                                       f"Block height decreased: {block_heights}")
                    return False
            
            self.log_test_result(test_name, True, 0, 200)
            return True
            
        except Exception as e:
            self.log_test_result(test_name, False, 0, 0, f"Test failed: {e}")
            return False
    
    def test_status_monitoring_compatibility(self) -> bool:
        """Test status endpoint for monitoring system compatibility"""
        test_name = "status_monitoring_compatibility"
        try:
            start_time = time.time()
            response = requests.get(f"{self.base_url}/status", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code != 200:
                self.log_test_result(test_name, False, response_time, response.status_code)
                return False
            
            data = response.json()
            if not data["success"] or "data" not in data:
                self.log_test_result(test_name, False, response_time, response.status_code, 
                                   "Invalid response structure")
                return False
            
            status_data = data["data"]
            
            # Check that essential monitoring metrics are present
            monitoring_fields = ["block_height", "peer_count", "sync_status"]
            missing_fields = [field for field in monitoring_fields if field not in status_data]
            
            if missing_fields:
                logger.warning(f"Missing monitoring fields: {missing_fields}")
            
            # Check response format is suitable for monitoring tools
            # Should be JSON with clear success/failure indication
            if "success" not in data:
                self.log_test_result(test_name, False, response_time, response.status_code, 
                                   "No success field for monitoring")
                return False
            
            # Response time should be reasonable for monitoring
            if response_time > 5.0:
                self.log_test_result(test_name, False, response_time, response.status_code, 
                                   "Too slow for monitoring systems")
                return False
            
            self.log_test_result(test_name, True, response_time, response.status_code)
            return True
            
        except Exception as e:
            self.log_test_result(test_name, False, 0, 0, f"Test failed: {e}")
            return False
    
    def validate_status_structure(self, status_data: Dict[str, Any]) -> bool:
        """Validate that status data has the expected structure"""
        required_fields = ["version", "uptime", "block_height", "peer_count", "mempool_size", "sync_status", "chain_id"]
        
        for field in required_fields:
            if field not in status_data:
                logger.error(f"Missing required field: {field}")
                return False
        
        # Validate data types
        if not isinstance(status_data["version"], str):
            logger.error("Version should be string")
            return False
        
        if not isinstance(status_data["uptime"], int) or status_data["uptime"] < 0:
            logger.error("Uptime should be non-negative integer")
            return False
        
        if not isinstance(status_data["block_height"], int) or status_data["block_height"] < 0:
            logger.error("Block height should be non-negative integer")
            return False
        
        if not isinstance(status_data["peer_count"], int) or status_data["peer_count"] < 0:
            logger.error("Peer count should be non-negative integer")
            return False
        
        if not isinstance(status_data["mempool_size"], int) or status_data["mempool_size"] < 0:
            logger.error("Mempool size should be non-negative integer")
            return False
        
        if not isinstance(status_data["sync_status"], str):
            logger.error("Sync status should be string")
            return False
        
        if not isinstance(status_data["chain_id"], str):
            logger.error("Chain ID should be string")
            return False
        
        return True
    
    def run_all_tests(self) -> Dict[str, Any]:
        """Run all status endpoint tests"""
        logger.info("Starting Status API test suite")
        self.start_time = time.time()
        
        tests = [
            self.test_status_endpoint_basic,
            self.test_health_endpoint_compatibility,
            self.test_status_response_time,
            self.test_status_metrics_validity,
            self.test_status_consistency,
            self.test_status_monitoring_compatibility
        ]
        
        passed = 0
        total = len(tests)
        
        for test in tests:
            if test():
                passed += 1
        
        total_time = time.time() - self.start_time
        
        summary = {
            "suite_name": "Status API Tests",
            "total_tests": total,
            "passed": passed,
            "failed": total - passed,
            "pass_rate": (passed / total) * 100,
            "total_time_seconds": total_time,
            "results": self.test_results
        }
        
        logger.info(f"Status API tests completed: {passed}/{total} passed ({summary['pass_rate']:.1f}%)")
        return summary

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Test Dytallix Status API")
    parser.add_argument("--url", default="http://localhost:3030", help="Base URL for API")
    parser.add_argument("--output", help="JSON output file for results")
    
    args = parser.parse_args()
    
    tester = StatusAPITester(args.url)
    results = tester.run_all_tests()
    
    if args.output:
        with open(args.output, 'w') as f:
            json.dump(results, f, indent=2)
        print(f"Results saved to {args.output}")
    else:
        print(json.dumps(results, indent=2))