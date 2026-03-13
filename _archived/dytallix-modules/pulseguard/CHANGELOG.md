# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2024-01-15 - MVP Release

### Added

#### 🚀 MVP Core Features
- **Real-time scoring API** with FastAPI and <100ms P95 latency target
- **Hybrid ML ensemble** combining IsolationForest (unsupervised) + LightGBM (supervised)
- **Live data connectors** for Ethereum mempool (WebSocket) and finalized blocks (RPC)
- **Graph analytics** with address-contract DAG and structural features (k-hop, cycles, centrality)
- **Domain detectors** for flash loans, mint/burn events, and bridge sequences
- **Security layer** with HMAC validation, Ed25519 signing, and PQC stubs

#### 📊 Data & Features
- **Temporal feature engine** with rolling aggregates and burst detection
- **Structural features** from transaction graph (k-hop neighbors, cycles, centrality)
- **Feature store** with Parquet I/O and versioned snapshots
- **Sliding window data management** with configurable retention periods

#### 🔧 Infrastructure  
- **Configuration system** using Pydantic Settings with environment variables
- **Telemetry integration** with Prometheus metrics and OpenTelemetry tracing
- **Health checks** and system status endpoints
- **Request/response middleware** with timing and security validation

#### 🛡️ Security
- **HMAC-SHA256 request validation** with configurable keys
- **Ed25519 response signing** for integrity verification
- **Post-quantum cryptography stubs** for future quantum-safe algorithms
- **Request ID tracing** for debugging and audit trails

#### 🎯 Detection Capabilities
- **Flash loan detection** using burst patterns and repay signatures
- **Mint/burn monitoring** with statistical spike detection
- **Bridge sequence analysis** for cross-chain transfer patterns
- **Graph anomaly detection** using connectivity and cycle analysis
- **Temporal anomaly detection** with burstiness and rate analysis

#### 📈 Monitoring & Observability
- **Prometheus metrics** for latency, throughput, and model performance
- **OpenTelemetry tracing** with distributed trace correlation
- **Structured logging** with reason codes and metadata
- **Performance benchmarking** tools and latency testing

#### 🧪 Testing & Quality
- **Unit tests** for all core components (graph, detectors, models)
- **Integration tests** for API endpoints and workflows
- **Performance tests** for latency validation
- **Fixtures and test data** for deterministic testing

#### 📚 Documentation
- **API documentation** with OpenAPI specification and examples
- **Operations guide** with deployment and scaling instructions
- **Security guide** with authentication and compliance information
- **Developer documentation** with architecture and design decisions

### Technical Implementation

#### API Endpoints
- `POST /score` - Score transactions with sub-100ms latency
- `GET /healthz` - System health checks
- `GET /status` - Detailed system status
- `GET /metrics` - Prometheus metrics export
- `GET /config` - Configuration information

#### Reason Codes
- **Flash Loan**: `PG.FLASH.CHAINBURST.K1`, `PG.FLASH.VOLSPIKE.K1`, `PG.FLASH.REPAY.K1`
- **Mint/Burn**: `PG.MINT.SPIKE.K1`, `PG.BURN.SPIKE.K1`, `PG.MINT.COORDINATED.K1`
- **Bridge**: `PG.BRIDGE.SEQ.K2`, `PG.BRIDGE.HOPS.K1`, `PG.BRIDGE.HIGHVAL.K1`
- **Graph**: `PG.GRAPH.CYCLE.K1`, `PG.GRAPH.HIGHCONN.K1`
- **Models**: `PG.MODEL.IF.HIGH`, `PG.MODEL.GBDT.HIGH`
- **Ensemble**: `PG.ENSEMBLE.ANOMALY.HIGH`, `PG.ENSEMBLE.CLASSIFIER.HIGH`

### Breaking Changes from v0.0.1

- **API endpoint changes**: `/score` now returns structured response with reason codes
- **Configuration format**: Migrated to Pydantic Settings with environment variables
- **Response format**: Added sub-scores, version info, and signature metadata
- **Authentication**: Now requires HMAC validation for all requests

### Migration Guide from v0.0.1

1. **Update configuration**: Convert old config to new environment variables
2. **Update API clients**: Handle new response format and HMAC authentication
3. **Update monitoring**: New Prometheus metrics with different names
4. **Update deployment**: New dependencies require container image update

## [0.0.1] - 2025-08-31 - Initial Prototype

### Added
- Initial release of PulseGuard (self-hosted)
- FastAPI service with endpoints: POST /score, POST /stream/webhook, GET /health
- Unsupervised anomaly scoring (rolling stats) + heuristics overlay
- Dockerfile with multi-stage and pinned deps; slim runtime
- Helm chart with values for image, env (RPC_URL, FEATURE_WINDOW, ALERT_THRESHOLD, SINK_URL), resources, autoscaling, service, ingress
- Scripts: build (image, chart, SBOM, checksums), run_local, helm_install, sign_artifacts
- OpenAPI spec and Quick Start README

