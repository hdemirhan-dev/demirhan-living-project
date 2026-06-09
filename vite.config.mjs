import { defineConfig } from 'vite';

export default defineConfig({
  // Das sorgt dafür, dass alle Pfade (CSS/JS) absolut zum Root gesetzt werden
  base: './', 
  build: {
    outDir: 'dist',
  },
});