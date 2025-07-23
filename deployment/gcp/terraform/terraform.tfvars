# Terraform variables configuration for Dytallix Bridge GCP deployment

project_id = "dytallix"
region     = "us-central1"
zone       = "us-central1-a"

cluster_name = "dytallix-bridge-cluster"
node_count   = 3
machine_type = "e2-standard-4"
disk_size_gb = 100

enable_monitoring = true
