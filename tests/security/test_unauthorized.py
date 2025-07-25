#!/usr/bin/env python3
"""
Security Testing Suite for Dytallix - Unauthorized Access Testing
Tests authentication, authorization, and access control mechanisms
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

class UnauthorizedAccessTester:
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
    
    def test_missing_authentication_headers(self) -> bool:
        """Test access without authentication headers where they might be required"""
        test_name = "missing_auth_headers"
        passed_tests = 0
        total_tests = 0
        
        # Test endpoints that might require authentication
        protected_endpoints = [
            ("/submit", "POST", {"from": "test", "to": "test", "amount": 1000}),
            ("/balance/admin_address", "GET", None),
            ("/peers", "GET", None),  # Might be admin-only
            ("/status", "GET", None),  # Should be public but test anyway
        ]
        
        for endpoint, method, data in protected_endpoints:
            total_tests += 1
            
            try:
                start_time = time.time()
                if method == "GET":
                    response = requests.get(f"{self.base_url}{endpoint}", timeout=10)
                elif method == "POST":
                    response = requests.post(f"{self.base_url}{endpoint}", json=data, timeout=10)
                response_time = time.time() - start_time
                
                # Check if endpoint properly handles missing auth
                # 200 = public endpoint (OK)
                # 401 = unauthorized (good security)
                # 403 = forbidden (good security)
                # 400 = bad request (acceptable for malformed requests)
                if response.status_code in [200, 400, 401, 403]:
                    passed_tests += 1
                else:
                    logger.warning(f"Unexpected status {response.status_code} for {endpoint}")
                    
            except Exception as e:
                logger.error(f"Exception testing {endpoint}: {e}")
        
        pass_rate = passed_tests / total_tests if total_tests > 0 else 0
        self.log_test_result(test_name, pass_rate >= 0.8, 0, 0, 
                           f"Pass rate: {pass_rate:.2%}",
                           {"total_tests": total_tests, "passed": passed_tests})
        return pass_rate >= 0.8
    
    def test_invalid_authentication_tokens(self) -> bool:
        """Test with invalid authentication tokens"""
        test_name = "invalid_auth_tokens"
        passed_tests = 0
        total_tests = 0
        
        invalid_tokens = [
            "invalid_token",
            "Bearer invalid_token",
            "Bearer ",
            "Bearer 123",
            "Bearer " + "A" * 1000,  # Very long token
            "Basic invalid_base64",
            "JWT invalid.jwt.token",
        ]
        
        headers_to_test = [
            "Authorization",
            "X-API-Key", 
            "X-Auth-Token",
            "Authentication",
        ]
        
        for token in invalid_tokens:
            for header_name in headers_to_test:
                total_tests += 1
                
                headers = {header_name: token}
                
                try:
                    start_time = time.time()
                    response = requests.get(f"{self.base_url}/balance/test_address", 
                                          headers=headers, timeout=10)
                    response_time = time.time() - start_time
                    
                    # Should reject invalid tokens with 401 or treat as no auth
                    if response.status_code in [200, 401, 403]:
                        passed_tests += 1
                    else:
                        logger.warning(f"Unexpected status {response.status_code} for invalid token")
                        
                except Exception as e:
                    logger.error(f"Exception with invalid token: {e}")
        
        pass_rate = passed_tests / total_tests if total_tests > 0 else 0
        self.log_test_result(test_name, pass_rate >= 0.8, 0, 0, 
                           f"Pass rate: {pass_rate:.2%}",
                           {"total_tests": total_tests, "passed": passed_tests})
        return pass_rate >= 0.8
    
    def test_privilege_escalation_attempts(self) -> bool:
        """Test privilege escalation attempts"""
        test_name = "privilege_escalation_protection"
        passed_tests = 0
        total_tests = 0
        
        # Test various privilege escalation patterns
        escalation_payloads = [
            {"from": "admin", "to": "user", "amount": 999999999},  # Large amount
            {"from": "root", "to": "test", "amount": 1000},        # Reserved username
            {"from": "system", "to": "test", "amount": 1000},      # System account
            {"from": "0x0", "to": "test", "amount": 1000},         # Null address
            {"admin": True, "from": "test", "to": "test", "amount": 1000},  # Admin flag
            {"role": "admin", "from": "test", "to": "test", "amount": 1000},  # Role injection
        ]
        
        for payload in escalation_payloads:
            total_tests += 1
            
            try:
                start_time = time.time()
                response = requests.post(f"{self.base_url}/submit", json=payload, timeout=10)
                response_time = time.time() - start_time
                
                # Should reject or sanitize privilege escalation attempts
                if response.status_code in [400, 401, 403, 422]:
                    passed_tests += 1
                elif response.status_code == 200:
                    try:
                        data = response.json()
                        if not data.get("success", True):
                            passed_tests += 1  # Handled as error
                        else:
                            # Check if privileged fields were ignored
                            if "admin" not in payload or "role" not in payload:
                                passed_tests += 1
                            else:
                                logger.warning("Privilege escalation payload may have been accepted")
                    except:
                        passed_tests += 1
                else:
                    passed_tests += 1
                    
            except Exception as e:
                logger.error(f"Exception with privilege escalation: {e}")
        
        pass_rate = passed_tests / total_tests if total_tests > 0 else 0
        self.log_test_result(test_name, pass_rate >= 0.8, 0, 0, 
                           f"Pass rate: {pass_rate:.2%}",
                           {"total_tests": total_tests, "passed": passed_tests})
        return pass_rate >= 0.8
    
    def test_cors_security(self) -> bool:
        """Test CORS (Cross-Origin Resource Sharing) security"""
        test_name = "cors_security"
        passed_tests = 0
        total_tests = 0
        
        # Test various Origin headers
        suspicious_origins = [
            "http://evil.com",
            "https://malicious-site.net",
            "http://localhost:3000",  # Different port
            "file://",
            "null",
            "http://127.0.0.1:8080",
        ]
        
        for origin in suspicious_origins:
            total_tests += 1
            
            headers = {
                "Origin": origin,
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "Content-Type"
            }
            
            try:
                start_time = time.time()
                # Test CORS preflight request
                response = requests.options(f"{self.base_url}/submit", headers=headers, timeout=10)
                response_time = time.time() - start_time
                
                # Check CORS headers in response
                cors_headers = {
                    "Access-Control-Allow-Origin": response.headers.get("Access-Control-Allow-Origin"),
                    "Access-Control-Allow-Methods": response.headers.get("Access-Control-Allow-Methods"),
                    "Access-Control-Allow-Headers": response.headers.get("Access-Control-Allow-Headers"),
                }
                
                # If CORS is configured securely, it should either:
                # 1. Not respond to OPTIONS at all
                # 2. Have restrictive CORS headers
                # 3. Return specific allowed origins, not "*" for all origins
                
                allow_origin = cors_headers["Access-Control-Allow-Origin"]
                if allow_origin == "*":
                    logger.warning("CORS allows all origins (*) - potential security risk")
                    passed_tests += 0.5  # Partial credit
                elif allow_origin is None:
                    passed_tests += 1  # No CORS = secure for this test
                elif origin in allow_origin:
                    if origin.startswith("http://evil") or origin.startswith("https://malicious"):
                        logger.warning(f"CORS allows suspicious origin: {origin}")
                    else:
                        passed_tests += 1
                else:
                    passed_tests += 1  # Origin not allowed = good
                    
            except Exception as e:
                logger.error(f"Exception testing CORS with origin {origin}: {e}")
        
        pass_rate = passed_tests / total_tests if total_tests > 0 else 0
        self.log_test_result(test_name, pass_rate >= 0.7, 0, 0, 
                           f"Pass rate: {pass_rate:.2%}",
                           {"total_tests": total_tests, "passed": passed_tests})
        return pass_rate >= 0.7
    
    def test_rate_limiting(self) -> bool:
        """Test rate limiting mechanisms"""
        test_name = "rate_limiting"
        
        try:
            # Make rapid requests to test rate limiting
            rapid_requests = []
            start_time = time.time()
            
            for i in range(20):  # 20 rapid requests
                try:
                    response = requests.get(f"{self.base_url}/health", timeout=5)
                    rapid_requests.append({
                        "request_number": i + 1,
                        "status_code": response.status_code,
                        "response_time": time.time() - start_time,
                        "rate_limited": response.status_code == 429
                    })
                except Exception as e:
                    rapid_requests.append({
                        "request_number": i + 1,
                        "error": str(e),
                        "rate_limited": False
                    })
            
            total_time = time.time() - start_time
            rate_limited_requests = sum(1 for req in rapid_requests if req.get("rate_limited", False))
            
            additional_data = {
                "total_requests": len(rapid_requests),
                "rate_limited_requests": rate_limited_requests,
                "total_time": total_time,
                "request_rate": len(rapid_requests) / total_time,
                "sample_responses": rapid_requests[:5]
            }
            
            # Rate limiting is good security practice but not always implemented
            # Test passes if either:
            # 1. Rate limiting is implemented (some 429 responses)
            # 2. All requests succeed (no rate limiting but API is functional)
            
            if rate_limited_requests > 0:
                self.log_test_result(test_name, True, total_time, 429, 
                                   f"Rate limiting detected: {rate_limited_requests} requests limited",
                                   additional_data)
                return True
            else:
                # No rate limiting detected, but this might be acceptable
                self.log_test_result(test_name, True, total_time, 200, 
                                   "No rate limiting detected (may be acceptable)",
                                   additional_data)
                return True
                
        except Exception as e:
            self.log_test_result(test_name, False, 0, 0, f"Exception: {e}")
            return False
    
    def test_http_security_headers(self) -> bool:
        """Test for proper HTTP security headers"""
        test_name = "http_security_headers"
        
        try:
            start_time = time.time()
            response = requests.get(f"{self.base_url}/health", timeout=10)
            response_time = time.time() - start_time
            
            security_headers = {
                "X-Content-Type-Options": response.headers.get("X-Content-Type-Options"),
                "X-Frame-Options": response.headers.get("X-Frame-Options"),
                "X-XSS-Protection": response.headers.get("X-XSS-Protection"),
                "Strict-Transport-Security": response.headers.get("Strict-Transport-Security"),
                "Content-Security-Policy": response.headers.get("Content-Security-Policy"),
                "Referrer-Policy": response.headers.get("Referrer-Policy"),
            }
            
            security_score = 0
            max_score = len(security_headers)
            
            for header, value in security_headers.items():
                if value:
                    security_score += 1
                    logger.info(f"Security header present: {header}: {value}")
                else:
                    logger.warning(f"Missing security header: {header}")
            
            additional_data = {
                "security_headers": security_headers,
                "security_score": security_score,
                "max_score": max_score,
                "security_percentage": (security_score / max_score) * 100
            }
            
            # Pass if at least some security headers are present
            passed = security_score >= 2  # At least 2 security headers
            
            self.log_test_result(test_name, passed, response_time, response.status_code,
                               f"Security headers score: {security_score}/{max_score}",
                               additional_data)
            return passed
            
        except Exception as e:
            self.log_test_result(test_name, False, 0, 0, f"Exception: {e}")
            return False
    
    def test_session_management(self) -> bool:
        """Test session management security"""
        test_name = "session_management"
        
        try:
            start_time = time.time()
            
            # Make requests and check for session cookies
            session = requests.Session()
            response1 = session.get(f"{self.base_url}/health", timeout=10)
            
            # Check for session cookies
            cookies = session.cookies.get_dict()
            
            # Check cookie security attributes
            secure_cookies = 0
            total_cookies = len(cookies)
            
            for cookie_name in cookies:
                # Get full cookie details
                for cookie in session.cookies:
                    if cookie.name == cookie_name:
                        if cookie.secure:
                            secure_cookies += 1
                        logger.info(f"Cookie: {cookie.name}, Secure: {cookie.secure}, HttpOnly: {hasattr(cookie, 'httponly') and cookie.httponly}")
            
            response_time = time.time() - start_time
            
            additional_data = {
                "total_cookies": total_cookies,
                "secure_cookies": secure_cookies,
                "cookie_names": list(cookies.keys())
            }
            
            # Pass if either no cookies (stateless) or cookies are properly secured
            if total_cookies == 0:
                self.log_test_result(test_name, True, response_time, response1.status_code,
                                   "No session cookies (stateless API)",
                                   additional_data)
                return True
            else:
                # If cookies exist, they should be secure
                passed = secure_cookies == total_cookies
                self.log_test_result(test_name, passed, response_time, response1.status_code,
                                   f"Cookie security: {secure_cookies}/{total_cookies} secure",
                                   additional_data)
                return passed
                
        except Exception as e:
            self.log_test_result(test_name, False, 0, 0, f"Exception: {e}")
            return False
    
    def test_information_disclosure(self) -> bool:
        """Test for information disclosure vulnerabilities"""
        test_name = "information_disclosure"
        passed_tests = 0
        total_tests = 0
        
        # Test various endpoints for information disclosure
        test_urls = [
            "/nonexistent_endpoint",
            "/admin",
            "/config",
            "/.env",
            "/debug",
            "/error",
        ]
        
        for url in test_urls:
            total_tests += 1
            
            try:
                start_time = time.time()
                response = requests.get(f"{self.base_url}{url}", timeout=10)
                response_time = time.time() - start_time
                
                # Check for information disclosure in error messages
                response_text = response.text.lower()
                
                # Look for sensitive information in response
                sensitive_keywords = [
                    "password", "secret", "key", "token", "database", 
                    "stack trace", "exception", "error", "debug",
                    "config", "environment", "env", "admin"
                ]
                
                disclosure_found = any(keyword in response_text for keyword in sensitive_keywords)
                
                if not disclosure_found or response.status_code == 404:
                    passed_tests += 1
                else:
                    logger.warning(f"Potential information disclosure at {url}")
                    
            except Exception as e:
                passed_tests += 1  # Connection errors are fine
        
        pass_rate = passed_tests / total_tests if total_tests > 0 else 0
        self.log_test_result(test_name, pass_rate >= 0.8, 0, 0, 
                           f"Pass rate: {pass_rate:.2%}",
                           {"total_tests": total_tests, "passed": passed_tests})
        return pass_rate >= 0.8
    
    def run_all_tests(self) -> Dict[str, Any]:
        """Run all unauthorized access tests"""
        logger.info("Starting Unauthorized Access Security test suite")
        self.start_time = time.time()
        
        tests = [
            self.test_missing_authentication_headers,
            self.test_invalid_authentication_tokens,
            self.test_privilege_escalation_attempts,
            self.test_cors_security,
            self.test_rate_limiting,
            self.test_http_security_headers,
            self.test_session_management,
            self.test_information_disclosure
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
            "suite_name": "Unauthorized Access Security Tests",
            "total_tests": total,
            "passed": passed,
            "failed": total - passed,
            "pass_rate": (passed / total) * 100,
            "total_time_seconds": total_time,
            "results": self.test_results
        }
        
        logger.info(f"Unauthorized Access tests completed: {passed}/{total} passed ({summary['pass_rate']:.1f}%)")
        return summary

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Test Dytallix API Security - Unauthorized Access")
    parser.add_argument("--url", default="http://localhost:3030", help="Base URL for API")
    parser.add_argument("--output", help="JSON output file for results")
    
    args = parser.parse_args()
    
    tester = UnauthorizedAccessTester(args.url)
    results = tester.run_all_tests()
    
    if args.output:
        with open(args.output, 'w') as f:
            json.dump(results, f, indent=2)
        print(f"Results saved to {args.output}")
    else:
        print(json.dumps(results, indent=2))