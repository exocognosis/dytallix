# Dytallix Cross-Chain Bridge - Google Cloud Platform Deployment

This directory contains all the necessary files and scripts to deploy the Dytallix Cross-Chain Bridge to Google Cloud Platform (GCP).

## Overview

The GCP deployment provides a production-ready, scalable infrastructure for the Dytallix cross-chain bridge, including:

- **Google Kubernetes Engine (GKE)** for container orchestration
- **Cloud SQL** for database services
- **Cloud Storage** for backups and large data
- **Artifact Registry** for container images
- **Load Balancers** for external access
- **Monitoring Stack** with Prometheus and Grafana
- **Security** with Workload Identity and private clusters

## Quick Start

### Prerequisites

Before starting, ensure you have:

1. **Google Cloud SDK** installed and configured
2. **Terraform** (>= 1.0) installed
3. **kubectl** installed
4. **Docker** installed
5. **Helm** installed (for monitoring)
6. A **Google Cloud Project** with billing enabled

### 1. Authentication

```bash
# Authenticate with Google Cloud
gcloud auth login

# Set up application default credentials
gcloud auth application-default login
```

### 2. Configure Project

```bash
# Set your project ID
export PROJECT_ID="your-project-id"
export REGION="us-central1"
export ZONE="us-central1-a"

# Set the project
gcloud config set project $PROJECT_ID
```

### 3. Deploy Infrastructure (Terraform Method - Recommended)

```bash
# Complete deployment with Terraform
./deploy-terraform-gcp.sh
```

### 4. Alternative: Manual Deployment

```bash
# 1. Deploy infrastructure only
./deploy-to-gcp.sh

# 2. Set up environment and secrets
./setup-gcp-environment.sh

# 3. Deploy application manually
kubectl apply -f dytallix-bridge-gcp.yaml
kubectl apply -f monitoring-gcp.yaml
```

## File Structure

```
deployment/gcp/
├── README.md                      # This file
├── gcp-config.yaml               # GCP configuration
├── deploy-to-gcp.sh              # Basic GCP deployment script
├── deploy-terraform-gcp.sh       # Complete Terraform deployment
├── setup-gcp-environment.sh      # Environment and secrets setup
├── dytallix-bridge-gcp.yaml      # Kubernetes manifests for bridge
├── monitoring-gcp.yaml           # Kubernetes manifests for monitoring
├── terraform/
│   ├── main.tf                   # Terraform infrastructure definition
│   └── terraform.tfvars          # Terraform variables
└── generated files...            # Generated during deployment
```

## Deployment Methods

### Method 1: Enhanced Terraform Deployment (Most Future-Proof) ⭐

The `deploy-enhanced-terraform-gcp.sh` script provides enterprise-grade infrastructure-as-code:

- ✅ **Multi-Environment Support** (dev, testnet, prod)
- ✅ **Terraform Workspaces** for environment isolation
- ✅ **Advanced Validation** and security features
- ✅ **Environment-Specific Configurations**
- ✅ **Comprehensive Output Management**
- ✅ **Built-in Rollback Capabilities**

```bash
# Deploy to testnet (default)
./deploy-enhanced-terraform-gcp.sh apply testnet

# Deploy to production
./deploy-enhanced-terraform-gcp.sh apply prod

# Plan production changes
./deploy-enhanced-terraform-gcp.sh plan prod

# Destroy development environment
./deploy-enhanced-terraform-gcp.sh destroy dev
```

### Method 2: Complete Terraform Deployment (Recommended)

The `deploy-terraform-gcp.sh` script provides a complete infrastructure-as-code deployment:

- ✅ Infrastructure provisioning with Terraform
- ✅ Automatic resource management
- ✅ Proper dependency handling
- ✅ Easy cleanup and updates

```bash
./deploy-terraform-gcp.sh
```

### Method 3: Manual GCP Deployment

