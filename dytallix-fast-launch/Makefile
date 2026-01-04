# DRY helper functions and variables
SCRIPT_PREFIX := @bash scripts
EVIDENCE_DIR := scripts/evidence
E2E_DIR := scripts/e2e

# Generic script runner
define run_script
	@echo "$(2)"
	$(SCRIPT_PREFIX)/$(1)
	@echo "✓ $(3)"
endef

# Generic evidence generator
define generate_evidence
	$(call run_script,$(EVIDENCE_DIR)/$(1),Generating $(2) evidence...,$(2) evidence complete)
endef

# User flow tests
e2e-user:
	$(call run_script,e2e_user_flow.sh,,)

e2e-user-with-logs:
	@TRACE=1 $(SCRIPT_PREFIX)/e2e_user_flow.sh

# Linting targets
lint-one:
	$(call run_script,lint_one_crate.sh "$(PKG)",,)

lint-all:
	$(call run_script,lint_all_crates.sh,,)

lint-report:
	@echo "See launch-evidence/build-logs/lint/WORKSPACE_SUMMARY.md"

# Evidence generation targets
evidence-observability:
	$(call generate_evidence,observability_probe.sh,observability)
	$(call run_script,$(EVIDENCE_DIR)/alert_canary.sh,,)

evidence-security:
	$(call generate_evidence,security_headers_check.sh,security)
	$(call run_script,$(EVIDENCE_DIR)/vault_probe.sh,,)

evidence-governance:
	$(call generate_evidence,governance_e2e.sh,governance)

evidence-ai:
	$(call generate_evidence,ai_risk_probe.sh,AI risk)

evidence-ci:
	$(call run_script,ci/local_ci_all.sh,Running local CI checks...,CI evidence complete)

# E2E PQC tests
evidence-e2e-pqc:
	$(call run_script,$(E2E_DIR)/user_journey.sh,Running E2E PQC user journey test...,E2E PQC evidence complete)

test-e2e-pqc:
	$(call run_script,$(E2E_DIR)/test_user_journey.sh,Running E2E PQC user journey unit tests...,E2E PQC tests passed)

verify-e2e-pqc:
	$(call run_script,$(E2E_DIR)/verify_integration.sh,Running E2E PQC integration verification...,E2E PQC integration verified)

# Aggregate evidence target
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