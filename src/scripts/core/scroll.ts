// Barra de progreso de lectura y nav que cambia al hacer scroll, para las páginas con marcado propio.

import { reduceMotion } from './motion';

/** Llama a `fn(p)` con el avance de lectura (0–1) al hacer scroll o cambiar el tamaño, una vez por cuadro. */
export function onScrollProgress(fn: (p: number) => void) {
  let queued = false;
  const frame = () => {
    queued = false;
    const max = document.documentElement.scrollHeight - innerHeight;
    fn(max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0);
  };
  const ask = () => { if (!queued) { queued = true; requestAnimationFrame(frame); } };
  addEventListener('scroll', ask, { passive: true });
  addEventListener('resize', ask, { passive: true });
  frame();
}

/** Barra de progreso: 'scaleX' (transform) o 'width' (porcentaje).
 *  Donde hay `animation-timeline: scroll()` la mueve el CSS (`.doc-scroll-progress` en document.css), sin escuchar
 *  el scroll; si no, o con movimiento reducido (algunas páginas apagan todas las animaciones), lo hace este JS. */
export function initScrollProgress(bar: HTMLElement | null, mode: 'scaleX' | 'width' = 'scaleX') {
  if (!bar) return;
  if (!reduceMotion && CSS.supports('animation-timeline: scroll()')) {
    bar.dataset.progress = mode;
    bar.classList.add('doc-scroll-progress');
    return;
  }
  onScrollProgress((p) => {
    if (mode === 'width') bar.style.width = p * 100 + '%';
    else bar.style.transform = `scaleX(${p})`;
  });
}

/** Variable CSS con el avance de lectura (p. ej. --scroll en <html>). */
export function initScrollVar(name = '--scroll', el: HTMLElement = document.documentElement) {
  onScrollProgress((p) => el.style.setProperty(name, p.toFixed(4)));
}

/** La nav recibe `className` cuando la página baja más de `threshold` px. */
export function initNavScrolled(nav: HTMLElement | null, threshold = 20, className = 'is-scrolled') {
  if (!nav) return;
  const onScroll = () => nav.classList.toggle(className, scrollY > threshold);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}
