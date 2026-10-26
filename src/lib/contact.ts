import site from '../data/site.json';

/** Clave pública de reCAPTCHA v2 (la secreta solo la conoce el micro). */
export const RECAPTCHA_KEY = '6LfmjS4eAAAAAFO2xgRDuY_oSU9LW85duBoqddMg';

/**
 * Atributos del formulario de contacto, decididos al compilar (los lee scripts/core/contact.ts).
 * Solo el build de producción envía al micro y pide reCAPTCHA; en local se simula el envío.
 * Para probar contra el micro local: PUBLIC_CONTACT_API=http://localhost:8000 npm run dev (sin reCAPTCHA).
 */
export function contactAttrs(siteUrl: URL | undefined, origen: string) {
  const prod = import.meta.env.PROD && !!siteUrl && siteUrl.href.startsWith(site.production);
  const api: string = import.meta.env.PUBLIC_CONTACT_API || (prod ? site.contactApi : '');
  return { 'data-api': api, 'data-captcha': String(prod), 'data-origen': origen };
}
