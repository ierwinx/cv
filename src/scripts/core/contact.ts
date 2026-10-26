// Formulario de contacto → microservicio Backierwinx (FastAPI + Firestore en Render).
// La página decide al compilar (lib/contact.ts): data-api (a dónde enviar; vacío = envío simulado),
// data-captcha (reCAPTCHA v2, solo producción) y data-origen (qué página lo envía).
import { $$ } from './dom';

declare const grecaptcha: { reset(): void } | undefined;

export interface ContactTexts { sending: string; success: string; error: string; captcha: string }

export const ES: ContactTexts = {
  sending: 'Enviando…',
  success: '¡Gracias! Tu mensaje llegó, te responderé pronto.',
  error: 'No se pudo enviar. Intenta de nuevo en un momento.',
  captcha: 'Marca la casilla «No soy un robot».',
};

const TIMEOUT = 90_000;   // Render gratis tarda hasta un minuto en despertar

let captchaLoaded = false;
function loadCaptcha() {
  if (captchaLoaded) return;
  captchaLoaded = true;
  const s = document.createElement('script');
  s.src = 'https://www.google.com/recaptcha/api.js';
  s.async = s.defer = true;
  document.head.appendChild(s);
}

interface Options {
  texts?: () => ContactTexts;                          // función: el CV cambia de idioma
  onError?: (text: string) => void;                    // falta el captcha
  onDone?: (ok: boolean, text: string) => void;        // resultado del envío
}

export function initContactForm(form: HTMLFormElement, { texts = () => ES, onError, onDone }: Options = {}) {
  const { api = '', origen = 'web' } = form.dataset;
  const captcha = form.dataset.captcha === 'true';
  const button = form.querySelector<HTMLButtonElement>('[type="submit"]')!;
  const error = form.querySelector<HTMLElement>('.cf-error');
  const status = form.querySelector<HTMLElement>('.cf-status');
  const showError = onError ?? ((text: string) => { if (error) error.textContent = text; });
  const done = onDone ?? ((ok: boolean, text: string) => {
    if (!status) return;
    status.hidden = false;
    status.className = `cf-status ${ok ? 'is-ok' : 'is-error'}`;
    status.textContent = text;
  });

  // Al acercarse a la pantalla carga reCAPTCHA y despierta el micro, que en Render gratis duerme tras 15 min
  const io = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    io.disconnect();
    if (captcha) loadCaptcha();
    if (api) fetch(`${api}/salud`).catch(() => {});
  }, { rootMargin: '600px' });
  io.observe(form);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const t = texts();
    const { 'g-recaptcha-response': token = '', ...fields } = Object.fromEntries(new FormData(form)) as Record<string, string>;
    if (captcha && !token) { showError(t.captcha); return; }
    showError('');
    if (status) status.hidden = true;
    const body = { ...fields, origen, recaptcha: token };

    if (!api) {
      console.info('[contacto] Envío simulado: este build no envía al micro.', body);
      form.reset();
      done(true, `${t.success} (simulado)`);
      return;
    }
    const label = button.textContent;
    button.disabled = true;
    button.textContent = t.sending;
    try {
      const r = await fetch(`${api}/contacto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(TIMEOUT),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      form.reset();
      done(true, t.success);
    } catch {
      done(false, t.error);
    } finally {
      if (captcha && typeof grecaptcha !== 'undefined') grecaptcha.reset();
      button.disabled = false;
      button.textContent = label;
    }
  });
}

/** Monta todos los <ContactForm> de la página (los que tienen data-contact). */
export function initContactForms() {
  $$<HTMLFormElement>('form[data-contact]').forEach((form) => initContactForm(form));
}
