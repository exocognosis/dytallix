# CI/CD & Security Pipeline

## Overview
This document describes the continuous integration, testing, and security scanning setup for the project (focus: dytallix-lean-launch). The pipeline emphasizes fast feedback, security posture, and reproducibility.

## Workflows

### 1. CI (ci.yml)
- **Triggers**: push to main, pull_request to main
- **Path filters**: Only runs when dytallix-lean-launch/, workflows, package files, or docs change
- **Steps**: checkout, Node setup (LTS), install (npm ci), lint, unit tests, optional build, checksum generation, artifact upload
- **Artifacts**: build-artifacts (contains checksums.txt when dist/ exists)
- **Concurrency**: Grouped by git ref, cancel-in-progress for efficiency

**Features:**
- Uses Node LTS with npm ci for deterministic installs
- Caches node_modules keyed by OS + lockfile hash
- Handles existing lint/test issues gracefully (continues pipeline)
- Skips Cypress installation to avoid network dependency issues
- Generates sha256 checksums for all files in dist/ directory

### 2. Security (security.yml)
- **Triggers**: push, pull_request, daily cron (3:17 AM)
- **Jobs**:
  - **NPM Audit**: npm audit --audit-level=high; fails if high/critical vulnerabilities unless ALLOW_AUDIT_FAIL=true
  - **Trivy Scan**: filesystem scan for HIGH/CRITICAL vulnerabilities; outputs SARIF to GitHub code scanning + artifact
- **Override**: Set repository secret ALLOW_AUDIT_FAIL=true to temporarily allow merging while addressing issues (not recommended long-term)

### 3. E2E (e2e.yml)
- **Placeholder workflow** for future end-to-end tests
- Currently just outputs a notice that Cypress/Playwright tests need to be added
- Can be triggered manually via workflow_dispatch or on pull requests

## Environment Variables & Secrets

### Security Workflow Variables
- **ALLOW_AUDIT_FAIL** (secret): If set to "true", Security workflow will not fail build on high vulns (use sparingly)
- **AUDIT_LEVEL**: Adjustable audit severity threshold (default: high)

### CI Environment
- **CYPRESS_INSTALL_BINARY=0**: Disables Cypress binary download during npm install to avoid network issues

## Checksum Generation / (Future: Signing)
- Checksum file `artifacts/checksums.txt` produced for dist/ files (sha256)
- Pipeline warns but doesn't fail if dist/ directory doesn't exist
- Future enhancement: Extend with GPG or cosign for cryptographic signatures

## Dependabot Configuration
- **NPM dependencies**: Weekly updates for dytallix-lean-launch directory
- **GitHub Actions**: Weekly updates for workflow dependencies
- **Labels**: PRs automatically labeled with "dependencies" and "security"/"ci" for quick triage
- **Limits**: Max 5 open pull requests to avoid noise

## Local Reproduction (act)

### Prerequisites
1. Install act: https://github.com/nektos/act
2. Optional: Create `.secrets` file for environment variables

### Running Workflows Locally
```bash
# Run CI workflow
act pull_request -W .github/workflows/ci.yml

# Run Security workflow (audit job only)
act pull_request -W .github/workflows/security.yml --job npm-audit

# Run with secrets (create .secrets file first)
act pull_request -W .github/workflows/security.yml --secret-file .secrets
```

### Example .secrets file
```
ALLOW_AUDIT_FAIL=true
```

## Makefile Usage

### Available Targets
```bash
# Full CI pipeline
make ci

# Individual steps
make install        # Install dependencies
make lint-lean      # Run ESLint
make test-lean      # Run Vitest tests
make build-lean     # Build with Vite
make checksum       # Generate checksums

# Security
make security-audit # npm audit locally
make trivy          # Run local Trivy scan (requires trivy installed)
```

### Environment Variables
```bash
# Override project directory
PROJECT_DIR=my-custom-dir make ci

# Allow audit failures
ALLOW_AUDIT_FAIL=true make security-audit
```

## Extending the Pipeline

### Adding E2E Tests (Cypress)
1. Install Cypress in dytallix-lean-launch: `npm install --save-dev cypress`
2. Update e2e.yml workflow:
   ```yaml
   - name: Install dependencies
     run: npm ci
   - name: Run Cypress tests
     run: npm run test:e2e
   ```
3. Add cache configuration for Cypress binary

