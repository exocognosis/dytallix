#!/bin/bash
# Backup Dytallix evidence and database

set -e

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${BACKUP_DIR:-./backups}"
EVIDENCE_DIR="${EVIDENCE_DIR:-./evidence}"
SERVER_DB="${SERVER_DB:-./server-new/data/dytallix.db}"

mkdir -p "$BACKUP_DIR"

echo "Creating backup: $TIMESTAMP"

# Backup evidence if exists
if [ -d "$EVIDENCE_DIR" ]; then
  echo "Backing up evidence directory..."
  tar -czf "$BACKUP_DIR/evidence-$TIMESTAMP.tar.gz" "$EVIDENCE_DIR"
  echo "Evidence backed up to: $BACKUP_DIR/evidence-$TIMESTAMP.tar.gz"
else
  echo "Warning: Evidence directory not found: $EVIDENCE_DIR"
fi

# Backup database if exists
if [ -f "$SERVER_DB" ]; then
  echo "Backing up database..."
  DB_DIR=$(dirname "$SERVER_DB")
  DB_FILE=$(basename "$SERVER_DB")
  tar -czf "$BACKUP_DIR/database-$TIMESTAMP.tar.gz" -C "$DB_DIR" "$DB_FILE"
  echo "Database backed up to: $BACKUP_DIR/database-$TIMESTAMP.tar.gz"
else
  echo "Warning: Database not found: $SERVER_DB"
fi

# Create combined backup
echo "Creating combined backup..."
tar -czf "$BACKUP_DIR/dytallix-full-$TIMESTAMP.tar.gz" \
  ${EVIDENCE_DIR:+--ignore-failed-read "$EVIDENCE_DIR"} \
  ${SERVER_DB:+--ignore-failed-read "$SERVER_DB"}
echo "Full backup created: $BACKUP_DIR/dytallix-full-$TIMESTAMP.tar.gz"

# Cleanup old backups (keep last 7)
echo "Cleaning up old backups..."
cd "$BACKUP_DIR"
ls -t dytallix-full-*.tar.gz | tail -n +8 | xargs -r rm
ls -t evidence-*.tar.gz | tail -n +8 | xargs -r rm
ls -t database-*.tar.gz | tail -n +8 | xargs -r rm
cd - > /dev/null

echo "Backup complete!"
echo "Backup size:"
du -sh "$BACKUP_DIR"
