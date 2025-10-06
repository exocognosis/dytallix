import { loadConfig } from '../config.js';
import { initDb, getDb, closeDb } from '../db.js';
import { logger } from '../util/logger.js';

async function main() {
  try {
    logger.info('Seeding database...');
    
    loadConfig();
    initDb();
    
    const db = getDb();
    
    // Ensure admin state exists
    db.prepare(`
      INSERT OR IGNORE INTO admin_state (id, is_paused) 
      VALUES (1, 0)
    `).run();
    
    // Add some initial configuration
    db.prepare(`
      INSERT OR IGNORE INTO kv (key, value) 
      VALUES ('initialized_at', ?)
    `).run(new Date().toISOString());
    
    logger.info('Database seeded successfully');
    closeDb();
    process.exit(0);
  } catch (error) {
    logger.error({ error }, 'Seeding failed');
    process.exit(1);
  }
}

main();
