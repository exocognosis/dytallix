# ...existing code...

lint-one:
	@bash scripts/lint_one_crate.sh "$(PKG)"

lint-all:
	@bash scripts/lint_all_crates.sh

lint-report:
	@echo "See launch-evidence/build-logs/lint/WORKSPACE_SUMMARY.md"

# Evidence generation targets
evidence-observability:
	@echo "Generating observability evidence..."
	@bash scripts/evidence/observability_probe.sh
	@bash scripts/evidence/alert_canary.sh
	@echo "✓ Observability evidence complete"

evidence-security:
	@echo "Generating security evidence..."
	@bash scripts/evidence/security_headers_check.sh
	@bash scripts/evidence/vault_probe.sh
	@echo "✓ Security evidence complete"

evidence-governance:
	@echo "Generating governance evidence..."
	@bash scripts/evidence/governance_e2e.sh
	@echo "✓ Governance evidence complete"

evidence-ai:
	@echo "Generating AI risk evidence..."
	@bash scripts/evidence/ai_risk_probe.sh
	@echo "✓ AI risk evidence complete"

evidence-ci:
	@echo "Running local CI checks..."
	@bash scripts/ci/local_ci_all.sh
	@echo "✓ CI evidence complete"

evidence-e2e-pqc:
	@echo "Running E2E PQC user journey test..."
	@bash scripts/e2e/user_journey.sh
	@echo "✓ E2E PQC evidence complete"

test-e2e-pqc:
	@echo "Running E2E PQC user journey unit tests..."
	@bash scripts/e2e/test_user_journey.sh
	@echo "✓ E2E PQC tests passed"

verify-e2e-pqc:
	@echo "Running E2E PQC integration verification..."
	@bash scripts/e2e/verify_integration.sh
	@echo "✓ E2E PQC integration verified"

evidence-all: evidence-observability evidence-security evidence-governance evidence-ai evidence-ci
	@echo ""
	@echo "==================================="
	@echo "✓ All evidence generation complete"
	@echo "==================================="
	@echo ""
	@echo "Evidence artifacts:"
	@echo "  - launch-evidence/monitoring/"
	@echo "  - launch-evidence/security/"
	@echo "  - launch-evidence/governance/"
	@echo "  - launch-evidence/ai/"
	@echo "  - readiness_out/"
	@echo ""
	@echo "Next: Review LAUNCH-CHECKLIST.md"

# ...existing code...