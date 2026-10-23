import { $$ } from './dom';
import { reduceMotion } from './motion';

export type CountOptions = {
  duration?: number;                              // ms (1700 por defecto)
  power?: number;                                 // curva de frenado: 4 = suave (por defecto), 3 = más directa
  format?: (value: number, el: HTMLElement) => string;
};

/** Formato por defecto: data-dec decimales, data-locale (es-MX por defecto: 1,000.5), data-prefix y data-suffix. */
export function formatCount(value: number, el: HTMLElement) {
  const dec = +(el.dataset.dec ?? 0);
  const text = value.toLocaleString(el.dataset.locale ?? 'es-MX', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  return (el.dataset.prefix ?? '') + text + (el.dataset.suffix ?? '');
}

/** Entero sin separador de miles, con data-suffix (para páginas que no agrupaban cifras). */
export const plainCount = (value: number, el: HTMLElement) => Math.round(value) + (el.dataset.suffix ?? '');

const done = new WeakSet<HTMLElement>();

/** Cuenta de 0 al valor de data-count (o data-to). Una sola vez por elemento; con movimiento reducido, directo al final. */
export function countUp(el: HTMLElement, { duration = 1700, power = 4, format = formatCount }: CountOptions = {}) {
  if (done.has(el)) return;
  done.add(el);
  const target = parseFloat(el.dataset.count ?? el.dataset.to ?? '0');
  if (reduceMotion) { el.textContent = format(target, el); return; }
  const start = performance.now();
  const frame = (now: number) => {
    const t = Math.min((now - start) / duration, 1);
    el.textContent = format(target * (1 - Math.pow(1 - t, power)), el);
    if (t < 1) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

/** Los elementos de `selector` cuentan al entrar en pantalla. */
export function initCounters(selector = '[data-count]', { threshold = 0.4, ...options }: CountOptions & { threshold?: number } = {}) {
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      countUp(e.target as HTMLElement, options);
      io.unobserve(e.target);
    }
  }, { threshold });
  $$(selector).forEach((el) => io.observe(el));
}
