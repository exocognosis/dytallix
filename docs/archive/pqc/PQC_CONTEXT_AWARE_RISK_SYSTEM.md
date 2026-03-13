# Context-Aware PQC Risk Classification System

## Overview

The QuantumVault PQC risk classification engine now features **context-aware, content-agnostic risk assessment** that can:

1. **Automatically detect asset types** based on names, paths, and metadata
2. **Apply intelligent preset profiles** for common deployment patterns
3. **Calculate risk scores inline** during asset creation
4. **Provide contextual questionnaires** when asset type cannot be inferred
5. **Show inference details** so users understand what the system detected

## Architecture

### 1. Preset-Based Risk Profiles (`src/risk/presets.rs`)

The system includes 14 pre-configured deployment patterns:

| Preset Key | Name | Use Case | Default Risk Profile |
|------------|------|----------|---------------------|
| `pki_root` | PKI Root CA | Root certificate authority | Critical/Low Agility/Long-lived |
| `code_signing` | Code Signing Key | Software/firmware signing | Critical/Low Agility/Long-lived |
| `database_encryption` | Database Encryption | TDE/encryption at rest | High/Medium Agility/Long-lived/Regulated |
| `vpn_gateway` | VPN Gateway | VPN tunnel endpoint | High/Medium Agility/Internet-exposed |
| `api_gateway_tls` | API Gateway TLS | Public-facing API/web TLS | High/High Agility/Internet-exposed |
| `internal_service_tls` | Internal Service TLS | Service-to-service mTLS | Medium/High Agility/Internal |
| `ssh_server` | SSH Server | SSH host/authorized keys | Medium/Medium Agility/Partner-exposed |
| `document_archive` | Document Archive | Long-term compliance storage | High/Low Agility/Long-lived/Regulated |
| `user_data_storage` | User Data Storage | User-generated content | High/Medium Agility/Long-lived/Confidential |
| `session_cache` | Session/Cache | Short-lived session tokens | Medium/High Agility/Ephemeral |
| `blockchain_ledger` | Blockchain/Ledger | Immutable ledger | Critical/Low Agility/Long-lived |
| `iot_device` | IoT/Embedded Device | Constrained devices | Medium/Low Agility/Firmware |
| `backup_encryption` | Backup Encryption | Encrypted backups | Critical/Low Agility/Long-lived/Regulated |
| `config_secret` | Configuration Secret | Secret storage (Vault, etc.) | High/High Agility/Confidential |

### 2. Intelligent Asset Type Detection

The system analyzes multiple signals to infer asset type:

```rust
// Detection heuristics (src/risk/presets.rs)
- Filename patterns: "root ca", "vpn", "database", "backup", "ssh", "code signing"
- Endpoint patterns: "/vpn", "/db", ":22", "/api"
- Environment indicators: "archive", "production", "field"
- Crypto usage types: PKI, code signing, VPN, blockchain, data-at-rest
```

**Examples:**
- `"Production Database"` → `database_encryption` preset
- `"VPN Gateway Production"` → `vpn_gateway` preset  
- `"Root CA Certificate"` → `pki_root` preset
- `"Code Signing Key"` → `code_signing` preset
- `"Random File"` → No detection, prompts for questionnaire

### 3. Inline Risk Evaluation

Risk scores are calculated **automatically during asset creation**:

```rust
// In src/api/asset_handlers.rs - create_asset_handler
1. Create asset from user input
2. Detect and apply preset (if found)
3. Evaluate PQC risk with default weights
4. Store asset with complete risk profile
```

**Risk Dimensions Calculated:**
- **AQV** (Algorithm Quantum Vulnerability): 0-5, based on crypto algorithms
- **DLV** (Data Longevity): 0-5, based on data retention and sensitivity
- **IMP** (Business Impact): 0-5, based on criticality and crypto usage
- **EXP** (Exposure): 0-5, based on network exposure level
- **AGI** (Crypto Agility): 0-5, based on upgrade difficulty (inverted)
- **CCW** (Classical Crypto Weakness): 0-5, based on legacy algorithms

**Composite Score:** Weighted sum of dimensions, normalized to 0-100

**Risk Classes:**
- **Low**: 0-24
- **Medium**: 25-49
- **High**: 50-74  
- **Critical**: 75-100 (or any critical override rules)

