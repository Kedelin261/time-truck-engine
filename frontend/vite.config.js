import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    define: {
      // Expose VITE_API_BASE to the app (set in Cloudflare Pages env vars)
      __API_BASE__: JSON.stringify(env.VITE_API_BASE || '')
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:8080',
          changeOrigin: true
        }
      }
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true
    }
  }
})
