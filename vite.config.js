import shopify from 'vite-plugin-shopify';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    /* Plugin options are not required, defaults shown */
    shopify({
      // Root path to your Shopify theme directory (location of snippets, sections, templates, etc.)
      themeRoot: './theme',
      // Front-end source code directory
      sourceCodeDir: './react/src',
      // Front-end entry points directory
      entrypointsDir: './react/src',
      // Additional files to use as entry points (accepts an array of file paths or glob patterns)
      additionalEntrypoints: [],
      // Specifies the file name of the snippet that loads your assets
      snippetFile: 'vite-tag.liquid',
    }),
    react(),
  ],
});
