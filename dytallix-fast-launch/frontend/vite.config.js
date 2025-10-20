import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/node': {
        target: 'http://localhost:3030',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/node/, '')
      },
      '/api/quantumvault': {
        target: 'http://localhost:3031',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/quantumvault/, '')
      }
    }
  }
})
