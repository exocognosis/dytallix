//! Smart Contract Security Test Suite
//!
//! Comprehensive test suite for the security auditing capabilities,
//! including vulnerability detection, gas attack analysis, and fuzz testing.

use dytallix_contracts::security::*;
use dytallix_contracts::runtime::{ContractDeployment, ContractCall, ExecutionResult, StateChange, ContractEvent};
use std::sync::Arc;

/// Test vulnerability scanner functionality
#[tokio::test]
async fn test_vulnerability_scanner_comprehensive() {
    let mut scanner = VulnerabilityScanner::new();

    // Test case 1: Valid WASM contract
    let valid_deployment = create_valid_test_deployment();
    let findings = scanner.scan_deployment(&valid_deployment);

    // Should pass basic validation
    assert!(findings.iter().all(|f| f.severity != Severity::Critical));

    // Test case 2: Invalid WASM contract (too small)
    let invalid_deployment = ContractDeployment {
        address: "test_invalid".to_string(),
        code: vec![1, 2, 3], // Too small to be valid WASM
        initial_state: vec![],
        gas_limit: 100_000,
        deployer: "deployer".to_string(),
        timestamp: 0,
        ai_audit_score: Some(0.8),
    };

    let findings = scanner.scan_deployment(&invalid_deployment);
    assert!(!findings.is_empty());
    assert!(findings.iter().any(|f| f.severity == Severity::Critical));
    assert!(findings.iter().any(|f| f.title.contains("Invalid WASM")));

    // Test case 3: Contract with low AI audit score
    let low_score_deployment = ContractDeployment {
        address: "test_low_score".to_string(),
        code: create_valid_wasm_bytecode(),
        initial_state: vec![],
        gas_limit: 100_000,
        deployer: "deployer".to_string(),
        timestamp: 0,
        ai_audit_score: Some(0.2), // Very low score
    };

    let findings = scanner.scan_deployment(&low_score_deployment);
    assert!(findings.iter().any(|f| f.title.contains("AI Audit Score")));
    assert!(findings.iter().any(|f| f.severity == Severity::Critical));

    // Test case 4: Contract with excessive gas limit
    let high_gas_deployment = ContractDeployment {
        address: "test_high_gas".to_string(),
        code: create_valid_wasm_bytecode(),
        initial_state: vec![],
        gas_limit: 20_000_000, // Very high gas limit
        deployer: "deployer".to_string(),
        timestamp: 0,
        ai_audit_score: Some(0.8),
    };

    let findings = scanner.scan_deployment(&high_gas_deployment);
    assert!(findings.iter().any(|f| f.category == VulnerabilityCategory::GasGriefing));

    // Test case 5: Large initial state
    let large_state_deployment = ContractDeployment {
        address: "test_large_state".to_string(),
        code: create_valid_wasm_bytecode(),
        initial_state: vec![0xFF; 20_000], // Large initial state
        gas_limit: 100_000,
        deployer: "deployer".to_string(),
        timestamp: 0,
        ai_audit_score: Some(0.8),
    };

    let findings = scanner.scan_deployment(&large_state_deployment);
    assert!(findings.iter().any(|f| f.category == VulnerabilityCategory::GasOptimization));

    println!("✅ Vulnerability scanner tests passed - {} total findings across test cases",
        findings.len());
}

