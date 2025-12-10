# PQC Operational Policies

**Document Version:** 1.0  
**Last Updated:** 2024-09-27  
**Effective Date:** Testnet Launch  
**Review Cycle:** Quarterly  

## Executive Summary

This document establishes operational policies for Post-Quantum Cryptography (PQC) key lifecycle management in the Dytallix network. These policies ensure cryptographic agility, operational continuity, and quantum-resilience across all network components.

## Key Lifecycle Policies

### 1. Key Generation

#### 1.1 Algorithm Standards
- **Primary Algorithm:** Dilithium-5 (NIST Level 5 security)
- **Backup Algorithms:** Falcon-1024, SPHINCS+-SHA256-128s
- **Key Generation Source:** Cryptographically secure random number generator (CSPRNG)
- **Entropy Requirements:** Minimum 256 bits of entropy per key generation

#### 1.2 Key Generation Procedures
1. Generate keypairs using approved algorithms
2. Test keypair validity with sign/verify cycle
3. Store public key in plaintext, encrypt private key
4. Generate cryptographic fingerprint for verification
5. Document key metadata (creation time, algorithm, purpose)

### 2. Key Storage and Protection

#### 2.1 Storage Requirements
- **Private Keys:** AES-256-GCM encryption with PBKDF2-derived keys
- **Key Encryption:** Minimum 100,000 PBKDF2 iterations
- **Storage Location:** Isolated key management storage
- **Access Control:** Multi-factor authentication required
- **Backup Storage:** Geographically distributed replicas

#### 2.2 Hardware Security Module (HSM) Integration
- **Production Environment:** HSM required for validator keys
- **Development/Testing:** Software-based key storage acceptable
- **HSM Standards:** FIPS 140-2 Level 3 or equivalent
- **Key Extraction:** HSM keys cannot be extracted in plaintext

### 3. Key Rotation Policies

#### 3.1 Scheduled Rotation
- **Validator Keys:** Every 12 months or 1M signatures (whichever comes first)
- **User Keys:** Recommended annually, required every 24 months
- **API Keys:** Every 6 months
- **Emergency Keys:** Every 3 months or after use

#### 3.2 Event-Driven Rotation
Immediate rotation required for:
- Suspected key compromise
- Algorithm deprecation announcements
- Quantum computing advances affecting security level
- Insider threat incidents
- Compliance requirement changes

#### 3.3 Rotation Procedures
1. **Pre-Rotation:**
   - Generate new keypair with same or upgraded algorithm
   - Test new keypair functionality
   - Prepare rotation announcement for network participants
   
2. **Rotation Execution:**
   - Create secure backup of current key with timestamp
   - Update active key atomically
   - Broadcast key rotation notification to network
   - Update all dependent systems
   
3. **Post-Rotation:**
   - Verify new key acceptance across network
   - Monitor for rotation-related issues
   - Schedule old key deprecation
   - Update monitoring and alerting systems

### 4. Key Backup and Recovery

#### 4.1 Backup Strategy
- **Backup Schedule:** Real-time backup of key changes
- **Backup Retention:** 7 years for validator keys, 3 years for user keys
- **Backup Encryption:** Same encryption standard as primary storage
- **Backup Testing:** Monthly recovery tests on 10% of backup set

#### 4.2 Recovery Procedures
1. **Recovery Authorization:** Multi-signature approval required
2. **Recovery Process:**
   - Verify backup integrity and encryption
   - Decrypt and validate recovered key
   - Test key functionality before activation
   - Document recovery event and root cause
3. **Post-Recovery:** Security audit and process review

### 5. Key Deprecation and Destruction

#### 5.1 Deprecation Timeline
- **Grace Period:** 90 days after key rotation
- **Warning Period:** 30 days before deprecation
- **Final Deprecation:** Complete removal from active systems

#### 5.2 Secure Destruction
- **Memory Clearing:** Zeroize all key material in memory
- **Storage Wiping:** Cryptographic erasure of storage media
- **Verification:** Confirm complete key removal
- **Documentation:** Record destruction event with timestamp

## Operational Procedures

### 6. Emergency Response

#### 6.1 Key Compromise Response
1. **Immediate Actions:**
   - Revoke compromised key immediately
   - Generate and deploy new key within 1 hour
   - Notify all network participants
   - Initiate security incident response

2. **Investigation:**
   - Determine compromise vector and scope
   - Assess impact on network security
   - Document lessons learned
   - Update security procedures

#### 6.2 Algorithm Compromise Response
1. **Assessment:**
   - Evaluate cryptographic vulnerability impact
   - Determine timeline for algorithm deprecation
   - Plan migration to secure algorithms

2. **Migration:**
   - Develop algorithm transition plan
   - Execute coordinated network-wide migration
   - Verify successful algorithm update
   - Decommission vulnerable algorithms

### 7. Compliance and Auditing

