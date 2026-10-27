import legal from '../data/legal.json';
import { getApp, type App } from './apps';

/** Lo que cada app guarda, pide y usa (data/legal.json). Los textos aceptan HTML. */
export type Legal = {
  updated: string;
  summary: string;
  network: string;
  saves: string[];
  permissions: [title: string, text: string][];
  thirdParty?: string;
  license?: 'gpl';                // por omisión, PolyForm Noncommercial 1.0.0
  requirements: string;
  install?: 'pkg';                // por omisión, .dmg
  uninstall: string;
  faq: [question: string, answer: string][];
};

/** getStaticPaths de las páginas legales: una por app con datos en legal.json. */
export function legalPaths() {
  return Object.entries(legal.apps as unknown as Record<string, Legal>).map(([slug, data]) => ({
    params: { slug },
    props: { app: getApp(slug), legal: data },
  }));
}

export type LegalProps = { app: App; legal: Legal };
