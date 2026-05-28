// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// Set site to your GitHub Pages URL, e.g. https://davidrourap.github.io
// If hosting as a project page (not username.github.io), also set base: '/repo-name'
export default defineConfig({
  site: 'https://drou0302.github.io',
  output: 'static',
  vite: {
    plugins: [tailwindcss()],
  },
});