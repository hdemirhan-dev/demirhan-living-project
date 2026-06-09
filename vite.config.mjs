import { defineConfig } from 'vite';
import { cloudflare } from '@cloudflare/vite-plugin'; // <-- Hier ist die Änderung: { cloudflare }

export default defineConfig({
  plugins: [
    cloudflare() 
  ],
  root: 'src', 
  build: {
    outDir: '../dist', 
    emptyOutDir: true,
  }
});