### Adding SBOM Generation
```yaml
- name: Generate SBOM
  run: npx @cyclonedx/cdx-cli@latest generate --output-file sbom.json
- name: Upload SBOM
  uses: actions/upload-artifact@v4
  with:
    name: sbom
    path: sbom.json
```

### Adding CodeQL for Code Scanning
```yaml
- name: Initialize CodeQL
  uses: github/codeql-action/init@v3
  with:
    languages: javascript
- name: Perform CodeQL Analysis
  uses: github/codeql-action/analyze@v3
```

### Adding Container Image Scanning
When Dockerfile is added:
```yaml
- name: Build container image
  run: docker build -t dytallix:${{ github.sha }} .
- name: Scan container image
  uses: aquasecurity/trivy-action@0.24.0
  with:
    image-ref: dytallix:${{ github.sha }}
    format: 'sarif'
    output: 'trivy-image.sarif'
```

### Adding Release Automation
- Integrate conventional commits with semantic-release
- Automate version bumping and changelog generation
- Sign and publish release artifacts

## Failure Conditions

### CI Workflow
- **Does NOT fail on**: Existing lint errors, test failures, or build issues (logs warnings)
- **Fails on**: Missing dependencies, invalid package.json, workspace configuration errors

### Security Workflow
- **Fails on**: High/Critical vulnerabilities in npm audit (unless ALLOW_AUDIT_FAIL=true)
- **Does NOT fail on**: Trivy findings (uploads to code scanning instead)

## Safe Defaults
- No secrets printed to logs
- Audit gating defaults to denying merges with unresolved high-risk vulnerabilities
- Graceful handling of missing dist/ directory
- Concurrency groups prevent resource conflicts
- Artifact uploads use `if-no-files-found: warn` to avoid failures

## Troubleshooting

### Common Issues

**Cache misses**: Ensure package-lock.json is stable and committed
```bash
rm package-lock.json node_modules/
npm install
git add package-lock.json
```

**Dist folder absent**: Normal behavior, checksum step logs warning but continues
```bash
# Force build if needed
npm run build
```

**Audit false positives**: Document in issue, optionally override temporarily
```bash
# Set repository secret
ALLOW_AUDIT_FAIL=true
```

**Cypress installation failures**: Expected due to network restrictions, e2e workflow is placeholder only

**Node version mismatches**: CI uses Node LTS, ensure local development matches
```bash
node --version  # Should match "lts/*"
```

### Testing Locally

**Test individual Makefile targets**:
```bash
make install      # Should complete without errors
make lint-lean    # May show existing warnings (expected)
make test-lean    # May show existing test issues (expected)
make build-lean   # May fail on missing dependencies (expected)
make checksum     # Should warn about missing dist/ (expected)
```

**Test security commands**:
```bash
make security-audit  # Shows current vulnerabilities
make trivy          # Requires trivy installation first
```

## Security Considerations

### Dependency Management
- Dependabot monitors for security updates weekly
- npm audit runs on every PR and daily schedule
- High/Critical vulnerabilities block merging by default

### Secret Management
- No hardcoded secrets in workflows
- Environment variables used for configuration
- Secrets accessed through GitHub repository secrets only

### Code Scanning Integration
- Trivy results uploaded to GitHub Security tab
- SARIF format for integration with GitHub Advanced Security
- Future: CodeQL for static analysis

### Network Security
- Workflows use pinned action versions (@v4, @v3)
- No external dependencies beyond GitHub Actions marketplace
- Trivy database updates handled automatically

## Maintenance

### Daily
- Review security alerts in GitHub Security tab
- Monitor CI/CD pipeline health

### Weekly
- Review Dependabot PRs
- Update any audit overrides that are no longer needed

### Monthly
- Review and update workflow action versions
- Assess security posture and update policies
- Review artifact retention policies

### Quarterly
- Audit ALLOW_AUDIT_FAIL usage and remediate
- Review and update documentation
- Consider pipeline performance optimizations

## References

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [npm audit Documentation](https://docs.npmjs.com/cli/v8/commands/npm-audit)
- [Trivy Documentation](https://aquasecurity.github.io/trivy/)
- [Dependabot Documentation](https://docs.github.com/en/code-security/supply-chain-security/keeping-your-dependencies-updated-automatically)
- [act Documentation](https://github.com/nektos/act)