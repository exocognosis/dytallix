# Changelog

All notable changes to this project will be documented in this file.

## v0.1.0 - 2025-08-31
- Initial release of CodeShield (self-hosted).
- FastAPI service with endpoints: POST /scan, GET /report/{id}, GET /health.
- Basic static analysis rules (regex) for common Solidity pitfalls.
- Optional Slither driver (if available on PATH).
- Dockerfile (python:3.11-slim) with image size target < 400 MB.
- Helm chart (values for image, resources, autoscaling, service, ingress, persistence).
- Scripts: build (image, chart, SBOM, checksums), run_local, helm_install, sign_artifacts.
- OpenAPI spec and Quick Start README.

