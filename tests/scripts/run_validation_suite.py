#!/usr/bin/env python3
"""
Dytallix API and WebSocket Validation Suite Orchestrator
One-command execution for comprehensive testing of all core interfaces
"""

import os
import sys
import json
import time
import asyncio
import logging
import argparse
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional
from concurrent.futures import ThreadPoolExecutor, as_completed

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))

try:
    from api.test_status import StatusAPITester
except ImportError as e:
    logger.error(f"Failed to import StatusAPITester: {e}")
    StatusAPITester = None

try:
    from websocket.test_realtime import WebSocketTester
except ImportError as e:
    logger.warning(f"WebSocket testing not available: {e}")
    WebSocketTester = None

try:
    from security.test_vulnerabilities import SecurityTester
except ImportError as e:
    logger.warning(f"Security testing not available: {e}")
    SecurityTester = None

try:
    from utils.performance_monitor import PerformanceMonitor, run_comprehensive_performance_test
except ImportError as e:
    logger.warning(f"Performance testing not available: {e}")
    PerformanceMonitor = None
    run_comprehensive_performance_test = None

class ValidationOrchestrator:
    def __init__(self, base_url: str = "http://localhost:3030", 
                 ws_url: str = "ws://localhost:3030/ws"):
        self.base_url = base_url
        self.ws_url = ws_url
        self.start_time = None
        self.results = {
            "test_run_info": {},
            "api_tests": {},
            "websocket_tests": {},
            "security_tests": {},
            "performance_tests": {},
            "summary": {}
        }
        
    def check_server_availability(self) -> bool:
        """Check if the Dytallix server is running and accessible"""
        logger.info("Checking server availability...")
        
        try:
            import requests
            response = requests.get(f"{self.base_url}/health", timeout=10)
            if response.status_code == 200:
                logger.info("✓ Server is running and accessible")
                return True
            else:
                logger.error(f"✗ Server returned status code: {response.status_code}")
                return False
        except Exception as e:
            logger.error(f"✗ Server is not accessible: {e}")
            return False
    
    def run_api_tests(self) -> Dict[str, Any]:
        """Run all API endpoint tests"""
        logger.info("🚀 Starting API endpoint tests...")
        
        api_results = {}
        
        # Status API tests
        try:
            status_tester = StatusAPITester(self.base_url)
            api_results["status"] = status_tester.run_all_tests()
            logger.info("✓ Status API tests completed")
        except Exception as e:
            logger.error(f"✗ Status API tests failed: {e}")
            api_results["status"] = {"error": str(e)}
        
        # Try to run other API tests if they exist
        api_test_classes = [
            ("blocks", "test_blocks", "BlocksAPITester"),
            ("transactions", "test_transactions", "TransactionsAPITester"), 
            ("peers", "test_peers", "PeersAPITester")
        ]
        
        for test_name, module_name, class_name in api_test_classes:
            try:
                # Try to import and run the test
                module_path = f"api.{module_name}"
                if self._module_exists(module_path):
                    module = __import__(module_path, fromlist=[class_name])
                    tester_class = getattr(module, class_name)
                    tester = tester_class(self.base_url)
                    api_results[test_name] = tester.run_all_tests()
                    logger.info(f"✓ {test_name.title()} API tests completed")
                else:
                    # Create basic test for missing modules
                    api_results[test_name] = self._run_basic_endpoint_test(f"/{test_name}")
                    logger.info(f"✓ Basic {test_name} endpoint test completed")
            except Exception as e:
                logger.error(f"✗ {test_name.title()} API tests failed: {e}")
                api_results[test_name] = {"error": str(e)}
        
        return api_results
    
    async def run_websocket_tests(self) -> Dict[str, Any]:
        """Run WebSocket real-time tests"""
        logger.info("🔌 Starting WebSocket tests...")
        
        try:
            ws_tester = WebSocketTester(self.ws_url)
            results = await ws_tester.run_all_tests()
            logger.info("✓ WebSocket tests completed")
            return results
        except Exception as e:
            logger.error(f"✗ WebSocket tests failed: {e}")
            return {"error": str(e)}
    
    def run_security_tests(self) -> Dict[str, Any]:
        """Run security vulnerability tests"""
        logger.info("🔒 Starting security tests...")
        
        try:
            security_tester = SecurityTester(self.base_url)
            results = security_tester.run_all_tests()
            logger.info("✓ Security tests completed")
            return results
        except Exception as e:
            logger.error(f"✗ Security tests failed: {e}")
            return {"error": str(e)}
    
    async def run_performance_tests(self) -> Dict[str, Any]:
        """Run performance and load tests"""
        logger.info("⚡ Starting performance tests...")
        
        try:
            results = await run_comprehensive_performance_test(self.base_url)
            logger.info("✓ Performance tests completed")
            return results
        except Exception as e:
            logger.error(f"✗ Performance tests failed: {e}")
            return {"error": str(e)}
    
    def _module_exists(self, module_path: str) -> bool:
        """Check if a module exists"""
        try:
            __import__(module_path)
            return True
        except ImportError:
            return False
    
    def _run_basic_endpoint_test(self, endpoint: str) -> Dict[str, Any]:
        """Run a basic test for an endpoint that doesn't have a dedicated test class"""
        import requests
        
        try:
            start_time = time.time()
            response = requests.get(f"{self.base_url}{endpoint}", timeout=10)
            response_time = time.time() - start_time
            
            return {
                "suite_name": f"Basic {endpoint} Test",
                "total_tests": 1,
                "passed": 1 if response.status_code == 200 else 0,
                "failed": 0 if response.status_code == 200 else 1,
                "pass_rate": 100.0 if response.status_code == 200 else 0.0,
                "total_time_seconds": response_time,
                "results": [{
                    "test_name": f"basic_{endpoint.replace('/', '_')}_access",
                    "passed": response.status_code == 200,
                    "response_time_ms": response_time * 1000,
                    "status_code": response.status_code,
                    "timestamp": datetime.now().isoformat()
                }]
            }
        except Exception as e:
            return {
                "suite_name": f"Basic {endpoint} Test",
                "total_tests": 1,
                "passed": 0,
                "failed": 1,
                "pass_rate": 0.0,
                "total_time_seconds": 0,
                "error": str(e)
            }
    
    def run_curl_tests(self) -> Dict[str, Any]:
        """Run cURL-based tests for quick validation"""
        logger.info("🌐 Running cURL validation tests...")
        
        curl_tests = [
            {
                "name": "status_curl",
                "command": ["curl", "-s", "-w", "%{http_code},%{time_total}", f"{self.base_url}/status"],
                "expected_status": "200"
            },
            {
                "name": "health_curl", 
                "command": ["curl", "-s", "-w", "%{http_code},%{time_total}", f"{self.base_url}/health"],
                "expected_status": "200"
            },
            {
                "name": "blocks_curl",
                "command": ["curl", "-s", "-w", "%{http_code},%{time_total}", f"{self.base_url}/blocks"],
                "expected_status": "200"
            },
            {
                "name": "transactions_curl",
                "command": ["curl", "-s", "-w", "%{http_code},%{time_total}", f"{self.base_url}/transactions"],
                "expected_status": "200"
            },
            {
                "name": "peers_curl",
                "command": ["curl", "-s", "-w", "%{http_code},%{time_total}", f"{self.base_url}/peers"],
                "expected_status": "200"
            }
        ]
        
        results = []
        passed = 0
        
        for test in curl_tests:
            try:
                result = subprocess.run(test["command"], capture_output=True, text=True, timeout=10)
                output = result.stdout
                
                # Parse status code and timing from curl output
                if "," in output:
                    parts = output.rsplit(",", 1)
                    status_code = parts[-1].split(",")[0] if "," in parts[-1] else parts[-1].strip()
                    response_time = parts[-1].split(",")[1] if "," in parts[-1] else "0"
                else:
                    status_code = "0"
                    response_time = "0"
                
                test_passed = status_code == test["expected_status"]
                if test_passed:
                    passed += 1
                
                results.append({
                    "test_name": test["name"],
                    "passed": test_passed,
                    "status_code": status_code,
                    "response_time": float(response_time) if response_time.replace(".", "").isdigit() else 0,
                    "command": " ".join(test["command"])
                })
                
            except Exception as e:
                results.append({
                    "test_name": test["name"],
                    "passed": False,
                    "error": str(e),
                    "command": " ".join(test["command"])
                })
        
        return {
            "suite_name": "cURL Validation Tests",
            "total_tests": len(curl_tests),
            "passed": passed,
            "failed": len(curl_tests) - passed,
            "pass_rate": (passed / len(curl_tests)) * 100,
            "results": results
        }
    
    def generate_summary(self) -> Dict[str, Any]:
        """Generate overall test summary"""
        total_tests = 0
        total_passed = 0
        total_failed = 0
        
        test_suites = [
            self.results.get("api_tests", {}),
            self.results.get("websocket_tests", {}),
            self.results.get("security_tests", {}),
            self.results.get("curl_tests", {})
        ]
        
        suite_summaries = []
        
        for suite in test_suites:
            if isinstance(suite, dict):
                for suite_name, suite_data in suite.items():
                    if isinstance(suite_data, dict) and "total_tests" in suite_data:
                        total_tests += suite_data.get("total_tests", 0)
                        total_passed += suite_data.get("passed", 0)
                        total_failed += suite_data.get("failed", 0)
                        
                        suite_summaries.append({
                            "suite": suite_name,
                            "tests": suite_data.get("total_tests", 0),
                            "passed": suite_data.get("passed", 0),
                            "pass_rate": suite_data.get("pass_rate", 0)
                        })
        
        overall_pass_rate = (total_passed / total_tests * 100) if total_tests > 0 else 0
        
        return {
            "overall_stats": {
                "total_test_suites": len(suite_summaries),
                "total_tests": total_tests,
                "total_passed": total_passed,
                "total_failed": total_failed,
                "overall_pass_rate": overall_pass_rate,
                "test_duration_seconds": time.time() - self.start_time if self.start_time else 0
            },
            "suite_breakdown": suite_summaries,
            "status": "PASS" if overall_pass_rate >= 80 else "FAIL",
            "timestamp": datetime.now().isoformat()
        }
    
    async def run_comprehensive_validation(self, include_performance: bool = True,
                                         include_security: bool = True) -> Dict[str, Any]:
        """Run comprehensive validation suite"""
        self.start_time = time.time()
        
        logger.info("🎯 Starting Dytallix Comprehensive Validation Suite")
        logger.info("=" * 60)
        
        # Check server availability first
        if not self.check_server_availability():
            return {
                "error": "Server is not accessible. Please ensure Dytallix is running on the specified URL.",
                "timestamp": datetime.now().isoformat()
            }
        
        # Store test run information
        self.results["test_run_info"] = {
            "start_time": datetime.now().isoformat(),
            "base_url": self.base_url,
            "websocket_url": self.ws_url,
            "include_performance": include_performance,
            "include_security": include_security
        }
        
        # 1. API Tests
        self.results["api_tests"] = self.run_api_tests()
        
        # 2. WebSocket Tests
        self.results["websocket_tests"] = await self.run_websocket_tests()
        
        # 3. cURL Tests
        self.results["curl_tests"] = self.run_curl_tests()
        
        # 4. Security Tests (optional)
        if include_security:
            self.results["security_tests"] = self.run_security_tests()
        
        # 5. Performance Tests (optional)
        if include_performance:
            self.results["performance_tests"] = await self.run_performance_tests()
        
        # Generate summary
        self.results["summary"] = self.generate_summary()
        
        total_time = time.time() - self.start_time
        logger.info("=" * 60)
        logger.info(f"🏁 Validation suite completed in {total_time:.2f} seconds")
        logger.info(f"📊 Overall pass rate: {self.results['summary']['overall_stats']['overall_pass_rate']:.1f}%")
        
        return self.results


