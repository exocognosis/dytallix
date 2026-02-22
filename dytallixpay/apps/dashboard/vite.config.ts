import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/dytallixpay/',
  plugins: [tailwindcss(), react()],
  resolve: {
    dedupe: ['react', 'react-dom']
  }
})
