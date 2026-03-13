# PQC Risk Classification - Test Plan

## Unit Tests

### Risk Engine Functions (`src/risk/engine.rs`)

All core risk dimension functions have comprehensive unit tests included in the source file.

#### Run All Risk Tests
```bash
cd quantumvault
cargo test risk::
```

#### Test Coverage

**1. compute_aqv() - Algorithm Quantum Vulnerability**
- ✅ RSA returns 5
- ✅ ECDSA returns 5
- ✅ ECDH returns 5
- ✅ DSA returns 5
- ✅ DH returns 5
- ✅ None with 128-bit symmetric returns 3
- ✅ None with 256-bit symmetric returns 1

**2. compute_dlv() - Data Longevity**
- ✅ Public data returns 0
- ✅ Confidential + long-lived returns 5
- ✅ Regulated + long-lived returns 5
- ✅ Regulated returns 4
- ✅ Confidential returns 3
- ✅ Internal returns 1
- ✅ Unknown returns 2

**3. compute_imp() - Business Impact**
- ✅ Critical returns 5
- ✅ High returns 4
- ✅ Medium returns 3
- ✅ Low returns 1
- ✅ Unknown returns 3
- ✅ PKI root adds +1 (capped at 5)
- ✅ Code signing adds +1 (capped at 5)
- ✅ VPN adds +1 (capped at 5)

**4. compute_exp() - Exposure**
- ✅ Internet returns 5
- ✅ Partner returns 4
- ✅ Internal returns 3
- ✅ Restricted returns 1
- ✅ Airgapped returns 0
- ✅ Unknown returns 3

**5. compute_agi() - Crypto Agility**
- ✅ Low agility returns 5
- ✅ High agility returns 1
- ✅ Medium agility returns 3
- ✅ Unknown with TLS returns 3
- ✅ Unknown with SSH returns 3
- ✅ Unknown other returns 4

**6. compute_ccw() - Classical Crypto Weakness**
- ✅ RSA 1024-bit returns 5
- ✅ SHA1 returns 5
- ✅ MD5 returns 5
- ✅ RC4 returns 5
- ✅ SSL3.0/TLS1.0/TLS1.1 returns 5
- ✅ 3DES returns 3
- ✅ RSA 2048 on critical system returns 3
- ✅ Modern config returns 1

**7. compute_pqc_risk_score() - Composite Score**
- ✅ All dimensions at 5 with default weights = 100
- ✅ All dimensions at 0 with default weights = 0
- ✅ Mixed dimensions produce correct weighted score
- ✅ Score clamped to 0-100 range

**8. compute_risk_class() - Risk Classification**
- ✅ Score ≥75 returns Critical
- ✅ Score ≥50 returns High
- ✅ Score ≥25 returns Medium
- ✅ Score <25 returns Low
- ✅ Override: CCW=5 + IMP≥4 returns Critical
- ✅ Override: AQV=5 + DLV≥4 + IMP≥4 + AGI≥4 returns Critical

**9. evaluate_asset_risk() - Integration**
- ✅ Computes all dimensions correctly
- ✅ Computes composite score correctly
- ✅ Assigns correct risk class
- ✅ Applies override rules

### Application Service Tests (`src/application/risk_service.rs`)

```bash
cargo test application::risk_service
```

**Test Cases:**
- ✅ domain_asset_to_risk_asset conversion
- ✅ evaluate_and_update_asset_risk updates all fields
- ✅ Enum conversions are bidirectional

## Integration Tests

### API Endpoint Tests

#### Setup Test Data
```bash
# Create a test asset
export ASSET_ID=$(curl -s -X POST http://localhost:8080/api/assets/manual \
  -H "X-API-Key: dev-api-key-change-in-production" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Asset",
    "asset_type": "tlsendpoint",
    "endpoint_or_path": "https://test.example.com",
    "owner": "test-team",
    "sensitivity": "confidential",
    "regulatory_tags": [],
    "exposure_level": "publicinternet",
    "data_lifetime_days": 365,
    "encryption_profile": {}
  }' | jq -r '.id')

echo "Created asset: $ASSET_ID"
```

#### Test 1: GET /api/risk/assets
```bash
# Should return 200 with array of assets
curl -s -H "X-API-Key: dev-api-key-change-in-production" \
  http://localhost:8080/api/risk/assets | jq '.'

# Expected: JSON array with assets
```

**Assertions:**
- ✅ Returns 200 OK
- ✅ Returns JSON array
- ✅ Each asset has id, name, risk fields
- ✅ pqc_risk_score is null initially (not computed)

#### Test 2: GET /api/risk/assets/:id
```bash
# Should return 200 with single asset
curl -s -H "X-API-Key: dev-api-key-change-in-production" \
  http://localhost:8080/api/risk/assets/$ASSET_ID | jq '.'

# Expected: JSON object with full asset details
```

