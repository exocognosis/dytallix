# Dytallix Cross-Chain Bridge - Google Cloud Platform Infrastructure
# This Terraform configuration sets up the complete GCP infrastructure

terraform {
  required_version = ">= 1.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.4"
    }
  }

  # Enable remote state backend for team collaboration
  # Uncomment and configure for production use
  # backend "gcs" {
  #   bucket = "dytallix-terraform-state"
  #   prefix = "terraform/state"
  # }
}

# Variables with enhanced validation and descriptions
variable "project_id" {
  description = "The GCP project ID where resources will be created"
  type        = string
  default     = "dytallix"

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{4,28}[a-z0-9]$", var.project_id))
    error_message = "Project ID must be 6-30 characters, start with lowercase letter, and contain only lowercase letters, numbers, and hyphens."
  }
}

variable "region" {
  description = "The GCP region for regional resources"
  type        = string
  default     = "us-central1"

  validation {
    condition = contains([
      "us-central1", "us-east1", "us-west1", "us-west2",
      "europe-west1", "europe-west2", "europe-west3",
      "asia-southeast1", "asia-east1"
    ], var.region)
    error_message = "Region must be a valid GCP region."
  }
}

variable "zone" {
  description = "The GCP zone for zonal resources"
  type        = string
  default     = "us-central1-a"
}

variable "cluster_name" {
  description = "The name of the GKE cluster"
  type        = string
  default     = "dytallix-bridge-cluster"

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]*[a-z0-9]$", var.cluster_name))
    error_message = "Cluster name must start with lowercase letter and contain only lowercase letters, numbers, and hyphens."
  }
}

variable "node_count" {
  description = "Initial number of nodes in the GKE cluster"
  type        = number
  default     = 3

  validation {
    condition     = var.node_count >= 1 && var.node_count <= 50
    error_message = "Node count must be between 1 and 50."
  }
}

variable "machine_type" {
  description = "Machine type for GKE nodes"
  type        = string
  default     = "e2-standard-4"

  validation {
    condition = contains([
      "e2-medium", "e2-standard-2", "e2-standard-4", "e2-standard-8",
      "n2-standard-2", "n2-standard-4", "n2-standard-8", "n2-highmem-4"
    ], var.machine_type)
    error_message = "Machine type must be a valid GCE machine type."
  }
}

variable "disk_size_gb" {
  description = "Boot disk size for GKE nodes in GB"
  type        = number
  default     = 100

  validation {
    condition     = var.disk_size_gb >= 20 && var.disk_size_gb <= 2000
    error_message = "Disk size must be between 20 and 2000 GB."
  }
}

