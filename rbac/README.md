# Dytallix Bridge RBAC Implementation

## Overview

This directory contains comprehensive Role-Based Access Control (RBAC) and pod security implementations for the Dytallix Cross-Chain Bridge, addressing security audit findings and establishing enterprise-grade access controls.

## Security Implementation Summary

### 🔒 Key Security Features

- **Principle of Least Privilege**: Each service account has minimal required permissions
- **Pod Security Contexts**: Non-root execution with read-only root filesystem
- **Network Microsegmentation**: Zero-trust networking with explicit allow policies
- **Workload Identity Integration**: Secure GCP service account binding
- **CIS Kubernetes Compliance**: Addresses CIS benchmark findings

## File Structure

```
rbac/
├── README.md                    # This documentation
├── service-accounts.yaml        # Service accounts with Workload Identity
├── cluster-roles.yaml          # ClusterRoles and namespace Roles
├── role-bindings.yaml          # RoleBindings between accounts and roles
├── network-policies.yaml       # Network policies for microsegmentation
└── test-rbac-permissions.sh    # Automated RBAC validation script
```

## Service Accounts

### Primary Service Accounts

1. **dytallix-bridge-sa** (`dytallix` namespace)
   - Purpose: Main bridge node operations
   - Permissions: Minimal bridge operations, specific ConfigMap/Secret access
   - Security: No cluster-admin privileges, namespace-scoped

2. **dytallix-monitoring-sa** (`dytallix` namespace)
   - Purpose: Internal monitoring components
   - Permissions: Read-only access for metrics collection
   - Security: Cannot create/modify resources

3. **dytallix-gateway-sa** (`dytallix` namespace)
   - Purpose: API gateway with service discovery
   - Permissions: Service discovery, gateway configuration access
   - Security: Limited to service and endpoint management

4. **prometheus-sa** (`dytallix-monitoring` namespace)
   - Purpose: Prometheus metrics collection
   - Permissions: Cluster-wide read access for metrics
   - Security: Cannot modify any resources

5. **grafana-sa** (`dytallix-monitoring` namespace)
   - Purpose: Grafana dashboard
   - Permissions: No Kubernetes API access required
   - Security: `automountServiceAccountToken: false`

## RBAC Roles

### ClusterRoles

- **dytallix-bridge-cluster-role**: Minimal cluster access for bridge nodes
- **dytallix-monitoring-cluster-role**: Read-only cluster access for monitoring
- **prometheus-cluster-role**: Comprehensive monitoring permissions

### Namespace Roles

- **dytallix-bridge-role**: Bridge operations within dytallix namespace
- **dytallix-monitoring-role**: Monitoring operations within dytallix namespace
- **dytallix-gateway-role**: Gateway operations and service discovery
- **prometheus-role**: Prometheus operations within monitoring namespace

## Security Contexts

### Pod-Level Security

```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 1000
  runAsGroup: 1000
  fsGroup: 1000
  fsGroupChangePolicy: "OnRootMismatch"
  seccompProfile:
    type: RuntimeDefault
```

### Container-Level Security

```yaml
securityContext:
  allowPrivilegeEscalation: false
  runAsNonRoot: true
  runAsUser: 1000
  runAsGroup: 1000
  readOnlyRootFilesystem: true
  capabilities:
    drop:
    - ALL
  seccompProfile:
    type: RuntimeDefault
```

## Network Policies

### Microsegmentation Strategy

1. **Default Deny**: All namespaces start with deny-all policies
2. **Explicit Allow**: Only required communication paths are permitted
3. **Cross-Namespace**: Monitoring namespace can access metrics endpoints
4. **External Access**: Controlled egress for blockchain connections

### Key Policies

- `default-deny-all`: Blocks all ingress/egress by default
- `dytallix-bridge-netpol`: Allows API, metrics, P2P, and blockchain connections
- `prometheus-netpol`: Allows metrics scraping across namespaces
- `grafana-netpol`: Allows dashboard access and Prometheus queries

## Deployment Instructions

### Prerequisites

1. Kubernetes cluster with RBAC enabled
2. Network policy support (Calico, Cilium, etc.)
3. Pod Security Standards enabled (recommended)
4. GCP Workload Identity configured (for GKE)

### Step 1: Deploy RBAC Configuration

```bash
# Apply service accounts
kubectl apply -f rbac/service-accounts.yaml

# Apply roles
kubectl apply -f rbac/cluster-roles.yaml

# Apply role bindings
kubectl apply -f rbac/role-bindings.yaml

# Apply network policies
kubectl apply -f rbac/network-policies.yaml
```

### Step 2: Deploy Secure Bridge

```bash
# Deploy with enhanced security contexts
kubectl apply -f deployment/gcp/k8s/dytallix-bridge-secure.yaml
```

### Step 3: Validate RBAC

