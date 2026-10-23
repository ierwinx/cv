import { $$ } from './dom';
import { reduceMotion } from './motion';

/** Tarjetas .tilt: inclinación 3D y brillo (--x/--y) bajo el cursor. */
export function initTilt() {
  // Grados máximos: --tilt del tema (6 por defecto).
  const deg = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tilt')) || 6;
  $$('.tilt').forEach((c) => {
    c.addEventListener('pointermove', (e) => {
      const r = c.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      c.style.setProperty('--x', x * 100 + '%');
      c.style.setProperty('--y', y * 100 + '%');
      if (!reduceMotion) c.style.transform = `perspective(900px) rotateY(${(x - 0.5) * deg}deg) rotateX(${(0.5 - y) * deg}deg)`;
    });
    c.addEventListener('pointerleave', () => (c.style.transform = ''));
  });
}

/** Botones .magnetic: siguen un poco al cursor. */
export function initMagnetic() {
  if (reduceMotion) return;
  $$('.magnetic').forEach((b) => {
    b.addEventListener('pointermove', (e) => {
      const r = b.getBoundingClientRect();
      b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.25}px,${(e.clientY - r.top - r.height / 2) * 0.35}px)`;
    });
    b.addEventListener('pointerleave', () => (b.style.transform = ''));
  });
}