#### 7.1 Audit Requirements
- **Internal Audits:** Monthly key lifecycle audits
- **External Audits:** Annual third-party security assessment
- **Compliance Standards:** NIST SP 800-57, FIPS 140-2
- **Documentation:** Complete audit trail of all key operations

#### 7.2 Compliance Metrics
- Key rotation compliance rate: >95%
- Backup recovery success rate: >99%
- HSM availability: >99.9%
- Security incident response time: <1 hour

### 8. Training and Awareness

#### 8.1 Personnel Training
- **Security Team:** Advanced PQC and key management training
- **Operations Team:** Operational procedures and emergency response
- **Development Team:** Secure coding and cryptographic implementation
- **All Staff:** Basic quantum computing and PQC awareness

#### 8.2 Training Schedule
- **Initial Training:** Before system access granted
- **Refresher Training:** Annually
- **Emergency Training:** Quarterly drills
- **Update Training:** After policy or procedure changes

## Implementation Guidelines

### 9. CLI Command Reference

#### 9.1 Key Generation
```bash
# Generate new key
dytx keys add --name validator-01 --algo dilithium

# Generate with specific parameters
dytx keys add --name backup-key --algo dilithium --passphrase $SECURE_PASS
```

#### 9.2 Key Rotation
```bash
# Rotate existing key
dytx keys rotate --name validator-01 --algo dilithium

# Emergency rotation
dytx keys rotate --name compromised-key --algo dilithium --emergency
```

#### 9.3 Key Export/Import
```bash
# Export public key in PEM format
dytx keys export --name validator-01 --format pem

# Import backup keystore
dytx keys import /secure/backup/validator-01-backup.json

# Restore from backup
dytx keys restore /backup/validator-01_backup_2024-09-27.json --name validator-01
```

#### 9.4 Key Management
```bash
# List all keys with rotation history
dytx keys list --verbose

# Verify key integrity
dytx keys verify --name validator-01

# Cleanup expired backups
dytx keys cleanup --retention-days 90
```

### 10. Monitoring and Alerting

#### 10.1 Key Lifecycle Monitoring
- **Metrics Tracked:**
  - Key age and signature count
  - Rotation schedule compliance
  - Backup success/failure rates
  - HSM health and availability
  - Algorithm usage statistics

#### 10.2 Alert Conditions
- **Critical Alerts:**
  - Key compromise detected
  - HSM failure or unavailability
  - Backup failure
  - Key rotation overdue (>30 days)
  
- **Warning Alerts:**
  - Key approaching rotation threshold
  - Backup verification failure
  - Algorithm deprecation announced
  - HSM performance degradation

## Security Considerations

### 11. Threat Model

#### 11.1 Quantum Threats
- **Current Quantum Computers:** No immediate threat to Dilithium-5
- **Future Quantum Systems:** Cryptographically relevant quantum computers (CRQC)
- **Timeline:** Monitor NIST guidance and quantum computing advances
- **Mitigation:** Crypto-agility and algorithm diversification

#### 11.2 Classical Threats
- **Side-Channel Attacks:** Timing, power, and electromagnetic analysis
- **Implementation Attacks:** Fault injection and glitching
- **Social Engineering:** Targeting key management personnel
- **Insider Threats:** Malicious or compromised insiders

### 12. Risk Management

#### 12.1 Risk Assessment Matrix
| Risk | Probability | Impact | Mitigation |
|------|-------------|---------|------------|
| Key Compromise | Medium | High | Rapid rotation, monitoring |
| Algorithm Break | Low | Critical | Crypto-agility, multiple algorithms |
| HSM Failure | Medium | High | Redundancy, backup procedures |
| Insider Threat | Low | High | Access controls, audit logging |

#### 12.2 Risk Mitigation Strategies
- **Defense in Depth:** Multiple security layers
- **Crypto-Agility:** Rapid algorithm transition capability
- **Incident Response:** Prepared response procedures
- **Regular Audits:** Continuous security assessment

## Appendices

### Appendix A: Algorithm Specifications
- **Dilithium-5:** NIST FIPS 204, Security Level 5
- **Falcon-1024:** NIST FIPS 205, Security Level 5  
- **SPHINCS+-SHA256-128s:** NIST FIPS 205, Security Level 1

### Appendix B: Key Storage Formats
- **Keystore Format:** JSON with encrypted private key
- **Public Key Export:** PEM and JSON formats
- **Backup Format:** Encrypted JSON with metadata

### Appendix C: Emergency Contacts
- **Security Team:** security@dytallix.com
- **Operations Team:** ops@dytallix.com
- **24/7 Emergency:** +1-XXX-XXX-XXXX

---

**Document Control:**  
- **Author:** Dytallix Security Team
- **Reviewers:** CTO, Head of Security, Lead Cryptographer
- **Approval:** Chief Security Officer
- **Distribution:** All technical staff, external auditors
- **Classification:** Internal Use

**Change Log:**
- v1.0 (2024-09-27): Initial policy document for testnet launch