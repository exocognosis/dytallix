#!/usr/bin/env python3
"""
Comprehensive Test Runner for Dytallix API and WebSocket Testing Suite
Orchestrates all tests and provides comprehensive logging and reporting
"""

import asyncio
import json
import os
import sys
import time
import logging
import argparse
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional

# Add the tests directory to the Python path
tests_dir = Path(__file__).parent.parent
sys.path.insert(0, str(tests_dir))

# Import test modules
from api.test_blocks import BlocksAPITester
from api.test_transactions import TransactionsAPITester
from api.test_peers import PeersAPITester
from api.test_status import StatusAPITester
from websocket.test_realtime import WebSocketTester
from security.test_malformed_input import MalformedInputTester
from security.test_unauthorized import UnauthorizedAccessTester

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(f'test_runner_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log')
    ]
)
logger = logging.getLogger(__name__)

class DytallixTestRunner:
    def __init__(self, base_url: str = "http://localhost:3030", 
                 websocket_url: str = "ws://localhost:3030/ws"):
        self.base_url = base_url
        self.websocket_url = websocket_url
        self.test_suites = []
        self.results = {}
        self.start_time = None
        self.end_time = None
        
    def add_test_suite(self, name: str, tester_class, *args, **kwargs):
        """Add a test suite to be executed"""
        self.test_suites.append({
            "name": name,
            "tester_class": tester_class,
            "args": args,
            "kwargs": kwargs,
            "async": asyncio.iscoroutinefunction(tester_class(*args, **kwargs).run_all_tests)
        })
    
    async def run_all_tests(self, include_suites: Optional[List[str]] = None) -> Dict[str, Any]:
        """Run all configured test suites"""
        logger.info("Starting Dytallix comprehensive test execution")
        self.start_time = time.time()
        
        # Filter test suites if specified
        suites_to_run = self.test_suites
        if include_suites:
            suites_to_run = [s for s in self.test_suites if s["name"] in include_suites]
        
        total_suites = len(suites_to_run)
        completed_suites = 0
        
        for suite_config in suites_to_run:
            suite_name = suite_config["name"]
            logger.info(f"Running test suite: {suite_name}")
            
            try:
                # Create tester instance
                tester = suite_config["tester_class"](*suite_config["args"], **suite_config["kwargs"])
                
                # Run tests (async or sync)
                suite_start_time = time.time()
                if suite_config["async"]:
                    suite_result = await tester.run_all_tests()
                else:
                    suite_result = tester.run_all_tests()
                suite_duration = time.time() - suite_start_time
                
                # Store results
                self.results[suite_name] = {
                    **suite_result,
                    "suite_duration": suite_duration,
                    "execution_order": completed_suites + 1
                }
                
                completed_suites += 1
                logger.info(f"Completed {suite_name}: {suite_result['passed']}/{suite_result['total_tests']} passed")
                
            except Exception as e:
                logger.error(f"Failed to run test suite {suite_name}: {e}")
                self.results[suite_name] = {
                    "suite_name": suite_name,
                    "error": str(e),
                    "total_tests": 0,
                    "passed": 0,
                    "failed": 1,
                    "pass_rate": 0.0,
                    "execution_order": completed_suites + 1
                }
                completed_suites += 1
        
        self.end_time = time.time()
        
        # Generate comprehensive summary
        return self.generate_comprehensive_summary()
    
    def generate_comprehensive_summary(self) -> Dict[str, Any]:
        """Generate comprehensive test execution summary"""
        total_duration = self.end_time - self.start_time if self.end_time else 0
        
        # Aggregate statistics
        total_tests = sum(result.get("total_tests", 0) for result in self.results.values())
        total_passed = sum(result.get("passed", 0) for result in self.results.values())
        total_failed = sum(result.get("failed", 0) for result in self.results.values())
        
        # Calculate suite statistics
        successful_suites = sum(1 for result in self.results.values() 
                              if result.get("pass_rate", 0) >= 80.0)
        total_suites = len(self.results)
        
        # Performance statistics
        fastest_suite = min(self.results.values(), 
                          key=lambda x: x.get("suite_duration", float('inf')),
                          default={})
        slowest_suite = max(self.results.values(), 
                          key=lambda x: x.get("suite_duration", 0),
                          default={})
        
        # Generate test categories summary
        categories = {
            "API Tests": ["Blocks API Tests", "Transactions API Tests", "Peers API Tests", "Status API Tests"],
            "WebSocket Tests": ["WebSocket Real-time Tests"],
            "Security Tests": ["Malformed Input Security Tests", "Unauthorized Access Security Tests"]
        }
        
        category_stats = {}
        for category, suite_names in categories.items():
            category_results = [self.results[name] for name in suite_names if name in self.results]
            if category_results:
                category_stats[category] = {
                    "total_tests": sum(r.get("total_tests", 0) for r in category_results),
                    "passed": sum(r.get("passed", 0) for r in category_results),
                    "failed": sum(r.get("failed", 0) for r in category_results),
                    "pass_rate": (sum(r.get("passed", 0) for r in category_results) / 
                                max(1, sum(r.get("total_tests", 0) for r in category_results))) * 100,
                    "suites": len(category_results)
                }
        
        summary = {
            "execution_info": {
                "start_time": datetime.fromtimestamp(self.start_time).isoformat(),
                "end_time": datetime.fromtimestamp(self.end_time).isoformat() if self.end_time else None,
                "total_duration_seconds": total_duration,
                "base_url": self.base_url,
                "websocket_url": self.websocket_url
            },
            "overall_statistics": {
                "total_test_suites": total_suites,
                "successful_suites": successful_suites,
                "failed_suites": total_suites - successful_suites,
                "suite_success_rate": (successful_suites / max(1, total_suites)) * 100,
                "total_individual_tests": total_tests,
                "total_passed": total_passed,
                "total_failed": total_failed,
                "overall_pass_rate": (total_passed / max(1, total_tests)) * 100
            },
            "performance_statistics": {
                "average_test_duration": total_duration / max(1, total_tests),
                "fastest_suite": {
                    "name": fastest_suite.get("suite_name", "Unknown"),
                    "duration": fastest_suite.get("suite_duration", 0)
                },
                "slowest_suite": {
                    "name": slowest_suite.get("suite_name", "Unknown"),
                    "duration": slowest_suite.get("suite_duration", 0)
                }
            },
            "category_statistics": category_stats,
            "detailed_results": self.results,
            "recommendations": self.generate_recommendations()
        }
        
        return summary
    
    def generate_recommendations(self) -> List[str]:
        """Generate recommendations based on test results"""
        recommendations = []
        
        # Overall pass rate recommendations
        total_tests = sum(result.get("total_tests", 0) for result in self.results.values())
        total_passed = sum(result.get("passed", 0) for result in self.results.values())
        overall_pass_rate = (total_passed / max(1, total_tests)) * 100
        
        if overall_pass_rate < 70:
            recommendations.append("CRITICAL: Overall pass rate is below 70%. Immediate attention required.")
        elif overall_pass_rate < 85:
            recommendations.append("WARNING: Overall pass rate is below 85%. Review failed tests.")
        else:
            recommendations.append("GOOD: Overall pass rate is above 85%.")
        
        # Suite-specific recommendations
        for suite_name, result in self.results.items():
            pass_rate = result.get("pass_rate", 0)
            if pass_rate < 50:
                recommendations.append(f"CRITICAL: {suite_name} has very low pass rate ({pass_rate:.1f}%)")
            elif pass_rate < 80:
                recommendations.append(f"WARNING: {suite_name} has low pass rate ({pass_rate:.1f}%)")
        
        # Performance recommendations
        for suite_name, result in self.results.items():
            duration = result.get("suite_duration", 0)
            if duration > 300:  # 5 minutes
                recommendations.append(f"PERFORMANCE: {suite_name} took {duration:.1f}s - consider optimization")
        
        # Security-specific recommendations
        security_suites = ["Malformed Input Security Tests", "Unauthorized Access Security Tests"]
        for suite_name in security_suites:
            if suite_name in self.results:
                result = self.results[suite_name]
                if result.get("pass_rate", 0) < 80:
                    recommendations.append(f"SECURITY: {suite_name} failed - review security configurations")
        
        # WebSocket recommendations
        if "WebSocket Real-time Tests" in self.results:
            ws_result = self.results["WebSocket Real-time Tests"]
            if ws_result.get("pass_rate", 0) < 60:
                recommendations.append("WEBSOCKET: Consider implementing WebSocket functionality if not yet available")
        
        return recommendations
    
    def save_results(self, output_file: str):
        """Save test results to file"""
        summary = self.generate_comprehensive_summary()
        
        with open(output_file, 'w') as f:
            json.dump(summary, f, indent=2)
        
        logger.info(f"Test results saved to {output_file}")
    
    def print_summary(self):
        """Print a summary of test results to console"""
        summary = self.generate_comprehensive_summary()
        
        print("\n" + "="*80)
        print("DYTALLIX TEST EXECUTION SUMMARY")
        print("="*80)
        
        # Overall statistics
        overall = summary["overall_statistics"]
        print(f"\nOverall Results:")
        print(f"  Test Suites: {overall['successful_suites']}/{overall['total_test_suites']} passed ({overall['suite_success_rate']:.1f}%)")
        print(f"  Individual Tests: {overall['total_passed']}/{overall['total_individual_tests']} passed ({overall['overall_pass_rate']:.1f}%)")
        print(f"  Duration: {summary['execution_info']['total_duration_seconds']:.1f} seconds")
        
        # Category breakdown
        print(f"\nCategory Breakdown:")
        for category, stats in summary["category_statistics"].items():
            print(f"  {category}: {stats['passed']}/{stats['total_tests']} passed ({stats['pass_rate']:.1f}%)")
        
        # Suite details
        print(f"\nSuite Details:")
        for suite_name, result in summary["detailed_results"].items():
            status = "PASS" if result.get("pass_rate", 0) >= 80 else "FAIL"
            print(f"  [{status}] {suite_name}: {result.get('passed', 0)}/{result.get('total_tests', 0)} ({result.get('pass_rate', 0):.1f}%)")
        
        # Recommendations
        if summary["recommendations"]:
            print(f"\nRecommendations:")
            for rec in summary["recommendations"]:
                print(f"  • {rec}")
        
        print("="*80)

