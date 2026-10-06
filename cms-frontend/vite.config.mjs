import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'REACT_APP_');

  return {
    plugins: [react()],
    define: {
      // Keep existing local and Vercel API URL configuration working during
      // the toolchain transition. This URL is public and is not a secret.
      'process.env.REACT_APP_API_URL': JSON.stringify(env.REACT_APP_API_URL || ''),
      'process.env.PUBLIC_URL': JSON.stringify(''),
    },
    server: {
      port: 3000,
    },
    build: {
      outDir: 'build',
      assetsDir: 'assets',
      emptyOutDir: true,
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/setupTests.js'],
      testTimeout: 15000,
    },
  };
});
