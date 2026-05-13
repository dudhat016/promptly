import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'icons/*.png'],
        manifest: false, // We use public/manifest.json
        workbox: {
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
    define: {
      'process.env.EMAIL_PROVIDER': JSON.stringify(env.EMAIL_PROVIDER),
      'process.env.SMTP_HOST': JSON.stringify(env.SMTP_HOST),
      'process.env.SMTP_PORT': JSON.stringify(env.SMTP_PORT),
      'process.env.SMTP_USER': JSON.stringify(env.SMTP_USER),
      'process.env.SMTP_SECURE': JSON.stringify(env.SMTP_SECURE),
      'process.env.FROM_NAME': JSON.stringify(env.FROM_NAME),
      'process.env.FROM_EMAIL': JSON.stringify(env.FROM_EMAIL),
      'process.env.CASHFREE_APP_ID': JSON.stringify(env.CASHFREE_APP_ID),
      'process.env.CASHFREE_ENV': JSON.stringify(env.CASHFREE_ENV),
      'process.env.PAYPAL_CLIENT_ID': JSON.stringify(env.PAYPAL_CLIENT_ID),
      'process.env.PAYPAL_ENV': JSON.stringify(env.PAYPAL_ENV),
    },
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), '.'),
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
      // Do not modifyâ€”file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
