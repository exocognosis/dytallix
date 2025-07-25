//! Security Audit Test Runner
//! 
//! Comprehensive security test runner for the Dytallix cross-chain bridge

use dytallix_tests::security::{SecurityTestRunner, SecurityTestConfig};
use std::time::Duration;
use tokio;
use serde_json;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("🔒 Starting Dytallix Bridge Security Audit");
    println!("==========================================");
    
    // Configuration for security tests
    let config = SecurityTestConfig {
        ethereum_rpc_url: "http://localhost:8545".to_string(),
        cosmos_rpc_url: "http://localhost:26657".to_string(),
        bridge_contract_address: "0x742d35Cc6aBFF0532846A3b4D8F78e54B9E3BD8E".to_string(),
        test_timeout: Duration::from_secs(60),
        enable_penetration_tests: true,
        coverage_threshold: 0.95,
    };
    
    // Initialize security test runner
    let mut runner = SecurityTestRunner::new(config);
    
    // Run comprehensive security audit
    println!("🚀 Executing comprehensive security test suite...\n");
    
    match runner.run_all_tests().await {
        Ok(report) => {
            println!("\n🎉 Security Audit Completed Successfully!");
            println!("=========================================");
            
            // Print summary
            println!("\n📊 AUDIT SUMMARY:");
            println!("  Total Tests: {}", report.summary.total_tests);
            println!("  Passed: {} ✅", report.summary.passed_tests);
            println!("  Failed: {} ❌", report.summary.failed_tests);
            println!("  Warnings: {} ⚠️", report.summary.warnings);
            
            println!("\n🔥 VULNERABILITY SUMMARY:");
            println!("  Critical: {} 🔴", report.summary.critical_vulnerabilities);
            println!("  High: {} 🟠", report.summary.high_vulnerabilities);
            println!("  Medium: {} 🟡", report.summary.medium_vulnerabilities);
            
            println!("\n🎯 PRODUCTION READINESS:");
            if report.summary.production_ready {
                println!("  Status: READY FOR PRODUCTION ✅");
            } else {
                println!("  Status: NOT READY - Address critical/high vulnerabilities ❌");
            }
            
            println!("\n🏆 COMPLIANCE STATUS:");
            println!("  NIST PQC Compliant: {} {}", 
                if report.compliance_status.nist_pqc_compliant { "✅" } else { "❌" },
                if report.compliance_status.nist_pqc_compliant { "YES" } else { "NO" }
            );
            println!("  OWASP Compliant: {} {}", 
                if report.compliance_status.owasp_compliant { "✅" } else { "❌" },
                if report.compliance_status.owasp_compliant { "YES" } else { "NO" }
            );
            println!("  Industry Standards: {} {}", 
                if report.compliance_status.industry_standards_met { "✅" } else { "❌" },
                if report.compliance_status.industry_standards_met { "YES" } else { "NO" }
            );
            println!("  Quantum Safe: {} {}", 
                if report.compliance_status.quantum_safe { "✅" } else { "❌" },
                if report.compliance_status.quantum_safe { "YES" } else { "NO" }
            );
            
            // Print key recommendations
            if !report.recommendations.is_empty() {
                println!("\n💡 KEY RECOMMENDATIONS:");
                for (i, recommendation) in report.recommendations.iter().take(10).enumerate() {
                    println!("  {}. {}", i + 1, recommendation);
                }
                if report.recommendations.len() > 10 {
                    println!("  ... and {} more recommendations", report.recommendations.len() - 10);
                }
            }
            
            // Save detailed report to file
            let report_json = serde_json::to_string_pretty(&report)?;
            std::fs::write("security_audit_report.json", report_json)?;
            println!("\n📄 Detailed report saved to: security_audit_report.json");
            
            // Print test categories breakdown
            println!("\n📋 TEST CATEGORIES BREAKDOWN:");
            let mut category_counts = std::collections::HashMap::new();
            for result in &report.test_results {
                let count = category_counts.entry(format!("{:?}", result.category)).or_insert(0);
                *count += 1;
            }
            
            for (category, count) in category_counts {
                println!("  {}: {} tests", category.replace("Category::", ""), count);
            }
            
            println!("\n🔗 For detailed findings, see security_audit_report.json");
            println!("📚 Security checklist: SECURITY_AUDIT_CHECKLIST.md");
            
        }
        Err(e) => {
            eprintln!("\n❌ Security Audit Failed: {}", e);
            eprintln!("Please check configuration and try again.");
            std::process::exit(1);
        }
    }
    
    println!("\n✨ Audit Complete - Thank you for prioritizing security! ✨");
    Ok(())
}