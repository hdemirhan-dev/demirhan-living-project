import { defineConfig } from 'vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: 'src',
  publicDir: '../public',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    // Multi-Page-Build: index.html + dashboard.html
    rollupOptions: {
      input: {
        main     : resolve(__dirname, 'src/index.html'),
        dashboard: resolve(__dirname, 'src/dashboard.html'),
      },
    },
  },
});
