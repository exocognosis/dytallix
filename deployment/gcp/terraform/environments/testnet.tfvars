# Terraform environments configuration
environment = "testnet"

# Resource sizing for testnet
node_count   = 3
machine_type = "e2-standard-4"
disk_size_gb = 100

# Monitoring and backup
enable_monitoring      = true
enable_backup         = true
backup_retention_days = 30

# Security settings for testnet
# Note: Production would have stricter settings