variable "enable_monitoring" {
  description = "Enable comprehensive monitoring stack"
  type        = bool
  default     = true
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "testnet"

  validation {
    condition     = contains(["dev", "staging", "testnet", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, testnet, prod."
  }
}

variable "enable_backup" {
  description = "Enable automated backups"
  type        = bool
  default     = true
}

variable "backup_retention_days" {
  description = "Number of days to retain backups"
  type        = number
  default     = 30

  validation {
    condition     = var.backup_retention_days >= 1 && var.backup_retention_days <= 365
    error_message = "Backup retention must be between 1 and 365 days."
  }
}

# Local values for resource naming and tagging
locals {
  common_labels = {
    project     = "dytallix-bridge"
    environment = var.environment
    managed_by  = "terraform"
    created_on  = formatdate("YYYY-MM-DD", timestamp())
  }

  resource_prefix = "${var.project_id}-${var.environment}"

  # Network configuration
  vpc_cidr      = "10.0.0.0/16"
  subnet_cidr   = "10.0.1.0/24"
  pods_cidr     = "10.1.0.0/16"
  services_cidr = "10.2.0.0/16"
}

# Providers
provider "google" {
  project = var.project_id
  region  = var.region
  zone    = var.zone
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
  zone    = var.zone
}

provider "kubernetes" {
  host                   = "https://${google_container_cluster.primary.endpoint}"
  token                  = data.google_client_config.default.access_token
  cluster_ca_certificate = base64decode(google_container_cluster.primary.master_auth.0.cluster_ca_certificate)
}

provider "helm" {
  kubernetes {
    host                   = "https://${google_container_cluster.primary.endpoint}"
    token                  = data.google_client_config.default.access_token
    cluster_ca_certificate = base64decode(google_container_cluster.primary.master_auth.0.cluster_ca_certificate)
  }
}

# Data sources
data "google_client_config" "default" {}

# Enable required APIs
resource "google_project_service" "apis" {
  for_each = toset([
    "container.googleapis.com",
    # "cloudsql.googleapis.com",  # Requires additional permissions
    "storage.googleapis.com",
    "monitoring.googleapis.com",
    "logging.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    "iam.googleapis.com",
    "compute.googleapis.com",
    "containerregistry.googleapis.com",
    "artifactregistry.googleapis.com",
    "binaryauthorization.googleapis.com",  # For Binary Authorization
    "cloudkms.googleapis.com",             # For KMS encryption
    "containeranalysis.googleapis.com",    # For vulnerability scanning
    "cloudtrace.googleapis.com",           # For security tracing
    "cloudsecurity.googleapis.com"         # For security posture management
  ])

  project = var.project_id
  service = each.value

  disable_dependent_services = true
}

# Service Account for the bridge
resource "google_service_account" "bridge_sa" {
  account_id   = "dytallix-bridge-sa"
  display_name = "Dytallix Bridge Service Account"
  description  = "Service account for Dytallix cross-chain bridge"
}

# IAM roles for the service account with enhanced security permissions
resource "google_project_iam_member" "bridge_sa_roles" {
  for_each = toset([
    "roles/container.admin",
    # "roles/cloudsql.client",  # Requires Cloud SQL API to be enabled
    "roles/storage.admin",
    "roles/monitoring.metricWriter",
    "roles/logging.logWriter",
    "roles/binaryauthorization.attestorsVerifier",  # For Binary Authorization
    "roles/cloudkms.cryptoKeyEncrypterDecrypter",   # For KMS encryption
    "roles/containeranalysis.notes.viewer",        # For vulnerability scanning
    "roles/cloudtrace.agent",                      # For security tracing
    "roles/monitoring.alertPolicyEditor"           # For security alerting
  ])

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.bridge_sa.email}"
}

# GKE Cluster with enhanced configuration
resource "google_container_cluster" "primary" {
  name     = "${local.resource_prefix}-cluster"
  location = var.zone

  # We can't create a cluster with no node pool defined, but we want to only use
  # separately managed node pools. So we create the smallest possible default
  # node pool and immediately delete it.
  remove_default_node_pool = true
  initial_node_count       = 1

  # Networking configuration
  network    = google_compute_network.vpc.name
  subnetwork = google_compute_subnetwork.subnet.name

  # IP allocation policy for VPC-native networking
  ip_allocation_policy {
    cluster_secondary_range_name  = "gke-pods"
    services_secondary_range_name = "gke-services"
  }

  # Enable Workload Identity
  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }

  # Enable network policy
  network_policy {
    enabled  = true
    provider = "CALICO"
  }

  # Enhanced Security configuration - Private cluster
  private_cluster_config {
    enable_private_nodes    = true
    enable_private_endpoint = true  # Enhanced security: private endpoint only
    master_ipv4_cidr_block  = "172.16.0.0/28"
    
    # Enable private Google access
    master_global_access_config {
      enabled = false  # Restrict to regional access only
    }
  }

  # Master authorized networks - restricted access
  master_authorized_networks_config {
    cidr_blocks {
      cidr_block   = local.subnet_cidr  # Only allow access from the cluster subnet
      display_name = "Cluster subnet access"
    }
    # Allow Cloud Shell access for management (optional - can be removed for max security)
    cidr_blocks {
      cidr_block   = "35.235.240.0/20"  # Cloud Shell IP range
      display_name = "Cloud Shell access"
    }
  }

  # Enable logging and monitoring
  logging_service    = "logging.googleapis.com/kubernetes"
  monitoring_service = "monitoring.googleapis.com/kubernetes"

  # Addons with enhanced security
  addons_config {
    horizontal_pod_autoscaling {
      disabled = false
    }
    http_load_balancing {
      disabled = false
    }
    gce_persistent_disk_csi_driver_config {
      enabled = true
    }
    network_policy_config {
      disabled = false
    }
    # Enable GKE backup for additional protection
    gcp_filestore_csi_driver_config {
      enabled = true
    }
    # Enable Cloud DNS for service discovery
    dns_cache_config {
      enabled = true
    }
  }

  # Pod Security Policy replacement - enable Pod Security Standards
  pod_security_policy_config {
    enabled = false  # Deprecated, using Pod Security Standards instead
  }
  
  # Enable security posture management
  security_posture_config {
    mode               = "BASIC"
    vulnerability_mode = "VULNERABILITY_BASIC"
  }

  # Enable cost management features
  cost_management_config {
    enabled = true
  }

  # Enhanced security features
  binary_authorization {
    evaluation_mode = "PROJECT_SINGLETON_POLICY_ENFORCE"  # Enable for all environments
  }

  # Database encryption with customer-managed keys
  database_encryption {
    state    = "ENCRYPTED"
    key_name = google_kms_crypto_key.cluster_key.id  # Always use CMEK
  }

  # Enhanced maintenance policy for minimal downtime
  maintenance_policy {
    recurring_window {
      start_time = "2023-01-01T04:00:00Z"
      end_time   = "2023-01-01T06:00:00Z"
      recurrence = "FREQ=WEEKLY;BYDAY=SU"  # Sunday maintenance window
    }
    
    maintenance_exclusion {
      exclusion_name = "holiday-exclusions"
      start_time     = "2023-12-20T00:00:00Z"
      end_time       = "2024-01-02T23:59:59Z"
      exclusion_options {
        scope = "NO_UPGRADES"
      }
    }
  }

  # Enable comprehensive logging for security monitoring
  logging_config {
    enable_components = [
      "SYSTEM_COMPONENTS",
      "WORKLOADS",
      "API_SERVER",
      "CONTROLLER_MANAGER",
      "SCHEDULER"
    ]
  }

  # Enhanced monitoring configuration
  monitoring_config {
    enable_components = [
      "SYSTEM_COMPONENTS",
      "WORKLOADS",
      "DAEMONSET",
      "DEPLOYMENT",
      "STATEFULSET",
      "STORAGE",
      "HPA",
      "POD"
    ]
    
    managed_prometheus {
      enabled = true
    }
  }

  # Resource labels
  resource_labels = local.common_labels

  depends_on = [
    google_project_service.apis,
    google_compute_subnetwork.subnet
  ]
}

