// vite.config.ts
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    // We no longer need to expose API_KEY here! 
    // It stays safely on the server.
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:3000', // Points to your Node server
          changeOrigin: true,
        }
      }
    }
  };
});
