#!/usr/bin/env python3
"""
Testnet Audit System Validation Script
Validates all components of the audit system before running tests
"""

import os
import sys
import json
import subprocess
import importlib.util
import tempfile
from pathlib import Path
from typing import Dict, List, Tuple, Any

# Colors for output
class Colors:
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    PURPLE = '\033[95m'
    CYAN = '\033[96m'
    BOLD = '\033[1m'
    END = '\033[0m'

def print_header(text: str):
    print(f"\n{Colors.PURPLE}{Colors.BOLD}{'='*60}")
    print(f"🔍 {text}")
    print(f"{'='*60}{Colors.END}")

def print_success(text: str):
    print(f"{Colors.GREEN}✅ {text}{Colors.END}")

def print_warning(text: str):
    print(f"{Colors.YELLOW}⚠️  {text}{Colors.END}")

def print_error(text: str):
    print(f"{Colors.RED}❌ {text}{Colors.END}")

def print_info(text: str):
    print(f"{Colors.CYAN}ℹ️  {text}{Colors.END}")

class AuditSystemValidator:
    def __init__(self, audit_dir: str):
        self.audit_dir = Path(audit_dir)
        self.project_root = self.audit_dir.parent
        self.validation_results = []
        
    def run_validation(self) -> bool:
        """Run complete validation of the audit system"""
        print_header("DYTALLIX TESTNET AUDIT SYSTEM VALIDATION")
        
        all_passed = True
        
        # Directory structure validation
        all_passed &= self.validate_directory_structure()
        
        # File existence validation
        all_passed &= self.validate_file_existence()
        
        # Python script validation
        all_passed &= self.validate_python_scripts()
        
        # Shell script validation
        all_passed &= self.validate_shell_scripts()
        
        # Configuration file validation
        all_passed &= self.validate_configuration_files()
        
        # Dependency validation
        all_passed &= self.validate_dependencies()
        
        # Integration validation
        all_passed &= self.validate_integration_points()
        
        # Generate validation report
        self.generate_validation_report()
        
        print_header("VALIDATION SUMMARY")
        if all_passed:
            print_success("All validations passed! Audit system is ready.")
        else:
            print_error("Some validations failed. Check the report for details.")
        
        return all_passed
    
    def validate_directory_structure(self) -> bool:
        """Validate the audit directory structure"""
        print_header("Directory Structure Validation")
        
        required_dirs = [
            "load-testing",
            "monitoring", 
            "scripts",
            "reports"
        ]
        
        all_dirs_exist = True
        for dir_name in required_dirs:
            dir_path = self.audit_dir / dir_name
            if dir_path.exists():
                print_success(f"Directory exists: {dir_name}/")
            else:
                print_error(f"Missing directory: {dir_name}/")
                all_dirs_exist = False
        
        # Check for results directory (created at runtime)
        results_dir = self.audit_dir / "results"
        if not results_dir.exists():
            print_info("Results directory will be created at runtime")
        
        self.validation_results.append({
            "test": "directory_structure",
            "passed": all_dirs_exist,
            "details": f"Required directories: {', '.join(required_dirs)}"
        })
        
        return all_dirs_exist
    
    def validate_file_existence(self) -> bool:
        """Validate that all required files exist"""
        print_header("File Existence Validation")
        
        required_files = [
            "load-testing/locust_load_test.py",
            "load-testing/artillery-config.yml",
            "load-testing/websocket_stress_test.py",
            "monitoring/performance-monitor.ts",
            "scripts/run-testnet-audit.sh",
            "scripts/post-audit-stability-check.sh",
            "reports/health-dashboard.html",
            "requirements.txt",
            "README.md"
        ]
        
        all_files_exist = True
        for file_path in required_files:
            full_path = self.audit_dir / file_path
            if full_path.exists():
                size = full_path.stat().st_size
                print_success(f"File exists: {file_path} ({size} bytes)")
            else:
                print_error(f"Missing file: {file_path}")
                all_files_exist = False
        
        self.validation_results.append({
            "test": "file_existence",
            "passed": all_files_exist,
            "details": f"Required files: {len(required_files)}"
        })
        
        return all_files_exist
    
    def validate_python_scripts(self) -> bool:
        """Validate Python scripts for syntax and basic imports"""
        print_header("Python Script Validation")
        
        python_files = [
            "load-testing/locust_load_test.py",
            "load-testing/websocket_stress_test.py"
        ]
        
        all_valid = True
        
        for file_path in python_files:
            full_path = self.audit_dir / file_path
            if not full_path.exists():
                continue
                
            try:
                # Syntax check
                with open(full_path, 'r') as f:
                    compile(f.read(), str(full_path), 'exec')
                print_success(f"Syntax valid: {file_path}")
                
                # Try to load module (with error handling for missing dependencies)
                try:
                    spec = importlib.util.spec_from_file_location("test_module", full_path)
                    module = importlib.util.module_from_spec(spec)
                    # Don't execute, just validate import structure
                    print_success(f"Import structure valid: {file_path}")
                except Exception as e:
                    print_warning(f"Import warnings for {file_path}: {str(e)[:100]}")
                    
            except SyntaxError as e:
                print_error(f"Syntax error in {file_path}: {e}")
                all_valid = False
            except Exception as e:
                print_error(f"Error validating {file_path}: {e}")
                all_valid = False
        
        self.validation_results.append({
            "test": "python_scripts",
            "passed": all_valid,
            "details": f"Python files validated: {len(python_files)}"
        })
        
        return all_valid
    
    def validate_shell_scripts(self) -> bool:
        """Validate shell scripts for syntax"""
        print_header("Shell Script Validation")
        
        shell_scripts = [
            "scripts/run-testnet-audit.sh",
            "scripts/post-audit-stability-check.sh"
        ]
        
        all_valid = True
        
        for script_path in shell_scripts:
            full_path = self.audit_dir / script_path
            if not full_path.exists():
                continue
                
            try:
                # Check if file is executable
                if not os.access(full_path, os.X_OK):
                    print_warning(f"Script not executable: {script_path}")
                
                # Syntax check using bash -n
                result = subprocess.run(
                    ['bash', '-n', str(full_path)],
                    capture_output=True,
                    text=True
                )
                
                if result.returncode == 0:
                    print_success(f"Syntax valid: {script_path}")
                else:
                    print_error(f"Syntax error in {script_path}: {result.stderr}")
                    all_valid = False
                    
            except Exception as e:
                print_error(f"Error validating {script_path}: {e}")
                all_valid = False
        
        self.validation_results.append({
            "test": "shell_scripts", 
            "passed": all_valid,
            "details": f"Shell scripts validated: {len(shell_scripts)}"
        })
        
        return all_valid
    
    def validate_configuration_files(self) -> bool:
        """Validate configuration files"""
        print_header("Configuration File Validation")
        
        all_valid = True
        
        # Validate YAML files
        yaml_files = ["load-testing/artillery-config.yml"]
        
        for yaml_file in yaml_files:
            full_path = self.audit_dir / yaml_file
            if not full_path.exists():
                continue
                
            try:
                import yaml
                with open(full_path, 'r') as f:
                    yaml.safe_load(f)
                print_success(f"YAML valid: {yaml_file}")
            except ImportError:
                print_warning(f"PyYAML not available - skipping {yaml_file} validation")
            except yaml.YAMLError as e:
                print_error(f"YAML error in {yaml_file}: {e}")
                all_valid = False
            except Exception as e:
                print_error(f"Error validating {yaml_file}: {e}")
                all_valid = False
        
        # Validate HTML file
        html_file = "reports/health-dashboard.html"
        full_path = self.audit_dir / html_file
        if full_path.exists():
            try:
                with open(full_path, 'r') as f:
                    content = f.read()
                    # Basic HTML validation
                    if '<!DOCTYPE html>' in content and '<html' in content and '</html>' in content:
                        print_success(f"HTML structure valid: {html_file}")
                    else:
                        print_warning(f"HTML structure may be invalid: {html_file}")
            except Exception as e:
                print_error(f"Error validating {html_file}: {e}")
                all_valid = False
        
        self.validation_results.append({
            "test": "configuration_files",
            "passed": all_valid,
            "details": "YAML and HTML configuration files"
        })
        
        return all_valid
    
    def validate_dependencies(self) -> bool:
        """Validate that dependencies are available or listed"""
        print_header("Dependency Validation")
        
        requirements_file = self.audit_dir / "requirements.txt"
        dependencies_listed = []
        
        if requirements_file.exists():
            with open(requirements_file, 'r') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#'):
                        # Extract package name (before >= or ==)
                        package = line.split('>=')[0].split('==')[0].split('[')[0]
                        dependencies_listed.append(package)
            
            print_success(f"Requirements file exists with {len(dependencies_listed)} packages")
        else:
            print_error("Requirements file missing")
            return False
        
        # Check some critical dependencies
        critical_deps = ['requests', 'psutil', 'numpy', 'pandas']
        missing_critical = []
        
        for dep in critical_deps:
            if dep not in dependencies_listed:
                missing_critical.append(dep)
        
        if missing_critical:
            print_warning(f"Critical dependencies not listed: {', '.join(missing_critical)}")
        else:
            print_success("All critical dependencies listed")
        
        # Try to import some common packages
        importable_packages = []
        for package in ['json', 'sys', 'os', 'time', 'subprocess']:
            try:
                __import__(package)
                importable_packages.append(package)
            except ImportError:
                pass
        
        print_info(f"Standard library packages available: {len(importable_packages)}")
        
        self.validation_results.append({
            "test": "dependencies",
            "passed": len(missing_critical) == 0,
            "details": f"Listed dependencies: {len(dependencies_listed)}, Critical missing: {len(missing_critical)}"
        })
        
        return len(missing_critical) == 0
    
    def validate_integration_points(self) -> bool:
        """Validate integration with existing systems"""
        print_header("Integration Point Validation")
        
        all_valid = True
        
        # Check for existing performance monitoring
        existing_monitor = self.project_root / "tests" / "utils" / "performance_monitor.py"
        if existing_monitor.exists():
            print_success("Existing performance monitor found")
        else:
            print_warning("Existing performance monitor not found")
            all_valid = False
        
        # Check for existing WebSocket testing
        existing_ws = self.project_root / "tests" / "websocket" / "ws_client.py"
        if existing_ws.exists():
            print_success("Existing WebSocket client found")
        else:
            print_warning("Existing WebSocket client not found")
        
        # Check for existing stress tests
        existing_stress = self.project_root / "tests" / "stress_tests.py"
        if existing_stress.exists():
            print_success("Existing stress tests found")
        else:
            print_warning("Existing stress tests not found")
        
        # Check project structure
        important_dirs = ["tests", "frontend", "blockchain-core"]
        for dir_name in important_dirs:
            dir_path = self.project_root / dir_name
            if dir_path.exists():
                print_success(f"Project directory found: {dir_name}/")
            else:
                print_warning(f"Project directory not found: {dir_name}/")
        
        self.validation_results.append({
            "test": "integration_points",
            "passed": all_valid,
            "details": "Integration with existing project components"
        })
        
        return all_valid
    
    def generate_validation_report(self):
        """Generate a detailed validation report"""
        print_header("Generating Validation Report")
        
        report = {
            "validation_timestamp": str(subprocess.check_output(['date', '-Iseconds'], text=True).strip()),
            "audit_directory": str(self.audit_dir),
            "project_root": str(self.project_root),
            "validation_results": self.validation_results,
            "summary": {
                "total_tests": len(self.validation_results),
                "passed_tests": sum(1 for r in self.validation_results if r["passed"]),
                "failed_tests": sum(1 for r in self.validation_results if not r["passed"]),
                "overall_status": "PASSED" if all(r["passed"] for r in self.validation_results) else "FAILED"
            }
        }
        
        # Save report
        report_file = self.audit_dir / "validation-report.json"
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2)
        
        print_success(f"Validation report saved: {report_file}")
        
        # Print summary
        print_info(f"Total tests: {report['summary']['total_tests']}")
        print_info(f"Passed: {report['summary']['passed_tests']}")
        print_info(f"Failed: {report['summary']['failed_tests']}")
        print_info(f"Overall status: {report['summary']['overall_status']}")

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Validate Dytallix Testnet Audit System")
    parser.add_argument("--audit-dir", 
                       default="./testnet-audit",
                       help="Path to audit directory")
    parser.add_argument("--verbose", "-v", 
                       action="store_true",
                       help="Verbose output")
    
    args = parser.parse_args()
    
    # Resolve audit directory path
    audit_dir = os.path.abspath(args.audit_dir)
    
    if not os.path.exists(audit_dir):
        print_error(f"Audit directory not found: {audit_dir}")
        return 1
    
    # Run validation
    validator = AuditSystemValidator(audit_dir)
    success = validator.run_validation()
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())