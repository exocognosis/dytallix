# PQC Risk Classification System

## Overview

The PQC (Post-Quantum Cryptography) Risk Classification Engine provides comprehensive quantum vulnerability assessment for cryptographic assets in QuantumVault. It evaluates assets across six risk dimensions and assigns a composite risk score (0-100) along with a risk class (Low/Medium/High/Critical).

## Risk Model

### Risk Dimensions (0-5 scale)

1. **AQV - Algorithm Quantum Vulnerability**
   - Measures susceptibility to quantum computing attacks
   - Score 5: Quantum-vulnerable public-key (RSA, ECDSA, ECDH, DSA, DH)
   - Score 3: Symmetric-only with ≤128-bit keys
   - Score 1: Strong symmetric (≥192-bit keys)

2. **DLV - Data Longevity / Time-to-Value**
   - Measures criticality of long-term data protection
   - Score 5: Long-lived confidential/regulated data
   - Score 4: Regulated data
   - Score 3: Confidential data
   - Score 1: Internal data
   - Score 0: Public data

3. **IMP - Business / System Impact**
   - Measures business criticality and system importance
   - Based on `business_criticality` field
   - +1 bonus for PKI root, code signing, or VPN usage

4. **EXP - Exposure**
   - Measures attack surface exposure
   - Score 5: Internet-facing
   - Score 4: Partner network
   - Score 3: Internal network
   - Score 1: Restricted network
   - Score 0: Air-gapped

5. **AGI - Cryptographic Agility**
   - Measures difficulty of upgrading cryptography (inverse scale)
   - Score 5: Low agility (hard to change)
   - Score 3: Medium agility
   - Score 1: High agility (easy to upgrade)

6. **CCW - Classical Crypto Weakness**
   - Measures pre-quantum cryptographic vulnerabilities
   - Score 5: Critical weaknesses (SHA1, MD5, 1024-bit RSA, RC4, legacy TLS)
   - Score 3: Moderate weaknesses (3DES, 2048-bit RSA on critical systems)
   - Score 1: Modern, secure configuration

### Composite Risk Score

The PQC risk score (0-100) is computed using weighted dimensions:

```
score = (aqv × 0.20 + dlv × 0.25 + imp × 0.25 + exp × 0.10 + agi × 0.10 + ccw × 0.10) × 20
```

**Default Weights:**
- AQV: 20% - Algorithm quantum vulnerability
- DLV: 25% - Data longevity (highest weight)
- IMP: 25% - Business impact (highest weight)
- EXP: 10% - Exposure
- AGI: 10% - Agility
- CCW: 10% - Classical weakness

### Risk Class Assignment

**Override Rules** (take precedence):
- Critical: CCW=5 AND IMP≥4 (classical weakness on critical system)
- Critical: AQV=5 AND DLV≥4 AND IMP≥4 AND AGI≥4 (quantum-vulnerable, long-lived, critical, hard to fix)

**Score-Based:**
- Critical: score ≥ 75
- High: score ≥ 50
- Medium: score ≥ 25
- Low: score < 25

## API Endpoints

### `GET /api/risk/assets`
List all assets with PQC risk information.

**Query Parameters:**
- `risk_class`: Filter by risk class (Low|Medium|High|Critical)
- `environment`: Filter by environment (prod|non-prod)
- `crypto_usage`: Filter by crypto usage type
- `min_risk_score`: Minimum PQC risk score (0-100)
- `max_risk_score`: Maximum PQC risk score (0-100)

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "api.example.com",
    "asset_type": "TlsEndpoint",
    "owner": "security-team",
    "environment": "prod",
    "business_criticality": "High",
    "crypto_usage": "Channel",
    "exposure_type": "Internet",
    "aqv": 5,
    "dlv": 4,
    "imp": 4,
    "exp": 5,
    "agi": 3,
    "ccw": 3,
    "pqc_risk_score": 78,
    "risk_class": "Critical"
  }
]
```

### `GET /api/risk/assets/:id`
Get detailed PQC risk information for a single asset.

### `PATCH /api/risk/assets/:id`
Update PQC risk fields and recompute risk score.

**Request Body:**
```json
{
  "environment": "prod",
  "business_criticality": "high",
  "crypto_usage": "channel",
  "algo_pk": "RSA",
  "pk_key_bits": 2048,
  "algo_sym": "AES",
  "sym_key_bits": 256,
  "protocol_version": "TLS1.2",
  "hash_algo": "SHA256",
  "exposure_type": "internet",
  "stores_long_lived_data": true,
  "data_sensitivity": "confidential",
  "crypto_agility": "medium",
  "classical_issues": ["rsa_keylen_2048"]
}
```

### `GET /api/risk/summary`
Get aggregate risk statistics for dashboard.

**Response:**
```json
{
  "total_assets": 1423,
  "by_risk_class": {
    "Low": 312,
    "Medium": 756,
    "High": 255,
    "Critical": 100
  },
  "by_environment": {
    "prod": { "Low": 50, "Medium": 300, "High": 200, "Critical": 80 },
    "non-prod": { "Low": 262, "Medium": 456, "High": 55, "Critical": 20 }
  },
  "by_crypto_usage": {
    "Channel": 950,
    "DataAtRest": 200,
    "CodeSigning": 30,
    "PkiRoot": 5,
    "PkiLeaf": 40,
    "Vpn": 100,
    "Ssh": 98
  },
  "average_risk_score": 42.5,
  "assets_needing_attention": 355
}
```

### `GET /api/risk/weights`
Get current risk weight profile.

## Frontend Dashboard

### PQC Risk Dashboard (`/pqc-risk`)

**Features:**
- Summary cards showing total assets by risk class
- Risk distribution visualization with percentage bars
- Interactive asset table with filtering:
  - Search by name/owner
  - Filter by risk class
  - Filter by environment
- Sortable columns (risk score, name, etc.)

### Asset Detail View (`/pqc-risk/assets/:id`)

**Features:**
- Large risk score gauge (0-100)
- Risk class badge
- Six dimension cards with:
  - Score (0-5)
  - Visual bar indicator
  - Explanatory text
- Comprehensive asset metadata
- Crypto configuration details

## Integration Guide

### Adding Risk Evaluation to Asset Ingestion

```rust
use quantumvault::application::evaluate_and_update_asset_risk;
use quantumvault::risk::RiskWeights;

