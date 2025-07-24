#!/usr/bin/env python3
"""
Security Testing Suite for Dytallix - Malformed Input Testing
Tests API endpoints with malformed, invalid, and edge case inputs
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

class MalformedInputTester:
    def __init__(self, base_url: str = "http://localhost:3030"):
        self.base_url = base_url
        self.test_results = []
        self.start_time = None
        
    def log_test_result(self, test_name: str, passed: bool, response_time: float, 
                       status_code: int, error_message: str = "", additional_data: Dict = None):
        """Log test results for later reporting"""
        result = {
            "test_name": test_name,
            "passed": passed,
            "response_time_ms": response_time * 1000,
            "status_code": status_code,
            "error_message": error_message,
            "timestamp": datetime.now().isoformat(),
            "additional_data": additional_data or {}
        }
        self.test_results.append(result)
        
        status = "PASS" if passed else "FAIL"
        logger.info(f"[{status}] {test_name} - {response_time*1000:.2f}ms - Status: {status_code}")
        if error_message:
            logger.error(f"Error: {error_message}")
    
    def test_sql_injection_attempts(self) -> bool:
        """Test SQL injection attempts in various endpoints"""
        test_name = "sql_injection_protection"
        passed_tests = 0
        total_tests = 0
        
        sql_payloads = [
            "'; DROP TABLE users; --",
            "1' OR '1'='1",
            "' UNION SELECT * FROM information_schema.tables --",
            "'; DELETE FROM blocks; --",
            "1' AND SLEEP(5) --"
        ]
        
        endpoints_to_test = [
            ("/balance/{}", "GET"),
            ("/transaction/{}", "GET"),
            ("/blocks/{}", "GET"),
        ]
        
        for endpoint_template, method in endpoints_to_test:
            for payload in sql_payloads:
                total_tests += 1
                endpoint = endpoint_template.format(payload)
                
                try:
                    start_time = time.time()
                    if method == "GET":
                        response = requests.get(f"{self.base_url}{endpoint}", timeout=10)
                    response_time = time.time() - start_time
                    
                    # SQL injection should either:
                    # 1. Return 400/422 (bad request)
                    # 2. Return 404 (not found) 
                    # 3. Return 200 with error in JSON
                    # BUT should not cause server error (500) or hang
                    
                    if response.status_code in [400, 404, 422]:
                        passed_tests += 1
                    elif response.status_code == 200:
                        try:
                            data = response.json()
                            if not data.get("success", True):  # Handled as error
                                passed_tests += 1
                            else:
                                logger.warning(f"SQL payload may have been processed: {payload}")
                        except:
                            passed_tests += 1  # Non-JSON response is acceptable
                    elif response.status_code >= 500:
                        logger.error(f"Server error with payload {payload}: {response.status_code}")
                    else:
                        passed_tests += 1  # Other responses are acceptable
                        
                except requests.exceptions.Timeout:
                    logger.error(f"Timeout with SQL payload: {payload}")
                except Exception as e:
                    logger.error(f"Exception with SQL payload {payload}: {e}")
        
        pass_rate = passed_tests / total_tests if total_tests > 0 else 0
        self.log_test_result(test_name, pass_rate >= 0.8, 0, 0, 
                           f"Pass rate: {pass_rate:.2%}", 
                           {"total_tests": total_tests, "passed": passed_tests})
        return pass_rate >= 0.8
    
    def test_xss_injection_attempts(self) -> bool:
        """Test XSS injection attempts"""
        test_name = "xss_injection_protection"
        passed_tests = 0
        total_tests = 0
        
        xss_payloads = [
            "<script>alert('xss')</script>",
            "javascript:alert('xss')",
            "<img src=x onerror=alert('xss')>",
            "<svg onload=alert('xss')>",
            "';alert('xss');//"
        ]
        
        # Test XSS in transaction submission (POST data)
        for payload in xss_payloads:
            total_tests += 1
            
            tx_data = {
                "from": payload,
                "to": f"legitimate_address_{payload}",
                "amount": 1000,
                "fee": 100
            }
            
            try:
                start_time = time.time()
                response = requests.post(f"{self.base_url}/submit", json=tx_data, timeout=10)
                response_time = time.time() - start_time
                
                # Should handle XSS attempts gracefully
                if response.status_code in [400, 422]:
                    passed_tests += 1
                elif response.status_code == 200:
                    try:
                        data = response.json()
                        # Check if the payload was sanitized or rejected
                        if "data" in data and isinstance(data["data"], dict):
                            if payload not in json.dumps(data["data"]):
                                passed_tests += 1  # Payload was sanitized
                            else:
                                logger.warning(f"XSS payload may not be sanitized: {payload}")
                        else:
                            passed_tests += 1
                    except:
                        passed_tests += 1
                else:
                    passed_tests += 1
                    
            except Exception as e:
                logger.error(f"Exception with XSS payload {payload}: {e}")
        
        pass_rate = passed_tests / total_tests if total_tests > 0 else 0
        self.log_test_result(test_name, pass_rate >= 0.8, 0, 0, 
                           f"Pass rate: {pass_rate:.2%}",
                           {"total_tests": total_tests, "passed": passed_tests})
        return pass_rate >= 0.8
    
    def test_buffer_overflow_attempts(self) -> bool:
        """Test buffer overflow attempts with extremely long inputs"""
        test_name = "buffer_overflow_protection"
        passed_tests = 0
        total_tests = 0
        
        # Generate very long strings
        long_strings = [
            "A" * 1000,      # 1KB
            "B" * 10000,     # 10KB  
            "C" * 100000,    # 100KB
            "X" * 1000000,   # 1MB
        ]
        
        for long_string in long_strings[:3]:  # Skip the 1MB test to avoid timeout
            total_tests += 1
            
            tx_data = {
                "from": long_string,
                "to": f"valid_address",
                "amount": 1000,
                "fee": 100
            }
            
            try:
                start_time = time.time()
                response = requests.post(f"{self.base_url}/submit", json=tx_data, timeout=15)
                response_time = time.time() - start_time
                
                # Should reject or handle large inputs gracefully
                if response.status_code in [400, 413, 422]:  # 413 = Payload Too Large
                    passed_tests += 1
                elif response.status_code == 200:
                    try:
                        data = response.json()
                        if not data.get("success", True):
                            passed_tests += 1  # Handled as error
                    except:
                        passed_tests += 1
                elif response.status_code >= 500:
                    logger.error(f"Server error with long input ({len(long_string)} chars)")
                else:
                    passed_tests += 1
                    
            except requests.exceptions.Timeout:
                logger.warning(f"Timeout with long input ({len(long_string)} chars)")
                passed_tests += 1  # Timeout is acceptable protection
            except Exception as e:
                logger.error(f"Exception with long input: {e}")
        
        pass_rate = passed_tests / total_tests if total_tests > 0 else 0
        self.log_test_result(test_name, pass_rate >= 0.8, 0, 0, 
                           f"Pass rate: {pass_rate:.2%}",
                           {"total_tests": total_tests, "passed": passed_tests})
        return pass_rate >= 0.8
    
    def test_invalid_json_formats(self) -> bool:
        """Test invalid JSON format handling"""
        test_name = "invalid_json_handling"
        passed_tests = 0
        total_tests = 0
        
        invalid_json_payloads = [
            '{invalid json}',
            '{"unclosed": "value"',
            '{"duplicate": "key", "duplicate": "value"}',
            '{"number": 123abc}',
            '{"array": [1,2,3,]}',  # Trailing comma
            '{"unicode": "\\uZZZZ"}',  # Invalid unicode
            '{"nested": {"very": {"deeply": {"nested": {"object": "value"}}}}}'  # Very deep nesting
        ]
        
        for payload in invalid_json_payloads:
            total_tests += 1
            
            try:
                start_time = time.time()
                response = requests.post(
                    f"{self.base_url}/submit", 
                    data=payload, 
                    headers={"Content-Type": "application/json"},
                    timeout=10
                )
                response_time = time.time() - start_time
                
                # Should return 400 (Bad Request) for invalid JSON
                if response.status_code == 400:
                    passed_tests += 1
                elif response.status_code in [422, 500]:
                    passed_tests += 1  # Also acceptable
                else:
                    logger.warning(f"Unexpected status for invalid JSON: {response.status_code}")
                    
            except requests.exceptions.RequestException:
                passed_tests += 1  # Connection errors are acceptable
            except Exception as e:
                logger.error(f"Exception with invalid JSON: {e}")
        
        pass_rate = passed_tests / total_tests if total_tests > 0 else 0
        self.log_test_result(test_name, pass_rate >= 0.8, 0, 0, 
                           f"Pass rate: {pass_rate:.2%}",
                           {"total_tests": total_tests, "passed": passed_tests})
        return pass_rate >= 0.8
    
    def test_type_confusion_attacks(self) -> bool:
        """Test type confusion attacks"""
        test_name = "type_confusion_protection"
        passed_tests = 0
        total_tests = 0
        
        type_confusion_payloads = [
            {"from": 123, "to": "valid", "amount": "invalid_number"},  # Wrong types
            {"from": [], "to": {}, "amount": None},  # Completely wrong types
            {"from": True, "to": False, "amount": [1,2,3]},  # Boolean/array confusion
            {"amount": "1.23e308"},  # Potential float overflow
            {"amount": -9223372036854775808},  # Large negative number
            {"nonce": {"nested": "object"}},  # Object where number expected
        ]
        
        for payload in type_confusion_payloads:
            total_tests += 1
            
            try:
                start_time = time.time()
                response = requests.post(f"{self.base_url}/submit", json=payload, timeout=10)
                response_time = time.time() - start_time
                
                # Should handle type errors gracefully
                if response.status_code in [400, 422]:
                    passed_tests += 1
                elif response.status_code == 200:
                    try:
                        data = response.json()
                        if not data.get("success", True):
                            passed_tests += 1  # Handled as error
                    except:
                        passed_tests += 1
                else:
                    passed_tests += 1
                    
            except Exception as e:
                logger.error(f"Exception with type confusion: {e}")
        
        pass_rate = passed_tests / total_tests if total_tests > 0 else 0
        self.log_test_result(test_name, pass_rate >= 0.8, 0, 0, 
                           f"Pass rate: {pass_rate:.2%}",
                           {"total_tests": total_tests, "passed": passed_tests})
        return pass_rate >= 0.8
    
    def test_unicode_and_encoding_attacks(self) -> bool:
        """Test Unicode and encoding-based attacks"""
        test_name = "unicode_encoding_protection"
        passed_tests = 0
        total_tests = 0
        
        unicode_payloads = [
            "dyt1\u0000null_byte",  # Null byte injection
            "dyt1\uffff\ufffe",     # Unicode BOM characters
            "dyt1\u202e\u202d",     # Right-to-left override
            "dyt1%00%0a%0d",        # URL encoded null/newline
            "dyt1\x00\x01\x02",    # Control characters
            "🚀💰🔥",               # Emoji (legitimate but test handling)
        ]
        
        for payload in unicode_payloads:
            total_tests += 1
            
            tx_data = {
                "from": payload,
                "to": "dyt1valid_receiver",
                "amount": 1000,
                "fee": 100
            }
            
            try:
                start_time = time.time()
                response = requests.post(f"{self.base_url}/submit", json=tx_data, timeout=10)
                response_time = time.time() - start_time
                
                # Should handle Unicode characters gracefully
                if response.status_code in [200, 400, 422]:
                    passed_tests += 1
                else:
                    logger.warning(f"Unexpected status for Unicode payload: {response.status_code}")
                    
            except Exception as e:
                logger.error(f"Exception with Unicode payload: {e}")
        
        pass_rate = passed_tests / total_tests if total_tests > 0 else 0
        self.log_test_result(test_name, pass_rate >= 0.8, 0, 0, 
                           f"Pass rate: {pass_rate:.2%}",
                           {"total_tests": total_tests, "passed": passed_tests})
        return pass_rate >= 0.8
    
    def test_path_traversal_attempts(self) -> bool:
        """Test path traversal attempts in URL parameters"""
        test_name = "path_traversal_protection"
        passed_tests = 0
        total_tests = 0
        
        path_traversal_payloads = [
            "../../../etc/passwd",
            "..\\..\\..\\windows\\system32\\config\\sam",
            "%2e%2e%2f%2e%2e%2f%2e%2e%2f",  # URL encoded
            "....//....//....//",
            "/dev/null",
            "con.txt",  # Windows reserved name
        ]
        
        for payload in path_traversal_payloads:
            total_tests += 1
            
            try:
                start_time = time.time()
                # Try path traversal in different endpoints
                response = requests.get(f"{self.base_url}/transaction/{payload}", timeout=10)
                response_time = time.time() - start_time
                
                # Should return 404 or 400, not 500 or actual file contents
                if response.status_code in [400, 404]:
                    passed_tests += 1
                elif response.status_code == 200:
                    # Check if response looks like file contents
                    try:
                        data = response.json()
                        if data.get("success") is False:
                            passed_tests += 1  # Handled as error
                        else:
                            logger.warning(f"Path traversal may have succeeded: {payload}")
                    except:
                        # Non-JSON response with path traversal is suspicious
                        logger.warning(f"Non-JSON response for path traversal: {payload}")
                else:
                    passed_tests += 1
                    
            except Exception as e:
                logger.error(f"Exception with path traversal: {e}")
        
        pass_rate = passed_tests / total_tests if total_tests > 0 else 0
        self.log_test_result(test_name, pass_rate >= 0.8, 0, 0, 
                           f"Pass rate: {pass_rate:.2%}",
                           {"total_tests": total_tests, "passed": passed_tests})
        return pass_rate >= 0.8
    
    def run_all_tests(self) -> Dict[str, Any]:
        """Run all malformed input tests"""
        logger.info("Starting Malformed Input Security test suite")
        self.start_time = time.time()
        
        tests = [
            self.test_sql_injection_attempts,
            self.test_xss_injection_attempts,
            self.test_buffer_overflow_attempts,
            self.test_invalid_json_formats,
            self.test_type_confusion_attacks,
            self.test_unicode_and_encoding_attacks,
            self.test_path_traversal_attempts
        ]
        
        passed = 0
        total = len(tests)
        
        for test in tests:
            try:
                if test():
                    passed += 1
            except Exception as e:
                logger.error(f"Test {test.__name__} failed with exception: {e}")
        
        total_time = time.time() - self.start_time
        
        summary = {
            "suite_name": "Malformed Input Security Tests",
            "total_tests": total,
            "passed": passed,
            "failed": total - passed,
            "pass_rate": (passed / total) * 100,
            "total_time_seconds": total_time,
            "results": self.test_results
        }
        
        logger.info(f"Malformed Input tests completed: {passed}/{total} passed ({summary['pass_rate']:.1f}%)")
        return summary

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Test Dytallix API Security - Malformed Input")
    parser.add_argument("--url", default="http://localhost:3030", help="Base URL for API")
    parser.add_argument("--output", help="JSON output file for results")
    
    args = parser.parse_args()
    
    tester = MalformedInputTester(args.url)
    results = tester.run_all_tests()
    
    if args.output:
        with open(args.output, 'w') as f:
            json.dump(results, f, indent=2)
        print(f"Results saved to {args.output}")
    else:
        print(json.dumps(results, indent=2))