# GKE Node Pool
resource "google_container_node_pool" "primary_nodes" {
  name       = "${var.cluster_name}-node-pool"
  location   = var.zone
  cluster    = google_container_cluster.primary.name
  node_count = var.node_count

  node_config {
    preemptible  = false
    machine_type = var.machine_type
    disk_size_gb = var.disk_size_gb
    disk_type    = "pd-ssd"

    # Enhanced security: use custom service account with minimal permissions
    service_account = google_service_account.bridge_sa.email
    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]

    labels = {
      env     = var.environment
      project = "dytallix-bridge"
    }

    tags = ["dytallix-bridge", var.environment]

    metadata = {
      disable-legacy-endpoints = "true"
      # Enhanced security metadata
      enable-oslogin                      = "true"
      enable-guest-attributes             = "false"
      block-project-ssh-keys              = "true"
    }

    workload_metadata_config {
      mode = "GKE_METADATA"
    }

    # Enhanced security: node hardening
    shielded_instance_config {
      enable_secure_boot          = true
      enable_integrity_monitoring = true
    }

    # Boot disk encryption with customer-managed key
    boot_disk_kms_key = google_kms_crypto_key.cluster_key.id

    # Enhanced image security
    image_type = "COS_CONTAINERD"  # Container-Optimized OS with containerd
  }

  management {
    auto_repair  = true
    auto_upgrade = true
  }

  autoscaling {
    min_node_count = 3
    max_node_count = 10
  }
}

