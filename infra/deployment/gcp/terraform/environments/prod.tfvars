# Production environment configuration
environment = "prod"
project_id  = "dytallix"
region      = "us-central1"

# Production resource sizing
node_count   = 5
machine_type = "n2-standard-8"
disk_size_gb = 200

# Enhanced monitoring and backup for production
enable_monitoring      = true
enable_backup         = true
backup_retention_days = 90

# Security settings for production
# All security features enabled
