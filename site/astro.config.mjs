import { defineConfig } from 'astro/config';

// GitHub Pages project site: https://stergioscha.github.io/vlaks/
export default defineConfig({
  site: 'https://stergioscha.github.io',
  base: '/vlaks',
  trailingSlash: 'ignore',
  devToolbar: { enabled: false },
  build: {
    inlineStylesheets: 'auto',
  },
});