def setup_default_test_suites(runner: DytallixTestRunner):
    """Set up default test suites"""
    runner.add_test_suite("Blocks API Tests", BlocksAPITester, runner.base_url)
    runner.add_test_suite("Transactions API Tests", TransactionsAPITester, runner.base_url)
    runner.add_test_suite("Peers API Tests", PeersAPITester, runner.base_url)
    runner.add_test_suite("Status API Tests", StatusAPITester, runner.base_url)
    runner.add_test_suite("WebSocket Real-time Tests", WebSocketTester, runner.websocket_url)
    runner.add_test_suite("Malformed Input Security Tests", MalformedInputTester, runner.base_url)
    runner.add_test_suite("Unauthorized Access Security Tests", UnauthorizedAccessTester, runner.base_url)

async def main():
    parser = argparse.ArgumentParser(description="Dytallix Comprehensive Test Runner")
    parser.add_argument("--url", default="http://localhost:3030", help="Base URL for API")
    parser.add_argument("--ws-url", default="ws://localhost:3030/ws", help="WebSocket URL")
    parser.add_argument("--output", help="JSON output file for results")
    parser.add_argument("--suites", nargs="+", help="Specific test suites to run")
    parser.add_argument("--list-suites", action="store_true", help="List available test suites")
    parser.add_argument("--quick", action="store_true", help="Run quick tests only (skip long-running tests)")
    
    args = parser.parse_args()
    
    # Initialize test runner
    runner = DytallixTestRunner(args.url, args.ws_url)
    setup_default_test_suites(runner)
    
    if args.list_suites:
        print("Available test suites:")
        for suite in runner.test_suites:
            print(f"  - {suite['name']}")
        return
    
    # Run tests
    try:
        await runner.run_all_tests(include_suites=args.suites)
        
        # Print summary
        runner.print_summary()
        
        # Save results if specified
        if args.output:
            runner.save_results(args.output)
        else:
            # Default output file
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            default_output = f"dytallix_test_results_{timestamp}.json"
            runner.save_results(default_output)
        
    except KeyboardInterrupt:
        logger.info("Test execution interrupted by user")
    except Exception as e:
        logger.error(f"Test execution failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())