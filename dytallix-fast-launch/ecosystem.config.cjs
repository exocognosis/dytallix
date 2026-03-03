/**
 * PM2 Ecosystem Configuration
 * Unified port scheme for Dytallix production deployment
 * 
 * Port Allocation:
 *   - 80/443: Dytallix Frontend (static via nginx)
 *   - 8787: Dytallix API (Express backend)
 *   - 3001: QuantumVault Frontend (Next.js)
 *   - 3002: QuantumVault Backend (NestJS)
 *   - 3004: Faucet API
 *   - 3030: Blockchain Node (Rust, managed by systemd)
 *   - 3031: QuantumVault API (legacy wallet API)
 */

module.exports = {
  apps: [
    {
      name: 'dytallix-api',
      script: 'server/index.js',
      cwd: '/opt/dytallix-fast-launch',
      interpreter: 'node',
      interpreter_args: '--experimental-modules',
      env: {
        NODE_ENV: 'development',
        API_PORT: 8787,
        PORT: 8787,
      },
      env_file: '/opt/dytallix-fast-launch/.env',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '500M',
      error_file: '/root/.pm2/logs/dytallix-api-error.log',
      out_file: '/root/.pm2/logs/dytallix-api-out.log',
      merge_logs: true,
      time: true,
    },
    {
      name: 'qv-backend',
      script: 'dist/main.js',
      cwd: '/opt/quantumvault/backend',
      env: {
        NODE_ENV: 'production',
        PORT: 3002,
      },
      env_file: '/opt/quantumvault/.env',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '500M',
      error_file: '/root/.pm2/logs/qv-backend-error.log',
      out_file: '/root/.pm2/logs/qv-backend-out.log',
      merge_logs: true,
      time: true,
    },
    {
      name: 'qv-frontend',
      script: 'npm',
      args: 'start',
      cwd: '/opt/quantumvault/frontend',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '300M',
      error_file: '/root/.pm2/logs/qv-frontend-error.log',
      out_file: '/root/.pm2/logs/qv-frontend-out.log',
      merge_logs: true,
      time: true,
    },
    {
      name: 'qv-wallet-api',
      script: 'server.js',
      cwd: '/opt/dytallix-fast-launch/services/quantumvault-api',
      env: {
        NODE_ENV: 'production',
        PORT: 3031,
      },
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '300M',
      error_file: '/root/.pm2/logs/qv-wallet-api-error.log',
      out_file: '/root/.pm2/logs/qv-wallet-api-out.log',
      merge_logs: true,
      time: true,
    },
    {
      name: 'faucet-api',
      script: 'server.js',
      cwd: '/opt/dytallix-fast-launch/services/faucet-api',
      env: {
        NODE_ENV: 'development',
        PORT: 3004,
        BLOCKCHAIN_NODE: 'http://127.0.0.1:3030',
        CHAIN_ID: 'dyt-local-1',
      },
      env_file: '/opt/dytallix-fast-launch/.env',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '200M',
      error_file: '/root/.pm2/logs/faucet-api-error.log',
      out_file: '/root/.pm2/logs/faucet-api-out.log',
      merge_logs: true,
      time: true,
    },
  ],
};
