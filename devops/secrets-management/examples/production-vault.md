# Dytallix Production Deployment with Vault Example
# This example shows how to deploy Dytallix in production with HashiCorp Vault

## Prerequisites
- HashiCorp Vault cluster
- Kubernetes cluster
- Proper TLS certificates
- Backup storage (S3 or similar)

## Step 1: Set Up Vault
```bash
# Initialize Vault cluster
./vault-setup.sh --production \
  --vault-addr https://vault.company.com:8200 \
  --auto-unseal

# Verify Vault is running
export VAULT_ADDR=https://vault.company.com:8200
export VAULT_TOKEN=<root-token>
vault status
```

## Step 2: Generate Production Keys
```bash
# Generate encrypted PQC keys
./generate-keys.sh --env prod \
  --vault \
  --vault-url https://vault.company.com:8200 \
  --vault-token <vault-token>

# Keys will be stored in Vault at: secret/dytallix/prod/pqc_keys
```

## Step 3: Configure Vault Policies
```bash
# Create service account for Dytallix
vault auth enable kubernetes

vault write auth/kubernetes/config \
  token_reviewer_jwt="$(cat /var/run/secrets/kubernetes.io/serviceaccount/token)" \
  kubernetes_host=https://kubernetes.default.svc.cluster.local:443 \
  kubernetes_ca_cert=@/var/run/secrets/kubernetes.io/serviceaccount/ca.crt

# Create role for Dytallix service
vault write auth/kubernetes/role/dytallix \
  bound_service_account_names=dytallix-node \
  bound_service_account_namespaces=dytallix-system \
  policies=dytallix-service \
  ttl=24h
```

## Step 4: Deploy to Kubernetes
```bash
# Update secrets in k8s-secrets.yaml with actual values
kubectl apply -f k8s-secrets.yaml

# Verify deployment
kubectl get pods -n dytallix-system
kubectl logs -n dytallix-system deployment/dytallix-node-prod
```

## Step 5: Set Up Monitoring
```bash
# Deploy Prometheus operator
kubectl apply -f https://raw.githubusercontent.com/prometheus-operator/prometheus-operator/master/bundle.yaml

# Create ServiceMonitor for Dytallix
kubectl apply -f - <<EOF
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: dytallix-node
  namespace: dytallix-system
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: dytallix
  endpoints:
  - port: metrics
    interval: 30s
    path: /metrics
EOF
```

## Step 6: Configure Backups
```bash
# Set up automated backups
./backup-keys.sh schedule --env prod \
  --rotation-interval 720 \
  --vault-url https://vault.company.com:8200 \
  --vault-token <vault-token> \
  --encryption-key <backup-encryption-key>

# Test backup
./backup-keys.sh backup --env prod
```

## Step 7: TLS Configuration
```bash
# Generate TLS certificates (use cert-manager in production)
openssl req -x509 -newkey rsa:4096 \
  -keyout server.key \
  -out server.crt \
  -days 365 \
  -nodes \
  -subj "/CN=dytallix.company.com"

# Create TLS secret
kubectl create secret tls dytallix-tls-certs-prod \
  --cert=server.crt \
  --key=server.key \
  -n dytallix-system
```

## Environment Variables for Production
```bash
export DYTALLIX_ENVIRONMENT=prod
export DYTALLIX_LOG_LEVEL=info
export DYTALLIX_DEBUG_MODE=false
export DYTALLIX_REQUIRE_TLS=true
export DYTALLIX_AUDIT_LOGGING=true
export DYTALLIX_METRICS_ENABLED=true
export DYTALLIX_USE_VAULT=true
export VAULT_ADDR=https://vault.company.com:8200
```

## Production Kubernetes Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dytallix-node-prod
  namespace: dytallix-system
spec:
  replicas: 3
  selector:
    matchLabels:
      app.kubernetes.io/name: dytallix
      dytallix.io/environment: prod
  template:
    metadata:
      labels:
        app.kubernetes.io/name: dytallix
        dytallix.io/environment: prod
    spec:
      serviceAccountName: dytallix-node
      containers:
      - name: dytallix-node
        image: dytallix:v1.0.0
        env:
        - name: VAULT_ADDR
          value: "https://vault.company.com:8200"
        - name: VAULT_ROLE
          value: "dytallix"
        - name: VAULT_AUTH_METHOD
          value: "kubernetes"
        resources:
          requests:
            cpu: 1
            memory: 2Gi
          limits:
            cpu: 4
            memory: 8Gi
        livenessProbe:
          httpGet:
            path: /health
            port: 8081
            scheme: HTTPS
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8081
            scheme: HTTPS
          initialDelaySeconds: 5
          periodSeconds: 5
```

## High Availability Configuration
```yaml
apiVersion: v1
kind: Service
metadata:
  name: dytallix-node-prod
  namespace: dytallix-system
spec:
  type: LoadBalancer
  ports:
  - name: https
    port: 443
    targetPort: 8080
    protocol: TCP
  selector:
    app.kubernetes.io/name: dytallix
    dytallix.io/environment: prod

---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: dytallix-node-prod
  namespace: dytallix-system
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
  - hosts:
    - dytallix.company.com
    secretName: dytallix-tls-cert
  rules:
  - host: dytallix.company.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: dytallix-node-prod
            port:
              number: 8080
```

## Monitoring and Alerting
```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: dytallix-alerts
  namespace: dytallix-system
spec:
  groups:
  - name: dytallix
    rules:
    - alert: DytallixNodeDown
      expr: up{job="dytallix-node"} == 0
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "Dytallix node is down"
        description: "Dytallix node {{ $labels.instance }} has been down for more than 5 minutes"

    - alert: DytallixHighCPU
      expr: rate(process_cpu_seconds_total{job="dytallix-node"}[5m]) > 0.8
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "High CPU usage on Dytallix node"
        description: "CPU usage is above 80% for more than 10 minutes"

    - alert: DytallixHighMemory
      expr: process_resident_memory_bytes{job="dytallix-node"} / 1024 / 1024 / 1024 > 6
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "High memory usage on Dytallix node"
        description: "Memory usage is above 6GB for more than 10 minutes"
```

## Security Best Practices
1. Use Vault for all secrets
2. Enable audit logging
3. Use TLS everywhere
4. Regular key rotation
5. Network policies
6. Pod security policies
7. RBAC
8. Regular security scans

## Backup and Recovery
```bash
# Automated daily backup
0 2 * * * /opt/dytallix/backup-keys.sh backup --env prod

# Disaster recovery procedure
1. Restore Vault cluster
2. Restore database
3. Restore PQC keys
4. Redeploy application
```

## Troubleshooting
- Check Vault logs: `kubectl logs -n vault vault-0`
- Check application logs: `kubectl logs -n dytallix-system deployment/dytallix-node-prod`
- Verify Vault connection: `vault status`
- Check secrets: `kubectl get secrets -n dytallix-system`
