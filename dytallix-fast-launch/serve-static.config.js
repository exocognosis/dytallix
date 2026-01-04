/**
 * Static Server Configuration
 * 
 * Centralizes all path mappings and route configurations for the static file server.
 * This makes it easier to modify routes and maintain consistency across the application.
 */

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Server configuration
 */
export const serverConfig = {
  // Port configuration - can be overridden by environment variable
  port: process.env.FRONTEND_PORT || process.env.PORT || 3000,
  host: '0.0.0.0',
  
  // Base directory for static files
  baseDir: __dirname,
};

/**
 * Path mappings for static file serving
 * Each entry defines a route and its corresponding directory
 */
export const pathMappings = [
  {
    route: '/shared-assets',
    directory: path.join(__dirname, 'shared-assets'),
    description: 'Shared assets (images, fonts, etc.)'
  },
  {
    route: '/build',
    directory: path.join(__dirname, 'build'),
    description: 'Build artifacts and developer pages'
  },
  {
    route: '/homepage',
    directory: path.join(__dirname, 'build', 'homepage'),
    description: 'Homepage static files'
  },
  {
    route: '/quantumvault',
    directory: path.join(__dirname, 'build', 'quantumvault'),
    description: 'QuantumVault application'
  }
];

/**
 * Redirect rules
 * Each entry defines an old path and its new target
 */
export const redirects = [
  {
    from: '/quantumshield',
    to: '/quantumvault',
    code: 301, // Permanent redirect
    description: 'Legacy QuantumShield to QuantumVault redirect'
  }
];

/**
 * Special routes that serve specific HTML files
 */
export const htmlRoutes = [
  {
    route: '/',
    file: path.join(__dirname, 'build', 'homepage', 'index.html'),
    description: 'Homepage'
  },
  {
    route: '/quantumvault',
    file: path.join(__dirname, 'build', 'quantumvault', 'index.html'),
    description: 'QuantumVault application'
  }
];

/**
 * Logging configuration
 */
export const loggingConfig = {
  showStartupInfo: true,
  logRoutes: true,
  logRedirects: true
};
