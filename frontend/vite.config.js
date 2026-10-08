import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 9999,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        ws: false,
        // Backend uses Keep-Alive: timeout=5; disable pooling to avoid ECONNRESET
        // when Vite reuses a connection after the backend has half-closed it.
        agent: new (require('node:http').Agent)({ keepAlive: false }),
      },
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        agent: new (require('node:http').Agent)({ keepAlive: false }),
      },
    },
  },
})