import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'
import process from 'node:process'

const dir = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { proxy: { "/api": { target: process.env.VITE_API_PROXY_TARGET || "http://localhost:3001", changeOrigin: true } } },
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      react: path.resolve(dir, 'node_modules/react'),
      'react-dom': path.resolve(dir, 'node_modules/react-dom'),
      'lucide-react': path.resolve(dir, 'node_modules/lucide-react'),
    },
  },
})
