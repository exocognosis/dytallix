# Dytallix Frontend GCP Deployment Guide

This guide walks you through deploying the Dytallix frontend to Google Cloud Platform using Google Kubernetes Engine (GKE).

## Prerequisites

Before you begin, ensure you have:

1. **Google Cloud SDK (gcloud)** installed and configured
2. **kubectl** installed
3. **Docker** installed and running
4. A GCP project with billing enabled
5. Required APIs enabled:
   - Container Registry API
   - Kubernetes Engine API
   - Cloud Build API
   - Compute Engine API

## Quick Start

### 1. Automated Deployment

Run the automated deployment script:

```bash
cd deployment/gcp
./deploy-frontend.sh
```

This script will:
- Build the frontend application
- Create a Docker image
- Push to Google Container Registry
- Deploy to GKE cluster
- Set up ingress and SSL certificates

### 2. Manual Deployment Steps

If you prefer manual control, follow these steps:

#### Step 1: Build the Frontend
```bash
cd frontend
npm install
npm run build
```

#### Step 2: Build Docker Image
```bash
cd ../deployment/gcp
docker build -f Dockerfile.frontend -t gcr.io/dytallix/dytallix-frontend:latest ../../
```

#### Step 3: Push to Container Registry
```bash
docker push gcr.io/dytallix/dytallix-frontend:latest
```

#### Step 4: Deploy to Kubernetes
```bash
kubectl apply -f k8s/dytallix-frontend.yaml
```

## Configuration Files

### Docker Configuration
- `Dockerfile.frontend`: Multi-stage build with Node.js and Nginx
- `nginx.conf`: Nginx configuration for SPA routing and API proxy

### Kubernetes Configuration
- `k8s/dytallix-frontend.yaml`: Complete K8s deployment with:
  - Deployment (3 replicas)
  - Service (ClusterIP)
  - Ingress (with SSL)
  - ManagedCertificate

### Cloud Build Configuration
- `cloudbuild-frontend.yaml`: Automated build and deployment pipeline

## Accessing the Frontend

Once deployed, the frontend will be accessible via:

1. **External IP**: Get the IP from the ingress:
   ```bash
   kubectl get ingress dytallix-frontend-ingress -n dytallix
   ```

2. **Domain**: If DNS is configured, access via `frontend.dytallix.com`

## Monitoring and Troubleshooting

### Check Deployment Status
```bash
kubectl get deployments -n dytallix
kubectl get pods -n dytallix
kubectl get services -n dytallix
kubectl get ingress -n dytallix
```

### View Logs
```bash
kubectl logs -l app=dytallix-frontend -n dytallix
```

### Update Deployment
```bash
kubectl set image deployment/dytallix-frontend frontend=gcr.io/dytallix/dytallix-frontend:new-tag -n dytallix
```

### Scale Deployment
```bash
kubectl scale deployment dytallix-frontend --replicas=5 -n dytallix
```

## Production Considerations

### 1. Domain and SSL
- Configure your domain DNS to point to the ingress IP
- Update the ManagedCertificate with your actual domain
- Consider using Cloud CDN for global distribution

### 2. Environment Variables
Add environment-specific configurations to the deployment:
```yaml
env:
- name: REACT_APP_API_URL
  value: "https://api.dytallix.com"
- name: REACT_APP_ENVIRONMENT
  value: "production"
```

### 3. Resource Limits
Adjust resource requests and limits based on your traffic:
```yaml
resources:
  requests:
    memory: "256Mi"
    cpu: "200m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

### 4. Security
- Configure proper Content Security Policy (CSP)
- Set up network policies
- Use secrets for sensitive configuration

## CI/CD Integration

### Cloud Build Trigger
Create a Cloud Build trigger for automated deployments:

```bash
gcloud builds triggers create github \
    --repo-name=dytallix \
    --repo-owner=your-github-username \
    --branch-pattern="^main$" \
    --build-config=deployment/gcp/cloudbuild-frontend.yaml
```

## Cost Optimization

1. **Use preemptible nodes** for non-production environments
2. **Configure horizontal pod autoscaler** for traffic-based scaling
3. **Use Cloud CDN** to reduce origin server load
4. **Monitor resource usage** and adjust limits accordingly

## Support

For issues or questions:
1. Check the deployment logs
2. Review the Kubernetes events: `kubectl get events -n dytallix`
3. Consult the GCP documentation
4. File an issue in the project repository

## Files Structure

```
deployment/gcp/
├── Dockerfile.frontend          # Frontend Docker configuration
├── nginx.conf                   # Nginx server configuration
├── deploy-frontend.sh          # Automated deployment script
├── cloudbuild-frontend.yaml    # Cloud Build configuration
└── k8s/
    └── dytallix-frontend.yaml  # Kubernetes manifests
```
