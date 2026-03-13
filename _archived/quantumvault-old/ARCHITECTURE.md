# QuantumVault Architecture & Implementation Details

## System Overview

QuantumVault is a production-ready enterprise platform for discovering, classifying, and protecting cryptographic assets with Post-Quantum Cryptography (PQC). The system is designed to be self-hosted on-premises or in private VPCs.

## Architecture Layers

### 1. Domain Layer (`src/domain/`)

Pure business logic with no external dependencies.

**Key Entities:**

- **Asset** (`asset.rs`): Represents a cryptographic asset
  - Types: TLS endpoints, certificates, data stores, key material, API endpoints
  - Properties: name, type, endpoint, owner, sensitivity, exposure, risk score
  - Risk scoring algorithm: `risk_score = (sensitivity * 10 + exposure * 5) * lifetime_multiplier`
  
- **ProtectionPolicy** (`policy.rs`): Defines how to protect assets
  - Modes: Classical, PQC, Hybrid
  - Algorithms: KEM (Kyber), Signatures (Dilithium, Falcon, SPHINCS+), Symmetric (AES-GCM, ChaCha20)
  - Validation: Ensures algorithm compatibility with mode
  
- **ProtectionJob** (`job.rs`): Represents async protection work
  - States: Pending → Running → Success/Failed
  - Tracks which policy to apply to which asset
  
- **AuditEvent** (`audit.rs`): Tamper-evident log entry
  - Hash chain: `current_hash = SHA3-256(prev_hash || event_data)`
  - Immutable: Cannot be updated or deleted

### 2. Infrastructure Layer (`src/infrastructure/`)

Technical implementations of domain concepts.

**CryptoEngine** (`crypto.rs`):
- **Real PQC Implementation** using `pqcrypto` crates
- **Kyber KEM**: Key encapsulation for shared secret generation
  - Kyber512, Kyber768, Kyber1024 variants
- **Dilithium Signatures**: Digital signatures for authentication
  - Dilithium2, Dilithium3, Dilithium5 variants
- **Falcon Signatures**: Compact lattice-based signatures
  - Falcon512, Falcon1024
- **SPHINCS+**: Stateless hash-based signatures for maximum security
- **Hybrid Operations**: Combines X25519 + Kyber for KEM, Ed25519 + Dilithium for signatures
- **Data Key Wrapping**: Uses hybrid KEM to protect symmetric data keys
  - Derives shared secret from both PQC and classical KEM
  - XORs secrets for combined key
  - Encrypts data key with AES-256-GCM or ChaCha20-Poly1305

**Repositories** (`repository/`):
- PostgreSQL-backed implementations
- **AssetRepository**: CRUD + search with filters
- **PolicyRepository**: Policy management with defaults
- **JobRepository**: Job queue with pending batch retrieval
- **AuditRepository**: Append-only audit log with chain verification

**Database Schema** (`migrations/001_init.sql`):
- Custom enums for type safety (asset_type, sensitivity_level, etc.)
- Audit immutability enforced via triggers
- Indexes for performance on common queries
- Foreign key constraints for referential integrity

### 3. Application Layer (`src/application/`)

Use cases and business workflows.

**AuditService** (`audit_service.rs`):
- Centralized audit logging for all domain actions
- Fetches previous hash from repository
- Computes new hash including previous
- Prevents tampering through cryptographic chaining

**JobEngine** (`job_engine.rs`):
- Async background worker
- Polls database for pending jobs every N seconds (configurable)
- Executes protection based on asset type:
  - **Data Assets**: Generates and wraps data keys with hybrid KEM
  - **TLS Assets**: Generates hybrid keypair (classical + PQC)
  - **API Assets**: Creates signature keys for API authentication
- Updates asset encryption profile with protection details
- Logs all operations to audit trail

### 4. API Layer (`src/api/`)

HTTP REST interface.

**Authentication** (`middleware.rs`):
- API key in `X-API-Key` header
- Configurable via environment variable
- Actor tracking for audit purposes

**Handlers**:
- **AssetHandlers**: Create manual, discover TLS, list, get, update classification
- **PolicyHandlers**: List policies, get policy, create custom policy
- **JobHandlers**: Apply policy to asset, check job status, list jobs
- **AuditHandlers**: Query audit log with filters, verify chain integrity

