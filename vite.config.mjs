import { defineConfig } from 'vite';

export default defineConfig({
  // Definiert 'src' als die Wurzel deines Frontend-Projekts
  root: 'src',
  // Sagt Vite, dass der öffentliche Ordner eine Ebene höher liegt
  publicDir: '../public',
  // Bestimmt, wo die fertigen Produktionsdateien landen sollen
  build: {
    outDir: '../dist', // Geht eine Ebene höher, um 'dist' im Hauptverzeichnis zu erstellen
    emptyOutDir: true,
  }
});