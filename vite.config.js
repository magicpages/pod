import { defineConfig } from 'vite';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  base: './',
  build: {
    outDir: 'assets/built',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'assets/js/main.js'),
        styles: resolve(__dirname, 'assets/css/main.css'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
      },
    },
    minify: 'esbuild',
    sourcemap: false,
  },
  css: {
    postcss: './postcss.config.js',
  },
  server: {
    watch: {
      usePolling: true,
    },
  },
});
