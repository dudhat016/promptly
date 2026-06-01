import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'android-chrome-192x192.png', 'android-chrome-512x512.png', 'apple-touch-icon.png'],
        manifest: false, // We use public/manifest.json
        workbox: {
          cleanupOutdatedCaches: true,
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/.*\.(?:png|jpg|jpeg|svg|gif|webp)$/,
              handler: 'StaleWhileRevalidate',
              options: { cacheName: 'images-cache', expiration: { maxEntries: 100 } },
            },
            {
              urlPattern: /\/api\/.*/,
              handler: 'NetworkFirst',
              options: { cacheName: 'api-cache', expiration: { maxEntries: 50, maxAgeSeconds: 300 } },
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), '.'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            // React core — loaded on every page
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            // Animation library
            'vendor-motion': ['motion/react'],
            // Firebase split from app code
            'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
            // Charts — only loaded on analytics/dashboard pages
            'vendor-recharts': ['recharts'],
            // PDF generation — only loaded on invoice/export pages
            'vendor-pdf': ['jspdf', 'jspdf-autotable'],
            // i18n
            'vendor-i18n': ['i18next', 'react-i18next'],
          },
        },
      },
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:3001',
          changeOrigin: true,
          rewrite: (path) => path
        }
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify — file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
