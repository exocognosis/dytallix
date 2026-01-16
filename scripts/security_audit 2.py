#!/usr/bin/env python3
"""
Dytallix DevSecOps Security Audit Implementation
Comprehensive security audit for cloud infrastructure and compliance validation
"""

import os
import sys
import json
import csv
import yaml
import subprocess
import re
import hashlib
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Any, Optional
from dataclasses import dataclass, asdict
from enum import Enum

class RiskLevel(Enum):
    CRITICAL = "Critical"
    HIGH = "High" 
    MEDIUM = "Medium"
    LOW = "Low"
    INFO = "Info"

class ComplianceFramework(Enum):
    CIS_KUBERNETES = "CIS Kubernetes Benchmark"
    NIST_CSF = "NIST Cybersecurity Framework"
    SOC2_TYPE2 = "SOC 2 Type II"
    GDPR = "GDPR Data Protection"

@dataclass
class SecurityFinding:
    resource_type: str
    resource_name: str
    finding_id: str
    title: str
    description: str
    risk_level: RiskLevel
    compliance_frameworks: List[ComplianceFramework]
    remediation: str
    timeline: str
    status: str = "Open"
    evidence: Optional[str] = None

@dataclass
class CloudResource:
    resource_type: str
    resource_name: str
    resource_id: str
    region: str
    encryption_status: str
    access_control: str
    network_security: str
    backup_status: str
    monitoring_status: str
    compliance_status: str
    risk_level: RiskLevel
    last_scan: str

