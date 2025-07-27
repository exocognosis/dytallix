#!/bin/bash
# Backup current Dockerfiles before security modifications

echo "🔄 Backing up current Dockerfiles..."

# Create backup directory with timestamp
BACKUP_DIR="./security-implementation/day1-containers/backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup main Dockerfile
cp ./Dockerfile "$BACKUP_DIR/Dockerfile.backup"
echo "✅ Backed up main Dockerfile"

# Backup AI services Dockerfile
cp ./ai-services/Dockerfile "$BACKUP_DIR/ai-services-Dockerfile.backup"
echo "✅ Backed up AI services Dockerfile"

# Backup frontend Dockerfile
if [ -f "./frontend/Dockerfile" ]; then
    cp ./frontend/Dockerfile "$BACKUP_DIR/frontend-Dockerfile.backup"
    echo "✅ Backed up frontend Dockerfile"
fi

# Backup GCP deployment Dockerfile
if [ -f "./deployment/gcp/Dockerfile" ]; then
    cp ./deployment/gcp/Dockerfile "$BACKUP_DIR/gcp-Dockerfile.backup"
    echo "✅ Backed up GCP Dockerfile"
fi

echo "🎉 All Dockerfiles backed up to: $BACKUP_DIR"
echo "💡 You can restore with: cp $BACKUP_DIR/*.backup ./original-locations"
