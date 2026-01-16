# QuantumVault - Enterprise PQC Asset Protection Platform

A production-ready MVP for discovering, classifying, and protecting cryptographic assets with Post-Quantum Cryptography (PQC). QuantumVault provides enterprises with real hybrid (classical + PQC) cryptographic protection, tamper-evident audit trails, and automated key management.

## Features

### Core Capabilities
- **Real PQC Implementation**: Uses NIST-standardized algorithms (Kyber, Dilithium, Falcon, SPHINCS+)
- **Hybrid Cryptography**: Combines classical (X25519, Ed25519) with PQC for defense-in-depth
- **Asset Discovery**: Automated TLS endpoint discovery and manual asset registration
- **Risk Classification**: Automated risk scoring based on sensitivity, exposure, and data lifetime
- **Protection Jobs**: Asynchronous job engine for applying PQC protection policies
- **Tamper-Evident Audit**: Hash-chained audit log prevents tampering and provides compliance trails
- **Key Management**: Automated key wrapping, rotation, and secure storage

### Technical Stack
- **Backend**: Rust (Axum web framework, SQLx for PostgreSQL)
- **Frontend**: React + TypeScript SPA
- **Database**: PostgreSQL with enforced audit immutability
- **Cryptography**: 
  - PQC: Kyber (KEM), Dilithium/Falcon/SPHINCS+ (signatures)
  - Classical: X25519 (ECDH), Ed25519 (signatures)
  - Symmetric: AES-256-GCM, ChaCha20-Poly1305
- **Deployment**: Docker + Docker Compose

## Quick Start

### ⚡ Fastest Way (Recommended)

```bash
# Start all services with one command
./start.sh

# Check status
./status.sh

# Open browser
open http://localhost:5173
```

**That's it!** The script will automatically start PostgreSQL, backend, and frontend.

See [SCRIPTS.md](./SCRIPTS.md) for detailed documentation of all management scripts.

### Prerequisites
- Docker and Docker Compose
- Rust 1.75+ (for backend)
- Node.js 18+ (for frontend)

### Manual Setup

#### 1. Clone and Setup

```bash
cd /Users/rickglenn/Downloads/dytallix-main/quantumvault

# Copy environment configuration
cp .env.example .env

# IMPORTANT: Change these values in .env for production:
# - MASTER_ENCRYPTION_KEY (generate with: openssl rand -hex 32)
# - API_KEY (generate with: openssl rand -hex 32)
```

#### 2. Option A: Start with Docker Compose (Full Stack)

```bash
# Build and start all services
docker-compose up --build

# Or run in detached mode
docker-compose up -d --build
```

This will start:
- **PostgreSQL** on port 5432
- **Backend API** on port 8080
- **Frontend** on port 3000

#### 3. Option B: Start Services Individually (Development)

**Start PostgreSQL:**
```bash
docker-compose up -d postgres
```

**Start Backend:**
```bash
cargo run --release
# Backend runs on http://localhost:8080
```

**Start Frontend:**
```bash
cd frontend
npm install
npm run dev
# Frontend runs on http://localhost:5173
```

### 3. Verify Installation

```bash
# Check health endpoint
curl http://localhost:8080/health

# List default policies (requires API key)
curl -H "X-API-Key: dev-api-key-change-in-production" \
  http://localhost:8080/api/policies
```

### 4. Access the UI