**Assertions:**
- ✅ Returns 200 OK for valid ID
- ✅ Returns 404 for invalid ID
- ✅ Returns complete asset with all risk fields

#### Test 3: PATCH /api/risk/assets/:id (Update Risk Fields)
```bash
# Should update fields and recompute risk
curl -s -X PATCH http://localhost:8080/api/risk/assets/$ASSET_ID \
  -H "X-API-Key: dev-api-key-change-in-production" \
  -H "Content-Type: application/json" \
  -d '{
    "environment": "prod",
    "business_criticality": "critical",
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
    "classical_issues": []
  }' | jq '.'
```

**Assertions:**
- ✅ Returns 200 OK
- ✅ Returns updated asset
- ✅ aqv is computed (should be 5 for RSA)
- ✅ dlv is computed (should be 5 for confidential + long-lived)
- ✅ imp is computed (should be 5 for critical)
- ✅ exp is computed (should be 5 for internet)
- ✅ agi is computed (should be 3 for medium)
- ✅ ccw is computed (should be 3 for RSA 2048 on critical)
- ✅ pqc_risk_score is computed (should be ~85)
- ✅ risk_class is assigned (should be "Critical")

#### Test 4: GET /api/risk/summary
```bash
# Should return aggregate statistics
curl -s -H "X-API-Key: dev-api-key-change-in-production" \
  http://localhost:8080/api/risk/summary | jq '.'
```

**Assertions:**
- ✅ Returns 200 OK
- ✅ total_assets matches asset count
- ✅ by_risk_class has Low/Medium/High/Critical counts
- ✅ by_environment has prod/non-prod breakdowns
- ✅ by_crypto_usage has usage type counts
- ✅ average_risk_score is computed correctly
- ✅ assets_needing_attention = High + Critical count

#### Test 5: Filtering Tests
```bash
# Filter by risk class
curl -s -H "X-API-Key: dev-api-key-change-in-production" \
  "http://localhost:8080/api/risk/assets?risk_class=Critical" | jq 'length'

# Filter by environment
curl -s -H "X-API-Key: dev-api-key-change-in-production" \
  "http://localhost:8080/api/risk/assets?environment=prod" | jq 'length'

# Filter by score range
curl -s -H "X-API-Key: dev-api-key-change-in-production" \
  "http://localhost:8080/api/risk/assets?min_risk_score=75" | jq 'length'
```

**Assertions:**
- ✅ risk_class filter returns only matching assets
- ✅ environment filter works
- ✅ min_risk_score filter works
- ✅ max_risk_score filter works
- ✅ Multiple filters can combine

#### Test 6: GET /api/risk/weights
```bash
# Should return current risk weights
curl -s -H "X-API-Key: dev-api-key-change-in-production" \
  http://localhost:8080/api/risk/weights | jq '.'
```

**Assertions:**
- ✅ Returns 200 OK
- ✅ Returns default weights: aqv=0.20, dlv=0.25, imp=0.25, exp=0.10, agi=0.10, ccw=0.10
- ✅ name is "default"

## End-to-End Tests

### Frontend Dashboard Tests

#### Test 1: Dashboard Load
1. Navigate to `http://localhost:5173/pqc-risk`
2. **Expected:**
   - ✅ Summary cards display with correct counts
   - ✅ Risk distribution chart renders
   - ✅ Asset table loads and displays assets
   - ✅ No JavaScript console errors

#### Test 2: Filtering
1. Select "Critical" from risk class dropdown
2. **Expected:**
   - ✅ Asset table updates to show only Critical assets
   - ✅ Asset count updates
   - ✅ Summary cards remain unchanged

3. Select "prod" from environment dropdown
4. **Expected:**
   - ✅ Asset table further filters to prod + Critical
   - ✅ Count reflects filtered results

5. Type "api" in search box
6. **Expected:**
   - ✅ Asset table filters to names/owners containing "api"
   - ✅ Filtering works with other filters

7. Clear all filters
8. **Expected:**
   - ✅ Asset table shows all assets again

#### Test 3: Asset Detail Navigation
1. Click on an asset row
2. **Expected:**
   - ✅ Navigates to `/pqc-risk/assets/:id`
   - ✅ Asset detail page loads
   - ✅ Risk score gauge displays correctly
   - ✅ All 6 dimension cards display
   - ✅ Asset metadata section populates

3. Click "Back to Dashboard" button
4. **Expected:**
   - ✅ Returns to `/pqc-risk`
   - ✅ Filters are cleared

