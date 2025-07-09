# Dytallix DevOps & Deployment

This directory contains CI/CD, containerization, and secrets management resources for Dytallix.

## CI/CD
- `.github/workflows/ci.yml`: GitHub Actions pipeline for Rust and Python

## Containerization
- `Dockerfile`: Build and run the blockchain node

## Secrets Management
- `secrets-management/` - Complete secrets management toolkit
  - `generate-keys.sh` - Generate and encrypt PQC keys
  - `vault-setup.sh` - Set up HashiCorp Vault
  - `env-setup.sh` - Environment variable configuration
  - `docker-secrets.sh` - Docker Swarm secrets management
  - `k8s-secrets.yaml` - Kubernetes secrets configuration
  - `backup-keys.sh` - Key backup and rotation
  - `config/` - Configuration templates
  - `examples/` - Deployment examples for different environments