**Error Handling**:
- HTTP status codes: 200 OK, 201 Created, 400 Bad Request, 404 Not Found, 500 Server Error
- JSON error responses with descriptive messages

## Data Flow Examples

### Creating and Protecting an Asset

```
1. Client → POST /api/assets/manual
2. API validates request
3. Domain creates Asset with computed risk_score
4. Repository persists to database
5. AuditService logs "asset.created" event
6. Response sent to client

7. Client → POST /api/assets/{id}/apply-policy
8. API validates asset exists and policy compatible
9. Domain creates ProtectionJob (status: Pending)
10. Repository persists job
11. Response sent to client

[Background: JobEngine polls database]
12. JobEngine retrieves pending job
13. Updates job status to Running
14. AuditService logs "job.started"
15. CryptoEngine generates keys based on policy
16. Repository stores wrapped keys in data_keys table
17. Updates asset encryption_profile
18. JobEngine marks job Success
19. AuditService logs "job.completed"
```

### Audit Chain Verification

```
1. Client → GET /api/audit/chain/verify
2. AuditRepository fetches ALL events ordered by created_at ASC
3. For each event:
   - Verify event.current_hash = SHA3-256(prev_hash || event_data)
   - Verify event.prev_hash == previous_event.current_hash
4. Return {valid: true/false, total_events, message}
```

## Cryptographic Details

### Hybrid Key Encapsulation

```rust
// Generate PQC keypair (Kyber)
(pqc_pk, pqc_sk) = kyber768::keypair()

// Generate classical keypair (X25519)
classical_sk = X25519::random()
classical_pk = X25519::public_from(classical_sk)

// Encapsulation (sender side)
(pqc_ct, pqc_ss) = kyber768::encapsulate(pqc_pk)
classical_ephemeral_sk = X25519::random()
classical_ephemeral_pk = X25519::public_from(classical_ephemeral_sk)
classical_ss = X25519::dh(classical_sk, classical_ephemeral_pk)

// Combine secrets
combined_key = pqc_ss XOR classical_ss

// Decapsulation (receiver side)
pqc_ss' = kyber768::decapsulate(pqc_ct, pqc_sk)
classical_ss' = X25519::dh(classical_sk, classical_ephemeral_pk)
combined_key' = pqc_ss' XOR classical_ss'
```

### Data Key Wrapping

```rust
// Generate random data encryption key
data_key = random(32 bytes)

// Derive combined key from hybrid KEM
combined_key = hybrid_kem_encapsulate()

// Wrap data key
cipher = AES-256-GCM(combined_key)
nonce = random(12 bytes)
wrapped_key = cipher.encrypt(nonce, data_key)

// Store: wrapped_key, nonce, pqc_ciphertext, classical_ciphertext
```

### Audit Hash Chain

```rust
// Genesis event
event1.prev_hash = "genesis"
event1.current_hash = SHA3-256(event1.id || event1.type || ... || "genesis" || timestamp)

// Subsequent events
event2.prev_hash = event1.current_hash
event2.current_hash = SHA3-256(event2.id || event2.type || ... || event1.current_hash || timestamp)

// Verification
for each event:
    computed_hash = SHA3-256(event fields)
    if computed_hash != event.current_hash:
        return INVALID
    if event.prev_hash != previous_event.current_hash:
        return INVALID
return VALID
```

## Security Considerations

### Defense in Depth

1. **Hybrid Cryptography**: Even if quantum computers break one component, classical crypto still protects
2. **Master Key Encryption**: All secrets encrypted at rest with master key from environment
3. **Audit Immutability**: PostgreSQL triggers prevent modification of audit logs
4. **Hash Chain Integrity**: Cryptographic proof of log tampering
5. **API Key Authentication**: Simple but effective for MVP; extend with OAuth2/JWT for production

### Key Management

- **Master Encryption Key**: 32-byte key for encrypting secrets at rest
  - Should be stored in HSM or cloud KMS for production
  - Rotated periodically with re-encryption of existing keys
- **Data Keys**: Per-asset symmetric keys, wrapped with hybrid KEM
- **Asymmetric Keys**: PQC + classical keypairs for TLS and API protection

### Attack Surface

- **Database**: Only accessible from backend service container
- **API**: Requires valid API key, rate limiting recommended
- **Secrets**: Never logged or exposed in responses
- **Audit Log**: Append-only, tamper-evident

