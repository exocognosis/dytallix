# PQC Protection Status - Strategic Dashboard Guide

## Overview

The **PQC Protection Status** section provides a strategic, high-level view of your organization's post-quantum cryptographic protection posture. Unlike a simple list of encrypted assets, this dashboard delivers actionable intelligence and strategic metrics that help security leaders understand their quantum readiness at a glance.

---

## Key Metrics

### 1. Overall Protection Rate
**What it shows:** Percentage of your total asset inventory that has been protected with post-quantum cryptography.

**Strategic value:**
- Quick snapshot of PQC adoption progress
- Benchmark against industry standards (target: 90%+ for quantum readiness)
- Visual progress bar with color-coded status:
  - 🟢 Green (75%+): Good protection coverage
  - 🟡 Yellow (50-74%): Moderate coverage, needs improvement
  - 🔴 Red (<50%): Critical coverage gap

**Example:**
```
Overall Protection: 68.2% (15/22 assets)
```

### 2. Critical Asset Protection
**What it shows:** Percentage of business-critical assets that are PQC-protected.

**Strategic value:**
- Focuses on highest-value assets
- Critical assets should be prioritized for PQC migration (target: 90%+)
- Immediate alert if critical assets are unprotected

**Status indicators:**
- ✓ Well Protected (90%+)
- ⚠ Needs Attention (<90%)

**Example:**
```
Critical Assets: 100% (5/5)
✓ Well Protected
```

### 3. Recent Activity (30 days)
**What it shows:** Number of assets protected with PQC in the last 30 days.

**Strategic value:**
- Tracks momentum of PQC migration efforts
- Identifies whether the organization is actively transitioning
- Helps justify resource allocation for crypto-agility initiatives

**Status indicators:**
- 📈 Active migration (1+ assets protected)
- ⏸ Low activity (0 assets protected)

**Example:**
```
Recent Activity: 7 assets protected
📈 Active migration
```

### 4. High-Risk Unprotected Assets
**What it shows:** Number of Critical or High risk-class assets that lack PQC protection.

**Strategic value:**
- Immediate risk exposure indicator
- Prioritizes remediation efforts
- Red flag for compliance and security audits

**Status indicators:**
- 🚨 Immediate action required (>0 assets)
- ✓ All high-risk covered (0 assets)

**Example:**
```
High-Risk Unprotected: 3 assets at risk
🚨 Immediate action required
```

---

## Algorithm Distribution Analysis

### Encryption Algorithms (KEM)
Shows the breakdown of Key Encapsulation Mechanisms used across protected assets.

**Supported KEM Algorithms:**
- **ML-KEM-512** (Kyber-512) - Standard security, high performance
- **ML-KEM-768** (Kyber-768) - High security, balanced performance
- **ML-KEM-1024** (Kyber-1024) - Highest security, maximum quantum resistance

**Strategic insights:**
- **Crypto-agility assessment:** Diverse algorithm usage indicates better preparedness for algorithm vulnerabilities
- **Performance optimization:** Identifies whether you're using appropriate security levels for different asset types
- **Migration planning:** Shows adoption patterns and helps plan future migrations

**Example:**
```
🔐 Encryption Algorithms (KEM)
ML-KEM-768:    10 assets (67%)  ████████████████
ML-KEM-1024:   5 assets (33%)   ████████
```

### Signature Algorithms
Shows the breakdown of digital signature schemes used for authentication and integrity.

**Supported Signature Algorithms:**
- **ML-DSA-44** (Dilithium2) - Standard security, smaller signatures
- **ML-DSA-65** (Dilithium3) - High security, balanced
- **ML-DSA-87** (Dilithium5) - Highest security, larger signatures
- **SLH-DSA-128s** (SPHINCS+-SHAKE-128s) - Hash-based, stateless signatures
- **SLH-DSA-256s** (SPHINCS+-SHAKE-256s) - Maximum security, stateless
- **None** - No signature protection applied

**Strategic insights:**
- **Authentication coverage:** Tracks which assets have digital signature protection
- **Algorithm diversity:** Multiple signature schemes improve resilience
- **Compliance alignment:** Helps ensure regulatory requirements are met

