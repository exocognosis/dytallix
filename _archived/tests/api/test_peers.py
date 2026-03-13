#!/usr/bin/env python3
"""
API Testing Suite for Dytallix - Peers Endpoint
Tests the /peers endpoint for peer network information
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

class PeersAPITester:
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
    
    def test_peers_endpoint_basic(self) -> bool:
        """Test GET /peers endpoint for basic functionality"""
        test_name = "peers_basic_retrieval"
        try:
            start_time = time.time()
            response = requests.get(f"{self.base_url}/peers", timeout=10)
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
            
            peers = data["data"]
            if not isinstance(peers, list):
                self.log_test_result(test_name, False, response_time, response.status_code, 
                                   "Peers data is not a list")
                return False
            
            # Validate peer structure
            for i, peer in enumerate(peers):
                if not self.validate_peer_structure(peer):
                    self.log_test_result(test_name, False, response_time, response.status_code, 
                                       f"Invalid peer structure at index {i}")
                    return False
            
            self.log_test_result(test_name, True, response_time, response.status_code)
            return True
            
        except requests.exceptions.RequestException as e:
            self.log_test_result(test_name, False, 0, 0, f"Request failed: {e}")
            return False
    
    def test_peers_response_time(self) -> bool:
        """Test that peers endpoint responds within acceptable time"""
        test_name = "peers_response_time"
        max_response_time = 2.0  # 2 seconds max
        
        try:
            start_time = time.time()
            response = requests.get(f"{self.base_url}/peers", timeout=10)
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
    
    def test_peers_data_integrity(self) -> bool:
        """Test peers data integrity and consistency"""
        test_name = "peers_data_integrity"
        try:
            start_time = time.time()
            response = requests.get(f"{self.base_url}/peers", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code != 200:
                self.log_test_result(test_name, False, response_time, response.status_code)
                return False
            
            data = response.json()
            if not data["success"] or "data" not in data:
                self.log_test_result(test_name, False, response_time, response.status_code, 
                                   "Invalid response structure")
                return False
            
            peers = data["data"]
            
            # Check for duplicate peer IDs
            peer_ids = [peer.get("id") for peer in peers if "id" in peer]
            if len(peer_ids) != len(set(peer_ids)):
                self.log_test_result(test_name, False, response_time, response.status_code, 
                                   "Duplicate peer IDs found")
                return False
            
            # Check for valid IP addresses and ports
            for peer in peers:
                if "address" in peer:
                    address = peer["address"]
                    if ":" not in address:
                        self.log_test_result(test_name, False, response_time, response.status_code, 
                                           f"Invalid address format: {address}")
                        return False
                    
                    try:
                        ip, port = address.split(":", 1)
                        port_int = int(port)
                        if port_int < 1 or port_int > 65535:
                            self.log_test_result(test_name, False, response_time, response.status_code, 
                                               f"Invalid port number: {port_int}")
                            return False
                    except ValueError:
                        self.log_test_result(test_name, False, response_time, response.status_code, 
                                           f"Invalid port in address: {address}")
                        return False
            
            self.log_test_result(test_name, True, response_time, response.status_code)
            return True
            
        except Exception as e:
            self.log_test_result(test_name, False, 0, 0, f"Test failed: {e}")
            return False
    
    def test_peers_network_health_indicators(self) -> bool:
        """Test that peer data provides useful network health indicators"""
        test_name = "peers_network_health"
        try:
            start_time = time.time()
            response = requests.get(f"{self.base_url}/peers", timeout=10)
            response_time = time.time() - start_time
            
            if response.status_code != 200:
                self.log_test_result(test_name, False, response_time, response.status_code)
                return False
            
            data = response.json()
            if not data["success"] or "data" not in data:
                self.log_test_result(test_name, False, response_time, response.status_code, 
                                   "Invalid response structure")
                return False
            
            peers = data["data"]
            
            # Check that we have peers (network should not be empty)
            if len(peers) == 0:
                logger.warning("No peers found - this might indicate network isolation")
            
            # Check peer statuses
            connected_peers = [p for p in peers if p.get("status") == "connected"]
            if len(connected_peers) == 0 and len(peers) > 0:
                logger.warning("No connected peers found")
            
            # Check protocol version consistency
            protocol_versions = [p.get("protocol_version") for p in peers if "protocol_version" in p]
            unique_versions = set(protocol_versions)
            if len(unique_versions) > 2:  # Allow some version diversity but not too much
                logger.warning(f"High protocol version diversity: {unique_versions}")
            
            # Check block height sync
            block_heights = [p.get("block_height") for p in peers if isinstance(p.get("block_height"), int)]
            if block_heights:
                max_height = max(block_heights)
                min_height = min(block_heights)
                if max_height - min_height > 10:  # Allow some lag but not too much
                    logger.warning(f"Large block height disparity: {min_height} to {max_height}")
            
            self.log_test_result(test_name, True, response_time, response.status_code)
            return True
            
        except Exception as e:
            self.log_test_result(test_name, False, 0, 0, f"Test failed: {e}")
            return False
    
    def test_peers_concurrent_requests(self) -> bool:
        """Test peers endpoint under concurrent requests"""
        test_name = "peers_concurrent_requests"
        try:
            import threading
            import queue
            
            results_queue = queue.Queue()
            num_threads = 5
            
            def make_request():
                try:
                    start_time = time.time()
                    response = requests.get(f"{self.base_url}/peers", timeout=10)
                    response_time = time.time() - start_time
                    results_queue.put((response.status_code, response_time, None))
                except Exception as e:
                    results_queue.put((0, 0, str(e)))
            
            # Start concurrent requests
            threads = []
            for _ in range(num_threads):
                thread = threading.Thread(target=make_request)
                thread.start()
                threads.append(thread)
            
            # Wait for all threads to complete
            for thread in threads:
                thread.join()
            
            # Collect results
            all_succeeded = True
            total_time = 0
            while not results_queue.empty():
                status_code, response_time, error = results_queue.get()
                if status_code != 200 or error:
                    all_succeeded = False
                    logger.error(f"Concurrent request failed: {status_code}, {error}")
                total_time += response_time
            
            avg_response_time = total_time / num_threads
            
            if all_succeeded:
                self.log_test_result(test_name, True, avg_response_time, 200)
                return True
            else:
                self.log_test_result(test_name, False, avg_response_time, 0, 
                                   "Some concurrent requests failed")
                return False
            
        except Exception as e:
            self.log_test_result(test_name, False, 0, 0, f"Test failed: {e}")
            return False
    
    def validate_peer_structure(self, peer: Dict[str, Any]) -> bool:
        """Validate that a peer has the expected structure"""
        required_fields = ["id", "address", "status", "last_seen", "block_height", "protocol_version"]
        
        for field in required_fields:
            if field not in peer:
                logger.error(f"Missing required field: {field}")
                return False
        
        # Validate data types
        if not isinstance(peer["id"], str) or len(peer["id"]) == 0:
            logger.error("Peer ID should be non-empty string")
            return False
        
        if not isinstance(peer["address"], str) or ":" not in peer["address"]:
            logger.error("Peer address should be in format 'ip:port'")
            return False
        
        if peer["status"] not in ["connected", "connecting", "disconnected", "banned"]:
            logger.error(f"Invalid peer status: {peer['status']}")
            return False
        
        if not isinstance(peer["last_seen"], int) or peer["last_seen"] < 0:
            logger.error("Last seen should be non-negative timestamp")
            return False
        
        if not isinstance(peer["block_height"], int) or peer["block_height"] < 0:
            logger.error("Block height should be non-negative integer")
            return False
        
        if not isinstance(peer["protocol_version"], str):
            logger.error("Protocol version should be string")
            return False
        
        return True
    
    def run_all_tests(self) -> Dict[str, Any]:
        """Run all peers endpoint tests"""
        logger.info("Starting Peers API test suite")
        self.start_time = time.time()
        
        tests = [
            self.test_peers_endpoint_basic,
            self.test_peers_response_time,
            self.test_peers_data_integrity,
            self.test_peers_network_health_indicators,
            self.test_peers_concurrent_requests
        ]
        
        passed = 0
        total = len(tests)
        
        for test in tests:
            if test():
                passed += 1
        
        total_time = time.time() - self.start_time
        
        summary = {
            "suite_name": "Peers API Tests",
            "total_tests": total,
            "passed": passed,
            "failed": total - passed,
            "pass_rate": (passed / total) * 100,
            "total_time_seconds": total_time,
            "results": self.test_results
        }
        
        logger.info(f"Peers API tests completed: {passed}/{total} passed ({summary['pass_rate']:.1f}%)")
        return summary

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Test Dytallix Peers API")
    parser.add_argument("--url", default="http://localhost:3030", help="Base URL for API")
    parser.add_argument("--output", help="JSON output file for results")
    
    args = parser.parse_args()
    
    tester = PeersAPITester(args.url)
    results = tester.run_all_tests()
    
    if args.output:
        with open(args.output, 'w') as f:
            json.dump(results, f, indent=2)
        print(f"Results saved to {args.output}")
    else:
        print(json.dumps(results, indent=2))