### 4. API Endpoints

#### `/api/risk/presets` (GET)
Lists all available preset profiles.

```bash
curl http://localhost:8080/api/risk/presets \
  -H "X-API-Key: dev-api-key-change-in-production"
```

**Response:**
```json
{
  "presets": [
    {
      "key": "vpn_gateway",
      "name": "VPN Gateway",
      "description": "VPN tunnel endpoint - medium/high impact, medium agility",
      "business_criticality": "High",
      "crypto_usage": "Vpn",
      "exposure": "Internet",
      ...
    },
    ...
  ]
}
```

#### `/api/risk/questionnaire` (GET)
Returns contextual questions for manual risk assessment.

```bash
curl http://localhost:8080/api/risk/questionnaire \
  -H "X-API-Key: dev-api-key-change-in-production"
```

**Response:**
```json
{
  "questionnaire": [
    {
      "id": "business_criticality",
      "question": "How critical is this asset to your business operations?",
      "field": "business_criticality",
      "options": [
        {
          "value": "low",
          "label": "Low",
          "description": "Nice to have, minimal business impact if unavailable"
        },
        ...
      ],
      "help_text": "Consider the impact on revenue, operations, and reputation..."
    },
    ...
  ]
}
```

**Questions Included:**
1. Business Criticality (4 options)
2. Cryptographic Use Case (6 options: data-at-rest, channel, code signing, PKI, VPN, blockchain)
3. Network Exposure Level (5 options: internet, partner, internal, restricted, air-gapped)
4. Data Sensitivity (4 options: public, internal, confidential, regulated)
5. Crypto Agility (3 options: high, medium, low)
6. Long-lived Data (2 options: yes/no)

#### `/api/risk/preview` (POST)
Preview asset inference without creating the asset.

```bash
curl -X POST http://localhost:8080/api/risk/preview \
  -H "Content-Type: application/json" \
  -H "X-API-Key: dev-api-key-change-in-production" \
  -d '{
    "name": "VPN Gateway Production",
    "endpoint_or_path": "/vpn",
    "environment": "production"
  }'
```

**Response (Detected):**
```json
{
  "detected": true,
  "confidence": "high",
  "preset_key": "vpn_gateway",
  "preset_name": "VPN Gateway",
  "preset_description": "VPN tunnel endpoint - medium/high impact, medium agility",
  "inferred_values": {
    "business_criticality": "High",
    "crypto_usage": "Vpn",
    "exposure": "Internet",
    "data_sensitivity": "Confidential",
    "crypto_agility": "Medium",
    "stores_long_lived_data": false
  },
  "recommendation": "Based on the name 'VPN Gateway Production', this appears to be a VPN Gateway. We'll apply appropriate security defaults."
}
```

**Response (Not Detected):**
```json
{
  "detected": false,
  "recommendation": "Could not determine asset type. Please provide additional context via questionnaire."
}
```

## Frontend Integration Points

To integrate the context-aware system into the DemoView UI:

### 1. Show Inference Preview Before Anchoring

```tsx
// After file is encrypted, before anchoring:
const [inferenceResult, setInferenceResult] = useState(null);

useEffect(() => {
  if (encryptionResult && selectedFile) {
    // Preview what will be inferred
    fetch(`${API_BASE}/api/risk/preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      },
      body: JSON.stringify({
        name: selectedFile.name,
        endpoint_or_path: `/secure/${encryptionResult.hash}`
      })
    })
    .then(res => res.json())
    .then(data => setInferenceResult(data));
  }
}, [encryptionResult, selectedFile]);
```

### 2. Display Inference Results

```tsx
{inferenceResult && (
  <div style={{
    padding: '1rem',
    background: inferenceResult.detected ? '#e8f5e9' : '#fff3e0',
    borderRadius: '8px',
    marginBottom: '1.5rem'
  }}>
    <h3>🔍 Asset Analysis</h3>
    {inferenceResult.detected ? (
      <>
        <p><strong>Detected Type:</strong> {inferenceResult.preset_name}</p>
        <p><strong>Description:</strong> {inferenceResult.preset_description}</p>
        <details>
          <summary>View Inferred Security Profile</summary>
          <ul>
            <li>Business Criticality: {inferenceResult.inferred_values.business_criticality}</li>
            <li>Crypto Usage: {inferenceResult.inferred_values.crypto_usage}</li>
            <li>Exposure: {inferenceResult.inferred_values.exposure}</li>
            <li>Data Sensitivity: {inferenceResult.inferred_values.data_sensitivity}</li>
          </ul>
        </details>
      </>
    ) : (
      <>
        <p>⚠️ {inferenceResult.recommendation}</p>
        <button onClick={() => setShowQuestionnaire(true)}>
          Answer Questions
        </button>
      </>
    )}
  </div>
)}
```

### 3. Optional Questionnaire Modal

```tsx
const [showQuestionnaire, setShowQuestionnaire] = useState(false);
const [questionnaireData, setQuestionnaireData] = useState(null);
const [userAnswers, setUserAnswers] = useState({});

