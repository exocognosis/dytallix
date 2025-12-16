# QuantumVault API Documentation

## Base URL

```
http://localhost:3000/api/v1
```

## Authentication

All endpoints (except `/auth/login`) require JWT authentication via Bearer token:

```
Authorization: Bearer <your_jwt_token>
```

## Authentication Endpoints

### POST /auth/login
Login with email and password.

**Request:**
```json
{
  "email": "admin@quantumvault.local",
  "password": "QuantumVault2024!"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "admin@quantumvault.local",
    "role": "ADMIN"
  }
}
```

### GET /auth/me
Get current user profile.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "id": "uuid",
  "email": "admin@quantumvault.local",
  "role": "ADMIN",
  "createdAt": "2024-12-16T14:00:00.000Z",
  "lastLoginAt": "2024-12-16T14:30:00.000Z"
}
```

### POST /auth/logout
Invalidate current session.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

## Scan Management

### GET /scans/targets
List all scan targets.

**Query Parameters:**
- None

**Response:** Array of target objects

### POST /scans/targets
Create a new scan target.

**Request:**
```json
{
  "name": "Production API",
  "type": "TLS_ENDPOINT",
  "host": "api.example.com",
  "port": 443,
  "protocol": "https"
}
```

### POST /scans/trigger/:targetId
Trigger a scan for a specific target.

**Parameters:**
- `targetId` (path): UUID of the target

**Response:**
```json
{
  "id": "scan-uuid",
  "targetId": "target-uuid",
  "status": "PENDING",
  "createdAt": "2024-12-16T14:00:00.000Z"
}
```

### GET /scans/status/:scanId
Get scan status and results.

**Parameters:**
- `scanId` (path): UUID of the scan

**Response:**
```json
{
  "id": "scan-uuid",
  "status": "COMPLETED",
  "startedAt": "2024-12-16T14:00:00.000Z",
  "completedAt": "2024-12-16T14:00:05.000Z",
  "scanAssets": [...]
}
```

### GET /scans/history
Get scan history.

**Query Parameters:**
- `targetId` (optional): Filter by target

**Response:** Array of scan objects

## Asset Management

### GET /assets
List assets with optional filters.

**Query Parameters:**
- `status`: Filter by status (DISCOVERED, ASSESSED, WRAPPED_PQC, ATTESTED)
- `riskLevel`: Filter by risk level (LOW, MEDIUM, HIGH, CRITICAL)
- `type`: Filter by asset type
- `search`: Search by name or fingerprint

**Response:** Array of asset objects

### GET /assets/:id
Get detailed asset information.

**Parameters:**
- `id` (path): UUID of the asset

**Response:**
```json
{
  "id": "asset-uuid",
  "name": "example.com:443",
  "type": "TLS_CERTIFICATE",
  "status": "DISCOVERED",
  "riskLevel": "HIGH",
  "riskScore": 75,
  "fingerprint": "sha256:...",
  "scanAssets": [...],
  "wrappingResults": [...],
  "attestations": [...]
}
```

### PUT /assets/:id/metadata
Update asset metadata.

**Request:**
```json
{
  "name": "Updated name",
  "exposure": "PUBLIC",
  "sensitivity": "HIGH",
  "criticality": "CRITICAL",
  "metadata": {
    "owner": "Security Team"
  }
}
```

### POST /assets/:id/key-material
Ingest key material for an asset.

**Request:**
```json
{
  "keyMaterial": "<base64-encoded-data>",
  "keyType": "PRIVATE_KEY"
}
```

**Note:** Maximum size 10MB. Payload is never logged.

### POST /assets/bulk-action
Perform bulk operations on assets.

**Request:**
```json
{
  "assetIds": ["uuid1", "uuid2"],
  "action": "wrap",
  "params": {}
}
```

## Policy Management

### GET /policies
List all policies.

**Response:** Array of policy objects

### POST /policies
Create a new policy.

**Request:**
```json
{
  "name": "High Risk Wrapping Policy",
  "description": "Automatically wrap high-risk assets",
  "ruleDefinition": {
    "riskLevel": ["HIGH", "CRITICAL"],
    "status": ["DISCOVERED"]
  },
  "targetScope": {
    "types": ["TLS_CERTIFICATE"]
  },
  "priority": 10
}
```

### POST /policies/:id/activate
Activate a policy.

### POST /policies/:id/deactivate
Deactivate a policy.

### POST /policies/:id/evaluate
Evaluate a policy against current assets.

**Response:**
```json
{
  "policyId": "policy-uuid",
  "evaluated": 100,
  "matched": 25
}
```

## PQC Anchor Management

### GET /anchors
List all PQC anchors.

**Response:** Array of anchor objects

### POST /anchors
Create a new PQC anchor.

**Request:**
```json
{
  "name": "Production Anchor",
  "algorithm": "Kyber1024"
}
```

**Response:**
```json
{
  "id": "anchor-uuid",
  "name": "Production Anchor",
  "algorithm": "Kyber1024",
  "isActive": true,
  "vaultKeyPath": "quantumvault/anchors/...",
  "createdAt": "2024-12-16T14:00:00.000Z"
}
```

### POST /anchors/:id/rotate
Rotate anchor keys (creates new keypair, preserves old for decryption).

### POST /anchors/:id/activate
Activate an anchor.

## PQC Wrapping

### POST /wrapping/wrap
Wrap a single asset.

**Request:**
```json
{
  "assetId": "asset-uuid",
  "anchorId": "anchor-uuid"
}
```

**Response:**
```json
{
  "id": "job-uuid",
  "totalAssets": 1,
  "status": "PENDING"
}
```

### POST /wrapping/bulk-wrap-by-policy/:policyId
Wrap all assets matching a policy.

**Parameters:**
- `policyId` (path): UUID of the policy

**Response:**
```json
{
  "id": "job-uuid",
  "policyId": "policy-uuid",
  "totalAssets": 50,
  "status": "PENDING"
}
```

### GET /wrapping/job-status/:jobId
Get wrapping job status.

**Parameters:**
- `jobId` (path): UUID of the job

**Response:**
```json
{
  "id": "job-uuid",
  "status": "IN_PROGRESS",
  "totalAssets": 50,
  "completedAssets": 25,
  "wrappingResults": [...]
}
```

## Blockchain Attestation

### POST /attestation/create-job
Create a new attestation job.

**Request:**
```json
{
  "assetIds": ["uuid1", "uuid2", "uuid3"]
}
```

**Response:**
```json
{
  "id": "job-uuid",
  "totalAssets": 3,
  "status": "PENDING"
}
```

### GET /attestation/job-status/:jobId
Get attestation job status.

**Response:**
```json
{
  "id": "job-uuid",
  "status": "COMPLETED",
  "totalAssets": 3,
  "attestations": [
    {
      "id": "attestation-uuid",
      "assetId": "asset-uuid",
      "attestationHash": "0x...",
      "txHash": "0x...",
      "blockNumber": 12345,
      "status": "SUBMITTED"
    }
  ]
}
```

### GET /attestation/asset/:assetId
Get all attestations for an asset.

**Parameters:**
- `assetId` (path): UUID of the asset

**Response:** Array of attestation objects

## Dashboard & Analytics

### GET /dashboard/kpis
Get key performance indicators.

**Response:**
```json
{
  "totalAssets": 150,
  "discoveredAssets": 100,
  "wrappedAssets": 40,
  "attestedAssets": 30,
  "criticalRiskAssets": 15,
  "highRiskAssets": 35,
  "mediumRiskAssets": 60,
  "lowRiskAssets": 40,
  "avgRiskScore": 62.5,
  "pqcCompliantPercent": 12.5,
  "recentScans": 10,
  "migrationProgress": {
    "total": 150,
    "discovered": 100,
    "wrapped": 40,
    "attested": 30,
    "percentComplete": 46.7
  }
}
```

### GET /dashboard/trends
Get historical trend data.

**Query Parameters:**
- `days`: Number of days (default: 30)

**Response:** Array of snapshot objects with timestamps

### GET /dashboard/migration-timeline
Get per-asset migration timeline.

**Response:**
```json
[
  {
    "assetId": "uuid",
    "assetName": "example.com:443",
    "discoveredAt": "2024-11-16T14:00:00.000Z",
    "scannedAt": "2024-11-16T14:05:00.000Z",
    "wrappedAt": "2024-11-20T10:00:00.000Z",
    "attestedAt": "2024-11-20T10:30:00.000Z",
    "status": "ATTESTED",
    "riskLevel": "MEDIUM"
  }
]
```

### POST /dashboard/snapshot
Capture current snapshot for trend analysis.

**Response:**
```json
{
  "id": "snapshot-uuid",
  "timestamp": "2024-12-16T14:00:00.000Z",
  "totalAssets": 150,
  "wrappedAssets": 40,
  "attestedAssets": 30,
  ...
}
```

## Blockchain Status

### GET /blockchain/status
Check blockchain service availability.

**Response:**
```json
{
  "available": true
}
```

## Error Responses

All endpoints may return the following error codes:

### 400 Bad Request
Invalid request parameters.

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```

### 401 Unauthorized
Missing or invalid authentication token.

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### 403 Forbidden
Insufficient permissions.

```json
{
  "statusCode": 403,
  "message": "Forbidden resource"
}
```

### 404 Not Found
Resource not found.

```json
{
  "statusCode": 404,
  "message": "Not Found"
}
```

### 500 Internal Server Error
Server error.

```json
{
  "statusCode": 500,
  "message": "Internal server error"
}
```

## Rate Limiting

Currently not implemented. Future versions will include rate limiting.

## WebSocket Support

Not currently supported. All endpoints use REST.

## OpenAPI Specification

Full OpenAPI 3.0 specification available at:
- `backend/dist/openapi.json`

Can be imported into Postman, Swagger UI, or any OpenAPI-compatible tool.

## SDK / Client Libraries

JavaScript/TypeScript client:
- See `frontend/src/lib/api.ts` for reference implementation
- Uses axios with interceptors for authentication

## Support

For API support or questions:
- GitHub Issues: https://github.com/HisMadRealm/dytallix/issues
- Email: support@quantumvault.local
