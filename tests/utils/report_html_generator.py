#!/usr/bin/env python3
"""
Report Generator for Dytallix Validation Suite
Generates HTML and Markdown reports from test results
"""

import json
import os
from datetime import datetime
from typing import Dict, List, Any, Optional
from pathlib import Path

def generate_html_report(results: Dict[str, Any]) -> str:
    """Generate comprehensive HTML report from test results"""
    
    # Extract summary data
    summary = results.get("summary", {})
    overall_stats = summary.get("overall_stats", {})
    
    # Status styling
    status = summary.get("status", "UNKNOWN")
    status_color = "#28a745" if status == "PASS" else "#dc3545"
    
    html_template = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dytallix Validation Report</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f8f9fa;
            color: #333;
        }}
        .container {{
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
        }}
        .header {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }}
        .header h1 {{
            margin: 0;
            font-size: 2.5em;
            font-weight: 300;
        }}
        .header .subtitle {{
            margin: 10px 0 0 0;
            opacity: 0.9;
            font-size: 1.1em;
        }}
        .summary {{
            padding: 30px;
            background: #f8f9fa;
        }}
        .summary-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
        }}
        .summary-card {{
            background: white;
            padding: 20px;
            border-radius: 6px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            text-align: center;
        }}
        .summary-card h3 {{
            margin: 0 0 10px 0;
            color: #666;
            font-size: 0.9em;
            text-transform: uppercase;
            letter-spacing: 1px;
        }}
        .summary-card .value {{
            font-size: 2em;
            font-weight: bold;
            color: #333;
        }}
        .status-badge {{
            display: inline-block;
            padding: 8px 16px;
            border-radius: 20px;
            color: white;
            font-weight: bold;
            font-size: 1.2em;
            background-color: {status_color};
        }}
        .section {{
            padding: 30px;
            border-bottom: 1px solid #eee;
        }}
        .section h2 {{
            margin: 0 0 20px 0;
            color: #333;
            font-size: 1.8em;
        }}
        .test-suite {{
            margin-bottom: 30px;
            border: 1px solid #ddd;
            border-radius: 6px;
            overflow: hidden;
        }}
        .test-suite-header {{
            background: #f8f9fa;
            padding: 15px 20px;
            border-bottom: 1px solid #ddd;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }}
        .test-suite-header h3 {{
            margin: 0;
            color: #333;
        }}
        .test-suite-stats {{
            font-size: 0.9em;
            color: #666;
        }}
        .test-results {{
            padding: 0;
        }}
        .test-result {{
            padding: 12px 20px;
            border-bottom: 1px solid #f0f0f0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }}
        .test-result:last-child {{
            border-bottom: none;
        }}
        .test-name {{
            font-weight: 500;
        }}
        .test-status {{
            display: flex;
            align-items: center;
            gap: 10px;
        }}
        .status-pass {{
            color: #28a745;
            font-weight: bold;
        }}
        .status-fail {{
            color: #dc3545;
            font-weight: bold;
        }}
        .response-time {{
            font-size: 0.9em;
            color: #666;
        }}
        .chart-container {{
            margin: 20px 0;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 6px;
        }}
        .progress-bar {{
            width: 100%;
            height: 20px;
            background: #e9ecef;
            border-radius: 10px;
            overflow: hidden;
            margin: 10px 0;
        }}
        .progress-fill {{
            height: 100%;
            background: linear-gradient(90deg, #28a745 0%, #20c997 100%);
            transition: width 0.3s ease;
        }}
        .timestamp {{
            color: #666;
            font-size: 0.9em;
            text-align: right;
            margin-top: 20px;
        }}
        .error-message {{
            color: #dc3545;
            font-size: 0.9em;
            margin-top: 5px;
            padding: 8px;
            background: #f8d7da;
            border-radius: 4px;
        }}
        .metadata {{
            background: #f8f9fa;
            padding: 15px;
            border-radius: 6px;
            margin: 10px 0;
            font-size: 0.9em;
        }}
        .metadata strong {{
            color: #495057;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎯 Dytallix Validation Report</h1>
            <div class="subtitle">Comprehensive API and WebSocket Testing Results</div>
        </div>
        
        <div class="summary">
            <div style="text-align: center; margin-bottom: 30px;">
                <span class="status-badge">{status}</span>
            </div>
            
            <div class="summary-grid">
                <div class="summary-card">
                    <h3>Total Tests</h3>
                    <div class="value">{overall_stats.get('total_tests', 0)}</div>
                </div>
                <div class="summary-card">
                    <h3>Passed</h3>
                    <div class="value" style="color: #28a745;">{overall_stats.get('total_passed', 0)}</div>
                </div>
                <div class="summary-card">
                    <h3>Failed</h3>
                    <div class="value" style="color: #dc3545;">{overall_stats.get('total_failed', 0)}</div>
                </div>
                <div class="summary-card">
                    <h3>Pass Rate</h3>
                    <div class="value">{overall_stats.get('overall_pass_rate', 0):.1f}%</div>
                </div>
                <div class="summary-card">
                    <h3>Duration</h3>
                    <div class="value">{overall_stats.get('test_duration_seconds', 0):.1f}s</div>
                </div>
            </div>
            
            <div class="progress-bar">
                <div class="progress-fill" style="width: {overall_stats.get('overall_pass_rate', 0)}%;"></div>
            </div>
        </div>
        
        {generate_test_sections_html(results)}
        
        {generate_metadata_section_html(results)}
        
        <div class="timestamp">
            Report generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')}
        </div>
    </div>
</body>
</html>
"""
    
    return html_template


def generate_test_sections_html(results: Dict[str, Any]) -> str:
    """Generate HTML sections for each test suite"""
    sections_html = ""
    
    test_categories = [
        ("api_tests", "🔌 API Endpoint Tests", "Tests for REST API endpoints including status, blocks, transactions, and peers"),
        ("websocket_tests", "⚡ WebSocket Tests", "Real-time WebSocket connection and message broadcasting tests"),
        ("security_tests", "🔒 Security Tests", "Security vulnerability and protection mechanism tests"),
        ("performance_tests", "📊 Performance Tests", "Load testing and performance monitoring results"),
        ("curl_tests", "🌐 cURL Validation", "Quick validation using cURL commands")
    ]
    
    for key, title, description in test_categories:
        if key in results and results[key]:
            sections_html += f"""
        <div class="section">
            <h2>{title}</h2>
            <p style="color: #666; margin-bottom: 25px;">{description}</p>
            {generate_test_suite_html(results[key])}
        </div>
            """
    
    return sections_html


def generate_test_suite_html(test_data: Dict[str, Any]) -> str:
    """Generate HTML for a test suite"""
    if isinstance(test_data, dict) and "error" in test_data:
        return f"""
        <div class="test-suite">
            <div class="test-suite-header">
                <h3>Error</h3>
            </div>
            <div class="error-message">
                {test_data["error"]}
            </div>
        </div>
        """
    
    suites_html = ""
    
    for suite_name, suite_data in test_data.items():
        if isinstance(suite_data, dict) and "results" in suite_data:
            pass_rate = suite_data.get("pass_rate", 0)
            total_tests = suite_data.get("total_tests", 0)
            passed = suite_data.get("passed", 0)
            failed = suite_data.get("failed", 0)
            
            suites_html += f"""
            <div class="test-suite">
                <div class="test-suite-header">
                    <h3>{suite_data.get('suite_name', suite_name)}</h3>
                    <div class="test-suite-stats">
                        {passed}/{total_tests} passed ({pass_rate:.1f}%)
                    </div>
                </div>
                <div class="test-results">
                    {generate_individual_test_results_html(suite_data.get("results", []))}
                </div>
            </div>
            """
    
    return suites_html


def generate_individual_test_results_html(test_results: List[Dict[str, Any]]) -> str:
    """Generate HTML for individual test results"""
    results_html = ""
    
    for result in test_results:
        test_name = result.get("test_name", "Unknown Test")
        passed = result.get("passed", False)
        response_time = result.get("response_time_ms", result.get("response_time", 0))
        error_message = result.get("error_message", "")
        
        status_class = "status-pass" if passed else "status-fail"
        status_text = "PASS" if passed else "FAIL"
        
        # Format response time
        if isinstance(response_time, (int, float)):
            if response_time > 1000:
                time_display = f"{response_time/1000:.2f}s"
            else:
                time_display = f"{response_time:.1f}ms"
        else:
            time_display = str(response_time)
        
        results_html += f"""
        <div class="test-result">
            <div class="test-name">{test_name}</div>
            <div class="test-status">
                <span class="response-time">{time_display}</span>
                <span class="{status_class}">{status_text}</span>
            </div>
        </div>
        """
        
        if error_message:
            results_html += f"""
            <div class="error-message">
                {error_message}
            </div>
            """
    
    return results_html


def generate_metadata_section_html(results: Dict[str, Any]) -> str:
    """Generate metadata section"""
    test_run_info = results.get("test_run_info", {})
    
    metadata_html = f"""
    <div class="section">
        <h2>📋 Test Configuration</h2>
        <div class="metadata">
            <strong>Base URL:</strong> {test_run_info.get('base_url', 'Unknown')}<br>
            <strong>WebSocket URL:</strong> {test_run_info.get('websocket_url', 'Unknown')}<br>
            <strong>Start Time:</strong> {test_run_info.get('start_time', 'Unknown')}<br>
            <strong>Performance Tests:</strong> {'Enabled' if test_run_info.get('include_performance') else 'Disabled'}<br>
            <strong>Security Tests:</strong> {'Enabled' if test_run_info.get('include_security') else 'Disabled'}
        </div>
    </div>
    """
    
    return metadata_html


def generate_markdown_report(results: Dict[str, Any]) -> str:
    """Generate Markdown report from test results"""
    
    summary = results.get("summary", {})
    overall_stats = summary.get("overall_stats", {})
    test_run_info = results.get("test_run_info", {})
    
    # Build markdown content
    markdown_content = f"""# 🎯 Dytallix Validation Report

**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')}

## 📊 Overall Results

| Metric | Value |
|--------|-------|
| **Status** | **{summary.get('status', 'UNKNOWN')}** |
| Total Tests | {overall_stats.get('total_tests', 0)} |
| Passed | {overall_stats.get('total_passed', 0)} |
| Failed | {overall_stats.get('total_failed', 0)} |
| Pass Rate | {overall_stats.get('overall_pass_rate', 0):.1f}% |
| Duration | {overall_stats.get('test_duration_seconds', 0):.1f}s |

## 🔧 Test Configuration

- **Base URL:** {test_run_info.get('base_url', 'Unknown')}
- **WebSocket URL:** {test_run_info.get('websocket_url', 'Unknown')}
- **Start Time:** {test_run_info.get('start_time', 'Unknown')}
- **Performance Tests:** {'✅ Enabled' if test_run_info.get('include_performance') else '❌ Disabled'}
- **Security Tests:** {'✅ Enabled' if test_run_info.get('include_security') else '❌ Disabled'}

"""
    
    # Add test sections
    test_categories = [
        ("api_tests", "🔌 API Endpoint Tests"),
        ("websocket_tests", "⚡ WebSocket Tests"),
        ("security_tests", "🔒 Security Tests"),
        ("performance_tests", "📊 Performance Tests"),
        ("curl_tests", "🌐 cURL Validation")
    ]
    
    for key, title in test_categories:
        if key in results and results[key]:
            markdown_content += f"\n## {title}\n\n"
            markdown_content += generate_test_section_markdown(results[key])
    
    return markdown_content


def generate_test_section_markdown(test_data: Dict[str, Any]) -> str:
    """Generate markdown for a test section"""
    if isinstance(test_data, dict) and "error" in test_data:
        return f"❌ **Error:** {test_data['error']}\n\n"
    
    section_md = ""
    
    for suite_name, suite_data in test_data.items():
        if isinstance(suite_data, dict) and "results" in suite_data:
            pass_rate = suite_data.get("pass_rate", 0)
            total_tests = suite_data.get("total_tests", 0)
            passed = suite_data.get("passed", 0)
            
            status_emoji = "✅" if pass_rate >= 80 else "❌"
            
            section_md += f"### {status_emoji} {suite_data.get('suite_name', suite_name)}\n\n"
            section_md += f"**Results:** {passed}/{total_tests} passed ({pass_rate:.1f}%)\n\n"
            
            # Individual test results
            results = suite_data.get("results", [])
            if results:
                section_md += "| Test | Status | Time | Details |\n"
                section_md += "|------|--------|------|----------|\n"
                
                for result in results:
                    test_name = result.get("test_name", "Unknown")
                    passed = result.get("passed", False)
                    response_time = result.get("response_time_ms", result.get("response_time", 0))
                    error_message = result.get("error_message", "")
                    
                    status_emoji = "✅" if passed else "❌"
                    
                    # Format response time
                    if isinstance(response_time, (int, float)):
                        if response_time > 1000:
                            time_display = f"{response_time/1000:.2f}s"
                        else:
                            time_display = f"{response_time:.1f}ms"
                    else:
                        time_display = str(response_time)
                    
                    details = error_message if error_message else "OK"
                    
                    section_md += f"| {test_name} | {status_emoji} | {time_display} | {details} |\n"
                
                section_md += "\n"
    
    return section_md


def generate_csv_report(results: Dict[str, Any]) -> str:
    """Generate CSV report from test results"""
    csv_lines = ["Suite,Test,Status,Response_Time_MS,Error"]
    
    test_categories = ["api_tests", "websocket_tests", "security_tests", "performance_tests", "curl_tests"]
    
    for category in test_categories:
        if category in results and results[category]:
            test_data = results[category]
            
            for suite_name, suite_data in test_data.items():
                if isinstance(suite_data, dict) and "results" in suite_data:
                    for result in suite_data.get("results", []):
                        test_name = result.get("test_name", "Unknown")
                        passed = "PASS" if result.get("passed", False) else "FAIL"
                        response_time = result.get("response_time_ms", result.get("response_time", 0))
                        error_message = result.get("error_message", "").replace(",", ";")
                        
                        csv_lines.append(f"{suite_name},{test_name},{passed},{response_time},{error_message}")
    
    return "\n".join(csv_lines)


def save_reports(results: Dict[str, Any], output_dir: str = "reports"):
    """Save reports in multiple formats"""
    os.makedirs(output_dir, exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # HTML Report
    html_content = generate_html_report(results)
    html_path = os.path.join(output_dir, f"validation_report_{timestamp}.html")
    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(html_content)
    
    # Markdown Report
    markdown_content = generate_markdown_report(results)
    md_path = os.path.join(output_dir, f"validation_report_{timestamp}.md")
    with open(md_path, 'w', encoding='utf-8') as f:
        f.write(markdown_content)
    
    # CSV Report
    csv_content = generate_csv_report(results)
    csv_path = os.path.join(output_dir, f"validation_report_{timestamp}.csv")
    with open(csv_path, 'w', encoding='utf-8') as f:
        f.write(csv_content)
    
    # JSON Report
    json_path = os.path.join(output_dir, f"validation_report_{timestamp}.json")
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2)
    
    return {
        "html": html_path,
        "markdown": md_path,
        "csv": csv_path,
        "json": json_path
    }


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Generate reports from Dytallix validation results")
    parser.add_argument("input", help="JSON file with test results")
    parser.add_argument("--output-dir", default="reports", help="Output directory for reports")
    parser.add_argument("--format", choices=["html", "markdown", "csv", "json", "all"], 
                       default="all", help="Report format to generate")
    
    args = parser.parse_args()
    
    # Load results
    with open(args.input, 'r') as f:
        results = json.load(f)
    
    # Generate reports
    if args.format == "all":
        report_paths = save_reports(results, args.output_dir)
        print("Generated reports:")
        for format_name, path in report_paths.items():
            print(f"  {format_name.upper()}: {path}")
    else:
        os.makedirs(args.output_dir, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        if args.format == "html":
            content = generate_html_report(results)
            filename = f"validation_report_{timestamp}.html"
        elif args.format == "markdown":
            content = generate_markdown_report(results)
            filename = f"validation_report_{timestamp}.md"
        elif args.format == "csv":
            content = generate_csv_report(results)
            filename = f"validation_report_{timestamp}.csv"
        elif args.format == "json":
            content = json.dumps(results, indent=2)
            filename = f"validation_report_{timestamp}.json"
        
        output_path = os.path.join(args.output_dir, filename)
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f"Report saved to: {output_path}")