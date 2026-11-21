import { $$ } from './dom';

export type RevealOptions = {
  /** Clase que se añade al entrar ('in' por defecto; algunas páginas usan 'visible' o 'is-in'). */
  className?: string;
  threshold?: number;
  rootMargin?: string;
  /** ms entre vecinos; 0 para ninguno. Con `group` el índice cuenta por padre; si no, por orden en la página. */
  stagger?: number;
  /** Cada cuántos elementos se reinicia el escalonado (4 por defecto; sin `group`). */
  every?: number;
  /** Índice máximo del escalonado (con `group`): el 7.º hermano y los siguientes esperan lo mismo que el 6.º. */
  maxIndex?: number;
  /** Retraso máximo en ms. */
  maxDelay?: number;
  /** El índice cuenta entre los hermanos .reveal del mismo padre. */
  group?: boolean;
  /** Variable CSS que recibe el retraso en segundos (p. ej. '--d') en lugar de transition-delay. */
  delayVar?: string;
  /** ms entre los elementos que entran en el mismo lote (se aplica con setTimeout, como el CV). */
  batchDelay?: number;
  /** Se llama una vez cuando el elemento entra (contadores, barras, demos…). */
  onEnter?: (el: HTMLElement) => void;
};

/** Los elementos de `selector` reciben `className` al entrar en pantalla (el CSS de cada diseño los anima). */
export function initReveal(selector = '.reveal', {
  className = 'in', threshold = 0.15, rootMargin, stagger = 80, every = 4, maxIndex = Infinity, maxDelay = Infinity,
  group = false, delayVar, batchDelay = 0, onEnter,
}: RevealOptions = {}) {
  const els = $$(selector);
  const done = new WeakSet<Element>();
  const show = (el: HTMLElement) => {
    if (done.has(el)) return;
    done.add(el);
    el.classList.add(className);
    onEnter?.(el);
  };
  const io = new IntersectionObserver((entries) => {
    let i = 0;
    for (const e of entries) {
      // Un salto con ancla puede pasar de largo sin intersectar; lo que queda arriba también se revela.
      if (!e.isIntersecting && e.boundingClientRect.top > 0) continue;
      const el = e.target as HTMLElement;
      io.unobserve(el);
      if (batchDelay) setTimeout(() => show(el), i++ * batchDelay); else show(el);
    }
  }, { threshold, rootMargin });

  const counts = new Map<Element | null, number>();
  els.forEach((el, n) => {
    if (stagger) {
      let index = n % every;
      if (group) {
        index = counts.get(el.parentElement) ?? 0;
        counts.set(el.parentElement, index + 1);
      }
      const ms = Math.min(Math.min(index, maxIndex) * stagger, maxDelay);
      if (delayVar) el.style.setProperty(delayVar, `${ms / 1000}s`); else el.style.transitionDelay = ms + 'ms';
    }
    io.observe(el);
  });

  // Respaldo: si el observador llega tarde (pestaña en segundo plano), al volver se revela lo que ya está en pantalla.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    for (const el of els) {
      if (done.has(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.top < innerHeight && r.bottom > 0) { io.unobserve(el); show(el); }
    }
  });
}

/** Llama a `fn` una sola vez, la primera vez que `el` entra en pantalla. */
export function onceVisible(el: Element | null, fn: (el: HTMLElement) => void, { threshold = 0.15, rootMargin }: { threshold?: number; rootMargin?: string } = {}) {
  if (!el) return;
  const io = new IntersectionObserver((entries) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    io.disconnect();
    fn(el as HTMLElement);
  }, { threshold, rootMargin });
  io.observe(el);
}