## Performance Characteristics

### PQC Algorithm Performance

- **Kyber768**: ~1ms for keygen, encap, decap (fast KEM)
- **Dilithium3**: ~5ms for keygen, ~10ms for sign, ~5ms for verify
- **Falcon512**: ~100ms for keygen (one-time), fast sign/verify
- **SPHINCS+**: Slow keygen and sign, fast verify (hash-based)

### Job Engine Throughput

- Default: 10 jobs per batch, 5-second poll interval
- Expected: ~120 jobs/minute sustained
- Bottleneck: PQC operations, especially key generation
- Optimization: Parallel job processing, pre-generated key pools

### Database Queries

- Indexed queries: <10ms typical
- Asset list with filters: <50ms for 1000s of assets
- Audit chain verification: O(n) where n = total events (~1ms per event)

## Testing Strategy

### Unit Tests

Located in each module:
- `src/domain/*/tests`: Risk scoring, validation logic
- `src/infrastructure/crypto.rs tests`: KEM, signing, wrapping round-trips
- `src/domain/audit.rs tests`: Hash chain computation and verification

### Integration Tests

Located in `tests/`:
- End-to-end asset lifecycle
- Policy application and job execution
- Audit integrity with simulated tampering

### Running Tests

```bash
# All tests
cargo test

# Specific module
cargo test domain::asset

# With output
cargo test -- --nocapture

# Integration only
cargo test --test '*'
```

## Deployment Patterns

### Single-Host Development

```bash
docker-compose up
```

- All services on one machine
- Suitable for development and demos

### Production Deployment

1. **Separate Database Host**: 
   - Managed PostgreSQL (AWS RDS, Azure Database, etc.)
   - Automated backups and point-in-time recovery

2. **Load-Balanced Backend**:
   - Multiple backend instances behind load balancer
   - Shared database connection pool

3. **Job Engine Scalability**:
   - Multiple job engine workers (set `JOB_BATCH_SIZE` appropriately)
   - Database-level job locking prevents duplicate processing

4. **Secrets Management**:
   - Master key from AWS Secrets Manager, Azure Key Vault, or HashiCorp Vault
   - API keys from environment or secret store

5. **Observability**:
   - Export logs to centralized logging (ELK, Splunk)
   - Metrics to Prometheus/Grafana
   - Distributed tracing with OpenTelemetry

### High Availability

- **Backend**: Stateless, scale horizontally
- **Database**: PostgreSQL replication (primary + replicas)
- **Job Engine**: Multiple workers with database-coordinated job claiming
- **Frontend**: CDN + multiple instances

## Monitoring and Alerting

### Key Metrics

- `quantumvault_jobs_pending`: Gauge of pending job queue depth
- `quantumvault_jobs_completed_total`: Counter of successful jobs
- `quantumvault_jobs_failed_total`: Counter of failed jobs
- `quantumvault_api_requests_total`: Counter by endpoint and status
- `quantumvault_audit_chain_valid`: Boolean gauge of last verification
- `quantumvault_crypto_operations_duration`: Histogram of crypto op times

### Alerts

- Job queue depth > threshold (backlog)
- Job failure rate > X%
- Audit chain verification failure (CRITICAL - possible tampering)
- API error rate spike
- Database connection failures

## Future Enhancements

### Phase 2

- [ ] Certificate generation and signing with hybrid keys
- [ ] Automated key rotation based on policy intervals
- [ ] Integration with cloud KMS (AWS, Azure, GCP)
- [ ] RBAC with multiple API keys and permissions

### Phase 3

- [ ] Multi-tenancy support
- [ ] Webhook notifications for job completion
- [ ] Scheduled protection jobs (cron-like)
- [ ] Asset dependency tracking

### Phase 4

- [ ] Automated discovery agents (AWS, Azure, Kubernetes)
- [ ] Compliance reporting (HIPAA, GDPR, PCI-DSS)
- [ ] Incident response playbooks
- [ ] Integration with SIEM systems

## References

- NIST PQC Standardization: https://csrc.nist.gov/projects/post-quantum-cryptography
- Kyber: https://pq-crystals.org/kyber/
- Dilithium: https://pq-crystals.org/dilithium/
- Falcon: https://falcon-sign.info/
- SPHINCS+: https://sphincs.org/
- pqcrypto crate: https://github.com/rustpq/pqcrypto
