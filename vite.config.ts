import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    // SECURITY UPDATE: We removed the 'define' block that was injecting
    // process.env.API_KEY. This prevents the key from leaking into the
    // client-side bundle. The key is now only used in the Cloudflare Function.
  };
});