The `deploy-to-gcp.sh` script uses gcloud commands directly:

- ✅ Simpler to understand
- ✅ No Terraform knowledge required
- ❌ Manual resource management
- ❌ Harder to update/cleanup

```bash
./deploy-to-gcp.sh
```

## Configuration

### Environment Variables

Key environment variables (set automatically by scripts):

```bash
PROJECT_ID="dytallix"          # Your GCP project ID
REGION="us-central1"                   # GCP region
ZONE="us-central1-a"                   # GCP zone
CLUSTER_NAME="dytallix-bridge-cluster" # GKE cluster name
```

### Terraform Variables

Edit `terraform/terraform.tfvars` to customize:

```hcl
project_id = "your-project-id"
region     = "us-central1"
zone       = "us-central1-a"

cluster_name = "dytallix-bridge-cluster"
node_count   = 3
machine_type = "e2-standard-4"
disk_size_gb = 100

enable_monitoring = true
```

### Bridge Configuration

The bridge configuration is managed via:

1. **Kubernetes ConfigMaps** - Application configuration
2. **Kubernetes Secrets** - Sensitive data (keys, passwords)
3. **Environment Variables** - Runtime settings

### Environment-Specific Configurations

The enhanced Terraform deployment supports multiple environments with different configurations:

#### Development Environment
```bash
# Minimal resources for cost efficiency
./deploy-enhanced-terraform-gcp.sh apply dev
```
- **Resources**: 1 node, e2-medium instances
- **Backup**: Disabled
- **Security**: Basic settings
- **Cost**: ~$50-80/month

#### Testnet Environment (Default)
```bash
# Balanced resources for testing
./deploy-enhanced-terraform-gcp.sh apply testnet
```
- **Resources**: 3 nodes, e2-standard-4 instances
- **Backup**: 30-day retention
- **Security**: Standard settings
- **Cost**: ~$200-300/month

#### Production Environment
```bash
# High-availability with full security
./deploy-enhanced-terraform-gcp.sh apply prod
```
- **Resources**: 5 nodes, n2-standard-8 instances
- **Backup**: 90-day retention, PITR enabled
- **Security**: Full encryption, private endpoints
- **Cost**: ~$800-1200/month

#### Terraform Workspaces
Each environment uses its own Terraform workspace for complete isolation:

```bash
# List workspaces
cd terraform && terraform workspace list

# Switch workspace manually
terraform workspace select prod

# Show current workspace
terraform workspace show
```

#### State Management
For production deployments, configure remote state backend:

```hcl
# Uncomment in terraform/main.tf
backend "gcs" {
  bucket = "your-terraform-state-bucket"
  prefix = "terraform/state"
}
```

#### Environment Variables
Override defaults with environment variables:

```bash
export PROJECT_ID="my-custom-project"
export REGION="europe-west1"
export ZONE="europe-west1-b"

./deploy-enhanced-terraform-gcp.sh apply prod
```

## Services and Endpoints

After deployment, the following services will be available:

### Bridge Services
- **API Endpoint**: `http://<EXTERNAL_IP>:3030`
- **Health Check**: `http://<EXTERNAL_IP>:8081/health`
- **Metrics**: `http://<EXTERNAL_IP>:9090/metrics`

### Monitoring Services
- **Prometheus**: `http://<PROMETHEUS_IP>:9090`
- **Grafana**: `http://<GRAFANA_IP>:3000` (admin/dytallix_admin)

### Database
- **Cloud SQL**: Accessible via private IP or Cloud SQL Proxy
- **Connection**: Use connection name from deployment output

## Security Features

### Network Security
- **Private GKE Cluster** with authorized networks
- **VPC Network** with custom subnets
- **Network Policies** for pod-to-pod communication
- **Cloud SQL** with private IP and SSL

### Identity and Access
- **Workload Identity** for pod-to-GCP service authentication
- **Service Account** with minimal required permissions
- **RBAC** for Kubernetes resources

