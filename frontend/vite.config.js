import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  // Remove custom define — use import.meta.env.VITE_API_BASE natively (Vite auto-exposes VITE_* vars)
  define: {
    // Keep __API_BASE__ as fallback for any code that still references it
    __API_BASE__: JSON.stringify(process.env.VITE_API_BASE || ''),
  },

  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },

  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
