// Campo de símbolos que flotan en el fondo (nació en iJson): suben despacio, giran, se apartan del cursor
// y siguen el scroll con parallax. Los símbolos y colores los pone ui/GlyphField.astro en data-*.
import { $$ } from './dom';
import { reduceMotion as reduce } from './motion';
import { frameLoop } from './loop';

type Glyph = { x: number; y: number; z: number; g: string; c: number; r: number; vr: number };

function mountField(cv: HTMLCanvasElement) {
  const ctx = cv.getContext('2d')!;
  const glyphs: string[] = JSON.parse(cv.dataset.glyphs || '[]');
  const vars = (cv.dataset.colors || '--a1,--a2,--a3,--a4,--muted').split(',');
  const density = +(cv.dataset.density || 1);
  if (!glyphs.length) return;
  let W = 0, H = 0, parts: Glyph[] = [], colors: string[] = [];
  const mouse = { x: -999, y: -999 };
  const readColors = () => {
    const cs = getComputedStyle(cv);
    colors = vars.map((v) => cs.getPropertyValue(v.trim()).trim() || '#fff');
  };
  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round(Math.min(70, W * H / 22000) * density);
    parts = Array.from({ length: n }, () => ({
      x: Math.random() * W, y: Math.random() * H, z: .3 + Math.random() * .9,
      g: glyphs[Math.random() * glyphs.length | 0], c: Math.random() * vars.length | 0, r: Math.random() * Math.PI, vr: (Math.random() - .5) * .004,
    }));
  };
  const draw = (_ = 0, k = 1) => {
    ctx.clearRect(0, 0, W, H);
    const sy = scrollY;
    for (const p of parts) {
      if (!reduce) { p.y -= .18 * p.z * k; p.r += p.vr * k; if (p.y < -40) { p.y = H + 40; p.x = Math.random() * W; } }
      const y = ((p.y - sy * .15 * p.z) % (H + 80) + H + 80) % (H + 80) - 40;
      const dx = p.x - mouse.x, dy = y - mouse.y, dist = Math.hypot(dx, dy);
      const near = Math.max(0, 1 - dist / 220);
      ctx.save();
      ctx.translate(p.x + (near ? dx / dist * near * 18 : 0), y + (near ? dy / dist * near * 18 : 0));
      ctx.rotate(p.r);
      ctx.globalAlpha = .08 + .1 * p.z + near * .5;
      ctx.fillStyle = colors[p.c];
      ctx.font = `${Math.round(12 + 16 * p.z)}px "JetBrains Mono", ui-monospace, monospace`;
      ctx.fillText(p.g, 0, 0);
      ctx.restore();
    }
  };
  readColors(); resize();
  if (reduce) draw(); else frameLoop(draw, { fps: 30 });   // fondo lento: 30 fps se ven igual
  addEventListener('resize', () => { resize(); if (reduce) draw(); });
  addEventListener('pointermove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });
  // Si la página cambia de tema (claro/oscuro), se releen los colores
  const recolor = () => { readColors(); if (reduce) draw(); };
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', recolor);
  new MutationObserver(recolor).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
}

export function initGlyphs(selector = '[data-glyph-field]') {
  $$<HTMLCanvasElement>(selector).forEach(mountField);
}
