# Day 2: Kubernetes RBAC Implementation Guide

## Overview
Implement comprehensive RBAC controls and security contexts for all Kubernetes workloads.

## Files to Create/Modify
1. Service Accounts for each microservice
2. ClusterRoles with minimal permissions
3. RoleBindings for namespace access
4. Pod Security Contexts in all manifests
5. Network Policies for microsegmentation

## Implementation Steps

### Step 1: Create RBAC Resources
```bash
kubectl apply -f ./security-implementation/day2-rbac/
```

### Step 2: Update Existing Deployments
```bash
./security-implementation/day2-rbac/update_deployments.sh
```

### Step 3: Test RBAC Permissions
```bash
./security-implementation/day2-rbac/test_rbac.sh
```

### Step 4: Validate Security Contexts
```bash
./security-implementation/day2-rbac/validate_security_contexts.sh
```

## Expected Results
- Each service has dedicated ServiceAccount
- Minimal RBAC permissions applied
- All pods run with security contexts
- Network policies restrict traffic

## Validation Checklist
- [ ] ServiceAccounts created for all services
- [ ] ClusterRoles follow least privilege
- [ ] RoleBindings correctly applied
- [ ] Pods run as non-root (runAsUser: 1000)
- [ ] Network policies enforce microsegmentation
- [ ] No privilege escalation allowed

## Next Steps
Commit changes with: `git commit -m "security: implement comprehensive RBAC and pod security contexts"`
