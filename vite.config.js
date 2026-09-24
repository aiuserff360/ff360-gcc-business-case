import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// VITE_BASE lets the GitHub Pages build serve from /<repo>/ while local dev stays at /.
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE || '/',
  server: { port: 5173 },
});
