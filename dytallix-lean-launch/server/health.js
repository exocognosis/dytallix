import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import path from 'path';

let commit = 'unknown';
try { commit = execSync('git rev-parse --short HEAD').toString().trim(); } catch {}
let version = '0.0.0';
try {
  const pkg = JSON.parse(readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf8'));
  version = pkg.version || version;
} catch {}

export function registerHealth(app, logger) {
  app.get('/api/health', (_req, res) => {
    const chainId = process.env.VITE_CHAIN_ID || process.env.CHAIN_ID || 'unknown';
    res.status(200).json({
      ok: true,
      service: 'dytallix-backend',
      version,
      commit,
      chainId,
      time: new Date().toISOString()
    });
  });
  logger.info({ msg: 'health_endpoint_registered' });
}