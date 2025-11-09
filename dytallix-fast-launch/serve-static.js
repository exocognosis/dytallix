import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Backward-compatible redirect for any old QuantumShield paths to the new QuantumVault routes.
// This must come BEFORE static middleware so it takes precedence over serving files directly.
app.use('/quantumshield', (req, res) => {
    const suffix = req.url && req.url !== '/' ? req.url : '/';
    const target = '/quantumvault' + (suffix === '/' ? '/' : suffix);
    res.redirect(301, target);
});

// Serve static files from the root directory
app.use(express.static(__dirname));

// Serve shared assets
app.use('/shared-assets', express.static(path.join(__dirname, 'shared-assets')));

// Route for homepage (now in build/homepage)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'homepage', 'index.html'));
});

// Route for build pages
app.use('/build', express.static(path.join(__dirname, 'build')));

// Serve homepage directory (now in build/homepage)
app.use('/homepage', express.static(path.join(__dirname, 'build', 'homepage')));

// Serve quantumvault directory (now in build/quantumvault)
app.use('/quantumvault', express.static(path.join(__dirname, 'build', 'quantumvault')));

// Route for quantumvault
app.get('/quantumvault', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'quantumvault', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Static server running on http://localhost:${PORT}`);
    console.log(`📍 Homepage:     http://localhost:${PORT}/`);
    console.log(`📍 Build:        http://localhost:${PORT}/build/`);
    console.log(`📍 QuantumVault: http://localhost:${PORT}/quantumvault/`);
    console.log(`↪︎  Redirect:    /quantumshield/* → /quantumvault/*`);
});