def create_postman_collection(base_url: str) -> Dict[str, Any]:
    """Create a Postman collection for API testing"""
    collection = {
        "info": {
            "name": "Dytallix API Validation",
            "description": "Comprehensive API testing collection for Dytallix blockchain",
            "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
        },
        "variable": [
            {
                "key": "base_url",
                "value": base_url,
                "type": "string"
            }
        ],
        "item": [
            {
                "name": "Health Check",
                "request": {
                    "method": "GET",
                    "header": [],
                    "url": {
                        "raw": "{{base_url}}/health",
                        "host": ["{{base_url}}"],
                        "path": ["health"]
                    }
                },
                "event": [
                    {
                        "listen": "test",
                        "script": {
                            "exec": [
                                "pm.test('Status code is 200', function () {",
                                "    pm.response.to.have.status(200);",
                                "});",
                                "",
                                "pm.test('Response time is less than 1000ms', function () {",
                                "    pm.expect(pm.response.responseTime).to.be.below(1000);",
                                "});",
                                "",
                                "pm.test('Response has status ok', function () {",
                                "    const responseJson = pm.response.json();",
                                "    pm.expect(responseJson.status).to.eql('ok');",
                                "});"
                            ]
                        }
                    }
                ]
            },
            {
                "name": "System Status",
                "request": {
                    "method": "GET",
                    "header": [],
                    "url": {
                        "raw": "{{base_url}}/status",
                        "host": ["{{base_url}}"],
                        "path": ["status"]
                    }
                },
                "event": [
                    {
                        "listen": "test",
                        "script": {
                            "exec": [
                                "pm.test('Status code is 200', function () {",
                                "    pm.response.to.have.status(200);",
                                "});",
                                "",
                                "pm.test('Response has required fields', function () {",
                                "    const responseJson = pm.response.json();",
                                "    pm.expect(responseJson).to.have.property('success');",
                                "    pm.expect(responseJson).to.have.property('data');",
                                "    pm.expect(responseJson.data).to.have.property('version');",
                                "    pm.expect(responseJson.data).to.have.property('block_height');",
                                "});"
                            ]
                        }
                    }
                ]
            },
            {
                "name": "Get Blocks",
                "request": {
                    "method": "GET",
                    "header": [],
                    "url": {
                        "raw": "{{base_url}}/blocks",
                        "host": ["{{base_url}}"],
                        "path": ["blocks"]
                    }
                },
                "event": [
                    {
                        "listen": "test",
                        "script": {
                            "exec": [
                                "pm.test('Status code is 200', function () {",
                                "    pm.response.to.have.status(200);",
                                "});",
                                "",
                                "pm.test('Response is valid JSON', function () {",
                                "    pm.response.to.be.json;",
                                "});",
                                "",
                                "pm.test('Response has data array', function () {",
                                "    const responseJson = pm.response.json();",
                                "    pm.expect(responseJson.data).to.be.an('array');",
                                "});"
                            ]
                        }
                    }
                ]
            },
            {
                "name": "Get Transactions", 
                "request": {
                    "method": "GET",
                    "header": [],
                    "url": {
                        "raw": "{{base_url}}/transactions",
                        "host": ["{{base_url}}"],
                        "path": ["transactions"]
                    }
                },
                "event": [
                    {
                        "listen": "test",
                        "script": {
                            "exec": [
                                "pm.test('Status code is 200', function () {",
                                "    pm.response.to.have.status(200);",
                                "});",
                                "",
                                "pm.test('Response has transactions data', function () {",
                                "    const responseJson = pm.response.json();",
                                "    pm.expect(responseJson.data).to.be.an('array');",
                                "});"
                            ]
                        }
                    }
                ]
            },
            {
                "name": "Get Peers",
                "request": {
                    "method": "GET", 
                    "header": [],
                    "url": {
                        "raw": "{{base_url}}/peers",
                        "host": ["{{base_url}}"],
                        "path": ["peers"]
                    }
                },
                "event": [
                    {
                        "listen": "test",
                        "script": {
                            "exec": [
                                "pm.test('Status code is 200', function () {",
                                "    pm.response.to.have.status(200);",
                                "});",
                                "",
                                "pm.test('Response has peers data', function () {",
                                "    const responseJson = pm.response.json();",
                                "    pm.expect(responseJson.data).to.be.an('array');",
                                "});"
                            ]
                        }
                    }
                ]
            },
            {
                "name": "Submit Transaction",
                "request": {
                    "method": "POST",
                    "header": [
                        {
                            "key": "Content-Type",
                            "value": "application/json"
                        }
                    ],
                    "body": {
                        "mode": "raw",
                        "raw": "{\n  \"from\": \"test_sender\",\n  \"to\": \"test_receiver\",\n  \"amount\": 1000,\n  \"fee\": 10\n}"
                    },
                    "url": {
                        "raw": "{{base_url}}/submit",
                        "host": ["{{base_url}}"],
                        "path": ["submit"]
                    }
                },
                "event": [
                    {
                        "listen": "test",
                        "script": {
                            "exec": [
                                "pm.test('Status code is 200', function () {",
                                "    pm.response.to.have.status(200);",
                                "});",
                                "",
                                "pm.test('Transaction accepted', function () {",
                                "    const responseJson = pm.response.json();",
                                "    pm.expect(responseJson.success).to.be.true;",
                                "    pm.expect(responseJson.data).to.have.property('hash');",
                                "});"
                            ]
                        }
                    }
                ]
            }
        ]
    }
    
    return collection


