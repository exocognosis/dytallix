#!/usr/bin/env python3
"""
Test Report Generator for Dytallix API Testing Suite
Generates comprehensive HTML and markdown reports from test results
"""

import json
import os
import time
from datetime import datetime
from typing import Dict, List, Any, Optional
from pathlib import Path

class DytallixReportGenerator:
    def __init__(self):
        self.template_dir = Path(__file__).parent / "templates"
        
    def generate_html_report(self, test_results: Dict[str, Any], output_file: str):
        """Generate comprehensive HTML report"""
        html_content = self._generate_html_content(test_results)
        
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        print(f"HTML report generated: {output_file}")
    
    def generate_markdown_report(self, test_results: Dict[str, Any], output_file: str):
        """Generate markdown report"""
        markdown_content = self._generate_markdown_content(test_results)
        
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(markdown_content)
        
        print(f"Markdown report generated: {output_file}")
    
    def _generate_html_content(self, results: Dict[str, Any]) -> str:
        """Generate HTML content for the report"""
        exec_info = results.get("execution_info", {})
        overall_stats = results.get("overall_statistics", {})
        perf_stats = results.get("performance_statistics", {})
        category_stats = results.get("category_statistics", {})
        detailed_results = results.get("detailed_results", {})
        recommendations = results.get("recommendations", [])
        
        # Determine overall status
        overall_pass_rate = overall_stats.get("overall_pass_rate", 0)
        if overall_pass_rate >= 90:
            status_class = "success"
            status_text = "EXCELLENT"
        elif overall_pass_rate >= 80:
            status_class = "warning"
            status_text = "GOOD"
        elif overall_pass_rate >= 60:
            status_class = "warning"
            status_text = "NEEDS IMPROVEMENT"
        else:
            status_class = "danger"
            status_text = "CRITICAL"
        
        html = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dytallix API Test Report</title>
    <style>
        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
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
        }}
        .header .subtitle {{
            margin: 10px 0 0 0;
            font-size: 1.2em;
            opacity: 0.9;
        }}
        .status-badge {{
            display: inline-block;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: bold;
            margin-top: 15px;
        }}
        .status-badge.success {{
            background-color: #28a745;
        }}
        .status-badge.warning {{
            background-color: #ffc107;
            color: #212529;
        }}
        .status-badge.danger {{
            background-color: #dc3545;
        }}
        .content {{
            padding: 30px;
        }}
        .summary-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }}
        .metric-card {{
            background: #f8f9fa;
            border-left: 4px solid #667eea;
            padding: 20px;
            border-radius: 8px;
        }}
        .metric-card h3 {{
            margin: 0 0 10px 0;
            color: #333;
            font-size: 1.1em;
        }}
        .metric-value {{
            font-size: 2em;
            font-weight: bold;
            color: #667eea;
        }}
        .metric-label {{
            color: #666;
            font-size: 0.9em;
        }}
        .section {{
            margin-bottom: 40px;
        }}
        .section h2 {{
            color: #333;
            border-bottom: 2px solid #667eea;
            padding-bottom: 10px;
            margin-bottom: 20px;
        }}
        .test-suite {{
            border: 1px solid #ddd;
            border-radius: 8px;
            margin-bottom: 20px;
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
        .test-suite-title {{
            font-weight: bold;
            font-size: 1.1em;
        }}
        .test-suite-stats {{
            display: flex;
            gap: 15px;
        }}
        .stat {{
            text-align: center;
        }}
        .stat-value {{
            display: block;
            font-weight: bold;
            font-size: 1.2em;
        }}
        .stat-label {{
            font-size: 0.8em;
            color: #666;
        }}
        .progress-bar {{
            height: 8px;
            background: #e9ecef;
            border-radius: 4px;
            overflow: hidden;
            margin: 10px 0;
        }}
        .progress-fill {{
            height: 100%;
            background: linear-gradient(90deg, #28a745, #20c997);
            transition: width 0.3s ease;
        }}
        .recommendations {{
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 8px;
            padding: 20px;
        }}
        .recommendation {{
            margin: 10px 0;
            padding: 10px;
            border-left: 4px solid #ffc107;
            background: white;
            border-radius: 4px;
        }}
        .recommendation.critical {{
            border-left-color: #dc3545;
        }}
        .recommendation.warning {{
            border-left-color: #ffc107;
        }}
        .recommendation.good {{
            border-left-color: #28a745;
        }}
        .footer {{
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            color: #666;
            border-top: 1px solid #ddd;
        }}
        .chart-container {{
            margin: 20px 0;
            text-align: center;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }}
        th, td {{
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }}
        th {{
            background-color: #f8f9fa;
            font-weight: bold;
        }}
        .pass {{ color: #28a745; }}
        .fail {{ color: #dc3545; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Dytallix API Test Report</h1>
            <div class="subtitle">Comprehensive API and WebSocket Testing Results</div>
            <div class="status-badge {status_class}">{status_text} - {overall_pass_rate:.1f}% Overall Pass Rate</div>
        </div>
        
        <div class="content">
            <!-- Executive Summary -->
            <div class="section">
                <h2>📊 Executive Summary</h2>
                <div class="summary-grid">
                    <div class="metric-card">
                        <h3>Test Suites</h3>
                        <div class="metric-value">{overall_stats.get('successful_suites', 0)}/{overall_stats.get('total_test_suites', 0)}</div>
                        <div class="metric-label">Successful Suites</div>
                    </div>
                    <div class="metric-card">
                        <h3>Individual Tests</h3>
                        <div class="metric-value">{overall_stats.get('total_passed', 0)}/{overall_stats.get('total_individual_tests', 0)}</div>
                        <div class="metric-label">Passed Tests</div>
                    </div>
                    <div class="metric-card">
                        <h3>Success Rate</h3>
                        <div class="metric-value">{overall_pass_rate:.1f}%</div>
                        <div class="metric-label">Overall Pass Rate</div>
                    </div>
                    <div class="metric-card">
                        <h3>Duration</h3>
                        <div class="metric-value">{exec_info.get('total_duration_seconds', 0):.1f}s</div>
                        <div class="metric-label">Total Execution Time</div>
                    </div>
                </div>
            </div>
            
            <!-- Category Breakdown -->
            <div class="section">
                <h2>📋 Test Category Breakdown</h2>
                {self._generate_category_html(category_stats)}
            </div>
            
            <!-- Detailed Test Results -->
            <div class="section">
                <h2>🔍 Detailed Test Results</h2>
                {self._generate_detailed_results_html(detailed_results)}
            </div>
            
            <!-- Performance Analysis -->
            <div class="section">
                <h2>⚡ Performance Analysis</h2>
                {self._generate_performance_html(perf_stats)}
            </div>
            
            <!-- Recommendations -->
            <div class="section">
                <h2>💡 Recommendations</h2>
                <div class="recommendations">
                    {self._generate_recommendations_html(recommendations)}
                </div>
            </div>
            
            <!-- Execution Details -->
            <div class="section">
                <h2>📅 Execution Details</h2>
                <table>
                    <tr><th>Start Time</th><td>{exec_info.get('start_time', 'Unknown')}</td></tr>
                    <tr><th>End Time</th><td>{exec_info.get('end_time', 'Unknown')}</td></tr>
                    <tr><th>Base URL</th><td>{exec_info.get('base_url', 'Unknown')}</td></tr>
                    <tr><th>WebSocket URL</th><td>{exec_info.get('websocket_url', 'Unknown')}</td></tr>
                </table>
            </div>
        </div>
        
        <div class="footer">
            <p>Report generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} | Dytallix Testing Suite v1.0</p>
        </div>
    </div>
</body>
</html>
        """
        
        return html
    
    def _generate_category_html(self, category_stats: Dict[str, Dict]) -> str:
        """Generate HTML for category breakdown"""
        html = ""
        for category, stats in category_stats.items():
            pass_rate = stats.get("pass_rate", 0)
            html += f"""
            <div class="test-suite">
                <div class="test-suite-header">
                    <div class="test-suite-title">{category}</div>
                    <div class="test-suite-stats">
                        <div class="stat">
                            <span class="stat-value">{stats.get('passed', 0)}</span>
                            <span class="stat-label">Passed</span>
                        </div>
                        <div class="stat">
                            <span class="stat-value">{stats.get('failed', 0)}</span>
                            <span class="stat-label">Failed</span>
                        </div>
                        <div class="stat">
                            <span class="stat-value">{pass_rate:.1f}%</span>
                            <span class="stat-label">Pass Rate</span>
                        </div>
                    </div>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: {pass_rate}%"></div>
                </div>
            </div>
            """
        return html
    
    def _generate_detailed_results_html(self, detailed_results: Dict[str, Dict]) -> str:
        """Generate HTML for detailed test results"""
        html = ""
        for suite_name, result in detailed_results.items():
            pass_rate = result.get("pass_rate", 0)
            status_class = "pass" if pass_rate >= 80 else "fail"
            
            html += f"""
            <div class="test-suite">
                <div class="test-suite-header">
                    <div class="test-suite-title">{suite_name}</div>
                    <div class="test-suite-stats">
                        <div class="stat">
                            <span class="stat-value {status_class}">{result.get('passed', 0)}/{result.get('total_tests', 0)}</span>
                            <span class="stat-label">Tests</span>
                        </div>
                        <div class="stat">
                            <span class="stat-value">{pass_rate:.1f}%</span>
                            <span class="stat-label">Pass Rate</span>
                        </div>
                        <div class="stat">
                            <span class="stat-value">{result.get('suite_duration', 0):.1f}s</span>
                            <span class="stat-label">Duration</span>
                        </div>
                    </div>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: {pass_rate}%"></div>
                </div>
            </div>
            """
        return html
    
    def _generate_performance_html(self, perf_stats: Dict[str, Dict]) -> str:
        """Generate HTML for performance statistics"""
        fastest = perf_stats.get("fastest_suite", {})
        slowest = perf_stats.get("slowest_suite", {})
        
        return f"""
        <table>
            <tr><th>Metric</th><th>Value</th></tr>
            <tr><td>Fastest Suite</td><td>{fastest.get('name', 'Unknown')} ({fastest.get('duration', 0):.2f}s)</td></tr>
            <tr><td>Slowest Suite</td><td>{slowest.get('name', 'Unknown')} ({slowest.get('duration', 0):.2f}s)</td></tr>
        </table>
        """
    
    def _generate_recommendations_html(self, recommendations: List[str]) -> str:
        """Generate HTML for recommendations"""
        html = ""
        for rec in recommendations:
            if rec.startswith("CRITICAL"):
                css_class = "critical"
            elif rec.startswith("WARNING"):
                css_class = "warning"
            elif rec.startswith("GOOD"):
                css_class = "good"
            else:
                css_class = "warning"
            
            html += f'<div class="recommendation {css_class}">{rec}</div>'
        
        return html
    
    def _generate_markdown_content(self, results: Dict[str, Any]) -> str:
        """Generate markdown content for the report"""
        exec_info = results.get("execution_info", {})
        overall_stats = results.get("overall_statistics", {})
        category_stats = results.get("category_statistics", {})
        detailed_results = results.get("detailed_results", {})
        recommendations = results.get("recommendations", [])
        
        overall_pass_rate = overall_stats.get("overall_pass_rate", 0)
        
        markdown = f"""# 🚀 Dytallix API Test Report

**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## 📊 Executive Summary

- **Overall Success Rate:** {overall_pass_rate:.1f}%
- **Test Suites:** {overall_stats.get('successful_suites', 0)}/{overall_stats.get('total_test_suites', 0)} successful
- **Individual Tests:** {overall_stats.get('total_passed', 0)}/{overall_stats.get('total_individual_tests', 0)} passed
- **Total Duration:** {exec_info.get('total_duration_seconds', 0):.1f} seconds

## 📋 Test Category Results

| Category | Tests Passed | Tests Failed | Pass Rate |
|----------|-------------|-------------|-----------|
"""
        
        for category, stats in category_stats.items():
            markdown += f"| {category} | {stats.get('passed', 0)} | {stats.get('failed', 0)} | {stats.get('pass_rate', 0):.1f}% |\n"
        
        markdown += f"""
## 🔍 Detailed Test Suite Results

| Test Suite | Status | Passed/Total | Pass Rate | Duration |
|------------|--------|-------------|-----------|----------|
"""
        
        for suite_name, result in detailed_results.items():
            pass_rate = result.get("pass_rate", 0)
            status = "✅ PASS" if pass_rate >= 80 else "❌ FAIL"
            markdown += f"| {suite_name} | {status} | {result.get('passed', 0)}/{result.get('total_tests', 0)} | {pass_rate:.1f}% | {result.get('suite_duration', 0):.1f}s |\n"
        
        markdown += f"""
## 💡 Recommendations

"""
        
        for rec in recommendations:
            if rec.startswith("CRITICAL"):
                markdown += f"- 🚨 **{rec}**\n"
            elif rec.startswith("WARNING"):
                markdown += f"- ⚠️ {rec}\n"
            elif rec.startswith("GOOD"):
                markdown += f"- ✅ {rec}\n"
            else:
                markdown += f"- ℹ️ {rec}\n"
        
        markdown += f"""
## 📅 Execution Details

- **Start Time:** {exec_info.get('start_time', 'Unknown')}
- **End Time:** {exec_info.get('end_time', 'Unknown')}
- **Base URL:** `{exec_info.get('base_url', 'Unknown')}`
- **WebSocket URL:** `{exec_info.get('websocket_url', 'Unknown')}`

---
*Report generated by Dytallix Testing Suite v1.0*
"""
        
        return markdown

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Generate Dytallix Test Reports")
    parser.add_argument("input_file", help="Input JSON file with test results")
    parser.add_argument("--html", help="Output HTML report file")
    parser.add_argument("--markdown", help="Output Markdown report file")
    parser.add_argument("--both", help="Generate both formats with this base name")
    
    args = parser.parse_args()
    
    # Load test results
    try:
        with open(args.input_file, 'r') as f:
            test_results = json.load(f)
    except Exception as e:
        print(f"Error loading test results: {e}")
        return
    
    generator = DytallixReportGenerator()
    
    if args.both:
        # Generate both formats
        html_file = f"{args.both}.html"
        md_file = f"{args.both}.md"
        generator.generate_html_report(test_results, html_file)
        generator.generate_markdown_report(test_results, md_file)
    else:
        # Generate specific formats
        if args.html:
            generator.generate_html_report(test_results, args.html)
        if args.markdown:
            generator.generate_markdown_report(test_results, args.markdown)
        
        if not args.html and not args.markdown:
            print("Please specify --html, --markdown, or --both")

if __name__ == "__main__":
    main()