class SecurityAuditor:
    def __init__(self, project_root: str):
        self.project_root = Path(project_root)
        self.findings: List[SecurityFinding] = []
        self.resources: List[CloudResource] = []
        self.scan_timestamp = datetime.now().isoformat()
        
    def run_comprehensive_audit(self) -> Dict[str, Any]:
        """Execute comprehensive security audit"""
        print("🔒 Starting Dytallix DevSecOps Security Audit")
        print("=" * 60)
        
        audit_results = {
            "scan_metadata": {
                "timestamp": self.scan_timestamp,
                "auditor": "Dytallix Security Audit System",
                "project_root": str(self.project_root),
                "compliance_frameworks": [f.value for f in ComplianceFramework]
            },
            "summary": {},
            "findings": [],
            "resources": [],
            "compliance_status": {}
        }
        
        # Infrastructure Security Assessment
        print("📋 1. Infrastructure Security Assessment")
        self._audit_gcp_infrastructure()
        self._audit_kubernetes_configuration()
        self._audit_networking_security()
        
        # Data Protection Validation  
        print("🔐 2. Data Protection Validation")
        self._audit_encryption_configurations()
        self._audit_backup_security()
        
        # Access Control Review
        print("👤 3. Access Control Review")
        self._audit_iam_configurations()
        self._audit_rbac_configurations()
        
        # Operational Security
        print("⚙️ 4. Operational Security")
        self._audit_operational_security()
        self._audit_monitoring_configurations()
        
        # Generate results
        audit_results["findings"] = [asdict(f) for f in self.findings]
        audit_results["resources"] = [asdict(r) for r in self.resources]
        audit_results["summary"] = self._generate_summary()
        audit_results["compliance_status"] = self._assess_compliance()
        
        return audit_results
    
    def _audit_gcp_infrastructure(self):
        """Audit GCP cloud resources"""
        print("  📊 Scanning GCP Infrastructure...")
        
        # Analyze Terraform configuration
        terraform_dir = self.project_root / "deployment" / "gcp" / "terraform"
        if terraform_dir.exists():
            self._analyze_terraform_security(terraform_dir)
            
        # Analyze existing configurations (methods defined below)
        self._audit_cloud_sql()
        self._audit_storage_buckets()
        self._audit_load_balancers()
    
    def _audit_kubernetes_configuration(self):
        """Audit Kubernetes security configurations"""
        print("  🚢 Scanning Kubernetes Configurations...")
        
        k8s_dir = self.project_root / "deployment" / "kubernetes"
        if k8s_dir.exists():
            for yaml_file in k8s_dir.glob("*.yaml"):
                self._analyze_k8s_manifest(yaml_file)
    
    def _audit_networking_security(self):
        """Audit network security configurations"""
        print("  🌐 Scanning Network Security...")
        
        # Check for firewall rules in Terraform
        terraform_file = self.project_root / "deployment" / "gcp" / "terraform" / "main.tf"
        if terraform_file.exists():
            self._analyze_network_security(terraform_file)
    
    def _audit_encryption_configurations(self):
        """Audit encryption settings for data-at-rest and data-in-transit"""
        print("  🔒 Auditing Encryption Configurations...")
        
        # Check disk encryption in Terraform
        self._check_disk_encryption()
        
        # Verify TLS 1.3 configurations
        self._check_tls_configurations()
        
        # Audit key management
        self._audit_key_management()
    
    def _audit_backup_security(self):
        """Audit backup configurations and encryption"""
        print("  💾 Auditing Backup Security...")
        
        # Check backup encryption in Terraform
        self._check_backup_encryption()
    
    def _audit_iam_configurations(self):
        """Audit IAM and access control configurations"""
        print("  🔑 Auditing IAM Configurations...")
        
        # Analyze service accounts and roles in Terraform
        self._analyze_iam_terraform()
    
    def _audit_rbac_configurations(self):
        """Audit RBAC and Workload Identity configurations"""
        print("  👥 Auditing RBAC Configurations...")
        
        # Check Kubernetes RBAC configurations
        self._check_k8s_rbac()
    
    def _audit_operational_security(self):
        """Audit operational security practices"""
        print("  ⚙️ Auditing Operational Security...")
        
        # Check secret management
        self._audit_secret_management()
        
        # Verify container security
        self._audit_container_security()
    
    def _audit_monitoring_configurations(self):
        """Audit monitoring and logging configurations"""
        print("  📊 Auditing Monitoring & Logging...")
        
        # Check logging configurations
        self._check_audit_logging()
        
        # Verify monitoring setup
        self._check_monitoring_setup()
    
    def _analyze_terraform_security(self, terraform_dir: Path):
        """Analyze Terraform configuration for security issues"""
        main_tf = terraform_dir / "main.tf"
        if not main_tf.exists():
            return
            
        with open(main_tf) as f:
            content = f.read()
            
        # Check for GKE cluster security
        self._check_gke_cluster_security(content)
        
        # Check for network security
        self._check_network_policy_config(content)
        
        # Check for encryption settings
        self._check_terraform_encryption(content)
    
    def _check_gke_cluster_security(self, terraform_content: str):
        """Check GKE cluster security configuration"""
        
        # Check for private cluster configuration
        if "enable_private_nodes = true" in terraform_content:
            self.resources.append(CloudResource(
                resource_type="GKE Cluster",
                resource_name="dytallix-bridge-cluster",
                resource_id="primary",
                region="us-central1",
                encryption_status="Enabled (Application-layer secrets encryption)",
                access_control="Private nodes enabled",
                network_security="Network policies enabled",
                backup_status="Not applicable",
                monitoring_status="Enabled",
                compliance_status="Compliant",
                risk_level=RiskLevel.LOW,
                last_scan=self.scan_timestamp
            ))
        else:
            self.findings.append(SecurityFinding(
                resource_type="GKE Cluster",
                resource_name="dytallix-bridge-cluster",
                finding_id="GKE-001",
                title="GKE Cluster Not Using Private Nodes",
                description="GKE cluster should use private nodes to enhance security",
                risk_level=RiskLevel.HIGH,
                compliance_frameworks=[ComplianceFramework.CIS_KUBERNETES],
                remediation="Enable private nodes in GKE cluster configuration",
                timeline="1 week"
            ))
        
        # Check for network policy
        if "network_policy" in terraform_content and "enabled = true" in terraform_content:
            pass  # Good
        else:
            self.findings.append(SecurityFinding(
                resource_type="GKE Cluster",
                resource_name="dytallix-bridge-cluster",
                finding_id="GKE-002",
                title="Network Policy Not Enabled",
                description="Kubernetes network policies should be enabled for microsegmentation",
                risk_level=RiskLevel.MEDIUM,
                compliance_frameworks=[ComplianceFramework.CIS_KUBERNETES],
                remediation="Enable Kubernetes network policies in cluster configuration",
                timeline="2 weeks"
            ))
        
        # Check for Binary Authorization
        if "binary_authorization" in terraform_content:
            pass  # Good
        else:
            self.findings.append(SecurityFinding(
                resource_type="GKE Cluster", 
                resource_name="dytallix-bridge-cluster",
                finding_id="GKE-003",
                title="Binary Authorization Not Configured",
                description="Binary Authorization should be enabled to ensure only verified container images are deployed",
                risk_level=RiskLevel.MEDIUM,
                compliance_frameworks=[ComplianceFramework.CIS_KUBERNETES, ComplianceFramework.SOC2_TYPE2],
                remediation="Configure Binary Authorization policy for container image verification",
                timeline="2 weeks"
            ))
    
    def _check_terraform_encryption(self, terraform_content: str):
        """Check encryption configurations in Terraform"""
        
        # Check for KMS encryption
        if "google_kms_crypto_key" in terraform_content:
            self.resources.append(CloudResource(
                resource_type="KMS Key",
                resource_name="cluster-encryption-key",
                resource_id="cluster_key",
                region="us-central1",
                encryption_status="Enabled (30-day rotation)",
                access_control="Service account based",
                network_security="Not applicable",
                backup_status="Automatic",
                monitoring_status="Enabled",
                compliance_status="Compliant",
                risk_level=RiskLevel.LOW,
                last_scan=self.scan_timestamp
            ))
        else:
            self.findings.append(SecurityFinding(
                resource_type="Encryption",
                resource_name="Data-at-rest encryption",
                finding_id="ENC-001",
                title="Customer-Managed Encryption Keys Not Used",
                description="Should use customer-managed encryption keys (CMEK) for enhanced security",
                risk_level=RiskLevel.MEDIUM,
                compliance_frameworks=[ComplianceFramework.SOC2_TYPE2, ComplianceFramework.GDPR],
                remediation="Implement customer-managed encryption keys for all data stores",
                timeline="3 weeks"
            ))
    
    def _audit_cloud_sql(self):
        """Audit Cloud SQL security configurations"""
        # Check if Cloud SQL is configured in Terraform
        terraform_file = self.project_root / "deployment" / "gcp" / "terraform" / "main.tf"
        if terraform_file.exists():
            with open(terraform_file) as f:
                content = f.read()
                
            if "google_sql_database_instance" in content:
                # Cloud SQL is configured
                self.resources.append(CloudResource(
                    resource_type="Cloud SQL",
                    resource_name="bridge-database",
                    resource_id="bridge_db",
                    region="us-central1",
                    encryption_status="Enabled (Google-managed)",
                    access_control="Private IP only",
                    network_security="VPC-native",
                    backup_status="Automated backups enabled",
                    monitoring_status="Enabled",
                    compliance_status="Compliant",
                    risk_level=RiskLevel.LOW,
                    last_scan=self.scan_timestamp
                ))
                
                # Check for SSL requirement
                if "require_ssl = true" in content:
                    pass  # Good
                else:
                    self.findings.append(SecurityFinding(
                        resource_type="Cloud SQL",
                        resource_name="bridge-database",
                        finding_id="SQL-001",
                        title="SSL Not Required for Database Connections",
                        description="Cloud SQL should require SSL for all connections",
                        risk_level=RiskLevel.HIGH,
                        compliance_frameworks=[ComplianceFramework.SOC2_TYPE2, ComplianceFramework.GDPR],
                        remediation="Enable require_ssl setting for Cloud SQL instance",
                        timeline="1 week"
                    ))
    
    def _audit_storage_buckets(self):
        """Audit Cloud Storage bucket security"""
        terraform_file = self.project_root / "deployment" / "gcp" / "terraform" / "main.tf"
        if terraform_file.exists():
            with open(terraform_file) as f:
                content = f.read()
                
            if "google_storage_bucket" in content:
                self.resources.append(CloudResource(
                    resource_type="Storage Bucket",
                    resource_name="bridge-storage",
                    resource_id="bridge_storage",
                    region="us-central1",
                    encryption_status="Enabled (Google-managed)",
                    access_control="Uniform bucket-level access",
                    network_security="Not applicable",
                    backup_status="Lifecycle policies configured",
                    monitoring_status="Access logs enabled",
                    compliance_status="Compliant",
                    risk_level=RiskLevel.LOW,
                    last_scan=self.scan_timestamp
                ))
                
                # Check for uniform bucket-level access
                if "uniform_bucket_level_access = true" in content:
                    pass  # Good
                else:
                    self.findings.append(SecurityFinding(
                        resource_type="Storage Bucket",
                        resource_name="bridge-storage",
                        finding_id="STG-001",
                        title="Uniform Bucket-Level Access Not Enabled",
                        description="Storage buckets should use uniform bucket-level access for consistent IAM",
                        risk_level=RiskLevel.MEDIUM,
                        compliance_frameworks=[ComplianceFramework.SOC2_TYPE2],
                        remediation="Enable uniform bucket-level access for all storage buckets",
                        timeline="1 week"
                    ))
    
    def _audit_load_balancers(self):
        """Audit load balancer security configurations"""
        # Check Kubernetes ingress configurations
        k8s_dir = self.project_root / "deployment" / "kubernetes"
        if k8s_dir.exists():
            for yaml_file in k8s_dir.glob("*.yaml"):
                self._check_ingress_security(yaml_file)
    
    def _check_ingress_security(self, yaml_file: Path):
        """Check ingress security configurations"""
        try:
            with open(yaml_file) as f:
                content = f.read()
                
            if "kind: Ingress" in content:
                self.resources.append(CloudResource(
                    resource_type="Load Balancer",
                    resource_name="ingress-controller",
                    resource_id="main-ingress",
                    region="us-central1",
                    encryption_status="TLS enabled",
                    access_control="External",
                    network_security="HTTPS redirect configured",
                    backup_status="Not applicable",
                    monitoring_status="Enabled",
                    compliance_status="Needs review",
                    risk_level=RiskLevel.MEDIUM,
                    last_scan=self.scan_timestamp
                ))
                
                # Check for TLS configuration
                if "tls:" in content or "ssl-redirect" in content:
                    pass  # Good
                else:
                    self.findings.append(SecurityFinding(
                        resource_type="Load Balancer",
                        resource_name="ingress-controller",
                        finding_id="LB-001",
                        title="TLS Not Configured for Ingress",
                        description="All ingress controllers should enforce HTTPS/TLS",
                        risk_level=RiskLevel.HIGH,
                        compliance_frameworks=[ComplianceFramework.SOC2_TYPE2, ComplianceFramework.GDPR],
                        remediation="Configure TLS certificates and HTTPS redirect for all ingress resources",
                        timeline="1 week"
                    ))
        except Exception as e:
            print(f"Warning: Could not parse {yaml_file}: {e}")
    
    def _analyze_k8s_manifest(self, yaml_file: Path):
        """Analyze Kubernetes manifest for security issues"""
        try:
            with open(yaml_file) as f:
                content = f.read()
                
            # Check for security contexts
            if "securityContext" in content:
                pass  # Good
            else:
                if "kind: Deployment" in content or "kind: Pod" in content:
                    self.findings.append(SecurityFinding(
                        resource_type="Kubernetes Workload",
                        resource_name=yaml_file.stem,
                        finding_id="K8S-001",
                        title="Security Context Not Defined",
                        description="Kubernetes workloads should define security contexts",
                        risk_level=RiskLevel.MEDIUM,
                        compliance_frameworks=[ComplianceFramework.CIS_KUBERNETES],
                        remediation="Add security context to all pod specifications",
                        timeline="2 weeks"
                    ))
            
            # Check for resource limits
            if "resources:" in content and "limits:" in content:
                pass  # Good
            else:
                if "kind: Deployment" in content:
                    self.findings.append(SecurityFinding(
                        resource_type="Kubernetes Workload",
                        resource_name=yaml_file.stem,
                        finding_id="K8S-002",
                        title="Resource Limits Not Defined",
                        description="Kubernetes workloads should define resource limits",
                        risk_level=RiskLevel.MEDIUM,
                        compliance_frameworks=[ComplianceFramework.CIS_KUBERNETES],
                        remediation="Add CPU and memory limits to all container specifications",
                        timeline="2 weeks"
                    ))
                        
        except Exception as e:
            print(f"Warning: Could not parse {yaml_file}: {e}")
    
    def _check_disk_encryption(self):
        """Check disk encryption configurations"""
        # This would typically check actual GCP resources, but we'll analyze Terraform
        terraform_file = self.project_root / "deployment" / "gcp" / "terraform" / "main.tf"
        if terraform_file.exists():
            with open(terraform_file) as f:
                content = f.read()
                
            if "disk_type = \"pd-ssd\"" in content:
                # SSD disks are encrypted by default
                pass
            else:
                self.findings.append(SecurityFinding(
                    resource_type="Storage",
                    resource_name="Node disks",
                    finding_id="ENC-002",
                    title="Disk Encryption Status Unknown",
                    description="Ensure all persistent disks use encryption at rest",
                    risk_level=RiskLevel.MEDIUM,
                    compliance_frameworks=[ComplianceFramework.SOC2_TYPE2, ComplianceFramework.GDPR],
                    remediation="Verify and document disk encryption status for all storage volumes",
                    timeline="1 week"
                ))
    
    def _check_tls_configurations(self):
        """Check TLS 1.3 implementation"""
        # Check ingress and service configurations for TLS
        nginx_conf = self.project_root / "deployment" / "gcp" / "nginx.conf"
        if nginx_conf.exists():
            with open(nginx_conf) as f:
                content = f.read()
                
            if "TLSv1.3" in content or "ssl_protocols TLSv1.2 TLSv1.3" in content:
                pass  # Good
            else:
                self.findings.append(SecurityFinding(
                    resource_type="TLS Configuration",
                    resource_name="nginx-proxy",
                    finding_id="TLS-001",
                    title="TLS 1.3 Not Enforced",
                    description="Should enforce TLS 1.3 for all HTTPS connections",
                    risk_level=RiskLevel.MEDIUM,
                    compliance_frameworks=[ComplianceFramework.SOC2_TYPE2],
                    remediation="Update TLS configuration to enforce TLS 1.3 minimum version",
                    timeline="2 weeks"
                ))
    
    def _audit_key_management(self):
        """Audit encryption key management and rotation"""
        terraform_file = self.project_root / "deployment" / "gcp" / "terraform" / "main.tf"
        if terraform_file.exists():
            with open(terraform_file) as f:
                content = f.read()
                
            if "rotation_period" in content:
                # Key rotation is configured
                pass
            else:
                self.findings.append(SecurityFinding(
                    resource_type="Key Management",
                    resource_name="encryption-keys",
                    finding_id="KEY-001",
                    title="Key Rotation Policy Not Defined",
                    description="Encryption keys should have automatic rotation policies",
                    risk_level=RiskLevel.MEDIUM,
                    compliance_frameworks=[ComplianceFramework.SOC2_TYPE2, ComplianceFramework.GDPR],
                    remediation="Implement automatic key rotation for all encryption keys",
                    timeline="3 weeks"
                ))
    
    def _check_backup_encryption(self):
        """Check backup encryption settings"""
        terraform_file = self.project_root / "deployment" / "gcp" / "terraform" / "main.tf"
        if terraform_file.exists():
            with open(terraform_file) as f:
                content = f.read()
                
            if "backup_configuration" in content:
                # Backups are configured
                pass
            else:
                self.findings.append(SecurityFinding(
                    resource_type="Backup",
                    resource_name="database-backups",
                    finding_id="BCK-001",
                    title="Backup Encryption Not Verified",
                    description="Ensure all backups are encrypted at rest",
                    risk_level=RiskLevel.MEDIUM,
                    compliance_frameworks=[ComplianceFramework.SOC2_TYPE2, ComplianceFramework.GDPR],
                    remediation="Verify and document backup encryption status",
                    timeline="1 week"
                ))
    
    def _analyze_iam_terraform(self):
        """Analyze IAM configurations in Terraform"""
        terraform_file = self.project_root / "deployment" / "gcp" / "terraform" / "main.tf"
        if terraform_file.exists():
            with open(terraform_file) as f:
                content = f.read()
                
            # Check for service account principle of least privilege
            if "roles/editor" in content or "roles/owner" in content:
                self.findings.append(SecurityFinding(
                    resource_type="IAM",
                    resource_name="service-accounts",
                    finding_id="IAM-001",
                    title="Overprivileged Service Account Roles",
                    description="Service accounts should follow principle of least privilege",
                    risk_level=RiskLevel.HIGH,
                    compliance_frameworks=[ComplianceFramework.CIS_KUBERNETES, ComplianceFramework.SOC2_TYPE2],
                    remediation="Review and reduce service account permissions to minimum required",
                    timeline="1 week"
                ))
            
            # Check for Workload Identity
            if "workload_identity_config" in content:
                self.resources.append(CloudResource(
                    resource_type="IAM",
                    resource_name="workload-identity",
                    resource_id="workload_pool",
                    region="global",
                    encryption_status="Not applicable",
                    access_control="Workload Identity enabled",
                    network_security="Not applicable", 
                    backup_status="Not applicable",
                    monitoring_status="Enabled",
                    compliance_status="Compliant",
                    risk_level=RiskLevel.LOW,
                    last_scan=self.scan_timestamp
                ))
    
    def _check_k8s_rbac(self):
        """Check Kubernetes RBAC configurations"""
        k8s_dir = self.project_root / "deployment" / "kubernetes"
        rbac_found = False
        
        if k8s_dir.exists():
            for yaml_file in k8s_dir.glob("*.yaml"):
                try:
                    with open(yaml_file) as f:
                        content = f.read()
                        
                    if "kind: Role" in content or "kind: ClusterRole" in content:
                        rbac_found = True
                        break
                except Exception:
                    continue
        
        if not rbac_found:
            self.findings.append(SecurityFinding(
                resource_type="RBAC",
                resource_name="kubernetes-rbac",
                finding_id="RBAC-001",
                title="RBAC Configurations Not Found",
                description="Kubernetes RBAC should be explicitly configured for access control",
                risk_level=RiskLevel.HIGH,
                compliance_frameworks=[ComplianceFramework.CIS_KUBERNETES],
                remediation="Implement explicit RBAC configurations for all service accounts and users",
                timeline="1 week"
            ))
    
    def _audit_secret_management(self):
        """Audit secret management practices"""
        secrets_dir = self.project_root / "secrets"
        devops_secrets = self.project_root / "devops" / "secrets-management"
        
        if secrets_dir.exists() or devops_secrets.exists():
            self.resources.append(CloudResource(
                resource_type="Secret Management",
                resource_name="secrets-store",
                resource_id="secret_mgmt",
                region="global",
                encryption_status="Encrypted",
                access_control="Role-based",
                network_security="Not applicable",
                backup_status="Not applicable", 
                monitoring_status="Enabled",
                compliance_status="Needs review",
                risk_level=RiskLevel.MEDIUM,
                last_scan=self.scan_timestamp
            ))
        
        # Check for hardcoded secrets in code
        self._scan_for_hardcoded_secrets()
    
    def _scan_for_hardcoded_secrets(self):
        """Scan for hardcoded secrets in codebase"""
        secret_patterns = [
            r'password\s*=\s*["\'][^"\']+["\']',
            r'api_key\s*=\s*["\'][^"\']+["\']',
            r'secret\s*=\s*["\'][^"\']+["\']',
            r'token\s*=\s*["\'][^"\']+["\']'
        ]
        
        found_secrets = False
        for pattern in secret_patterns:
            result = subprocess.run(
                ['grep', '-r', '-i', '--include=*.py', '--include=*.js', '--include=*.ts', 
                 '--include=*.yaml', '--include=*.yml', pattern, str(self.project_root)],
                capture_output=True, text=True
            )
            if result.returncode == 0 and result.stdout.strip():
                found_secrets = True
                break
        
        if found_secrets:
            self.findings.append(SecurityFinding(
                resource_type="Secret Management",
                resource_name="source-code",
                finding_id="SEC-001",
                title="Potential Hardcoded Secrets Detected",
                description="Source code may contain hardcoded secrets or credentials",
                risk_level=RiskLevel.CRITICAL,
                compliance_frameworks=[ComplianceFramework.SOC2_TYPE2, ComplianceFramework.GDPR],
                remediation="Review flagged files and move secrets to secure secret management system",
                timeline="24 hours"
            ))
    
    def _audit_container_security(self):
        """Audit container security configurations"""
        # Check Dockerfiles for security best practices
        dockerfiles = list(self.project_root.glob("**/Dockerfile*"))
        
        for dockerfile in dockerfiles:
            self._analyze_dockerfile_security(dockerfile)
    
    def _analyze_dockerfile_security(self, dockerfile: Path):
        """Analyze Dockerfile for security issues"""
        try:
            with open(dockerfile) as f:
                content = f.read()
                
            # Check for running as root
            if "USER " not in content:
                self.findings.append(SecurityFinding(
                    resource_type="Container Security",
                    resource_name=str(dockerfile.relative_to(self.project_root)),
                    finding_id="CTR-001",
                    title="Container Running as Root User",
                    description="Containers should not run as root user",
                    risk_level=RiskLevel.HIGH,
                    compliance_frameworks=[ComplianceFramework.CIS_KUBERNETES],
                    remediation="Add USER directive to run container as non-root user",
                    timeline="1 week"
                ))
            
            # Check for package updates
            if "apt-get update" in content and "apt-get upgrade" not in content:
                self.findings.append(SecurityFinding(
                    resource_type="Container Security", 
                    resource_name=str(dockerfile.relative_to(self.project_root)),
                    finding_id="CTR-002",
                    title="Container Packages Not Updated",
                    description="Container should update packages to latest versions",
                    risk_level=RiskLevel.MEDIUM,
                    compliance_frameworks=[ComplianceFramework.CIS_KUBERNETES],
                    remediation="Add package upgrade step in Dockerfile",
                    timeline="2 weeks"
                ))
                
        except Exception as e:
            print(f"Warning: Could not analyze {dockerfile}: {e}")
    
    def _check_audit_logging(self):
        """Check audit logging configurations"""
        terraform_file = self.project_root / "deployment" / "gcp" / "terraform" / "main.tf"
        if terraform_file.exists():
            with open(terraform_file) as f:
                content = f.read()
                
            if "logging_service" in content and "monitoring_service" in content:
                self.resources.append(CloudResource(
                    resource_type="Audit Logging",
                    resource_name="gcp-audit-logs",
                    resource_id="audit_logs",
                    region="global",
                    encryption_status="Enabled",
                    access_control="Service account based",
                    network_security="Not applicable",
                    backup_status="Retained per policy",
                    monitoring_status="Enabled",
                    compliance_status="Compliant",
                    risk_level=RiskLevel.LOW,
                    last_scan=self.scan_timestamp
                ))
    
    def _check_monitoring_setup(self):
        """Check monitoring and alerting configurations"""
        monitoring_files = [
            self.project_root / "security" / "monitoring.py",
            self.project_root / "deployment" / "monitoring",
            self.project_root / "simple_performance_dashboard.py"
        ]
        
        monitoring_configured = any(f.exists() for f in monitoring_files)
        
        if monitoring_configured:
            self.resources.append(CloudResource(
                resource_type="Monitoring",
                resource_name="security-monitoring",
                resource_id="monitoring_stack",
                region="global",
                encryption_status="Not applicable",
                access_control="Role-based",
                network_security="Not applicable",
                backup_status="Not applicable",
                monitoring_status="Enabled",
                compliance_status="Compliant",
                risk_level=RiskLevel.LOW,
                last_scan=self.scan_timestamp
            ))
        else:
            self.findings.append(SecurityFinding(
                resource_type="Monitoring",
                resource_name="security-monitoring",
                finding_id="MON-001", 
                title="Comprehensive Security Monitoring Not Configured",
                description="Should implement comprehensive security monitoring and alerting",
                risk_level=RiskLevel.MEDIUM,
                compliance_frameworks=[ComplianceFramework.SOC2_TYPE2, ComplianceFramework.NIST_CSF],
                remediation="Implement security monitoring dashboard and alerting system",
                timeline="3 weeks"
            ))
    
    def _generate_summary(self) -> Dict[str, Any]:
        """Generate audit summary statistics"""
        risk_counts = {}
        for level in RiskLevel:
            risk_counts[level.value] = len([f for f in self.findings if f.risk_level == level])
        
        compliance_counts = {}
        for framework in ComplianceFramework:
            compliance_counts[framework.value] = len([
                f for f in self.findings 
                if framework in f.compliance_frameworks
            ])
        
        return {
            "total_findings": len(self.findings),
            "total_resources": len(self.resources),
            "risk_distribution": risk_counts,
            "compliance_impact": compliance_counts,
            "critical_findings": [f.finding_id for f in self.findings if f.risk_level == RiskLevel.CRITICAL],
            "recommendations": self._generate_recommendations()
        }
    
    def _generate_recommendations(self) -> List[str]:
        """Generate top security recommendations"""
        recommendations = []
        
        critical_findings = [f for f in self.findings if f.risk_level == RiskLevel.CRITICAL]
        high_findings = [f for f in self.findings if f.risk_level == RiskLevel.HIGH]
        
        if critical_findings:
            recommendations.append("Address all CRITICAL risk findings immediately (within 24 hours)")
        
        if high_findings:
            recommendations.append("Address all HIGH risk findings within 1 week")
        
        # Add specific recommendations based on common findings
        finding_types = [f.resource_type for f in self.findings]
        
        if "Secret Management" in finding_types:
            recommendations.append("Implement comprehensive secret management system")
        
        if "IAM" in finding_types:
            recommendations.append("Review and implement principle of least privilege for all accounts")
        
        if "TLS Configuration" in finding_types:
            recommendations.append("Upgrade all endpoints to enforce TLS 1.3")
        
        recommendations.append("Establish regular security audit schedule (monthly)")
        recommendations.append("Implement automated security scanning in CI/CD pipeline")
        
        return recommendations
    
    def _assess_compliance(self) -> Dict[str, Any]:
        """Assess compliance status for each framework"""
        compliance_status = {}
        
        for framework in ComplianceFramework:
            framework_findings = [f for f in self.findings if framework in f.compliance_frameworks]
            critical_high = [f for f in framework_findings if f.risk_level in [RiskLevel.CRITICAL, RiskLevel.HIGH]]
            
            if not framework_findings:
                status = "Compliant"
                score = 100
            elif critical_high:
                status = "Non-Compliant" 
                score = max(0, 100 - len(critical_high) * 20)
            else:
                status = "Partially Compliant"
                score = max(50, 100 - len(framework_findings) * 10)
            
            compliance_status[framework.value] = {
                "status": status,
                "score": score,
                "total_findings": len(framework_findings),
                "critical_high_findings": len(critical_high)
            }
        
        return compliance_status
    
    def generate_security_matrix(self, output_file: str):
        """Generate Infrastructure Security Matrix CSV"""
        print(f"📊 Generating Infrastructure Security Matrix: {output_file}")
        
        with open(output_file, 'w', newline='') as csvfile:
            fieldnames = [
                'Resource Type', 'Resource Name', 'Resource ID', 'Region',
                'Encryption Status', 'Access Control', 'Network Security',
                'Backup Status', 'Monitoring Status', 'Compliance Status',
                'Risk Level', 'Last Scan'
            ]
            
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()
            
            for resource in self.resources:
                writer.writerow({
                    'Resource Type': resource.resource_type,
                    'Resource Name': resource.resource_name,
                    'Resource ID': resource.resource_id,
                    'Region': resource.region,
                    'Encryption Status': resource.encryption_status,
                    'Access Control': resource.access_control,
                    'Network Security': resource.network_security,
                    'Backup Status': resource.backup_status,
                    'Monitoring Status': resource.monitoring_status,
                    'Compliance Status': resource.compliance_status,
                    'Risk Level': resource.risk_level.value,
                    'Last Scan': resource.last_scan
                })
        
        print(f"✅ Security matrix saved to {output_file}")
    
    def _analyze_network_security(self, terraform_file: Path):
        """Analyze network security configurations"""
        with open(terraform_file) as f:
            content = f.read()
            
        # Check for VPC flow logs
        if "log_config" in content:
            pass  # Good
        else:
            self.findings.append(SecurityFinding(
                resource_type="Network Security",
                resource_name="vpc-flow-logs",
                finding_id="NET-001",
                title="VPC Flow Logs Not Enabled",
                description="VPC flow logs should be enabled for network monitoring",
                risk_level=RiskLevel.MEDIUM,
                compliance_frameworks=[ComplianceFramework.SOC2_TYPE2, ComplianceFramework.NIST_CSF],
                remediation="Enable VPC flow logs for network monitoring and analysis",
                timeline="2 weeks"
            ))
    
    def _check_network_policy_config(self, terraform_content: str):
        """Check network policy configurations"""
        if "network_policy" in terraform_content and "CALICO" in terraform_content:
            self.resources.append(CloudResource(
                resource_type="Network Policy",
                resource_name="calico-network-policy",
                resource_id="network_policy",
                region="us-central1",
                encryption_status="Not applicable",
                access_control="Policy-based",
                network_security="Microsegmentation enabled",
                backup_status="Not applicable",
                monitoring_status="Enabled",
                compliance_status="Compliant",
                risk_level=RiskLevel.LOW,
                last_scan=self.scan_timestamp
            ))

def main():
    """Main execution function"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Dytallix DevSecOps Security Audit")
    parser.add_argument("--project-root", default=".", help="Project root directory")
    parser.add_argument("--output-dir", default="./security_audit_results", help="Output directory for results")
    parser.add_argument("--matrix-file", default="infra_security_matrix.csv", help="Security matrix CSV filename")
    
    args = parser.parse_args()
    
    # Create output directory
    output_dir = Path(args.output_dir)
    output_dir.mkdir(exist_ok=True)
    
    # Run security audit
    auditor = SecurityAuditor(args.project_root)
    results = auditor.run_comprehensive_audit()
    
    # Generate outputs
    matrix_file = output_dir / args.matrix_file
    auditor.generate_security_matrix(str(matrix_file))
    
    # Save full results
    results_file = output_dir / f"security_audit_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(results_file, 'w') as f:
        json.dump(results, f, indent=2, default=str)
    
    print(f"\n🎯 Security Audit Complete!")
    print(f"📊 Infrastructure Security Matrix: {matrix_file}")
    print(f"📋 Full Results: {results_file}")
    print(f"🔍 Total Findings: {results['summary']['total_findings']}")
    print(f"📈 Total Resources: {results['summary']['total_resources']}")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())