/// Test reentrancy detection
#[tokio::test]
async fn test_reentrancy_detection() {
    let scanner = VulnerabilityScanner::new();

    // Create suspicious state changes that might indicate reentrancy
    let call = ContractCall {
        contract_address: "test_contract".to_string(),
        caller: "attacker".to_string(),
        method: "withdraw".to_string(),
        input_data: vec![],
        gas_limit: 1_000_000,
        value: 100,
        timestamp: 1234567890,
    };

    // Simulate reentrancy pattern - multiple modifications to same key
    let suspicious_result = ExecutionResult {
        success: true,
        return_data: vec![],
        gas_used: 800_000,
        gas_remaining: 200_000,
        state_changes: vec![
            StateChange {
                contract_address: "test_contract".to_string(),
                key: b"balance_attacker".to_vec(),
                old_value: Some(b"1000".to_vec()),
                new_value: b"900".to_vec(),
            },
            StateChange {
                contract_address: "test_contract".to_string(),
                key: b"balance_attacker".to_vec(),
                old_value: Some(b"900".to_vec()),
                new_value: b"800".to_vec(),
            },
            StateChange {
                contract_address: "test_contract".to_string(),
                key: b"balance_attacker".to_vec(),
                old_value: Some(b"800".to_vec()),
                new_value: b"700".to_vec(),
            },
        ],
        events: vec![],
        ai_analysis: None,
    };

    let findings = scanner.check_reentrancy_execution(&call, &suspicious_result);
    assert!(!findings.is_empty());
    assert!(findings.iter().any(|f| f.category == VulnerabilityCategory::Reentrancy));
    assert!(findings.iter().any(|f| f.severity == Severity::High));

    // Test normal execution (should not trigger reentrancy detection)
    let normal_result = ExecutionResult {
        success: true,
        return_data: vec![],
        gas_used: 50_000,
        gas_remaining: 950_000,
        state_changes: vec![
            StateChange {
                contract_address: "test_contract".to_string(),
                key: b"balance_attacker".to_vec(),
                old_value: Some(b"1000".to_vec()),
                new_value: b"900".to_vec(),
            },
        ],
        events: vec![],
        ai_analysis: None,
    };

    let normal_findings = scanner.check_reentrancy_execution(&call, &normal_result);
    assert!(normal_findings.is_empty());

    println!("✅ Reentrancy detection tests passed");
}

/// Test gas attack analyzer
#[tokio::test]
async fn test_gas_attack_analyzer() {
    let mut analyzer = GasAttackAnalyzer::new();

    // Test deployment analysis
    let deployment = create_valid_test_deployment();
    let deployment_findings = analyzer.analyze_deployment(&deployment).await;

    // Should pass basic checks for a reasonable deployment
    assert!(deployment_findings.iter().all(|f| f.severity != Severity::Critical));

    // Test excessive gas limit
    let excessive_gas_deployment = ContractDeployment {
        address: "test_gas_attack".to_string(),
        code: create_valid_wasm_bytecode(),
        initial_state: vec![],
        gas_limit: 15_000_000, // Excessive gas limit
        deployer: "attacker".to_string(),
        timestamp: 0,
        ai_audit_score: Some(0.8),
    };

    let excessive_findings = analyzer.analyze_deployment(&excessive_gas_deployment).await;
    assert!(excessive_findings.iter().any(|f| f.category == VulnerabilityCategory::GasGriefing));

    // Test execution analysis - gas griefing
    let griefing_call = ContractCall {
        contract_address: "test_contract".to_string(),
        caller: "griefer".to_string(),
        method: "expensive_operation".to_string(),
        input_data: vec![],
        gas_limit: 2_000_000,
        value: 0,
        timestamp: 1234567890,
    };

    let griefing_result = ExecutionResult {
        success: true,
        return_data: vec![],
        gas_used: 200_000, // Very low efficiency (10%)
        gas_remaining: 1_800_000,
        state_changes: vec![],
        events: vec![],
        ai_analysis: None,
    };

    let execution_findings = analyzer.analyze_execution(&griefing_call, &griefing_result).await;
    assert!(execution_findings.iter().any(|f| f.title.contains("Gas Griefing")));

    // Test gas exhaustion DoS
    let dos_call = ContractCall {
        contract_address: "test_contract".to_string(),
        caller: "attacker".to_string(),
        method: "dos_operation".to_string(),
        input_data: vec![],
        gas_limit: 10_000_000,
        value: 0,
        timestamp: 1234567890,
    };

    let dos_result = ExecutionResult {
        success: false,
        return_data: vec![],
        gas_used: 9_500_000, // Exhausts most gas
        gas_remaining: 500_000,
        state_changes: vec![],
        events: vec![],
        ai_analysis: None,
    };

    let dos_findings = analyzer.analyze_execution(&dos_call, &dos_result).await;
    assert!(dos_findings.iter().any(|f| f.category == VulnerabilityCategory::DoS));
    assert!(dos_findings.iter().any(|f| f.severity == Severity::Critical));

    println!("✅ Gas attack analyzer tests passed - detected {} attack patterns",
        excessive_findings.len() + execution_findings.len() + dos_findings.len());
}

