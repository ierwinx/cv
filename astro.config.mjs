// @ts-check
import { defineConfig } from 'astro/config';

// URL base del sitio. En local apunta a astro dev/preview; el deploy pasa SITE=https://ierwinx.com.
// tools/seo.py lee la misma variable, así que nada del build local apunta a producción.
export const SITE = process.env.SITE ?? 'http://localhost:4321';

export default defineConfig({
  site: SITE,
  output: 'static',
  trailingSlash: 'ignore',
  build: {
    // Mantiene las URLs actuales: pages/ibridge/index.astro → /ibridge/index.html,
    // pages/superpets/privacy.astro → /superpets/privacy.html
    format: 'preserve',
  },
  // Sin compactar el HTML: varias demos usan white-space: pre y necesitan los saltos de línea tal cual.
  compressHTML: false,
  devToolbar: { enabled: false },
  vite: {
    build: {
      rollupOptions: {
        output: {
          // scripts/core son módulos de unos cientos de bytes que usan casi todas las páginas: van juntos en un
          // solo archivo (una petición, en caché para todo el sitio) en vez de uno por módulo.
          manualChunks: (id) => (id.includes('/src/scripts/core/') ? 'core' : undefined),
        },
      },
    },
  },
});
