# PulseScan Database Migrations

This directory contains database migration scripts for the PulseScan fraud & anomaly monitoring system.

## Migration Files

### 001_initial_schema.sql
Initial database schema including:
- `findings` - Core anomaly detection results
- `address_profiles` - Aggregate address information
- `transaction_features` - ML feature vectors
- `anomaly_patterns` - Detected pattern definitions
- `model_metrics` - ML model performance tracking
- `audit_log` - System audit trail

## Usage

### PostgreSQL Setup

1. Create database:
```sql
CREATE DATABASE pulsescan;
CREATE USER pulsescan_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE pulsescan TO pulsescan_user;
```

2. Run migrations:
```bash
psql -U pulsescan_user -d pulsescan -f 001_initial_schema.sql
```

### Environment Variables

Required environment variables for database connection:
```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=pulsescan
DB_USERNAME=pulsescan_user
DB_PASSWORD=secure_password
DB_SSL=false
```

## Schema Overview

### Core Tables

- **findings**: Stores all anomaly detection results with scores, reasons, and metadata
- **address_profiles**: Aggregated risk profiles per blockchain address
- **transaction_features**: Normalized feature vectors used by ML models
- **anomaly_patterns**: Configurable pattern definitions for different anomaly types

### Supporting Tables

- **model_metrics**: Tracks ML model performance over time
- **audit_log**: Complete audit trail of system activities

## Indexes

The schema includes optimized indexes for:
- Fast lookup by address, transaction hash, timestamp
- Efficient sorting by score and severity
- JSON/JSONB field queries for metadata
- Composite indexes for common query patterns

## Performance Considerations

- JSONB fields for flexible metadata storage with GIN indexes
- Partitioning recommendations for large datasets (>10M records)
- Archive strategy for old findings (suggested 1+ year retention)

## Security

- Row-level security policies can be added for multi-tenant scenarios
- Audit triggers track all data modifications
- Sensitive data should be encrypted at application level before storage