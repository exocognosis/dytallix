# Quick Start: PQC Risk Classification

## Prerequisites

1. QuantumVault backend running on `http://localhost:8080`
2. QuantumVault frontend running on `http://localhost:5173`
3. PostgreSQL database with migrations applied

## Step 1: Apply Database Migration

```bash
cd /Users/rickglenn/Downloads/dytallix-main/quantumvault
sqlx migrate run
```

This will create:
- New PQC risk enum types
- New columns on the `assets` table
- `risk_weight_profiles` table
- Necessary indices

## Step 2: Start the Backend

```bash
cd /Users/rickglenn/Downloads/dytallix-main/quantumvault
cargo run
```

The backend will now expose the new risk API endpoints:
- `GET /api/risk/assets`
- `GET /api/risk/assets/:id`
- `PATCH /api/risk/assets/:id`
- `GET /api/risk/summary`
- `GET /api/risk/weights`

## Step 3: Start the Frontend

```bash
cd /Users/rickglenn/Downloads/dytallix-main/quantumvault/frontend
npm run dev
```

## Step 4: Access the PQC Risk Dashboard

1. Open browser to `http://localhost:5173`
2. Click **"PQC Risk"** in the top navigation
3. You should see the PQC Risk Dashboard with:
   - Summary cards (Total Assets, Critical, High, Medium, Low, Avg Score)
   - Risk distribution visualization
   - Asset table with filtering

## Step 5: Create Sample Assets with Risk Data

Use the API or UI to create assets with PQC risk fields populated:

```bash
curl -X POST http://localhost:8080/api/assets/manual \
  -H "X-API-Key: dev-api-key-change-in-production" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production API Server",
    "asset_type": "tlsendpoint",
    "endpoint_or_path": "https://api.example.com",
    "owner": "platform-team",
    "sensitivity": "confidential",
    "regulatory_tags": ["PCI-DSS", "SOC2"],
    "exposure_level": "publicinternet",
    "data_lifetime_days": 1825,
    "encryption_profile": {
      "protected": false
    }
  }'
```

Then update with risk fields:

```bash
curl -X PATCH http://localhost:8080/api/risk/assets/ASSET_ID \
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
  }'
```

The backend will automatically:
- Compute all 6 risk dimensions (AQV, DLV, IMP, EXP, AGI, CCW)
- Calculate the composite PQC risk score (0-100)
- Assign a risk class (Low/Medium/High/Critical)

## Step 6: Explore the Dashboard

### Dashboard Features:
- **Filter by Risk Class**: Use dropdown to show only Critical, High, Medium, or Low risk assets
- **Filter by Environment**: Filter for prod or non-prod assets
- **Search**: Type to search asset names or owners
- **Sort**: Click column headers to sort (risk score default)
- **View Detail**: Click any row or "View Details" button

### Asset Detail Features:
- **Risk Score Gauge**: Visual 0-100 score with color coding
- **Risk Dimensions**: Six cards showing each dimension score (0-5) with explanations
- **Asset Metadata**: Complete asset information
- **Navigation**: Back button to return to dashboard

## Example Scenarios

### High-Risk Asset
```json
{
  "environment": "prod",
  "business_criticality": "critical",
  "crypto_usage": "pki_root",
  "algo_pk": "RSA",
  "pk_key_bits": 2048,
  "exposure_type": "internet",
  "stores_long_lived_data": true,
  "data_sensitivity": "regulated",
  "crypto_agility": "low",
  "classical_issues": ["rsa_keylen_2048"]
}
```
Expected: **PQC Risk Score: 80-90, Risk Class: Critical**

### Low-Risk Asset
```json
{
  "environment": "non-prod",
  "business_criticality": "low",
  "crypto_usage": "channel",
  "algo_pk": "None",
  "algo_sym": "AES",
  "sym_key_bits": 256,
  "exposure_type": "internal",
  "stores_long_lived_data": false,
  "data_sensitivity": "internal",
  "crypto_agility": "high",
  "classical_issues": []
}
```
Expected: **PQC Risk Score: 15-25, Risk Class: Low**

## Testing API Endpoints

### Get Risk Summary
```bash
curl -H "X-API-Key: dev-api-key-change-in-production" \
  http://localhost:8080/api/risk/summary
```

### List All Risk Assets
```bash
curl -H "X-API-Key: dev-api-key-change-in-production" \
  http://localhost:8080/api/risk/assets
```

### Filter Critical Assets
```bash
curl -H "X-API-Key: dev-api-key-change-in-production" \
  "http://localhost:8080/api/risk/assets?risk_class=Critical"
```

### Get Single Asset Detail
```bash
curl -H "X-API-Key: dev-api-key-change-in-production" \
  http://localhost:8080/api/risk/assets/ASSET_ID
```

## Troubleshooting

### "No assets found"
- Create assets via `/api/assets/manual` endpoint
- Update them with risk fields via `/api/risk/assets/:id`

### "Risk scores not computed"
- Ensure risk fields are populated (especially: business_criticality, crypto_usage, algo_pk, exposure_type, data_sensitivity)
- PATCH the asset to trigger recomputation

### Migration fails
- Check PostgreSQL is running
- Verify DATABASE_URL in .env
- Ensure no existing tables conflict

### Frontend shows errors
- Verify backend is running on port 8080
- Check API_KEY matches between frontend and backend
- Open browser console for detailed errors

## Next Steps

1. **Integrate with Scanners**: Auto-populate risk fields from TLS/SSH scans
2. **Set Up Alerts**: Create notifications for Critical/High risk assets
3. **Create Weight Profiles**: Define sector-specific risk weights
4. **Historical Tracking**: Track risk score changes over time
5. **Compliance Reports**: Generate PDF reports for audits

## Support

For issues or questions:
- Review `PQC_RISK_CLASSIFICATION.md` for detailed documentation
- Check `PQC_RISK_IMPLEMENTATION_SUMMARY.md` for architecture overview
- Examine unit tests in `src/risk/engine.rs` for expected behavior
