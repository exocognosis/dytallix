import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // Load environment variables based on mode
  const env = loadEnv(mode, process.cwd(), '')
  
  // Environment-specific proxy targets
  const getProxyConfig = () => {
    const blockchainTarget = env.VITE_BLOCKCHAIN_API_URL || 'http://localhost:3030'
    const aiTarget = env.VITE_AI_API_URL || 'http://localhost:8000'
    
    return {
      '/api': {
        target: blockchainTarget,
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api/, ''),
        configure: (proxy: any) => {
          proxy.on('error', (err: any) => {
            console.log('Blockchain proxy error:', err)
          })
          proxy.on('proxyReq', (proxyReq: any, req: any) => {
            console.log(`[${mode.toUpperCase()}] Blockchain API: ${req.method} ${req.url} -> ${blockchainTarget}${req.url}`)
          })
        },
      },
      '/ai-api': {
        target: aiTarget,
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/ai-api/, ''),
        configure: (proxy: any) => {
          proxy.on('error', (err: any) => {
            console.log('AI API proxy error:', err)
          })
          proxy.on('proxyReq', (proxyReq: any, req: any) => {
            console.log(`[${mode.toUpperCase()}] AI API: ${req.method} ${req.url} -> ${aiTarget}${req.url}`)
          })
        },
      }
    }
  }

  return {
    plugins: [react()],
    base: './',
    define: {
      __APP_ENV__: JSON.stringify(mode),
    },
    build: {
      outDir: `dist-${mode}`,
      assetsDir: 'assets',
      sourcemap: mode === 'development' || mode === 'testnet',
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            utils: ['axios', 'date-fns', 'clsx'],
            ui: ['@headlessui/react', '@heroicons/react', 'lucide-react', 'framer-motion'],
          },
        },
      },
    },
    server: {
      port: 3000,
      host: true,
      proxy: command === 'serve' ? getProxyConfig() : undefined,
    },
    preview: {
      port: 4173,
      host: true,
    },
  }
})
