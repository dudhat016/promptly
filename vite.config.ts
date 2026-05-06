import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.EMAIL_PROVIDER': JSON.stringify(env.EMAIL_PROVIDER),
      'process.env.SMTP_HOST': JSON.stringify(env.SMTP_HOST),
      'process.env.SMTP_PORT': JSON.stringify(env.SMTP_PORT),
      'process.env.SMTP_USER': JSON.stringify(env.SMTP_USER),
      'process.env.SMTP_PASS': JSON.stringify(env.SMTP_PASS),
      'process.env.SMTP_SECURE': JSON.stringify(env.SMTP_SECURE),
      'process.env.FROM_NAME': JSON.stringify(env.FROM_NAME),
      'process.env.FROM_EMAIL': JSON.stringify(env.FROM_EMAIL),
      'process.env.CASHFREE_APP_ID': JSON.stringify(env.CASHFREE_APP_ID),
      'process.env.CASHFREE_SECRET_KEY': JSON.stringify(env.CASHFREE_SECRET_KEY),
      'process.env.CASHFREE_ENV': JSON.stringify(env.CASHFREE_ENV),
      'process.env.PAYPAL_CLIENT_ID': JSON.stringify(env.PAYPAL_CLIENT_ID),
      'process.env.PAYPAL_SECRET_KEY': JSON.stringify(env.PAYPAL_SECRET_KEY),
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
