import apps from '../data/apps.json';
import site from '../data/site.json';

export type App = (typeof apps)[number] & {
  release?: { tag: string; file: string };
  size?: string;               // tamaño del instalador, p. ej. "3.5 MB"
  install?: string;            // App Store (apps móviles)
  play?: string;               // Google Play; sin él, los botones dicen «Próximamente»
  home?: { tagline: string; logo: string; new?: boolean; round?: boolean };   // menú, órbita y dock de la home
  theme?: { color: string; fonts?: string; vars?: Record<string, string> };
  title?: string;
  description?: string;
  icon?: string;
  touchIcon?: string;
};

export function getApp(slug: string): App {
  const app = (apps as App[]).find((a) => a.slug === slug);
  if (!app) throw new Error(`No existe la app "${slug}" en src/data/apps.json`);
  return app;
}

/** Enlace de descarga del instalador en GitHub Releases. */
export function downloadUrl(app: App) {
  if (!app.release) throw new Error(`La app "${app.slug}" no tiene "release" en apps.json`);
  return `${site.releases}/${app.release.tag}/${app.release.file}`;
}
