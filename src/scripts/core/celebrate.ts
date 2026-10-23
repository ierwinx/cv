import { $, $$ } from './dom';
import { reduceMotion } from './motion';

/* ───────────── Confeti ───────────── */

export type ConfettiOptions = {
  count?: number;
  colors?: string[];                   // por defecto, los de --confetti del tema
  spread?: 'fountain' | 'radial';      // hacia arriba en abanico, o en todas direcciones
  speed?: [number, number];            // radial: velocidad inicial (px por fotograma de 60 fps)
  lift?: number;                       // radial: impulso extra hacia arriba
  gravity?: number;
  drag?: number;                       // fricción horizontal por fotograma (1 = ninguna)
  dragY?: boolean;                     // aplica también la fricción en vertical
  spin?: number;                       // velocidad de giro máxima
  decay?: number;                      // cuánto se desvanece por fotograma (vida de 1 a 0)
  width?: [number, number];            // ancho de cada papelito
  height?: [number, number] | 'half';  // alto, o la mitad del ancho
  flip?: boolean;                      // los papelitos «giran» (el alto oscila)
  glyphs?: string[];                   // si se dan, parte de los papelitos son estos caracteres
  glyphRatio?: number;
  font?: string;                       // familia de los caracteres
};

type Bit = { x: number; y: number; vx: number; vy: number; w: number; h: number; r: number; vr: number; c: string; life: number; glyph?: string };
type Burst = { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; bits: Bit[]; o: Required<Omit<ConfettiOptions, 'glyphs' | 'colors'>> & ConfettiOptions };
const active = new Map<HTMLCanvasElement, Burst>();
const rand = (min: number, max: number) => min + Math.random() * (max - min);

const DEFAULTS = {
  count: 140, spread: 'fountain', speed: [4, 13], lift: 6, gravity: 0.45, drag: 1, dragY: false, spin: 0.4, decay: 0.008,
  width: [4, 11], height: 'half', flip: false, glyphRatio: 0.4, font: 'JetBrains Mono, monospace',
} as const;

function themeColors() {
  return getComputedStyle(document.documentElement).getPropertyValue('--confetti').split(',').map((c) => c.trim()).filter(Boolean);
}

function size(b: Burst) {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  b.canvas.width = b.canvas.offsetWidth * dpr;
  b.canvas.height = b.canvas.offsetHeight * dpr;
  b.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

/** Lanza confeti desde (x, y) en coordenadas del canvas (px CSS). Varias ráfagas comparten el mismo bucle. */
export function confetti(canvas: HTMLCanvasElement | null, x: number, y: number, options: ConfettiOptions = {}) {
  if (!canvas || reduceMotion) return;
  const o = { ...DEFAULTS, ...options } as Burst['o'];
  const colors = o.colors ?? themeColors();
  let b = active.get(canvas);
  const fresh = !b;
  if (!b) { b = { canvas, ctx: canvas.getContext('2d')!, bits: [], o }; size(b); active.set(canvas, b); }
  b.o = o;
  for (let i = 0; i < o.count; i++) {
    let vx, vy;
    if (o.spread === 'fountain') { vx = (Math.random() - 0.5) * 14; vy = Math.random() * -14 - 4; }
    else { const a = Math.random() * Math.PI * 2, s = rand(o.speed[0], o.speed[1]); vx = Math.cos(a) * s; vy = Math.sin(a) * s - o.lift; }
    const w = rand(o.width[0], o.width[1]);
    b.bits.push({
      x, y, vx, vy, w, h: o.height === 'half' ? w / 2 : rand(o.height[0], o.height[1]),
      r: Math.random() * Math.PI * 2, vr: (Math.random() - 0.5) * o.spin, c: colors[i % colors.length], life: 1,
      glyph: o.glyphs && Math.random() < o.glyphRatio ? o.glyphs[i % o.glyphs.length] : undefined,
    });
  }
  if (!fresh) return;
  let last = 0;
  const frame = (now: number) => {
    const k = last ? Math.min((now - last) / (1000 / 60), 4) : 1;
    last = now;
    const { ctx, o } = b!;
    ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
    const drag = Math.pow(o.drag, k);
    b!.bits = b!.bits.filter((p) => p.life > 0 && p.y < canvas.offsetHeight + 40);
    for (const p of b!.bits) {
      p.vy += o.gravity * k; p.vx *= drag; if (o.dragY) p.vy *= drag;
      p.x += p.vx * k; p.y += p.vy * k; p.r += p.vr * k; p.life -= o.decay * k;
      ctx.save();
      ctx.globalAlpha = Math.max(p.life, 0);
      ctx.translate(p.x, p.y); ctx.rotate(p.r);
      ctx.fillStyle = p.c;
      if (p.glyph) { ctx.font = `800 ${p.w * 2.4}px ${o.font}`; ctx.fillText(p.glyph, 0, 0); }
      else ctx.fillRect(-p.w / 2, -p.h / 2, p.w, o.flip ? p.h * Math.abs(Math.cos(p.r * 2)) : p.h);
      ctx.restore();
    }
    if (b!.bits.length) requestAnimationFrame(frame);
    else { ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight); active.delete(canvas); }
  };
  requestAnimationFrame(frame);
}

/* ───────────── Aviso flotante ───────────── */

export type ToastOptions = {
  el?: string | HTMLElement;  // el aviso (#toast por defecto)
  className?: string;         // clase que lo muestra («on» en el sistema aurora; algunas páginas usan «show»)
  ms?: number;                // cuánto se queda visible
  html?: boolean;             // `message` es HTML
};
const toastTimers = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>();

/** Muestra el aviso con `message` (o con el texto que ya tenga) y lo oculta a los `ms`. Resuelve al ocultarse. */
export function toast(message?: string, { el = '#toast', className = 'on', ms = 4000, html = true }: ToastOptions = {}) {
  const box = typeof el === 'string' ? $(el) : el;
  if (!box) return Promise.resolve();
  if (message !== undefined) { if (html) box.innerHTML = message; else box.textContent = message; }
  box.classList.add(className);
  clearTimeout(toastTimers.get(box));
  return new Promise<void>((resolve) => {
    toastTimers.set(box, setTimeout(() => { box.classList.remove(className); resolve(); }, ms));
  });
}

/** Botones [data-download] del sistema aurora: confeti en #confetti y el aviso de la página. */
export function initDownloads() {
  $$('[data-download]').forEach((a) => a.addEventListener('click', (e) => {
    confetti($<HTMLCanvasElement>('#confetti'), e.clientX, e.clientY);
    toast();
  }));
}