**Example:**
```
✍️ Signature Algorithms
ML-DSA-65:     8 assets (53%)   ██████████████
SLH-DSA-128s:  5 assets (33%)   ████████
None:          2 assets (13%)   ███
```

---

## Strategic Recommendations

The dashboard automatically generates actionable recommendations based on your protection status:

### Priority Actions
**Triggers when:** High-risk unprotected assets exist

**Recommendation:**
> "Priority: Protect X high-risk unprotected assets immediately"

**What to do:**
1. Navigate to the Assets table and filter by "Critical" or "High" risk class
2. Review unprotected assets
3. Use the File Encryption Demo to protect these assets
4. Verify protection status updates

### Critical Business Assets
**Triggers when:** Critical asset protection rate < 90%

**Recommendation:**
> "Critical: X critical business assets lack PQC protection"

**What to do:**
1. Identify critical assets in your inventory
2. Prioritize based on business impact
3. Implement PQC protection using ML-KEM-1024 + ML-DSA-87 for maximum security
4. Update asset classification if needed

### Coverage Improvement
**Triggers when:** Overall protection rate < 75%

**Recommendation:**
> "Coverage: Overall protection rate is X% - aim for 90%+ for quantum readiness"

**What to do:**
1. Develop a phased migration plan
2. Start with Critical and High risk assets
3. Set quarterly targets (e.g., 80% by Q2, 90% by Q3)
4. Monitor progress through the dashboard

### Crypto-Agility Enhancement
**Triggers when:** Only one KEM algorithm is in use across 5+ protected assets

**Recommendation:**
> "Diversity: Consider adopting multiple KEM algorithms to improve crypto-agility"

**What to do:**
1. Assess whether all assets need the same security level
2. Use ML-KEM-512 for low-risk, performance-sensitive assets
3. Use ML-KEM-768 for general-purpose protection
4. Use ML-KEM-1024 for critical, long-lived data
5. Test multiple algorithms to validate operational readiness

---

## Dashboard Usage Guide

### For Security Leaders
**Key questions answered:**
- "What percentage of our assets are quantum-ready?"
- "Are our critical assets protected?"
- "Is our PQC migration on track?"
- "Where should we focus our resources?"

**How to use:**
1. Review the four top-level metrics for a 30-second status check
2. Check the algorithm distribution to ensure crypto-agility
3. Read the strategic recommendations for prioritized action items
4. Share metrics in executive reports and board presentations

### For Security Engineers
**Key questions answered:**
- "Which assets need immediate attention?"
- "What algorithms should I use for new assets?"
- "How is our algorithm diversity?"
- "What's the recent migration velocity?"

**How to use:**
1. Monitor "High-Risk Unprotected" for urgent remediation
2. Use algorithm distribution charts to guide new asset configuration
3. Track "Recent Activity" to measure team progress
4. Filter the Assets table to find specific assets needing protection

### For Compliance Teams
**Key questions answered:**
- "Are we meeting quantum-readiness requirements?"
- "What's our audit readiness for PQC standards?"
- "Which critical assets have gaps?"

**How to use:**
1. Document "Overall Protection Rate" for compliance reports
2. Ensure "Critical Asset Protection" meets regulatory thresholds
3. Use algorithm breakdowns to demonstrate NIST-approved crypto usage
4. Export strategic recommendations for audit remediation plans

---

## Integration with Risk Dashboard

The PQC Protection Status section complements the existing Risk Dashboard:

### Risk Overview
Shows **what** is at risk based on quantum vulnerability assessment

### PQC Protection Status
Shows **what you're doing** to mitigate those risks

**Together they provide:**
1. **Risk identification** (AQV, DLV, IMP, EXP, AGI, CCW scores)
2. **Risk quantification** (PQC Risk Score, Risk Class)
3. **Protection status** (Protected vs. Unprotected)
4. **Migration progress** (Recent Activity, Coverage Metrics)
5. **Strategic guidance** (Recommendations, Algorithm Insights)

---

## Best Practices

### Target Metrics
- **Overall Protection Rate:** 90%+
- **Critical Asset Protection:** 100%
- **Recent Activity:** 5+ assets per month during active migration
- **High-Risk Unprotected:** 0

