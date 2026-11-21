// Luz (o cualquier efecto) que sigue al cursor: escribe la posición en variables CSS o en left/top.
import { finePointer, reduceMotion } from './motion';

export type CursorGlowOptions = {
  /** Elemento que recibe la posición (<html> por defecto). */
  el?: HTMLElement;
  /** 'vars': variables CSS `x`/`y` (--mx/--my por defecto). 'position': left/top del elemento. */
  mode?: 'vars' | 'position';
  x?: string;
  y?: string;
  /** Suavizado 0–1 por cuadro a 60 fps (0 = sin demora). Independiente de los fps; se detiene al alcanzar al cursor. */
  ease?: number;
  /** Solo con ratón/trackpad. */
  fineOnly?: boolean;
  /** Desactivado con movimiento reducido. */
  respectReduce?: boolean;
  /** Posición inicial antes de mover el ratón. */
  initial?: [number, number];
};

/** Devuelve false si quedó desactivado (táctil o movimiento reducido, según las opciones). */
export function initCursorGlow({
  el = document.documentElement, mode = 'vars', x = '--mx', y = '--my', ease = 0, fineOnly = false, respectReduce = false, initial,
}: CursorGlowOptions = {}) {
  if ((fineOnly && !finePointer) || (respectReduce && reduceMotion)) return false;
  let tx = initial?.[0] ?? 0, ty = initial?.[1] ?? 0, cx = tx, cy = ty, raf = 0, last = 0;
  const put = () => {
    if (mode === 'position') { el.style.left = cx + 'px'; el.style.top = cy + 'px'; }
    else { el.style.setProperty(x, cx + 'px'); el.style.setProperty(y, cy + 'px'); }
  };
  const step = (t: number) => {
    raf = 0;
    if (ease) {
      const k = 1 - Math.pow(1 - ease, Math.min(t - last, 100) / 16.67);
      last = t;
      cx += (tx - cx) * k; cy += (ty - cy) * k;
      if (Math.abs(tx - cx) < 0.1 && Math.abs(ty - cy) < 0.1) { cx = tx; cy = ty; }
      else raf = requestAnimationFrame(step);
    } else { cx = tx; cy = ty; }
    put();
  };
  addEventListener('pointermove', (e) => {
    tx = e.clientX; ty = e.clientY;
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(step); }
  }, { passive: true });
  if (initial) put();
  return true;
}
