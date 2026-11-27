// @ts-check
import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';
import { unified } from '@astrojs/markdown-remark';
import rehypeMedia from './scripts/rehype-media.mjs';

// Legge PUBLIC_MEDIA_BASE da .env (o dalle variabili d'ambiente della build)
const mode = process.argv.includes('dev') ? 'development' : 'production';
const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env };

export default defineConfig({
  // indirizzo del sito: per la demo si imposta SITE_URL con l'indirizzo workers.dev
  site: env.SITE_URL || 'https://www.pedalebolognese.it',
  trailingSlash: 'ignore',
  build: { format: 'directory' },
  markdown: {
    // pipeline remark/rehype: serve per il plugin che riscrive i link alle foto
    processor: unified({
      rehypePlugins: [[rehypeMedia, { base: env.PUBLIC_MEDIA_BASE ?? '' }]],
    }),
  },
});