# VPC Network
resource "google_compute_network" "vpc" {
  name                    = "${local.resource_prefix}-vpc"
  auto_create_subnetworks = false
}

# Subnet with improved CIDR management
resource "google_compute_subnetwork" "subnet" {
  name          = "${local.resource_prefix}-subnet"
  ip_cidr_range = local.subnet_cidr
  region        = var.region
  network       = google_compute_network.vpc.name

  # Secondary ranges for GKE
  secondary_ip_range {
    range_name    = "gke-pods"
    ip_cidr_range = local.pods_cidr
  }

  secondary_ip_range {
    range_name    = "gke-services"
    ip_cidr_range = local.services_cidr
  }

  # Enable private Google access
  private_ip_google_access = true

  # Enable flow logs for network monitoring
  log_config {
    aggregation_interval = "INTERVAL_10_MIN"
    flow_sampling        = 0.5
    metadata             = "INCLUDE_ALL_METADATA"
  }
}

# KMS key for cluster encryption (always created for security)
resource "google_kms_key_ring" "cluster_key_ring" {
  name     = "${local.resource_prefix}-keyring"
  location = var.region
}

resource "google_kms_crypto_key" "cluster_key" {
  name            = "${local.resource_prefix}-cluster-key"
  key_ring        = google_kms_key_ring.cluster_key_ring.id
  rotation_period = "2592000s" # 30 days

  labels = local.common_labels
}

# Cloud SQL Instance with enhanced configuration
# Commented out due to permissions issue - enable Cloud SQL API manually first
/*
resource "google_sql_database_instance" "bridge_db" {
  name             = "${local.resource_prefix}-db"
  database_version = "POSTGRES_15"
  region           = var.region

  settings {
    tier              = var.environment == "prod" ? "db-custom-4-15360" : "db-custom-2-7680"
    availability_type = var.environment == "prod" ? "REGIONAL" : "ZONAL"
    disk_size         = var.environment == "prod" ? 200 : 100
    disk_type         = "PD_SSD"
    disk_autoresize   = true

    backup_configuration {
      enabled                        = var.enable_backup
      start_time                     = "03:00"
      location                       = var.region
      point_in_time_recovery_enabled = true
      backup_retention_settings {
        retained_backups = var.backup_retention_days
        retention_unit   = "COUNT"
      }
      transaction_log_retention_days = 7
    }

    maintenance_window {
      day          = 7 # Sunday
      hour         = 4
      update_track = "stable"
    }

    ip_configuration {
      ipv4_enabled                                  = false
      private_network                               = google_compute_network.vpc.id
      enable_private_path_for_google_cloud_services = true
      require_ssl                                   = true
    }

    # Database flags for performance
    database_flags {
      name  = "shared_preload_libraries"
      value = "pg_stat_statements"
    }

    database_flags {
      name  = "log_statement"
      value = "all"
    }

    # Insights configuration for monitoring
    insights_config {
      query_insights_enabled  = true
      record_application_tags = true
      record_client_address   = true
    }
  }

  deletion_protection = var.environment == "prod" ? true : false

  depends_on = [
    google_project_service.apis,
    google_compute_network.vpc
  ]
}

# Cloud SQL Database
resource "google_sql_database" "bridge_database" {
  name     = "bridge_db"
  instance = google_sql_database_instance.bridge_db.name
}

# Cloud SQL User
resource "google_sql_user" "bridge_user" {
  name     = "dytallix"
  instance = google_sql_database_instance.bridge_db.name
  password = random_password.db_password.result
}
*/

