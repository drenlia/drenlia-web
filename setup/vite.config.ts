import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: path.resolve(__dirname, 'src'),
  base: '/setup/',
  server: {
    port: 3012,
    host: true,
    proxy: {
      '/api/setup': {
        target: 'http://localhost:3013',
        changeOrigin: true
      }
    },
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      'website.demo.drenlia.com'
    ]
  },
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true
  }
}); 
