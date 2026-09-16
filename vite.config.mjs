import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)) } },
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  build: {
    outDir: 'public/crypto',
    lib: { entry: 'src/crypto-main.tsx', name: 'PredictCrypto', formats: ['iife'], fileName: () => 'dashboard.js' }
  }
});