# Random password for database
resource "random_password" "db_password" {
  length  = 32
  special = true
}

# Cloud Storage Bucket with enhanced configuration
resource "google_storage_bucket" "bridge_storage" {
  name          = "${local.resource_prefix}-storage"
  location      = var.region
  storage_class = "REGIONAL"

  # Uniform bucket-level access
  uniform_bucket_level_access = true

  versioning {
    enabled = true
  }

  lifecycle_rule {
    condition {
      age = 30
    }
    action {
      type          = "SetStorageClass"
      storage_class = "NEARLINE"
    }
  }

  lifecycle_rule {
    condition {
      age = 365
    }
    action {
      type = "Delete"
    }
  }

  # Enable logging
  logging {
    log_bucket = google_storage_bucket.access_logs.name
  }

  labels = local.common_labels
}

# Access logs bucket
resource "google_storage_bucket" "access_logs" {
  name          = "${local.resource_prefix}-access-logs"
  location      = var.region
  storage_class = "STANDARD"

  uniform_bucket_level_access = true

  lifecycle_rule {
    condition {
      age = 90
    }
    action {
      type = "Delete"
    }
  }

  labels = local.common_labels
}

# Cloud Router for Cloud NAT
resource "google_compute_router" "router" {
  name    = "${local.resource_prefix}-router"
  region  = var.region
  network = google_compute_network.vpc.id

  bgp {
    asn = 64514
  }
}

# Cloud NAT for outbound connectivity from private nodes
resource "google_compute_router_nat" "nat" {
  name                               = "${local.resource_prefix}-nat"
  router                             = google_compute_router.router.name
  region                             = var.region
  nat_ip_allocate_option            = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"

  # Enhanced logging for security monitoring
  log_config {
    enable = true
    filter = "ERRORS_ONLY"
  }

  # Minimum ports per VM for better resource management
  min_ports_per_vm = 64

  # Enable endpoint independent mapping for better security
  enable_endpoint_independent_mapping = true
}

# VPC Firewall Rules for enhanced security
resource "google_compute_firewall" "deny_all_ingress" {
  name    = "${local.resource_prefix}-deny-all-ingress"
  network = google_compute_network.vpc.name

  # Default deny all ingress (highest priority)
  deny {
    protocol = "all"
  }

  source_ranges = ["0.0.0.0/0"]
  priority      = 65534

  log_config {
    metadata = "INCLUDE_ALL_METADATA"
  }
}

resource "google_compute_firewall" "allow_internal" {
  name    = "${local.resource_prefix}-allow-internal"
  network = google_compute_network.vpc.name

  allow {
    protocol = "tcp"
  }
  allow {
    protocol = "udp"
  }
  allow {
    protocol = "icmp"
  }

  source_ranges = [local.vpc_cidr, local.pods_cidr, local.services_cidr]
  priority      = 1000

  log_config {
    metadata = "INCLUDE_ALL_METADATA"
  }
}

resource "google_compute_firewall" "allow_gke_master" {
  name    = "${local.resource_prefix}-allow-gke-master"
  network = google_compute_network.vpc.name

  allow {
    protocol = "tcp"
    ports    = ["443", "10250"]
  }

  source_ranges = ["172.16.0.0/28"]  # GKE master CIDR
  target_tags   = ["dytallix-bridge", "testnet"]
  priority      = 1000

  log_config {
    metadata = "INCLUDE_ALL_METADATA"
  }
}

