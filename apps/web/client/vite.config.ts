import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Dev: client on 4568, API proxied to the M1 server on 4567.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 4568,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4567',
        changeOrigin: true,
      },
    },
  },
});
