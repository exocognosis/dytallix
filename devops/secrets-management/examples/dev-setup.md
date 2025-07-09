# Dytallix Development Environment Setup Example
# This example shows how to set up a complete development environment

## Prerequisites
- Docker and Docker Compose
- Rust toolchain
- PostgreSQL (or Docker container)
- Git

## Step 1: Generate Development Keys
```bash
# Generate PQC keys for development
./generate-keys.sh --env dev --output-dir ./keys
```

## Step 2: Set Up Environment Variables
```bash
# Set up environment variables
source ./env-setup.sh --env dev --keys-dir ./keys

# Or create .env file
./env-setup.sh --env dev --keys-dir ./keys
```

## Step 3: Start Database
```bash
# Using Docker
docker run -d \
  --name dytallix-db-dev \
  -e POSTGRES_DB=dytallix_dev \
  -e POSTGRES_USER=dytallix_dev \
  -e POSTGRES_PASSWORD=dytallix_dev_password \
  -p 5432:5432 \
  postgres:14
```

## Step 4: Start the Application
```bash
# Navigate to blockchain-core
cd ../../blockchain-core

# Run the application
cargo run
```

## Step 5: Verify Setup
```bash
# Check health endpoint
curl http://localhost:8081/health

# Check metrics
curl http://localhost:9090/metrics

# Check PQC key loading
curl http://localhost:8080/api/v1/keys/public
```

## Environment Variables Used
- `DYTALLIX_ENVIRONMENT=dev`
- `DYTALLIX_LOG_LEVEL=debug`
- `DYTALLIX_DEBUG_MODE=true`
- `DYTALLIX_PQC_KEYS_PATH=./keys/pqc_keys_dev.json.enc`
- `DYTALLIX_KEYS_PASSWORD=<generated>`
- `DYTALLIX_DATABASE_URL=postgresql://dytallix_dev:dytallix_dev_password@localhost:5432/dytallix_dev`

## Docker Compose Alternative
```yaml
version: '3.8'

services:
  dytallix-db:
    image: postgres:14
    environment:
      POSTGRES_DB: dytallix_dev
      POSTGRES_USER: dytallix_dev
      POSTGRES_PASSWORD: dytallix_dev_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  dytallix-node:
    build: ../../
    depends_on:
      - dytallix-db
    ports:
      - "8080:8080"
      - "9090:9090"
      - "8081:8081"
    environment:
      DYTALLIX_ENVIRONMENT: dev
      DYTALLIX_LOG_LEVEL: debug
      DYTALLIX_DEBUG_MODE: "true"
      DYTALLIX_DATABASE_URL: postgresql://dytallix_dev:dytallix_dev_password@dytallix-db:5432/dytallix_dev
    volumes:
      - ./keys:/etc/dytallix/keys:ro
      - ./data:/var/lib/dytallix
      - ./logs:/var/log/dytallix

volumes:
  postgres_data:
```

## Key Rotation Schedule
```bash
# Set up automatic key rotation (weekly)
./backup-keys.sh schedule --env dev --rotation-interval 168
```

## Monitoring Setup
```bash
# Enable metrics collection
export DYTALLIX_METRICS_ENABLED=true

# Start Prometheus (optional)
docker run -d \
  --name prometheus \
  -p 9091:9090 \
  prom/prometheus:latest

# Start Grafana (optional)
docker run -d \
  --name grafana \
  -p 3000:3000 \
  grafana/grafana:latest
```

## Security Considerations for Development
1. Use encrypted keys even in development
2. Rotate keys regularly
3. Enable audit logging
4. Use TLS for production-like testing
5. Keep secrets in environment variables, not code

## Troubleshooting
- Check logs: `tail -f ./logs/dytallix.log`
- Verify key decryption: `openssl enc -aes-256-cbc -d -in keys/pqc_keys_dev.json.enc -pass pass:$DYTALLIX_KEYS_PASSWORD`
- Test database connection: `psql postgresql://dytallix_dev:dytallix_dev_password@localhost:5432/dytallix_dev`
