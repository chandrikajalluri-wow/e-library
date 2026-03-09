/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    host: true,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5173,
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React & routing — changes rarely, cache aggressively
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],

          // Charting library — heavy (~500 kB), almost never changes
          'vendor-recharts': ['recharts'],

          // PDF generation — heavy, only needed on specific pages
          'vendor-pdf': ['jspdf', 'jspdf-autotable'],

          // Animation — moderate size, changes with framer releases
          'vendor-framer': ['framer-motion'],

          // Real-time / networking — socket.io is sizeable
          'vendor-realtime': ['socket.io-client'],

          // Utilities — small but stable
          'vendor-utils': [
            'axios',
            'date-fns',
            'jwt-decode',
            'idb',
            'react-toastify',
            '@react-oauth/google',
          ],

          // Icon set — lucide ships many modules; bundle together
          'vendor-icons': ['lucide-react'],
        },
      },
    },
    // Raise the warning threshold so we can see real outliers
    chunkSizeWarningLimit: 600,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
    css: true,
  },
});