// Fetch questionnaire
useEffect(() => {
  if (showQuestionnaire) {
    fetch(`${API_BASE}/api/risk/questionnaire`, {
      headers: { 'X-API-Key': API_KEY }
    })
    .then(res => res.json())
    .then(data => setQuestionnaireData(data.questionnaire));
  }
}, [showQuestionnaire]);

// Render questionnaire UI
{showQuestionnaire && questionnaireData && (
  <div style={{ /* modal styles */ }}>
    <h2>Security Context Questions</h2>
    {questionnaireData.map(q => (
      <div key={q.id}>
        <label>{q.question}</label>
        <select onChange={(e) => setUserAnswers({
          ...userAnswers,
          [q.field]: e.target.value
        })}>
          {q.options.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label} - {opt.description}
            </option>
          ))}
        </select>
      </div>
    ))}
    <button onClick={() => {
      // Include userAnswers in asset creation
      setShowQuestionnaire(false);
    }}>
      Continue with These Settings
    </button>
  </div>
)}
```

### 4. Include Context in Asset Creation

```tsx
const assetData = {
  name: selectedFile.name,
  asset_type: 'datastore',
  endpoint_or_path: `/secure/${encryptionResult.hash}`,
  owner: 'user',
  sensitivity: 'confidential',
  regulatory_tags: ['encrypted', 'pqc-protected', 'blockchain-anchored'],
  exposure_level: 'internal',
  data_lifetime_days: 365,
  
  // Include user-provided or inferred context
  ...userAnswers, // If questionnaire was filled
  
  // PQC encryption profile
  encryption_profile: {
    protected: true,
    kem: selectedAlgorithm,
    signature_scheme: selectedSignature,
    symmetric_algo: 'aes256gcm',
    mode: 'pqc',
    encrypted_at: new Date().toISOString()
  }
};
```

## Testing Examples

### Example 1: Database Asset
```bash
curl -X POST http://localhost:8080/api/assets/manual \
  -H "Content-Type: application/json" \
  -H "X-API-Key: dev-api-key-change-in-production" \
  -d '{
    "name": "Production Database",
    "asset_type": "datastore",
    "endpoint_or_path": "/db/prod",
    "owner": "dba-team",
    "sensitivity": "confidential",
    "regulatory_tags": ["PCI-DSS"],
    "exposure_level": "internal",
    "data_lifetime_days": 2555
  }'
```

**Result:**
- Preset: `database_encryption`
- Risk Score: **71** (High)
- Business Criticality: **High**
- Stores Long-lived Data: **true**
- Data Sensitivity: **Regulated**

### Example 2: VPN Gateway
```bash
curl -X POST http://localhost:8080/api/assets/manual \
  -H "Content-Type: application/json" \
  -H "X-API-Key: dev-api-key-change-in-production" \
  -d '{
    "name": "VPN Gateway Production",
    "asset_type": "tlsendpoint",
    "endpoint_or_path": "/vpn/gateway",
    "owner": "security-team",
    "sensitivity": "confidential",
    "regulatory_tags": ["SOC2"],
    "exposure_level": "publicinternet",
    "data_lifetime_days": 365
  }'
```

**Result:**
- Preset: `vpn_gateway`
- Risk Score: **70** (High)
- Business Criticality: **High**
- Exposure: **Internet**
- Crypto Usage: **VPN**

### Example 3: Unknown Asset (No Detection)
```bash
curl -X POST http://localhost:8080/api/risk/preview \
  -H "Content-Type: application/json" \
  -H "X-API-Key: dev-api-key-change-in-production" \
  -d '{
    "name": "Random File 123"
  }'
