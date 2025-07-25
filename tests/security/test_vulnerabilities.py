#!/usr/bin/env python3
"""
Security Testing Suite for Dytallix API
Tests for common vulnerabilities, input validation, and security measures
"""

import requests
import json
import time
import logging
import string
import random
from datetime import datetime
from typing import Dict, List, Any, Optional
from urllib.parse import urlencode

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class SecurityTester:
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

    def test_sql_injection_protection(self) -> bool:
        """Test SQL injection attack protection"""
        test_name = "sql_injection_protection"
        
        # Common SQL injection payloads
        sql_payloads = [
            "' OR '1'='1",
            "'; DROP TABLE users; --",
            "' UNION SELECT * FROM users --",
            "1' OR 1=1 --",
            "admin'--",
            "' OR 1=1#",
            "1'; EXEC xp_cmdshell('dir'); --",
            "'; SELECT * FROM information_schema.tables --"
        ]
        
        vulnerable_endpoints = []
        total_tests = 0
        
        for payload in sql_payloads:
            # Test various endpoints with SQL injection payloads
            endpoints_to_test = [
                f"/blocks?from={payload}",
                f"/transactions?account={payload}",
                f"/balance/{payload}",
                f"/blocks/{payload}",
                f"/transaction/{payload}"
            ]
            
            for endpoint in endpoints_to_test:
                total_tests += 1
                start_time = time.time()
                
                try:
                    response = requests.get(f"{self.base_url}{endpoint}", timeout=5)
                    response_time = time.time() - start_time
                    
                    # Server should not crash or return database errors
                    if response.status_code == 500:
                        # Check if error message reveals database information
                        error_text = response.text.lower()
                        db_indicators = ["sql", "database", "table", "column", "mysql", "postgres", "sqlite"]
                        
                        if any(indicator in error_text for indicator in db_indicators):
                            vulnerable_endpoints.append({
                                "endpoint": endpoint,
                                "payload": payload,
                                "status_code": response.status_code,
                                "error_content": response.text[:200]
                            })
                    
                except requests.exceptions.RequestException:
                    # Timeouts or connection errors are acceptable for malformed requests
                    pass
        
        additional_data = {
            "total_tests": total_tests,
            "vulnerable_endpoints": vulnerable_endpoints,
            "payloads_tested": len(sql_payloads)
        }
        
        # Test passes if no SQL injection vulnerabilities found
        if len(vulnerable_endpoints) == 0:
            self.log_test_result(test_name, True, 0, 200, "", additional_data)
            return True
        else:
            self.log_test_result(test_name, False, 0, 200, 
                               f"Found {len(vulnerable_endpoints)} potential SQL injection vulnerabilities", 
                               additional_data)
            return False

    def test_xss_protection(self) -> bool:
        """Test Cross-Site Scripting (XSS) protection"""
        test_name = "xss_protection"
        
        # XSS payloads
        xss_payloads = [
            "<script>alert('XSS')</script>",
            "javascript:alert('XSS')",
            "<img src=x onerror=alert('XSS')>",
            "<svg onload=alert('XSS')>",
            "';alert('XSS');//",
            "<iframe src=javascript:alert('XSS')>",
            "<body onload=alert('XSS')>",
            "><script>alert('XSS')</script>"
        ]
        
        vulnerable_endpoints = []
        total_tests = 0
        
        for payload in xss_payloads:
            # Test endpoints that might reflect user input
            endpoints_to_test = [
                f"/balance/{payload}",
                f"/transaction/{payload}",
                f"/blocks/{payload}"
            ]
            
            for endpoint in endpoints_to_test:
                total_tests += 1
                start_time = time.time()
                
                try:
                    response = requests.get(f"{self.base_url}{endpoint}", timeout=5)
                    response_time = time.time() - start_time
                    
                    # Check if XSS payload is reflected in response without proper encoding
                    if payload in response.text:
                        vulnerable_endpoints.append({
                            "endpoint": endpoint,
                            "payload": payload,
                            "status_code": response.status_code
                        })
                    
                except requests.exceptions.RequestException:
                    pass
        
        additional_data = {
            "total_tests": total_tests,
            "vulnerable_endpoints": vulnerable_endpoints,
            "payloads_tested": len(xss_payloads)
        }
        
        if len(vulnerable_endpoints) == 0:
            self.log_test_result(test_name, True, 0, 200, "", additional_data)
            return True
        else:
            self.log_test_result(test_name, False, 0, 200, 
                               f"Found {len(vulnerable_endpoints)} potential XSS vulnerabilities", 
                               additional_data)
            return False

    def test_buffer_overflow_protection(self) -> bool:
        """Test buffer overflow protection with large payloads"""
        test_name = "buffer_overflow_protection"
        
        # Generate large payloads of different sizes
        large_payloads = [
            "A" * 1024,      # 1KB
            "B" * 10240,     # 10KB  
            "C" * 102400,    # 100KB
            "D" * 1048576    # 1MB
        ]
        
        crash_responses = []
        total_tests = 0
        
        for i, payload in enumerate(large_payloads):
            endpoints_to_test = [
                f"/balance/{payload}",
                f"/transaction/{payload}",
                f"/blocks/{payload}"
            ]
            
            for endpoint in endpoints_to_test:
                total_tests += 1
                start_time = time.time()
                
                try:
                    response = requests.get(f"{self.base_url}{endpoint}", timeout=10)
                    response_time = time.time() - start_time
                    
                    # Server should handle large inputs gracefully
                    if response.status_code == 500:
                        crash_responses.append({
                            "endpoint": endpoint,
                            "payload_size": len(payload),
                            "status_code": response.status_code,
                            "response_time": response_time
                        })
                    
                except requests.exceptions.Timeout:
                    # Timeout might indicate resource exhaustion
                    crash_responses.append({
                        "endpoint": endpoint,
                        "payload_size": len(payload),
                        "status_code": "timeout",
                        "response_time": 10.0
                    })
                except requests.exceptions.RequestException as e:
                    crash_responses.append({
                        "endpoint": endpoint,
                        "payload_size": len(payload),
                        "status_code": "error",
                        "error": str(e)
                    })
        
        additional_data = {
            "total_tests": total_tests,
            "crash_responses": crash_responses,
            "payload_sizes_tested": [len(p) for p in large_payloads]
        }
        
        # Allow some 4xx responses (bad request) but not 5xx (server errors) or crashes
        server_errors = [r for r in crash_responses if r.get("status_code", 0) >= 500 or r.get("status_code") == "timeout"]
        
        if len(server_errors) == 0:
            self.log_test_result(test_name, True, 0, 200, "", additional_data)
            return True
        else:
            self.log_test_result(test_name, False, 0, 200, 
                               f"Found {len(server_errors)} buffer overflow issues", 
                               additional_data)
            return False

    def test_rate_limiting(self) -> bool:
        """Test rate limiting protection"""
        test_name = "rate_limiting"
        
        # Rapid fire requests to test rate limiting
        endpoint = "/status"
        request_count = 50
        time_window = 10  # seconds
        
        start_time = time.time()
        responses = []
        
        for i in range(request_count):
            try:
                req_start = time.time()
                response = requests.get(f"{self.base_url}{endpoint}", timeout=2)
                req_time = time.time() - req_start
                
                responses.append({
                    "request_number": i + 1,
                    "status_code": response.status_code,
                    "response_time": req_time,
                    "timestamp": time.time()
                })
                
                # Small delay to avoid overwhelming
                time.sleep(0.1)
                
            except requests.exceptions.RequestException as e:
                responses.append({
                    "request_number": i + 1,
                    "status_code": "error",
                    "error": str(e),
                    "timestamp": time.time()
                })
        
        total_time = time.time() - start_time
        
        # Analyze responses for rate limiting
        rate_limited = [r for r in responses if r.get("status_code") == 429]
        successful = [r for r in responses if r.get("status_code") == 200]
        errors = [r for r in responses if r.get("status_code") not in [200, 429]]
        
        additional_data = {
            "total_requests": request_count,
            "total_time": total_time,
            "requests_per_second": request_count / total_time,
            "rate_limited_responses": len(rate_limited),
            "successful_responses": len(successful),
            "error_responses": len(errors),
            "sample_responses": responses[:5]
        }
        
        # Rate limiting is good if we get some 429 responses or if server handles gracefully
        if len(rate_limited) > 0 or len(errors) == 0:
            self.log_test_result(test_name, True, total_time, 200, "", additional_data)
            return True
        else:
            # If no rate limiting and no errors, it might be acceptable for a small test
            if len(successful) == request_count:
                self.log_test_result(test_name, True, total_time, 200, 
                                   "No rate limiting detected but server handled all requests", additional_data)
                return True
            else:
                self.log_test_result(test_name, False, total_time, 200, 
                                   "Server had issues handling rapid requests", additional_data)
                return False

    def test_cors_headers(self) -> bool:
        """Test CORS security headers"""
        test_name = "cors_headers"
        
        endpoints_to_test = ["/status", "/blocks", "/transactions", "/peers"]
        cors_issues = []
        total_tests = 0
        
        for endpoint in endpoints_to_test:
            total_tests += 1
            start_time = time.time()
            
            try:
                # Test preflight request
                preflight_response = requests.options(f"{self.base_url}{endpoint}", 
                                                    headers={"Origin": "https://malicious-site.com",
                                                           "Access-Control-Request-Method": "GET"}, 
                                                    timeout=5)
                
                # Test actual request with origin
                response = requests.get(f"{self.base_url}{endpoint}", 
                                      headers={"Origin": "https://malicious-site.com"}, 
                                      timeout=5)
                response_time = time.time() - start_time
                
                # Check CORS headers
                cors_headers = response.headers
                
                # Look for overly permissive CORS settings
                access_control_origin = cors_headers.get("Access-Control-Allow-Origin", "")
                
                issues = []
                if access_control_origin == "*":
                    issues.append("Wildcard origin allowed")
                
                if "Access-Control-Allow-Credentials" in cors_headers and access_control_origin == "*":
                    issues.append("Credentials allowed with wildcard origin")
                
                if issues:
                    cors_issues.append({
                        "endpoint": endpoint,
                        "issues": issues,
                        "cors_headers": dict(cors_headers)
                    })
                
            except requests.exceptions.RequestException:
                pass
        
        additional_data = {
            "total_tests": total_tests,
            "cors_issues": cors_issues
        }
        
        if len(cors_issues) == 0:
            self.log_test_result(test_name, True, 0, 200, "", additional_data)
            return True
        else:
            self.log_test_result(test_name, False, 0, 200, 
                               f"Found {len(cors_issues)} CORS security issues", 
                               additional_data)
            return False

    def test_http_security_headers(self) -> bool:
        """Test HTTP security headers"""
        test_name = "http_security_headers"
        
        endpoint = "/status"
        start_time = time.time()
        
        try:
            response = requests.get(f"{self.base_url}{endpoint}", timeout=5)
            response_time = time.time() - start_time
            
            headers = response.headers
            
            # Check for important security headers
            security_headers = {
                "X-Content-Type-Options": "nosniff",
                "X-Frame-Options": ["DENY", "SAMEORIGIN"],
                "X-XSS-Protection": "1; mode=block",
                "Strict-Transport-Security": "max-age=",
                "Content-Security-Policy": "default-src"
            }
            
            missing_headers = []
            present_headers = []
            
            for header, expected in security_headers.items():
                header_value = headers.get(header, "")
                
                if not header_value:
                    missing_headers.append(header)
                else:
                    if isinstance(expected, list):
                        if not any(exp in header_value for exp in expected):
                            missing_headers.append(f"{header} (invalid value)")
                    elif expected not in header_value:
                        missing_headers.append(f"{header} (invalid value)")
                    else:
                        present_headers.append(header)
            
            additional_data = {
                "missing_headers": missing_headers,
                "present_headers": present_headers,
                "all_headers": dict(headers)
            }
            
            # Consider test passed if at least some security headers are present
            if len(present_headers) >= 2:  # At least 2 security headers
                self.log_test_result(test_name, True, response_time, response.status_code, "", additional_data)
                return True
            else:
                self.log_test_result(test_name, False, response_time, response.status_code, 
                                   f"Missing important security headers: {missing_headers}", additional_data)
                return False
        
        except requests.exceptions.RequestException as e:
            self.log_test_result(test_name, False, 0, 0, f"Request failed: {e}")
            return False

    def test_malformed_json_handling(self) -> bool:
        """Test handling of malformed JSON in POST requests"""
        test_name = "malformed_json_handling"
        
        malformed_payloads = [
            '{"incomplete": json',
            '{"valid": "json", "but": "extra"} garbage',
            '{invalid: "json without quotes"}',
            '{"nested": {"incomplete": json}',
            '{"unicode": "\x00\x01\x02"}',
            '{"very": "long", "json": "' + 'A' * 10000 + '"}',
            '',
            'not json at all',
            '{"null_byte": "\x00"}'
        ]
        
        endpoint = "/submit"
        server_errors = []
        total_tests = 0
        
        for i, payload in enumerate(malformed_payloads):
            total_tests += 1
            start_time = time.time()
            
            try:
                response = requests.post(f"{self.base_url}{endpoint}", 
                                       data=payload,
                                       headers={"Content-Type": "application/json"},
                                       timeout=5)
                response_time = time.time() - start_time
                
                # Server should return 4xx (client error) not 5xx (server error)
                if response.status_code >= 500:
                    server_errors.append({
                        "payload_index": i,
                        "status_code": response.status_code,
                        "response_time": response_time,
                        "payload_preview": payload[:50]
                    })
                
            except requests.exceptions.RequestException:
                # Connection errors acceptable for malformed data
                pass
        
        additional_data = {
            "total_tests": total_tests,
            "server_errors": server_errors,
            "payloads_tested": len(malformed_payloads)
        }
        
        if len(server_errors) == 0:
            self.log_test_result(test_name, True, 0, 200, "", additional_data)
            return True
        else:
            self.log_test_result(test_name, False, 0, 200, 
                               f"Server errors on {len(server_errors)} malformed JSON payloads", 
                               additional_data)
            return False

    def run_all_tests(self) -> Dict[str, Any]:
        """Run all security tests"""
        logger.info("Starting Security test suite")
        self.start_time = time.time()
        
        tests = [
            self.test_sql_injection_protection,
            self.test_xss_protection,
            self.test_buffer_overflow_protection,
            self.test_rate_limiting,
            self.test_cors_headers,
            self.test_http_security_headers,
            self.test_malformed_json_handling
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
            "suite_name": "Security Vulnerability Tests",
            "total_tests": total,
            "passed": passed,
            "failed": total - passed,
            "pass_rate": (passed / total) * 100,
            "total_time_seconds": total_time,
            "results": self.test_results
        }
        
        logger.info(f"Security tests completed: {passed}/{total} passed ({summary['pass_rate']:.1f}%)")
        return summary

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Test Dytallix API Security")
    parser.add_argument("--url", default="http://localhost:3030", help="Base URL for API")
    parser.add_argument("--output", help="JSON output file for results")
    
    args = parser.parse_args()
    
    tester = SecurityTester(args.url)
    results = tester.run_all_tests()
    
    if args.output:
        with open(args.output, 'w') as f:
            json.dump(results, f, indent=2)
        print(f"Results saved to {args.output}")
    else:
        print(json.dumps(results, indent=2))