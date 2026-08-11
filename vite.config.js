import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * The site is served from https://nottrezz.github.io/Luna-Music/, so every
 * emitted asset URL has to carry the repository name. Without `base`, Vite
 * writes absolute `/assets/...` paths that resolve to the user root and 404 —
 * which looks exactly like a broken deploy rather than a config mistake.
 *
 * `public/prototype/` is copied through untouched. It is the design mockup
 * vendored from the app repo, and it is deliberately not part of the React
 * build: bundling it would rewrite the very CSS the site is showing off.
 */
export default defineConfig({
  base: '/Luna-Music/',
  plugins: [react()],
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
  },
});
