import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { getConfig, loadConfig } from '../config.js';
import { logger } from '../util/logger.js';

const execAsync = promisify(exec);

async function main() {
  try {
    loadConfig();
    const config = getConfig();
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(process.cwd(), 'backups');
    
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const backupFile = path.join(backupDir, `dytallix-backup-${timestamp}.tar.gz`);
    
    logger.info('Starting backup...');
    
    // Backup database
    const dbPath = config.DB_PATH;
    const dbDir = path.dirname(dbPath);
    const dbFile = path.basename(dbPath);
    
    // Create tar archive
    await execAsync(`tar -czf ${backupFile} -C ${dbDir} ${dbFile}`);
    
    logger.info({ backupFile }, 'Backup completed successfully');
    
    // Keep only last 7 backups
    const backups = fs.readdirSync(backupDir)
      .filter(f => f.startsWith('dytallix-backup-') && f.endsWith('.tar.gz'))
      .sort()
      .reverse();
    
    if (backups.length > 7) {
      const toDelete = backups.slice(7);
      for (const file of toDelete) {
        const filePath = path.join(backupDir, file);
        fs.unlinkSync(filePath);
        logger.info({ file }, 'Deleted old backup');
      }
    }
    
    process.exit(0);
  } catch (error) {
    logger.error({ error }, 'Backup failed');
    process.exit(1);
  }
}

main();
