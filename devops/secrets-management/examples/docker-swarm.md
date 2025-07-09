# Dytallix Docker Swarm Deployment Example
# This example shows how to deploy Dytallix using Docker Swarm with secrets management

## Prerequisites
- Docker Swarm initialized
- Shared storage for secrets
- Load balancer (optional)

## Step 1: Initialize Docker Swarm
```bash
# Initialize swarm (on manager node)
docker swarm init

# Join worker nodes
docker swarm join --token <worker-token> <manager-ip>:2377
```

## Step 2: Generate and Create Secrets
```bash
# Generate keys
./generate-keys.sh --env prod

# Create Docker secrets
./docker-secrets.sh create --env prod --stack-name dytallix
```

## Step 3: Deploy Database
```bash
# Create database stack
docker stack deploy -c - db <<EOF
version: '3.8'

services:
  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: dytallix_prod
      POSTGRES_USER: dytallix_prod
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    secrets:
      - db_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    deploy:
      placement:
        constraints:
          - node.role == worker
      replicas: 1
      restart_policy:
        condition: on-failure
    networks:
      - dytallix_network

secrets:
  db_password:
    external: true
    name: dytallix_db_password_prod

volumes:
  postgres_data:
    driver: local

networks:
  dytallix_network:
    driver: overlay
    attachable: true
EOF
```

## Step 4: Deploy Dytallix Stack
```bash
# Deploy main application
docker stack deploy -c docker-compose.secrets.yml dytallix
```

## Step 5: Set Up Load Balancer
```bash
# Create load balancer service
docker service create \
  --name dytallix-lb \
  --publish 443:443 \
  --mount type=bind,src=/etc/ssl/certs,dst=/etc/ssl/certs \
  --network dytallix_network \
  nginx:alpine
```

## Docker Compose Stack File
```yaml
version: '3.8'

services:
  dytallix-node:
    image: dytallix:latest
    environment:
      DYTALLIX_ENVIRONMENT: prod
      DYTALLIX_LOG_LEVEL: info
      DYTALLIX_DEBUG_MODE: "false"
      DYTALLIX_REQUIRE_TLS: "true"
      DYTALLIX_AUDIT_LOGGING: "true"
      DYTALLIX_PQC_KEYS_PATH: /run/secrets/pqc_keys
      DYTALLIX_KEYS_PASSWORD_FILE: /run/secrets/keys_password
      DYTALLIX_DATABASE_URL: postgresql://dytallix_prod:$(cat /run/secrets/db_password)@postgres:5432/dytallix_prod
      DYTALLIX_API_KEY_FILE: /run/secrets/api_key
      DYTALLIX_JWT_SECRET_FILE: /run/secrets/jwt_secret
    secrets:
      - pqc_keys
      - keys_password
      - db_password
      - api_key
      - jwt_secret
      - tls_cert
      - tls_key
    ports:
      - "8080:8080"
      - "9090:9090"
    volumes:
      - app_data:/var/lib/dytallix
      - app_logs:/var/log/dytallix
    deploy:
      replicas: 3
      placement:
        constraints:
          - node.role == worker
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '1'
          memory: 2G
      update_config:
        parallelism: 1
        delay: 10s
        failure_action: rollback
        monitor: 60s
    networks:
      - dytallix_network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8081/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  prometheus:
    image: prom/prometheus:latest
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
    configs:
      - source: prometheus_config
        target: /etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"
    volumes:
      - prometheus_data:/prometheus
    deploy:
      replicas: 1
      placement:
        constraints:
          - node.role == manager
    networks:
      - dytallix_network

  grafana:
    image: grafana/grafana:latest
    environment:
      GF_SECURITY_ADMIN_PASSWORD_FILE: /run/secrets/grafana_password
    secrets:
      - grafana_password
    ports:
      - "3000:3000"
    volumes:
      - grafana_data:/var/lib/grafana
    deploy:
      replicas: 1
      placement:
        constraints:
          - node.role == manager
    networks:
      - dytallix_network

secrets:
  pqc_keys:
    external: true
    name: dytallix_pqc_keys_prod
  keys_password:
    external: true
    name: dytallix_keys_password_prod
  db_password:
    external: true
    name: dytallix_db_password_prod
  api_key:
    external: true
    name: dytallix_api_key_prod
  jwt_secret:
    external: true
    name: dytallix_jwt_secret_prod
  tls_cert:
    external: true
    name: dytallix_tls_cert_prod
  tls_key:
    external: true
    name: dytallix_tls_key_prod
  grafana_password:
    external: true
    name: dytallix_grafana_password_prod

configs:
  prometheus_config:
    external: true
    name: dytallix_prometheus_config_prod

volumes:
  app_data:
    driver: local
  app_logs:
    driver: local
  prometheus_data:
    driver: local
  grafana_data:
    driver: local

networks:
  dytallix_network:
    driver: overlay
    attachable: true
```

## Monitoring Configuration
```yaml
# Prometheus configuration
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'dytallix-node'
    static_configs:
      - targets: ['dytallix-node:9090']
    metrics_path: '/metrics'
    scrape_interval: 5s

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']

rule_files:
  - "alerts.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093
```

## High Availability Setup
```bash
# Create overlay network
docker network create \
  --driver overlay \
  --attachable \
  dytallix_network

# Deploy with constraints for high availability
docker service create \
  --name dytallix-node \
  --replicas 3 \
  --constraint 'node.role == worker' \
  --network dytallix_network \
  --secret dytallix_pqc_keys_prod \
  --secret dytallix_keys_password_prod \
  dytallix:latest
```

## Backup and Recovery
```bash
# Backup script for Docker Swarm
#!/bin/bash
set -e

BACKUP_DIR="/var/backups/dytallix"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p "$BACKUP_DIR/$DATE"

# Backup Docker secrets
docker secret ls --format "table {{.Name}}" | grep dytallix | while read secret; do
    docker secret inspect "$secret" > "$BACKUP_DIR/$DATE/${secret}.json"
done

# Backup volumes
docker run --rm \
  -v dytallix_app_data:/data \
  -v "$BACKUP_DIR/$DATE":/backup \
  alpine tar czf /backup/app_data.tar.gz /data

# Backup database
docker exec dytallix_postgres_1 pg_dump -U dytallix_prod dytallix_prod > "$BACKUP_DIR/$DATE/database.sql"

echo "Backup completed: $BACKUP_DIR/$DATE"
```

## Security Considerations
1. Use secrets for all sensitive data
2. Enable TLS between services
3. Use overlay networks for isolation
4. Regular security updates
5. Monitor access logs
6. Implement network policies

## Scaling
```bash
# Scale up
docker service scale dytallix_dytallix-node=5

# Scale down
docker service scale dytallix_dytallix-node=2

# Rolling update
docker service update --image dytallix:v1.1.0 dytallix_dytallix-node
```

## Troubleshooting
```bash
# Check service status
docker service ls

# Check service logs
docker service logs dytallix_dytallix-node

# Check secrets
docker secret ls

# Check networks
docker network ls

# Inspect service
docker service inspect dytallix_dytallix-node
```