// After creating or updating an asset
let mut asset = Asset::new(/* ... */);

// Set PQC risk fields
asset.environment = Some("prod".to_string());
asset.business_criticality = BusinessCriticality::High;
asset.crypto_usage = CryptoUsage::Channel;
asset.algo_pk = AlgoPublicKey::RSA;
asset.pk_key_bits = Some(2048);
// ... set other fields ...

// Evaluate and update risk
let weights = RiskWeights::default();
evaluate_and_update_asset_risk(&mut asset, &weights);

// asset now has aqv, dlv, imp, exp, agi, ccw, pqc_risk_score, risk_class populated
```

### Custom Risk Weight Profiles

To create sector-specific risk profiles (e.g., financial services, industrial control systems):

1. Adjust weights based on sector priorities
2. Store in `risk_weight_profiles` table
3. Use when evaluating assets:

```rust
let custom_weights = RiskWeights {
    aqv: 0.30,  // Higher weight on quantum vulnerability
    dlv: 0.30,  // Higher weight on data longevity
    imp: 0.20,
    exp: 0.10,
    agi: 0.05,
    ccw: 0.05,
};

evaluate_and_update_asset_risk(&mut asset, &custom_weights);
```

## Database Schema

### New Asset Fields

```sql
-- PQC Risk Classification Fields
environment VARCHAR(20),
business_criticality business_criticality NOT NULL DEFAULT 'unknown',
crypto_usage crypto_usage NOT NULL DEFAULT 'other',
algo_pk algo_public_key NOT NULL DEFAULT 'None',
pk_key_bits INTEGER,
algo_sym algo_symmetric NOT NULL DEFAULT 'None',
sym_key_bits INTEGER,
hash_algo VARCHAR(50),
protocol_version VARCHAR(50),
exposure_type exposure_type NOT NULL DEFAULT 'unknown',
stores_long_lived_data BOOLEAN NOT NULL DEFAULT false,
data_sensitivity data_sensitivity NOT NULL DEFAULT 'unknown',
crypto_agility crypto_agility NOT NULL DEFAULT 'unknown',
classical_issues TEXT[] NOT NULL DEFAULT '{}',

-- Risk Dimension Scores (0-5)
aqv SMALLINT,
dlv SMALLINT,
imp SMALLINT,
exp SMALLINT,
agi SMALLINT,
ccw SMALLINT,

-- Composite Risk
pqc_risk_score SMALLINT,
risk_class risk_class
```

## Testing

### Unit Tests

Risk engine functions have comprehensive unit tests in `src/risk/engine.rs`:

```bash
cargo test risk::
```

### Integration Tests

Test API endpoints:

```bash
# List risk assets
curl -H "X-API-Key: $API_KEY" http://localhost:8080/api/risk/assets

# Get risk summary
curl -H "X-API-Key: $API_KEY" http://localhost:8080/api/risk/summary

# Get asset detail
curl -H "X-API-Key: $API_KEY" http://localhost:8080/api/risk/assets/:id

# Update asset risk fields
curl -X PATCH -H "X-API-Key: $API_KEY" -H "Content-Type: application/json" \
  -d '{"business_criticality": "critical"}' \
  http://localhost:8080/api/risk/assets/:id
```

## Migration

Run the database migration to add PQC risk fields:

```bash
cd quantumvault
sqlx migrate run
```

This applies migration `002_add_pqc_risk_fields.sql`.

## Future Enhancements

1. **Historical Risk Trends**: Track risk score changes over time
2. **Risk Remediation Workflow**: Guided remediation for high-risk assets
3. **Automated Scanning**: TLS/SSH scanner integration to populate fields
4. **ML-Based Risk Prediction**: Predict risk score based on metadata
5. **Custom Risk Policies**: Per-team or per-project risk thresholds
6. **Export/Reporting**: PDF/Excel reports for compliance
7. **Risk Heatmap**: Visual geographic or network topology heatmap

## References

- [NIST Post-Quantum Cryptography](https://csrc.nist.gov/projects/post-quantum-cryptography)
- [Harvest Now, Decrypt Later Attacks](https://en.wikipedia.org/wiki/Harvest_now,_decrypt_later)
- [CISA Quantum Readiness](https://www.cisa.gov/quantum)