### Migration Strategy
1. **Phase 1 (Immediate):** Protect all Critical risk class assets
2. **Phase 2 (30 days):** Protect all High risk class assets
3. **Phase 3 (90 days):** Protect Medium risk class assets
4. **Phase 4 (6 months):** Achieve 90%+ overall coverage
5. **Phase 5 (Ongoing):** Maintain crypto-agility and algorithm diversity

### Algorithm Selection Guidelines
| Asset Type | Recommended KEM | Recommended Signature |
|------------|----------------|----------------------|
| Critical long-lived data | ML-KEM-1024 | ML-DSA-87 |
| Standard sensitive data | ML-KEM-768 | ML-DSA-65 |
| Performance-sensitive | ML-KEM-512 | ML-DSA-44 |
| Stateless requirements | Any KEM | SLH-DSA-128s/256s |

---

## Technical Implementation

### Data Sources
- **Asset Repository:** SQLite database with `encryption_profile` JSON field
- **Risk Service:** `/api/risk/assets` endpoint
- **Real-time calculation:** Metrics computed on-demand from current asset state

### Encryption Profile Structure
```json
{
  "protected": true,
  "kem": "ML-KEM-768",
  "signature_scheme": "ML-DSA-65",
  "symmetric_algo": "aes256gcm",
  "mode": "pqc",
  "encrypted_at": "2024-01-15T10:30:00Z"
}
```

### Protection Status Detection
An asset is considered "protected" if:
- `encryption_profile.protected === true`
- `encryption_profile.kem` is set to a valid PQC algorithm
- `encryption_profile.encrypted_at` is a valid timestamp

---

## Troubleshooting

### Issue: Protection rate shows 0%
**Cause:** No assets have been encrypted yet
**Solution:** Use the File Encryption Demo to protect your first asset

### Issue: Critical asset protection shows "Needs Attention"
**Cause:** One or more critical assets lack PQC protection
**Solution:**
1. Go to Assets table and filter by "Critical" risk class
2. Review unprotected assets
3. Apply PQC encryption using the demo or API

### Issue: Recent Activity shows 0
**Cause:** No assets have been protected in the last 30 days
**Solution:**
- If actively migrating, protect more assets to maintain momentum
- If migration complete, this is expected behavior

### Issue: Algorithm distribution is empty
**Cause:** No protected assets with algorithm metadata
**Solution:**
- Ensure assets have valid `encryption_profile.kem` and `encryption_profile.signature_scheme` values
- Re-encrypt assets using the updated demo interface

---

## API Endpoints

The PQC Protection Status section uses the following endpoints:

### Get All Assets with Risk Data
```http
GET /api/risk/assets
X-API-Key: dev-api-key-change-in-production
```

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Customer Database",
    "asset_type": "datastore",
    "business_criticality": "critical",
    "risk_class": "High",
    "pqc_risk_score": 72,
    "encryption_profile": {
      "protected": true,
      "kem": "ML-KEM-768",
      "signature_scheme": "ML-DSA-65",
      "encrypted_at": "2024-01-15T10:30:00Z"
    }
  }
]
```

---

## Roadmap

### Future Enhancements
- **Trend charts:** Historical protection rate over time
- **Department breakdown:** Protection status by business unit
- **Algorithm recommendations:** AI-powered suggestions based on asset characteristics
- **Compliance scoring:** Automated NIST/NSA PQC readiness assessment
- **Integration alerts:** Slack/email notifications for high-risk unprotected assets
- **Export reports:** PDF/CSV export for compliance documentation

---

## Related Documentation
- [PQC Risk Classification Guide](PQC_RISK_CLASSIFICATION.md)
- [PQC Algorithm Explanation](PQC_ALGORITHM_EXPLANATION.md)
- [PQC Risk Quick Start](PQC_RISK_QUICKSTART.md)
- [PQC Risk Test Plan](PQC_RISK_TEST_PLAN.md)

---

## Summary

The **PQC Protection Status** section transforms raw encryption data into strategic intelligence, giving security leaders and engineers the insights they need to:

1. **Assess quantum readiness** at a glance
2. **Prioritize remediation efforts** based on risk and criticality
3. **Track migration progress** with clear metrics
4. **Ensure crypto-agility** through algorithm diversity
5. **Make data-driven decisions** about PQC investments

This is not just a list of encrypted assets—it's a strategic command center for your organization's post-quantum security transformation.
