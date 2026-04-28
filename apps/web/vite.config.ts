import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  root: __dirname,
  plugins: [react()],
  resolve: {
    alias: {
      '@contracts/generated': path.resolve(__dirname, '../../contracts/generated/be-types.ts'),
      '@contracts': path.resolve(__dirname, '../../contracts'),
    },
  },
  server: { port: 5173, strictPort: true },
});