Open your browser to [http://localhost:3000](http://localhost:3000)

## API Usage Examples

### Create an Asset

```bash
curl -X POST http://localhost:8080/api/assets/manual \
  -H "Content-Type: application/json" \
  -H "X-API-Key: dev-api-key-change-in-production" \
  -d '{
    "name": "Production Database",
    "asset_type": "datastore",
    "endpoint_or_path": "postgresql://prod-db:5432/app",
    "owner": "platform-team",
    "sensitivity": "confidential",
    "regulatory_tags": ["HIPAA", "GDPR"],
    "exposure_level": "internal",
    "data_lifetime_days": 2555
  }'
```

### Discover TLS Endpoint

```bash
curl -X POST http://localhost:8080/api/assets/discover/tls \
  -H "Content-Type: application/json" \
  -H "X-API-Key: dev-api-key-change-in-production" \
  -d '{
    "hostname": "api.example.com",
    "port": 443,
    "name": "Public API Endpoint",
    "owner": "api-team",
    "sensitivity": "confidential"
  }'
```

### Apply PQC Protection

```bash
# Get asset ID and policy ID first, then:
curl -X POST http://localhost:8080/api/assets/{ASSET_ID}/apply-policy \
  -H "Content-Type: application/json" \
  -H "X-API-Key: dev-api-key-change-in-production" \
  -d '{
    "policy_id": "{POLICY_ID}"
  }'
```

### Update Asset Classification

```bash
curl -X PATCH http://localhost:8080/api/assets/{ASSET_ID}/classification \
  -H "Content-Type: application/json" \
  -H "X-API-Key: dev-api-key-change-in-production" \
  -d '{
    "owner": "security-team",
    "sensitivity": "secret",
    "regulatory_tags": ["HIPAA", "GDPR", "PCI-DSS"],
    "exposure_level": "publicinternet",
    "data_lifetime_days": 3650
  }'
```

### Query Audit Log

```bash
# Get all audit events for an asset
curl -H "X-API-Key: dev-api-key-change-in-production" \
  "http://localhost:8080/api/audit?asset_id={ASSET_ID}"

# Verify audit chain integrity
curl -H "X-API-Key: dev-api-key-change-in-production" \
  http://localhost:8080/api/audit/chain/verify
```

## Architecture

### Backend Structure

```
quantumvault/src/
├── domain/           # Core business logic, entities
│   ├── asset.rs      # Asset model with risk scoring
│   ├── policy.rs     # Protection policies with validation
│   ├── job.rs        # Protection job lifecycle
│   └── audit.rs      # Tamper-evident audit events
├── infrastructure/   # Technical implementations
│   ├── crypto.rs     # Real PQC + classical crypto engine
│   ├── repository/   # PostgreSQL data access
│   └── config.rs     # Environment configuration
├── application/      # Use cases and orchestration
│   ├── audit_service.rs  # Centralized audit logging
│   └── job_engine.rs     # Async job processor
└── api/              # HTTP REST endpoints
    ├── asset_handlers.rs
    ├── policy_handlers.rs
    ├── job_handlers.rs
    └── audit_handlers.rs
```

### Key Design Decisions

1. **Real Cryptography**: All PQC operations use production-grade libraries (pqcrypto crate with NIST algorithms)
2. **Hybrid Security**: Every operation combines classical + PQC for quantum-resistant protection today
3. **Immutable Audit**: PostgreSQL triggers prevent audit log tampering; hash-chain provides cryptographic verification
4. **Async Job Engine**: Background worker polls for pending jobs and executes protection operations
5. **Type Safety**: Strongly-typed domain models with compile-time guarantees

## Development

### Backend Development

```bash
cd /Users/rickglenn/Downloads/dytallix-main/quantumvault

# Run tests
cargo test

# Run with auto-reload
cargo watch -x run

# Check for issues
cargo clippy
```

### Frontend Development

```bash
cd frontend

# Install dependencies
npm install

# Start dev server with hot reload
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

### Database Migrations

Migrations run automatically on startup. To add new migrations:

```bash
# Create new migration
mkdir migrations
# Add SQL file: migrations/002_your_migration.sql
```

## Testing

### Unit Tests

```bash
# Run all backend tests
cargo test

# Run specific module tests
cargo test domain::asset::tests
cargo test infrastructure::crypto::tests
```

### Integration Tests

```bash
# Start test environment
docker-compose up -d postgres

# Run integration tests
cargo test --test '*'
```

### API Testing

```bash
# Use provided example curl commands in this README
# Or use tools like Postman, Insomnia with API key header
```

## Security Considerations

### Production Deployment Checklist

1. **Change Default Secrets**:
   ```bash
   # Generate new master encryption key (32 bytes)
   openssl rand -hex 32
   
   # Generate new API key
   openssl rand -hex 32
   ```

2. **Environment Variables**: Never commit `.env` file to version control

3. **Database Security**:
   - Use strong PostgreSQL passwords
   - Enable SSL/TLS for database connections
   - Restrict network access to DB port

4. **API Security**:
   - Rotate API keys regularly
   - Use HTTPS in production (add reverse proxy like Nginx)
   - Implement rate limiting

5. **Audit Integrity**:
   - Regularly verify audit chain: `GET /api/audit/chain/verify`
   - Monitor for verification failures
   - Back up audit logs to immutable storage

6. **Key Management**:
   - Master encryption key should be stored in HSM or cloud KMS for production
   - Implement key rotation policy
   - Secure backup and recovery procedures

## Default Protection Policies

The system includes four pre-configured policies:

1. **Hybrid Kyber768 + Dilithium3** (Recommended)
   - Production-grade hybrid PQC
   - 180-day rotation
   - AES-256-GCM symmetric encryption

2. **Hybrid Kyber1024 + Dilithium5**
   - Maximum security
   - 90-day rotation
   - Best for highly sensitive assets

3. **PQC Kyber768 + Falcon512**
   - Pure PQC with compact signatures
   - 180-day rotation
   - ChaCha20-Poly1305 encryption

4. **Classical X25519 + Ed25519**
   - Baseline for comparison
   - 365-day rotation
   - Traditional cryptography only

## Monitoring and Observability

### Health Check

```bash
curl http://localhost:8080/health
```

### Logs

```bash
# View backend logs
docker-compose logs -f backend

# View job engine activity
docker-compose logs -f backend | grep "job_engine"
```

### Metrics

Monitor these key metrics:
- Pending job queue depth
- Job success/failure rates
- Asset risk score distribution
- Audit chain verification status
- API response times

## Troubleshooting

### Database Connection Issues

```bash
# Check PostgreSQL is running
docker-compose ps postgres

# View database logs
docker-compose logs postgres

# Test connection
docker-compose exec postgres psql -U quantumvault -d quantumvault -c "SELECT 1;"
```

### Job Engine Not Processing

```bash
# Check job engine logs
docker-compose logs backend | grep -i "job engine"

# Verify pending jobs exist
curl -H "X-API-Key: dev-api-key-change-in-production" \
  "http://localhost:8080/api/jobs"
```

### Frontend Can't Connect to Backend

```bash
# Ensure backend is running
curl http://localhost:8080/health

# Check frontend configuration
cat frontend/vite.config.ts
# Proxy should point to http://localhost:8080
```

## Contributing

This is an MVP implementation. Future enhancements:

- [ ] Additional asset discovery methods (AWS KMS, Azure Key Vault)
- [ ] Certificate generation and signing with hybrid keys
- [ ] Automated rotation scheduling
- [ ] Multi-tenancy support
- [ ] RBAC for API access
- [ ] Prometheus metrics export
- [ ] OpenTelemetry tracing

## License

Copyright © 2025 Dytallix. All rights reserved.

## Support

For questions or issues:
- File GitHub issues
- Review audit logs for security events
- Check documentation in `/docs` directory