/// Test fuzz testing capabilities
#[tokio::test]
async fn test_fuzz_tester() {
    let mut fuzz_tester = FuzzTester::new();

    // Test deployment fuzzing
    let deployment = create_valid_test_deployment();
    let fuzz_findings = fuzz_tester.test_deployment(&deployment).await;

    // Fuzz testing should complete without errors
    assert_eq!(fuzz_tester.get_test_count(), 1);

    // Test with problematic deployment parameters
    let problematic_deployment = ContractDeployment {
        address: "test_fuzz".to_string(),
        code: create_valid_wasm_bytecode(),
        initial_state: vec![0; 200_000], // Very large state
        gas_limit: 1_000_000,
        deployer: "deployer".to_string(),
        timestamp: 0,
        ai_audit_score: Some(0.5),
    };

    let problematic_findings = fuzz_tester.test_deployment(&problematic_deployment).await;

    // Should detect issues with large state
    assert!(problematic_findings.iter().any(|f|
        f.title.contains("Large State") || f.title.contains("DoS")
    ));

    println!("✅ Fuzz tester tests passed - ran {} test iterations",
        fuzz_tester.get_test_count());
}

/// Test complete security auditor integration
#[tokio::test]
async fn test_security_auditor_integration() {
    let mut auditor = SecurityAuditor::new();

    // Test comprehensive audit of a normal contract
    let normal_deployment = create_valid_test_deployment();
    let audit_result = auditor.audit_contract(&normal_deployment).await;

    assert_eq!(audit_result.contract_address, normal_deployment.address);
    assert!(audit_result.audit_duration_ms > 0);
    assert!(!audit_result.auditor_version.is_empty());

    // Contract should pass basic security checks
    assert!(audit_result.passes_security_check());
    assert!(audit_result.security_score() >= 70); // Should have reasonable score

    // Test audit of problematic contract
    let problematic_deployment = ContractDeployment {
        address: "problematic_contract".to_string(),
        code: vec![1, 2, 3], // Invalid WASM
        initial_state: vec![0xFF; 50_000], // Large state
        gas_limit: 25_000_000, // Excessive gas
        deployer: "deployer".to_string(),
        timestamp: 0,
        ai_audit_score: Some(0.1), // Very low AI score
    };

    let problematic_audit = auditor.audit_contract(&problematic_deployment).await;

    // Should find multiple critical issues
    assert!(!problematic_audit.passes_security_check());
    assert!(problematic_audit.security_score() < 50);
    assert!(!problematic_audit.findings_by_severity(Severity::Critical).is_empty());

    // Test execution analysis
    let suspicious_call = ContractCall {
        contract_address: "test_contract".to_string(),
        caller: "attacker".to_string(),
        method: "suspicious_method".to_string(),
        input_data: vec![],
        gas_limit: 5_000_000,
        value: 1000,
        timestamp: 1234567890,
    };

    let suspicious_result = ExecutionResult {
        success: true,
        return_data: vec![],
        gas_used: 500_000, // Low efficiency
        gas_remaining: 4_500_000,
        state_changes: vec![
            // Multiple modifications suggesting reentrancy
            StateChange {
                contract_address: "test_contract".to_string(),
                key: b"balance".to_vec(),
                old_value: Some(b"1000".to_vec()),
                new_value: b"900".to_vec(),
            },
            StateChange {
                contract_address: "test_contract".to_string(),
                key: b"balance".to_vec(),
                old_value: Some(b"900".to_vec()),
                new_value: b"800".to_vec(),
            },
            StateChange {
                contract_address: "test_contract".to_string(),
                key: b"balance".to_vec(),
                old_value: Some(b"800".to_vec()),
                new_value: b"700".to_vec(),
            },
        ],
        events: vec![],
        ai_analysis: None,
    };

    let execution_findings = auditor.analyze_execution(&suspicious_call, &suspicious_result).await;
    assert!(!execution_findings.is_empty());
    assert!(execution_findings.iter().any(|f|
        f.category == VulnerabilityCategory::Reentrancy ||
        f.category == VulnerabilityCategory::GasGriefing
    ));

    let stats = auditor.get_statistics();
    assert!(stats.contracts_audited >= 2);
    assert!(stats.vulnerabilities_found > 0);

    println!("✅ Security auditor integration tests passed");
    println!("   - Audited {} contracts", stats.contracts_audited);
    println!("   - Found {} vulnerabilities", stats.vulnerabilities_found);
    println!("   - Detected {} gas attacks", stats.gas_attacks_detected);
    println!("   - Ran {} fuzz tests", stats.fuzz_tests_run);
}

