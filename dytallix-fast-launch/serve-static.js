import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { 
  serverConfig, 
  pathMappings, 
  redirects, 
  htmlRoutes,
  loggingConfig 
} from './serve-static.config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = serverConfig.port;

// Setup redirects first (before static middleware)
redirects.forEach(redirect => {
  app.use(redirect.from, (req, res) => {
    const suffix = req.url && req.url !== '/' ? req.url : '/';
    const target = redirect.to + (suffix === '/' ? '/' : suffix);
    if (loggingConfig.logRedirects) {
      console.log(`Redirecting: ${redirect.from}${suffix} → ${target}`);
    }
    res.redirect(redirect.code, target);
  });
});

// Serve static files from the root directory
app.use(express.static(__dirname));

// Setup path mappings for static file serving
pathMappings.forEach(mapping => {
  app.use(mapping.route, express.static(mapping.directory));
  if (loggingConfig.logRoutes) {
    console.log(`Mapped: ${mapping.route} → ${mapping.directory}`);
  }
});

// Setup HTML routes
htmlRoutes.forEach(route => {
  app.get(route.route, (req, res) => {
    res.sendFile(route.file);
  });
});

app.listen(PORT, serverConfig.host, () => {
  if (loggingConfig.showStartupInfo) {
    console.log(`✅ Static server running on http://localhost:${PORT}`);
    console.log(`📍 Homepage:     http://localhost:${PORT}/`);
    console.log(`📍 Build:        http://localhost:${PORT}/build/`);
    console.log(`📍 QuantumVault: http://localhost:${PORT}/quantumvault/`);
    
    if (redirects.length > 0) {
      console.log(`↪︎  Redirects:`);
      redirects.forEach(redirect => {
        console.log(`   ${redirect.from}/* → ${redirect.to}/*`);
      });
    }
  }
});