```bash
# Run validation script
./rbac/test-rbac-permissions.sh

# Verbose output
./rbac/test-rbac-permissions.sh --verbose
```

## Validation Testing

The `test-rbac-permissions.sh` script validates:

- ✅ Service account existence and configuration
- ✅ RBAC permissions (positive and negative tests)
- ✅ Pod security context enforcement
- ✅ Network policy implementation
- ✅ Cross-namespace access restrictions
- ✅ Workload Identity configuration

### Example Output

```
[INFO] Starting Dytallix Bridge RBAC Validation Tests
==================================
[SUCCESS] Service Account dytallix-bridge-sa exists in namespace dytallix
[SUCCESS] SA dytallix-bridge-sa can get configmaps/dytallix-bridge-config
[SUCCESS] SA dytallix-bridge-sa can create namespaces (correctly denied)
[SUCCESS] Bridge pod runs as non-root user
[SUCCESS] Bridge pod has read-only root filesystem
[SUCCESS] Default deny-all network policy exists
==================================
Total Tests: 25
Passed: 25
Failed: 0
[SUCCESS] All RBAC tests passed! ✅
```

## Security Compliance

### CIS Kubernetes Benchmark Compliance

| Control | Status | Implementation |
|---------|--------|----------------|
| 5.1.1 | ✅ | Minimize cluster access to read-only |
| 5.1.2 | ✅ | Minimize wildcard use in Roles |
| 5.2.1 | ✅ | Minimize access to secrets |
| 5.7.3 | ✅ | Apply security context to pods |
| 5.7.4 | ✅ | Default deny network policies |

### SOC 2 Type II Controls

- **Access Control**: RBAC with principle of least privilege
- **Data Protection**: Read-only filesystems and secret access controls
- **Monitoring**: Comprehensive audit logging and metrics collection
- **Network Security**: Microsegmentation with explicit allow policies

## Troubleshooting

### Common Issues

1. **Permission Denied Errors**
   ```bash
   # Check service account bindings
   kubectl get rolebindings,clusterrolebindings --all-namespaces | grep dytallix
   
   # Test specific permission
   kubectl auth can-i get pods --as=system:serviceaccount:dytallix:dytallix-bridge-sa
   ```

2. **Network Connectivity Issues**
   ```bash
   # Check network policies
   kubectl get networkpolicy -A
   
   # Test connectivity from pod
   kubectl exec -it <pod-name> -n dytallix -- nc -zv <target> <port>
   ```

3. **Pod Security Context Failures**
   ```bash
   # Check pod security context
   kubectl get pod <pod-name> -n dytallix -o yaml | grep -A 20 securityContext
   
   # Check events for security violations
   kubectl get events -n dytallix --field-selector type=Warning
   ```

### Debug Commands

```bash
# Verify RBAC configuration
kubectl auth can-i --list --as=system:serviceaccount:dytallix:dytallix-bridge-sa

# Check network policy effects
kubectl describe networkpolicy dytallix-bridge-netpol -n dytallix

# Validate pod security
kubectl get pod <pod-name> -n dytallix -o jsonpath='{.spec.securityContext}'

# Check Workload Identity
kubectl get serviceaccount dytallix-bridge-sa -n dytallix -o yaml
```

## Monitoring and Alerting

### Key Metrics to Monitor

1. **RBAC Violations**: Unauthorized access attempts
2. **Network Policy Denials**: Blocked connections
3. **Pod Security Violations**: Security context failures
4. **Service Account Usage**: Unusual permission usage

### Alert Rules

```yaml
# Example Prometheus alert for RBAC violations
- alert: RBACViolation
  expr: increase(apiserver_audit_total{verb="create",objectRef_resource="pods",user=~"system:serviceaccount:dytallix:.*"}[5m]) > 0
  labels:
    severity: warning
  annotations:
    summary: "Potential RBAC violation detected"
```

## Maintenance

### Regular Tasks

1. **Quarterly Reviews**: Review and update RBAC permissions
2. **Security Scanning**: Run validation script in CI/CD
3. **Compliance Audits**: Verify CIS benchmark compliance
4. **Permission Audits**: Review service account usage logs

### Updates and Changes

When modifying RBAC:
1. Update the appropriate YAML files
2. Test changes in staging environment
3. Run validation script to verify security
4. Deploy with rolling updates to avoid downtime
5. Monitor for any access issues post-deployment

## Support

For questions or issues with RBAC implementation:

1. Check the troubleshooting section above
2. Run the validation script for diagnostics
3. Review Kubernetes audit logs for access patterns
4. Consult the security team for compliance questions

---

**Last Updated**: $(date +%Y-%m-%d)
**Version**: 1.0.0
**Compliance**: CIS Kubernetes Benchmark, SOC 2 Type II, NIST CSF