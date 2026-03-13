# Dytallix Vault Configuration Template
# This file configures HashiCorp Vault for secure PQC key storage

# Basic configuration
ui = true
cluster_name = "dytallix-vault"
log_level = "INFO"
log_format = "json"

# Disable memory locking for development
disable_mlock = true

# Storage backend configuration
storage "raft" {
  path = "/opt/vault/data"
  node_id = "vault-node-1"
  
  # Performance tuning
  performance_multiplier = 1
  
  # Automatic snapshots
  snapshot_threshold = 8192
  snapshot_interval = "30s"
  
  # Cluster configuration
  retry_join {
    leader_api_addr = "https://vault-0.vault.dytallix.svc.cluster.local:8200"
  }
  
  retry_join {
    leader_api_addr = "https://vault-1.vault.dytallix.svc.cluster.local:8200"
  }
  
  retry_join {
    leader_api_addr = "https://vault-2.vault.dytallix.svc.cluster.local:8200"
  }
}

# Listener configuration
listener "tcp" {
  address = "0.0.0.0:8200"
  cluster_address = "0.0.0.0:8201"
  
  # TLS configuration
  tls_cert_file = "/etc/vault/tls/vault.crt"
  tls_key_file = "/etc/vault/tls/vault.key"
  tls_client_ca_file = "/etc/vault/tls/ca.crt"
  
  # TLS settings
  tls_min_version = "tls12"
  tls_cipher_suites = "TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256,TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384"
  tls_prefer_server_cipher_suites = true
  tls_require_and_verify_client_cert = false
  
  # Performance settings
  max_request_size = "33554432"
  max_request_duration = "90s"
}

# API configuration
api_addr = "https://vault.dytallix.local:8200"
cluster_addr = "https://vault-0.vault.dytallix.svc.cluster.local:8201"

# Seal configuration (auto-unseal with cloud KMS)
seal "awskms" {
  region = "us-west-2"
  kms_key_id = "arn:aws:kms:us-west-2:123456789012:key/12345678-1234-1234-1234-123456789012"
  endpoint = "https://kms.us-west-2.amazonaws.com"
}

# Entropy augmentation
entropy "seal" {
  mode = "augmentation"
}

# Telemetry configuration
telemetry {
  prometheus_retention_time = "30s"
  disable_hostname = true
  enable_hostname_label = false
  
  # Metrics prefixes
  statsite_address = "127.0.0.1:8125"
  statsd_address = "127.0.0.1:8125"
  
  # Circonus configuration
  circonus_api_token = ""
  circonus_api_app = "vault"
  circonus_api_url = "https://api.circonus.com/v2"
  circonus_submission_interval = "10s"
  circonus_submission_url = ""
  circonus_check_id = ""
  circonus_check_force_metric_activation = ""
  circonus_check_instance_id = ""
  circonus_check_search_tag = ""
  circonus_check_display_name = ""
  circonus_check_tags = ""
  circonus_broker_id = ""
  circonus_broker_select_tag = ""
}

# Plugin directory
plugin_directory = "/opt/vault/plugins"

# Maximum lease TTL
max_lease_ttl = "768h"
default_lease_ttl = "768h"

# Cache size
cache_size = "32000"

# Cluster configuration
cluster_cipher_suites = "TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256,TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384"

# License path (for Enterprise)
license_path = "/etc/vault/license/vault.hclic"

# Audit configuration
audit {
  file {
    path = "/var/log/vault/audit.log"
    log_raw = false
    format = "json"
    prefix = "vault_audit"
  }
  
  syslog {
    facility = "AUTH"
    tag = "vault_audit"
    log_raw = false
    format = "json"
  }
}

# Raw storage endpoint
raw_storage_endpoint = true

# Introspection endpoint
introspection_endpoint = true

# Replication configuration (Enterprise)
replication {
  performance {
    mode = "primary"
  }
  
  disaster_recovery {
    mode = "primary"
  }
}

# Service registration
service_registration "kubernetes" {
  namespace = "vault"
  pod_name = "vault-0"
}