#### Test 4: Visual Indicators
1. Verify color coding:
   - ✅ Critical assets show red (#ef4444)
   - ✅ High assets show orange (#f97316)
   - ✅ Medium assets show amber (#f59e0b)
   - ✅ Low assets show green (#10b981)

2. Verify badges render correctly:
   - ✅ Risk class badges have correct colors
   - ✅ AQV badges highlight score 5 in red

3. Verify progress bars:
   - ✅ Risk score bars fill proportionally (0-100%)
   - ✅ Dimension bars fill proportionally (0-5 scale)

## Performance Tests

### Database Query Performance
```bash
# Time a summary query
time curl -s -H "X-API-Key: dev-api-key-change-in-production" \
  http://localhost:8080/api/risk/summary > /dev/null
```

**Expected:**
- ✅ < 100ms for <1000 assets
- ✅ < 500ms for <10000 assets

### Frontend Load Performance
1. Open browser DevTools → Network tab
2. Navigate to `/pqc-risk`
3. **Expected:**
   - ✅ Initial load < 2 seconds
   - ✅ API calls complete < 500ms
   - ✅ No memory leaks (check Memory tab)

## Regression Tests

### Existing Asset API Compatibility
```bash
# Ensure existing asset endpoints still work
curl -s -H "X-API-Key: dev-api-key-change-in-production" \
  http://localhost:8080/api/assets | jq '.'
```

**Assertions:**
- ✅ GET /api/assets still works
- ✅ POST /api/assets/manual still works
- ✅ GET /api/assets/:id still works
- ✅ Existing assets have default risk field values

## Test Scenarios

### Scenario 1: Critical Risk Asset
**Given:** An asset with:
- RSA 2048
- Internet-facing
- Critical business
- Long-lived regulated data
- Low agility

**Expected:**
- ✅ AQV = 5
- ✅ DLV = 5
- ✅ IMP = 5
- ✅ EXP = 5
- ✅ AGI = 5
- ✅ CCW = 3
- ✅ PQC Risk Score ≈ 93
- ✅ Risk Class = Critical

### Scenario 2: Low Risk Asset
**Given:** An asset with:
- AES 256 only (no public-key)
- Internal network
- Low business criticality
- Short-lived internal data
- High agility

**Expected:**
- ✅ AQV = 1
- ✅ DLV = 1
- ✅ IMP = 1
- ✅ EXP = 3
- ✅ AGI = 1
- ✅ CCW = 1
- ✅ PQC Risk Score ≈ 16
- ✅ Risk Class = Low

### Scenario 3: Override Rule - Classical Weakness
**Given:** An asset with:
- SHA1 hash (classical_issues = ["uses_sha1"])
- High business criticality

**Expected:**
- ✅ CCW = 5
- ✅ IMP ≥ 4
- ✅ Risk Class = Critical (override applied)
- ✅ Regardless of computed score

## Cleanup
```bash
# Delete test assets
curl -X DELETE http://localhost:8080/api/assets/$ASSET_ID \
  -H "X-API-Key: dev-api-key-change-in-production"
```

## Continuous Testing

### Pre-Commit Hooks
```bash
# Run before committing
cargo test
cargo clippy -- -D warnings
cd frontend && npm run lint
```

### CI/CD Pipeline
```yaml
# Add to .github/workflows/test.yml
- name: Run Risk Engine Tests
  run: cargo test risk::

- name: Run API Integration Tests
  run: cargo test --test integration

- name: Lint Frontend
  run: cd frontend && npm run lint
```

## Test Automation Script
```bash
#!/bin/bash
# test_pqc_risk.sh

set -e

echo "Running backend unit tests..."
cargo test risk::

echo "Running integration tests..."
# Create test asset
ASSET_ID=$(curl -s -X POST http://localhost:8080/api/assets/manual \
  -H "X-API-Key: dev-api-key-change-in-production" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","asset_type":"tlsendpoint","endpoint_or_path":"test","owner":"test","sensitivity":"confidential","regulatory_tags":[],"exposure_level":"internal","data_lifetime_days":365,"encryption_profile":{}}' \
  | jq -r '.id')

# Update with risk fields
curl -s -X PATCH http://localhost:8080/api/risk/assets/$ASSET_ID \
  -H "X-API-Key: dev-api-key-change-in-production" \
  -H "Content-Type: application/json" \
  -d '{"business_criticality":"critical","algo_pk":"RSA"}' > /dev/null

# Verify risk computed
RISK_SCORE=$(curl -s -H "X-API-Key: dev-api-key-change-in-production" \
  http://localhost:8080/api/risk/assets/$ASSET_ID | jq -r '.pqc_risk_score')

if [ "$RISK_SCORE" != "null" ]; then
  echo "✅ Risk score computed: $RISK_SCORE"
else
  echo "❌ Risk score not computed"
  exit 1
fi

# Cleanup
curl -s -X DELETE http://localhost:8080/api/assets/$ASSET_ID \
  -H "X-API-Key: dev-api-key-change-in-production" > /dev/null

echo "All tests passed!"
```

Make executable:
```bash
chmod +x test_pqc_risk.sh
./test_pqc_risk.sh
```
