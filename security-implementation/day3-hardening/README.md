# Day 3 GKE Security Hardening - Enhanced Network Policies

This directory contains the Calico-based network policies implementing microsegmentation with default deny-all and explicit allow rules for the Dytallix bridge infrastructure.

## Files

- `default-deny-network-policies.yaml` - Default deny-all ingress and egress policies
- `calico-enhanced-policies.yaml` - Calico-specific network policies with microsegmentation
- `pod-security-standards.yaml` - Pod Security Standards (restricted profile) configurations
- `binary-authorization-policy.yaml` - Binary Authorization policy for container image verification

## Policy Overview

1. **Default Deny**: All ingress and egress traffic is denied by default
2. **Explicit Allows**: Only necessary communication paths are explicitly allowed
3. **Microsegmentation**: Each service has its own network policy with minimal required access
4. **DNS Access**: All pods can access DNS for name resolution
5. **System Access**: System pods can communicate as needed

## Security Features

- Zero-trust network model
- Calico-based policy enforcement
- Comprehensive logging of denied traffic
- Namespace isolation
- Service-to-service communication controls