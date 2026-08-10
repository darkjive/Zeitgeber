/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config';

// Web-Target des Sun-Clock-MVP. Basis relativ, damit der statische Build
// (dist/) auch unter einem Unterpfad ausgeliefert werden kann.
export default defineConfig({
  base: './',
  // Eigenständiges Projekt: nicht die PostCSS-/Tailwind-Konfig des
  // umgebenden Astro-Repos erben.
  css: { postcss: {} },
  build: {
    target: 'es2022',
    outDir: 'dist',
  },
  test: {
    globals: true,
    environment: 'node',
  },
});