/// Test audit report generation
#[tokio::test]
async fn test_audit_report_generation() {
    let mut auditor = SecurityAuditor::new();
    let mut report_generator = AuditReportGenerator::new();

    // Create audit result with various findings
    let test_deployment = ContractDeployment {
        address: "report_test_contract".to_string(),
        code: vec![1, 2, 3], // Invalid to generate findings
        initial_state: vec![0xFF; 20_000], // Large state
        gas_limit: 15_000_000, // High gas
        deployer: "deployer".to_string(),
        timestamp: 1234567890,
        ai_audit_score: Some(0.3), // Low score
    };

    let audit_result = auditor.audit_contract(&test_deployment).await;

    // Generate comprehensive report
    let report = report_generator.generate_report(&audit_result, None, None);

    // Validate report structure
    assert_eq!(report.metadata.contract_address, test_deployment.address);
    assert!(!report.metadata.report_id.is_empty());
    assert!(!report.metadata.audit_date.is_empty());

    // Should have findings
    assert!(report.findings_summary.total_findings > 0);
    assert!(!report.detailed_findings.is_empty());

    // Should have security assessment
    assert!(report.executive_summary.overall_security_score <= 100);
    assert!(report.executive_summary.critical_issues > 0);

    // Generate markdown report
    let markdown = report_generator.generate_markdown_report(&report);

    // Validate markdown content
    assert!(markdown.contains("# Smart Contract Security Audit Report"));
    assert!(markdown.contains(&test_deployment.address));
    assert!(markdown.contains("Executive Summary"));
    assert!(markdown.contains("Detailed Security Findings"));
    assert!(markdown.contains("Gas Analysis Report"));
    assert!(markdown.contains("Recommendations"));
    assert!(markdown.contains("Appendix"));

    // Check for specific security content
    assert!(markdown.contains("Critical") || markdown.contains("High"));
    assert!(markdown.contains("Severity"));
    assert!(markdown.contains("Recommendations"));

    println!("✅ Audit report generation tests passed");
    println!("   - Generated report with {} findings", report.findings_summary.total_findings);
    println!("   - Security score: {}/100", report.executive_summary.overall_security_score);
    println!("   - Markdown report length: {} characters", markdown.len());

    // Test saving report to file (would work in real environment)
    // let filename = "/tmp/test_audit_report.md";
    // report_generator.save_report_to_file(&markdown, filename).unwrap();
    // println!("   - Saved report to {}", filename);
}

/// Test edge cases and error handling
#[tokio::test]
async fn test_security_edge_cases() {
    let mut auditor = SecurityAuditor::new();

    // Test empty contract
    let empty_deployment = ContractDeployment {
        address: "empty_contract".to_string(),
        code: vec![], // Completely empty
        initial_state: vec![],
        gas_limit: 0, // Zero gas
        deployer: "".to_string(), // Empty deployer
        timestamp: 0,
        ai_audit_score: None, // No AI score
    };

    let empty_audit = auditor.audit_contract(&empty_deployment).await;

    // Should detect multiple critical issues
    assert!(!empty_audit.passes_security_check());
    assert!(empty_audit.security_score() < 30);
    assert!(!empty_audit.findings_by_severity(Severity::Critical).is_empty());

    // Test maximum values
    let max_deployment = ContractDeployment {
        address: "x".repeat(1000), // Very long address
        code: vec![0xFF; 1_000_000], // Very large code
        initial_state: vec![0xAA; 100_000], // Large state
        gas_limit: u64::MAX, // Maximum gas
        deployer: "deployer".to_string(),
        timestamp: u64::MAX, // Maximum timestamp
        ai_audit_score: Some(1.5), // Invalid score > 1.0
    };

    let max_audit = auditor.audit_contract(&max_deployment).await;

    // Should handle extreme values gracefully
    assert!(!max_audit.findings.is_empty());
    assert!(max_audit.findings.iter().any(|f|
        f.category == VulnerabilityCategory::GasGriefing ||
        f.category == VulnerabilityCategory::DoS
    ));

    println!("✅ Edge case tests passed - system handles extreme inputs gracefully");
}

// Helper functions

