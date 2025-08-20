# Changelog

All notable changes to the Dytallix project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Prometheus Metrics Integration**: Complete metrics collection for faucet and blockchain API services
  - HTTP request/response metrics with path, method, and status code labels
  - Request duration histograms for latency monitoring
  - Faucet-specific metrics tracking success/error/rate-limited requests
  - Rate limit hit counters for security monitoring
  - In-flight request gauges for load monitoring
  - 5xx error counters for reliability tracking

- **Community Feedback System**: New feedback intake endpoints with privacy protection
  - `POST /api/feedback` endpoint for user feedback submission
  - `GET /api/feedback/stats` endpoint for feedback statistics
  - Spam protection with honeypot fields and pattern detection
  - Privacy-preserving IP address hashing
  - JSONL-based persistent storage with append-only logging
  - Input validation and sanitization

- **Production Monitoring Configuration**:
  - `monitoring/prometheus.yml`: Complete Prometheus scrape configuration
  - `monitoring/alerts.yml`: Production-ready alerting rules
  - Configurable alert thresholds for different environments
  - Comprehensive error rate and latency monitoring
  - Service health detection and automated alerts

- **Enhanced API Documentation**:
  - Updated endpoint documentation with new monitoring and feedback APIs
  - Configuration examples and deployment guides
  - Security and privacy considerations documentation

### Changed
- **Faucet Service Dependencies**: Added `prom-client` for Prometheus metrics collection
- **Blockchain Core Dependencies**: Added Prometheus metrics libraries (`prometheus`, `metrics`, `metrics-prometheus`)
- **API Response Structure**: Enhanced error handling and consistent response formats
- **Logging**: Improved privacy-aware logging with sensitive data redaction

### Security
- **Privacy Protection**: No PII (Personally Identifiable Information) exposed in metrics labels
- **IP Address Protection**: SHA256 hashing of IP addresses with configurable salt
- **Input Validation**: Comprehensive validation for feedback endpoints
- **Spam Prevention**: Multi-layer spam detection including honeypot and pattern matching
- **Rate Limiting**: Enhanced rate limiting with metrics tracking

### Technical Debt
- **Code Organization**: Separated monitoring and feedback functionality into dedicated modules
- **Error Handling**: Standardized error responses across all endpoints
- **Configuration**: Environment-based configuration with sensible defaults
- **Testing**: Added unit tests for metrics collection and feedback processing

### Infrastructure
- **Monitoring Stack**: Production-ready Prometheus configuration templates
- **Alerting**: Configurable alert rules with environment-specific thresholds
- **Documentation**: Comprehensive deployment and configuration guides

## Previous Releases

### [0.1.0] - Previous Release
- Core blockchain functionality
- Faucet service implementation
- Basic API endpoints
- Dual token system (DGT/DRT)
- Post-quantum cryptography integration
- Smart contract support
- Staking mechanisms

---

## Release Notes

### Monitoring & Metrics (New in Unreleased)

The monitoring system provides comprehensive observability into the Dytallix network:

**Metrics Collected:**
- `http_requests_total`: Counter of all HTTP requests by path, method, and status
- `http_request_duration_seconds`: Histogram of request latencies
- `faucet_requests_total`: Counter of faucet requests by result type
- `rate_limit_hits_total`: Counter of rate limiting events
- `http_5xx_responses_total`: Counter of server error responses
- `in_flight_requests`: Gauge of concurrent requests

**Privacy Features:**
- No raw IP addresses in metrics labels
- Path sanitization to remove user identifiers
- Configurable data retention policies

### Feedback System (New in Unreleased)

The feedback system enables community input while protecting user privacy:

**Features:**
- Structured feedback submission with optional contact information
- Spam protection through honeypot fields and content analysis
- Privacy-preserving storage with IP address hashing
- Real-time feedback statistics without exposing user data

**API Endpoints:**
```
POST /api/feedback - Submit feedback
GET /api/feedback/stats - Get feedback statistics
```

### Security Enhancements (New in Unreleased)

**Data Protection:**
- SHA256 hashing of IP addresses with configurable salt
- Input sanitization and validation
- Spam detection and prevention
- Rate limiting with monitoring

**Privacy Measures:**
- No PII in metrics or logs
- Optional contact information storage
- Configurable data retention
- Secure default configurations

### Deployment Changes (New in Unreleased)

**New Configuration Files:**
- `monitoring/prometheus.yml`: Prometheus scrape configuration
- `monitoring/alerts.yml`: Alerting rules and thresholds

**Environment Variables:**
- `FEEDBACK_LOG_PATH`: Path for feedback storage
- `IP_SALT`: Salt for IP address hashing
- `METRICS_ENABLED`: Enable/disable metrics collection

**Dependencies:**
- Node.js: Added `prom-client` for metrics
- Rust: Added Prometheus metrics libraries

### Migration Guide

**For Existing Deployments:**
1. Update dependencies: `npm install` in faucet directory
2. Add new environment variables to configuration
3. Copy monitoring configuration files
4. Test new endpoints: `/metrics`, `/api/feedback`
5. Configure Prometheus to scrape new endpoints

**Backward Compatibility:**
- All existing APIs remain unchanged
- New features are opt-in via configuration
- No breaking changes to existing functionality