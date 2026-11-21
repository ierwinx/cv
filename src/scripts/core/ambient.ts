import { $ } from './dom';
import { reduceMotion } from './motion';
import { frameLoop } from './loop';
import { initCursorGlow } from './cursor';
import { initScrollProgress } from './scroll';

/** Foco que sigue al cursor (.spot usa --mx/--my). */
export const initSpotlight = () => initCursorGlow();

/** Ventana del hero que se endereza al hacer scroll ([data-scroll-tilt]). */
export function initScrollTilt(el: HTMLElement) {
  if (reduceMotion) return;
  addEventListener('scroll', () => {
    const t = Math.min(scrollY / 500, 1);
    el.style.transform = `rotateX(${14 - 14 * t}deg) scale(${0.96 + 0.04 * t})`;
  }, { passive: true });
}

export function initStars(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  let stars: { x: number; y: number; r: number; v: number; p: number }[] = [];
  const size = () => {
    canvas.width = innerWidth * devicePixelRatio;
    canvas.height = innerHeight * devicePixelRatio;
    stars = Array.from({ length: Math.min(160, innerWidth / 8) }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      r: Math.random() * 1.3 * devicePixelRatio + 0.2, v: Math.random() * 0.25 + 0.05, p: Math.random() * 6,
    }));
  };
  size();
  addEventListener('resize', size);
  const draw = (t: number, k: number) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const s of stars) {
      s.y -= s.v * k;
      if (s.y < 0) s.y = canvas.height;
      ctx.globalAlpha = 0.35 + 0.35 * Math.sin(t / 900 + s.p);
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.fill();
    }
  };
  if (reduceMotion) draw(0, 0); else frameLoop(draw, { fps: 30 });   // fondo lento: 30 fps se ven igual
}

export function initAmbient() {
  initSpotlight();
  const bar = $('#progress');
  initScrollProgress(bar, 'width');
  const stars = $<HTMLCanvasElement>('#stars');
  if (stars) initStars(stars);
  const tilt = $('[data-scroll-tilt]');
  if (tilt) initScrollTilt(tilt);
}
