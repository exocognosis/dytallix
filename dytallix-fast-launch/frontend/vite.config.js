import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // FIXED PORT - Frontend always runs on 3000
    port: 3000,
    host: true, // Allow external connections
    proxy: {
      // Blockchain node API
      '/api/node': {
        target: 'http://localhost:3003',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/node/, '')
      },
      // QuantumVault API  
      '/api/quantumvault': {
        target: 'http://localhost:3002',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/quantumvault/, '')
      },
      // Backend API proxy
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
})