```

**Result:**
```json
{
  "detected": false,
  "recommendation": "Could not determine asset type. Please provide additional context via questionnaire."
}
```

## Benefits

### 1. **Content-Agnostic**
- Works with any file type or asset
- No hardcoded assumptions about specific file extensions or formats
- Flexible pattern matching on names, paths, and metadata

### 2. **Context-Aware**
- Automatically detects common deployment patterns
- Applies industry-standard risk profiles
- Fills in missing metadata intelligently

### 3. **Transparent**
- Shows what was detected and why
- Displays inferred values before applying them
- Provides confidence levels and recommendations

### 4. **User-Friendly**
- Minimal input required for common cases
- Guided questionnaire for edge cases
- Clear explanations of risk factors

### 5. **Accurate Risk Scoring**
- Risk calculated inline with no delays
- All dimensions populated immediately
- Consistent scoring across similar assets

## Configuration

### Customizing Presets

To add or modify presets, edit `/Users/rickglenn/Downloads/dytallix-main/quantumvault/src/risk/presets.rs`:

```rust
presets.insert("my_custom_preset", AssetPreset {
    name: "My Custom Asset Type",
    description: "Description of this asset type",
    business_criticality: BusinessCriticality::High,
    crypto_usage: CryptoUsage::DataAtRest,
    exposure: ExposureType::Internal,
    data_sensitivity: DataSensitivity::Confidential,
    crypto_agility: CryptoAgility::Medium,
    stores_long_lived_data: true,
    typical_environments: vec!["production", "staging"],
});
```

### Adjusting Detection Heuristics

Modify the `infer_preset_from_asset()` function to add new detection patterns:

```rust
// Check for your custom pattern
if name_lower.contains("mypattern") {
    return Some("my_custom_preset");
}
```

### Risk Weights

Default risk weights are defined in `src/risk/types.rs`:

```rust
impl Default for RiskWeights {
    fn default() -> Self {
        Self {
            aqv: 0.35,  // 35% weight on algorithm vulnerability
            dlv: 0.20,  // 20% weight on data longevity
            imp: 0.20,  // 20% weight on business impact
            exp: 0.10,  // 10% weight on exposure
            agi: 0.10,  // 10% weight on crypto agility
            ccw: 0.05,  // 5% weight on classical weaknesses
        }
    }
}
```

## Next Steps

### Recommended UI Enhancements

1. **Step 2.5: "Review Asset Classification"**
   - Show between encryption and anchoring
   - Display detected preset and inferred values
   - Allow user to override or confirm
   - Show expected risk score

2. **Questionnaire Modal**
   - Slide-in panel with guided questions
   - Progress indicator (question X of 6)
   - Save answers for future similar assets
   - "Use these defaults next time" checkbox

3. **Asset Type Selector**
   - Dropdown of all available presets
   - Manual preset selection option
   - "Let the system detect" (default)
   - Preview inferred values on hover

4. **Risk Score Visualization**
   - Show risk score badge after anchoring
   - Color-coded (green/yellow/orange/red)
   - Link to full risk breakdown
   - Comparison to organizational average

### Backend Enhancements

1. **Learning System**
   - Track user overrides to preset detection
   - Improve heuristics based on feedback
   - Organizational custom presets

2. **Batch Operations**
   - Bulk asset import with auto-detection
   - CSV upload with preset mapping
   - API for programmatic asset creation

3. **Risk Trending**
   - Track risk score changes over time
   - Alert on risk class upgrades
   - Periodic re-evaluation of assets

## Summary

The PQC risk classification system is now **fully context-aware and content-agnostic**:

✅ **Automatic detection** of 14 common asset types  
✅ **Inline risk evaluation** during asset creation  
✅ **Preview endpoint** to show what will be inferred  
✅ **Contextual questionnaire** for unknown assets  
✅ **Transparent inference** with confidence levels  
✅ **Preset profiles** with industry-standard defaults  
✅ **Complete risk dimensions** calculated immediately  
✅ **API-first design** ready for frontend integration  

The system now provides meaningful risk scores for all assets, with no "N/A" or null values, while remaining flexible enough to handle any type of file or asset through intelligent inference or guided user input.
