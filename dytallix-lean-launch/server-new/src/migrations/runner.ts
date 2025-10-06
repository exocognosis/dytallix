import { loadConfig } from '../config.js';
import { initDb, runMigrations, closeDb } from '../db.js';
import { logger } from '../util/logger.js';

async function main() {
  try {
    logger.info('Starting database migrations...');
    
    loadConfig();
    initDb();
    runMigrations();
    
    logger.info('Migrations completed successfully');
    closeDb();
    process.exit(0);
  } catch (error) {
    logger.error({ error }, 'Migration failed');
    process.exit(1);
  }
}

main();