fn create_valid_test_deployment() -> ContractDeployment {
    ContractDeployment {
        address: "test_contract_valid".to_string(),
        code: create_valid_wasm_bytecode(),
        initial_state: vec![1, 2, 3, 4], // Small, reasonable state
        gas_limit: 500_000, // Reasonable gas limit
        deployer: "legitimate_deployer".to_string(),
        timestamp: 1234567890,
        ai_audit_score: Some(0.85), // Good AI score
    }
}

fn create_valid_wasm_bytecode() -> Vec<u8> {
    vec![
        0x00, 0x61, 0x73, 0x6d, // WASM magic number
        0x01, 0x00, 0x00, 0x00, // WASM version
        // Minimal valid WASM sections
        0x01, 0x04, 0x01, 0x60, 0x00, 0x00, // Type section
        0x03, 0x02, 0x01, 0x00, // Function section
        0x0a, 0x04, 0x01, 0x02, 0x00, 0x0b, // Code section
    ]
}

/// Integration test demonstrating full security audit workflow
#[tokio::test]
async fn test_full_security_audit_workflow() {
    println!("🔍 Starting comprehensive security audit workflow test...");

    // Step 1: Initialize security auditor
    let mut auditor = SecurityAuditor::new();
    let mut report_generator = AuditReportGenerator::new();

    // Step 2: Create various contract scenarios
    let contracts = vec![
        ("secure_contract", create_secure_contract()),
        ("vulnerable_contract", create_vulnerable_contract()),
        ("gas_attack_contract", create_gas_attack_contract()),
    ];

    let mut all_results = Vec::new();

    // Step 3: Audit each contract
    for (name, deployment) in contracts {
        println!("   Auditing {}...", name);
        let audit_result = auditor.audit_contract(&deployment).await;

        println!("     - Security score: {}/100", audit_result.security_score());
        println!("     - Findings: {}", audit_result.findings.len());
        println!("     - Passes check: {}", audit_result.passes_security_check());

        all_results.push((name, audit_result));
    }

    // Step 4: Generate reports for problematic contracts
    for (name, result) in &all_results {
        if !result.passes_security_check() {
            println!("   Generating detailed report for {}...", name);
            let report = report_generator.generate_report(result, None, None);
            let markdown = report_generator.generate_markdown_report(&report);

            assert!(markdown.len() > 1000); // Should be substantial report
            assert!(markdown.contains("Critical") || markdown.contains("High"));

            println!("     - Report generated: {} characters", markdown.len());
        }
    }

    // Step 5: Verify auditor statistics
    let stats = auditor.get_statistics();
    assert_eq!(stats.contracts_audited, 3);
    assert!(stats.vulnerabilities_found > 0);

    println!("✅ Full security audit workflow completed successfully!");
    println!("   Final statistics:");
    println!("   - Contracts audited: {}", stats.contracts_audited);
    println!("   - Vulnerabilities found: {}", stats.vulnerabilities_found);
    println!("   - Gas attacks detected: {}", stats.gas_attacks_detected);
    println!("   - Fuzz tests executed: {}", stats.fuzz_tests_run);
}

fn create_secure_contract() -> ContractDeployment {
    ContractDeployment {
        address: "secure_contract_addr".to_string(),
        code: create_valid_wasm_bytecode(),
        initial_state: vec![0, 1, 2, 3],
        gas_limit: 200_000,
        deployer: "trusted_deployer".to_string(),
        timestamp: 1234567890,
        ai_audit_score: Some(0.95),
    }
}

fn create_vulnerable_contract() -> ContractDeployment {
    ContractDeployment {
        address: "vulnerable_contract_addr".to_string(),
        code: vec![0xFF, 0xFF, 0xFF, 0xFF], // Invalid WASM magic
        initial_state: vec![],
        gas_limit: 100_000,
        deployer: "untrusted_deployer".to_string(),
        timestamp: 1234567890,
        ai_audit_score: Some(0.15), // Very low AI score
    }
}

fn create_gas_attack_contract() -> ContractDeployment {
    ContractDeployment {
        address: "gas_attack_contract_addr".to_string(),
        code: create_valid_wasm_bytecode(),
        initial_state: vec![0xFF; 80_000], // Large initial state
        gas_limit: 20_000_000, // Excessive gas limit
        deployer: "attacker_deployer".to_string(),
        timestamp: 1234567890,
        ai_audit_score: Some(0.4), // Low AI score
    }
}