import { $$ } from './dom';
import { reduceMotion } from './motion';

export type TiltOptions = {
  /** Grados máximos de inclinación (en los dos ejes, salvo que se den degX/degY). */
  deg?: number;
  degX?: number;
  degY?: number;
  /** perspective() en px; 0 para no ponerla (cuando el padre ya tiene perspective). */
  perspective?: number;
  /** Variables CSS con la posición del cursor dentro del elemento (para el brillo); null para no escribirlas. */
  x?: string | null;
  y?: string | null;
  /** '%' (0–100 %) o 'px' (desde la esquina). */
  unit?: '%' | 'px';
  /** Transformación que se añade tras la inclinación (p. ej. 'translateY(-4px)'). */
  extra?: string;
  /** Inclinar (false = solo brillo). Por defecto, salvo con movimiento reducido. Con una función, se decide en cada movimiento. */
  rotate?: boolean | ((el: HTMLElement) => boolean);
};

/** Inclinación 3D y brillo bajo el cursor para un elemento. */
export function tilt(el: HTMLElement, {
  deg = 6, degX = deg, degY = deg, perspective = 900, x = '--x', y = '--y', unit = '%', extra = '', rotate = !reduceMotion,
}: TiltOptions = {}) {
  el.addEventListener('pointermove', (e) => {
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
    if (x) el.style.setProperty(x, unit === '%' ? px * 100 + '%' : e.clientX - r.left + 'px');
    if (y) el.style.setProperty(y, unit === '%' ? py * 100 + '%' : e.clientY - r.top + 'px');
    if (typeof rotate === 'function' ? rotate(el) : rotate) {
      el.style.transform = `${perspective ? `perspective(${perspective}px) ` : ''}rotateX(${(0.5 - py) * degX}deg) rotateY(${(px - 0.5) * degY}deg)${extra ? ' ' + extra : ''}`;
    }
  });
  if (rotate) el.addEventListener('pointerleave', () => (el.style.transform = ''));
}

/** Tarjetas .tilt: inclinación 3D y brillo (--x/--y) bajo el cursor. */
export function initTilt(selector = '.tilt', options?: TiltOptions) {
  // Grados máximos: --tilt del tema (6 por defecto).
  const deg = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tilt')) || 6;
  $$(selector).forEach((c) => tilt(c, { deg, ...options }));
}

/** Botones .magnetic: siguen un poco al cursor (fx/fy: fracción del desplazamiento).
 *  vars: además escribe --mx/--my (px dentro del botón) para un brillo, también con movimiento reducido. */
export function initMagnetic(selector = '.magnetic', { fx = 0.25, fy = 0.35, vars = false } = {}) {
  if (reduceMotion && !vars) return;
  $$(selector).forEach((b) => {
    b.addEventListener('pointermove', (e) => {
      const r = b.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      if (vars) { b.style.setProperty('--mx', x + 'px'); b.style.setProperty('--my', y + 'px'); }
      if (!reduceMotion) b.style.transform = `translate(${(x - r.width / 2) * fx}px,${(y - r.height / 2) * fy}px)`;
    });
    b.addEventListener('pointerleave', () => (b.style.transform = ''));
  });
}