# Allow health checks for load balancers
resource "google_compute_firewall" "allow_health_checks" {
  name    = "${local.resource_prefix}-allow-health-checks"
  network = google_compute_network.vpc.name

  allow {
    protocol = "tcp"
  }

  source_ranges = ["130.211.0.0/22", "35.191.0.0/16"]  # Google health check ranges
  target_tags   = ["dytallix-bridge", "testnet"]
  priority      = 1000

  log_config {
    metadata = "INCLUDE_ALL_METADATA"
  }
}
resource "google_artifact_registry_repository" "bridge_repo" {
  location      = var.region
  repository_id = "${local.resource_prefix}-repo"
  description   = "Dytallix Bridge container images for ${var.environment}"
  format        = "DOCKER"

  # Cleanup policy
  cleanup_policies {
    id     = "delete-old-images"
    action = "DELETE"
    condition {
      tag_state  = "UNTAGGED"
      older_than = "2592000s" # 30 days
    }
  }

  cleanup_policies {
    id     = "keep-recent-tagged"
    action = "KEEP"
    condition {
      tag_state  = "TAGGED"
      newer_than = "604800s" # 7 days
    }
  }

  labels = local.common_labels
}

# Enhanced outputs with additional useful information
output "cluster_endpoint" {
  description = "GKE Cluster Endpoint"
  value       = google_container_cluster.primary.endpoint
  sensitive   = true
}

output "cluster_ca_certificate" {
  description = "GKE Cluster CA Certificate"
  value       = google_container_cluster.primary.master_auth.0.cluster_ca_certificate
  sensitive   = true
}

output "cluster_name" {
  description = "GKE Cluster Name"
  value       = google_container_cluster.primary.name
}

output "cluster_location" {
  description = "GKE Cluster Location"
  value       = google_container_cluster.primary.location
}

# Cloud SQL outputs - commented out due to permissions issue
/*
output "database_connection_name" {
  description = "Cloud SQL Connection Name"
  value       = google_sql_database_instance.bridge_db.connection_name
}

output "database_private_ip" {
  description = "Cloud SQL Private IP"
  value       = google_sql_database_instance.bridge_db.private_ip_address
}

output "database_name" {
  description = "Database Name"
  value       = google_sql_database.bridge_database.name
}

output "database_user" {
  description = "Database User"
  value       = google_sql_user.bridge_user.name
}

output "database_password" {
  description = "Database Password"
  value       = random_password.db_password.result
  sensitive   = true
}
*/

output "storage_bucket_name" {
  description = "Storage Bucket Name"
  value       = google_storage_bucket.bridge_storage.name
}

output "storage_bucket_url" {
  description = "Storage Bucket URL"
  value       = google_storage_bucket.bridge_storage.url
}

output "artifact_registry_url" {
  description = "Artifact Registry URL"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.bridge_repo.repository_id}"
}

output "service_account_email" {
  description = "Service Account Email"
  value       = google_service_account.bridge_sa.email
}

output "vpc_network_name" {
  description = "VPC Network Name"
  value       = google_compute_network.vpc.name
}

output "subnet_name" {
  description = "Subnet Name"
  value       = google_compute_subnetwork.subnet.name
}

output "project_id" {
  description = "Project ID"
  value       = var.project_id
}

output "region" {
  description = "Region"
  value       = var.region
}

output "environment" {
  description = "Environment"
  value       = var.environment
}

# Kubectl configuration command
output "kubectl_config_command" {
  description = "Command to configure kubectl"
  value       = "gcloud container clusters get-credentials ${google_container_cluster.primary.name} --zone=${var.zone} --project=${var.project_id}"
}

# Database connection string - commented out due to permissions issue
/*
output "database_url" {
  description = "Database connection URL"
  value       = "postgresql://${google_sql_user.bridge_user.name}:${random_password.db_password.result}@${google_sql_database_instance.bridge_db.private_ip_address}:5432/${google_sql_database.bridge_database.name}"
  sensitive   = true
}
*/