def create_curl_scripts(base_url: str, output_dir: str):
    """Create cURL scripts for quick validation"""
    scripts = {
        "test_health.sh": f"""#!/bin/bash
# Test health endpoint
echo "Testing health endpoint..."
curl -w "Status: %{{http_code}}, Time: %{{time_total}}s\\n" \\
     -s -o /dev/null \\
     {base_url}/health
""",
        "test_status.sh": f"""#!/bin/bash
# Test status endpoint
echo "Testing status endpoint..."
curl -w "Status: %{{http_code}}, Time: %{{time_total}}s\\n" \\
     -s \\
     {base_url}/status | jq .
""",
        "test_blocks.sh": f"""#!/bin/bash
# Test blocks endpoint
echo "Testing blocks endpoint..."
curl -w "Status: %{{http_code}}, Time: %{{time_total}}s\\n" \\
     -s \\
     "{base_url}/blocks?limit=5" | jq .
""",
        "test_all.sh": f"""#!/bin/bash
# Test all endpoints quickly
echo "=== Dytallix API Quick Validation ==="
echo ""

echo "1. Health Check:"
curl -w "Status: %{{http_code}}, Time: %{{time_total}}s\\n" -s -o /dev/null {base_url}/health

echo ""
echo "2. System Status:"
curl -w "Status: %{{http_code}}, Time: %{{time_total}}s\\n" -s -o /dev/null {base_url}/status

echo ""
echo "3. Blocks:"
curl -w "Status: %{{http_code}}, Time: %{{time_total}}s\\n" -s -o /dev/null {base_url}/blocks

echo ""
echo "4. Transactions:"
curl -w "Status: %{{http_code}}, Time: %{{time_total}}s\\n" -s -o /dev/null {base_url}/transactions

echo ""
echo "5. Peers:"
curl -w "Status: %{{http_code}}, Time: %{{time_total}}s\\n" -s -o /dev/null {base_url}/peers

echo ""
echo "=== Validation Complete ==="
"""
    }
    
    # Create output directory
    os.makedirs(output_dir, exist_ok=True)
    
    # Write scripts
    for filename, content in scripts.items():
        script_path = os.path.join(output_dir, filename)
        with open(script_path, 'w') as f:
            f.write(content)
        os.chmod(script_path, 0o755)
        logger.info(f"Created cURL script: {script_path}")


