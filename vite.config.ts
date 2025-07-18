import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  publicDir: 'public', // Ensure Vite serves static files from 'public'
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});