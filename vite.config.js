import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './', 
  plugins: [react()],
  resolve: {
    extensions: ['.jsx', '.js', '.json']
  },
  server: {
    port: 5173,  // با dev.cjs یکی باشه
    host: 'localhost',
    hmr: {
      overlay: false
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
  optimizeDeps: {
    esbuild: {
      loader: {
        '.js': 'jsx',
        '.jsx': 'jsx'
      }
    }
  }
})