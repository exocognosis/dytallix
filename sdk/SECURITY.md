# Security Policy

## Reporting a Vulnerability

The Dytallix team takes security vulnerabilities seriously. We appreciate your efforts to responsibly disclose your findings.

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via email to: **TODO: security@dytallix.network**

You should receive a response within 48 hours. If for some reason you do not, please follow up via email to ensure we received your original message.

Please include the following information in your report:

- Type of issue (e.g., buffer overflow, SQL injection, cross-site scripting, etc.)
- Full paths of source file(s) related to the manifestation of the issue
- The location of the affected source code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit it

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Security Considerations

### Post-Quantum Cryptography

This SDK provides interfaces for post-quantum cryptographic algorithms (ML-DSA, SLH-DSA). The current implementation includes mock adapters for development and testing purposes.

**⚠️ WARNING: The default PQC implementations are NOT production-ready. You must integrate real PQC primitives before using this SDK in production.**

### Keystore Security

- Keystores are encrypted using AES-GCM with PBKDF2 key derivation
- Always use strong passwords (recommended: 16+ characters, mixed case, numbers, symbols)
- Never commit keystores or passwords to version control
- Store keystores in secure locations with appropriate file permissions

### Network Security

- Always use HTTPS for RPC connections in production
- Validate SSL/TLS certificates
- Be cautious when connecting to unknown or untrusted nodes

## Disclosure Policy

When we receive a security bug report, we will:

1. Confirm the problem and determine affected versions
2. Audit code to find any similar problems
3. Prepare fixes for all supported versions
4. Release patches as soon as possible

## Comments on this Policy

If you have suggestions on how this process could be improved, please submit a pull request.