async def main():
    parser = argparse.ArgumentParser(description="Dytallix Comprehensive Validation Suite")
    parser.add_argument("--url", default="http://localhost:3030", help="Base URL for API")
    parser.add_argument("--ws-url", default="ws://localhost:3030/ws", help="WebSocket URL")
    parser.add_argument("--output", help="JSON output file for results")
    parser.add_argument("--html-report", help="HTML report output file")
    parser.add_argument("--no-performance", action="store_true", help="Skip performance tests")
    parser.add_argument("--no-security", action="store_true", help="Skip security tests") 
    parser.add_argument("--create-postman", help="Create Postman collection file")
    parser.add_argument("--create-curl", help="Create cURL scripts directory")
    parser.add_argument("--quick", action="store_true", help="Run quick validation only")
    
    args = parser.parse_args()
    
    # Create orchestrator
    orchestrator = ValidationOrchestrator(args.url, args.ws_url)
    
    # Run validation
    if args.quick:
        logger.info("Running quick validation...")
        results = {
            "api_tests": {"status": StatusAPITester(args.url).run_all_tests()},
            "curl_tests": orchestrator.run_curl_tests()
        }
        results["summary"] = orchestrator.generate_summary()
    else:
        results = await orchestrator.run_comprehensive_validation(
            include_performance=not args.no_performance,
            include_security=not args.no_security
        )
    
    # Save results
    if args.output:
        with open(args.output, 'w') as f:
            json.dump(results, f, indent=2)
        logger.info(f"Results saved to {args.output}")
    
    # Create HTML report
    if args.html_report:
        try:
            from utils.report_html_generator import generate_html_report
            html_content = generate_html_report(results)
            with open(args.html_report, 'w') as f:
                f.write(html_content)
            logger.info(f"HTML report saved to {args.html_report}")
        except ImportError:
            logger.warning("HTML report generation not available")
    
    # Create Postman collection
    if args.create_postman:
        collection = create_postman_collection(args.url)
        with open(args.create_postman, 'w') as f:
            json.dump(collection, f, indent=2)
        logger.info(f"Postman collection saved to {args.create_postman}")
    
    # Create cURL scripts
    if args.create_curl:
        create_curl_scripts(args.url, args.create_curl)
        logger.info(f"cURL scripts created in {args.create_curl}")
    
    # Print summary
    if "summary" in results:
        summary = results["summary"]["overall_stats"]
        print(f"\n📊 VALIDATION SUMMARY:")
        print(f"   Total Tests: {summary['total_tests']}")
        print(f"   Passed: {summary['total_passed']}")
        print(f"   Failed: {summary['total_failed']}")
        print(f"   Pass Rate: {summary['overall_pass_rate']:.1f}%")
        print(f"   Duration: {summary['test_duration_seconds']:.1f}s")
        print(f"   Status: {results['summary']['status']}")
    
    # Exit with error code if tests failed
    if "summary" in results and results["summary"]["status"] == "FAIL":
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())