### Data Protection
- **Kubernetes Secrets** for sensitive data
- **Encrypted Storage** for persistent volumes
- **SSL/TLS** for all communications

## Monitoring and Observability

### Metrics
- **Prometheus** scrapes metrics from bridge nodes
- **Grafana** provides visualization dashboards
- **Google Cloud Monitoring** integration

### Logging
- **Container logs** via Google Cloud Logging
- **Structured logging** in JSON format
- **Log aggregation** by service and severity

### Health Checks
- **Kubernetes probes** (liveness, readiness, startup)
- **HTTP health endpoints** for external monitoring
- **Resource monitoring** (CPU, memory, disk)

## Scaling and Performance

### Horizontal Scaling
- **Horizontal Pod Autoscaler** (HPA) configured
- **Automatic scaling** based on CPU/memory metrics
- **Node autoscaling** for cluster capacity

### Resource Management
- **Resource requests/limits** for all containers
- **Quality of Service** classes for scheduling priority
- **Persistent volumes** for data storage

## Backup and Recovery

### Database Backups
- **Automated daily backups** of Cloud SQL
- **Point-in-time recovery** capability
- **Cross-region backup** storage

### Application Data
- **Persistent volume snapshots** for node data
- **Configuration backup** via git repository
- **Secret backup** (encrypted) to Cloud Storage

## Troubleshooting

### Common Issues

1. **External IP Pending**
   ```bash
   # Check load balancer status
   kubectl get services -n dytallix
   # Wait 5-10 minutes for provisioning
   ```

2. **Pods Not Starting**
   ```bash
   # Check pod status
   kubectl describe pod <pod-name> -n dytallix
   # Check resource limits and node capacity
   kubectl top nodes
   ```

3. **Database Connection Issues**
   ```bash
   # Check Cloud SQL proxy
   kubectl logs deployment/cloudsql-proxy -n dytallix
   # Test database connectivity
   kubectl exec -it <pod-name> -n dytallix -- psql $DATABASE_URL
   ```

### Debugging Commands

```bash
# View all resources
kubectl get all -n dytallix

# Check events
kubectl get events -n dytallix --sort-by='.lastTimestamp'

# View logs
kubectl logs -f deployment/dytallix-bridge-node -n dytallix

# Port forward for local access
kubectl port-forward service/dytallix-bridge-service 3030:3030 -n dytallix

# Check resource usage
kubectl top pods -n dytallix
```

## Verification

Run the verification script to check deployment status:

```bash
./verify-gcp-deployment.sh
```

This will check:
- ✅ Namespace creation
- ✅ Deployment status
- ✅ Service endpoints
- ✅ Secret configuration
- ✅ Health endpoints
- ✅ Pod logs

## Cleanup

### Remove Application Only
```bash
kubectl delete namespace dytallix
kubectl delete namespace monitoring
```

### Remove Infrastructure (Terraform)
```bash
cd terraform
terraform destroy -var="project_id=$PROJECT_ID"
```

### Complete Cleanup
```bash
# Delete the entire project (CAREFUL!)
gcloud projects delete $PROJECT_ID
```

## Cost Optimization

### Development/Testing
- Use preemptible nodes
- Reduce replica counts
- Use smaller machine types
- Enable autoscaling with lower minimums

### Production
- Use committed use discounts
- Optimize resource requests/limits
- Use appropriate storage classes
- Monitor and right-size resources

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review Google Cloud Console for resource status
3. Check Kubernetes events and logs
4. Consult the main project documentation

## Security Considerations

1. **Rotate secrets** regularly
2. **Monitor access logs** via Cloud Audit Logs
3. **Update dependencies** and base images
4. **Review IAM permissions** periodically
5. **Enable security scanning** for container images

---

This deployment is designed for production use with proper security, monitoring, and scalability features. Always review and test configurations before deploying to production environments.
