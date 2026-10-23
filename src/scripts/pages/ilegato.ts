// iLegato · sitio. Efectos con el mismo espíritu que la app: aurora, revelados, inclinación y brillo.
// Todo se pausa fuera de pantalla y respeta "Reducir movimiento". Lo monta components/ilegato/IlegatoShell.
// Los enlaces del App Store y de Google Play salen de apps.json al compilar.
import { $, $$ } from '../core/dom';
import { reduceMotion as reduced } from '../core/motion';
import { initCounters } from '../core/counters';
import { initMagnetic, initTilt } from '../core/pointer';
import { initReveal } from '../core/reveal';
import { frameLoop } from '../core/loop';

const fine = matchMedia('(pointer: fine)').matches;
const root = document.documentElement;
const body = document.body;

/** Observa la visibilidad de `el` y llama a `on` en cada cambio. */
const watch = (el: Element, on: (visible: boolean) => void, threshold = 0) =>
  new IntersectionObserver(([e]) => on(e.isIntersecting), { threshold }).observe(el);

// ───────── Aurora: manchas de color que derivan y siguen un poco al cursor ─────────
(() => {
  const canvas = $<HTMLCanvasElement>('#aurora');
  if (!canvas) return;
  const ctx = canvas.getContext('2d')!;
  const scale = 0.22; // se dibuja chico y el navegador lo escala: suave y barato
  const blobs = [
    { c: [124, 92, 255], x: .25, y: .25, r: .55, sx: .00011, sy: .00007, p: 0 },
    { c: [63, 169, 255], x: .8, y: .3, r: .5, sx: .00008, sy: .00012, p: 1.7 },
    { c: [46, 230, 166], x: .6, y: .85, r: .5, sx: .0001, sy: .00006, p: 3.1 },
    { c: [236, 72, 153], x: .1, y: .8, r: .45, sx: .00007, sy: .0001, p: 4.4 },
  ];
  let w = 0, h = 0, mx = .5, my = .3, tx = .5, ty = .3;
  const size = () => { w = canvas.width = Math.ceil(innerWidth * scale); h = canvas.height = Math.ceil(innerHeight * scale); };
  size();
  addEventListener('resize', size);
  addEventListener('pointermove', (e) => { tx = e.clientX / innerWidth; ty = e.clientY / innerHeight; }, { passive: true });

  const withAlpha = (color: string, a: number) => {
    if (color.startsWith('#')) {
      const n = parseInt(color.slice(1), 16);
      return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`;
    }
    return color.replace('rgb(', 'rgba(').replace(')', `,${a})`);
  };

  function draw(t: number) {
    mx += (tx - mx) * .03; my += (ty - my) * .03;
    ctx.fillStyle = '#07070c';
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    const glow = getComputedStyle(body).getPropertyValue('--glow').trim();
    blobs.forEach((b, i) => {
      const k = reduced ? 0 : t;
      const x = (b.x + Math.sin(k * b.sx + b.p) * .18 + (mx - .5) * (.08 + i * .03)) * w;
      const y = (b.y + Math.cos(k * b.sy + b.p) * .14 + (my - .5) * (.06 + i * .02)) * h;
      const r = b.r * Math.max(w, h);
      const color = i === 0 && glow ? glow : `rgb(${b.c})`;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, withAlpha(color, .34));
      g.addColorStop(1, withAlpha(color, 0));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    });
    ctx.globalCompositeOperation = 'source-over';
  }
  if (reduced) draw(0); else frameLoop(draw, { fps: 30 });   // ~30 fps es suficiente para una deriva tan lenta
})();

// ───────── Luz del cursor, barra de progreso y navegación ─────────
(() => {
  const bar = $('.progress');
  const nav = $('#nav');
  let px = innerWidth / 2, py = innerHeight * .3, queued = false;
  const frame = () => {
    queued = false;
    root.style.setProperty('--mx', px + 'px');
    root.style.setProperty('--my', py + 'px');
    const max = root.scrollHeight - innerHeight;
    if (bar) bar.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
    nav?.classList.toggle('scrolled', scrollY > 30);
  };
  const ask = () => { if (!queued) { queued = true; requestAnimationFrame(frame); } };
  addEventListener('pointermove', (e) => { px = e.clientX; py = e.clientY; ask(); }, { passive: true });
  addEventListener('scroll', ask, { passive: true });
  frame();
})();

// ───────── Títulos palabra por palabra ─────────
// El degradado va en cada palabra: background-clip no cruza los inline-block.
$$('.split').forEach((el) => {
  let i = 0;
  const wrap = (node: Node, grad: boolean) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        child.textContent!.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.append(' '); return; }
          const w = document.createElement('span');
          w.className = 'w';
          const inner = document.createElement('span');
          inner.textContent = part;
          inner.style.setProperty('--i', String(i++));
          if (grad) inner.className = 'grad';
          w.append(inner);
          frag.append(w);
        });
        child.replaceWith(frag);
      } else if (child instanceof Element) {
        const isGrad = grad || child.classList.contains('grad');
        child.classList.remove('grad');
        wrap(child, isGrad);
      }
    });
  };
  wrap(el, false);
});

// ───────── Revelados, contadores, tarjetas con inclinación y botones magnéticos ─────────
initReveal('.reveal, .split, #compare', { threshold: .18, rootMargin: '0px 0px -8% 0px', stagger: 0 });
initCounters();
if (fine) { initTilt(); initMagnetic(); }

// ───────── El color ambiente sigue a la sección (como el tema Dinámico) ─────────
const glowWatch = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    const glow = (e.target as HTMLElement).dataset.glow;
    if (e.isIntersecting && glow) body.style.setProperty('--glow', glow);
  });
}, { rootMargin: '-45% 0px -45% 0px' });
$$('[data-glow]').forEach((el) => glowWatch.observe(el));

// ───────── Teléfonos del inicio: inclinación con el cursor ─────────
(() => {
  const phones = $('#phones');
  const stage = $('#phones .stage');
  if (!phones || !stage || reduced || !fine) return;
  phones.addEventListener('pointermove', (e) => {
    const r = phones.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - .5;
    const y = (e.clientY - r.top) / r.height - .5;
    stage.style.transform = `rotateY(${x * 16}deg) rotateX(${-y * 12}deg)`;
  });
  phones.addEventListener('pointerleave', () => { stage.style.transform = ''; });
})();

// ───────── Recorrido: el teléfono fijo cambia de pantalla con cada paso ─────────
(() => {
  const shots = $$('.story-phone img');
  const steps = $$('.step');
  const show = (name?: string) => {
    shots.forEach((img) => img.classList.toggle('on', img.dataset.shot === name));
    steps.forEach((s) => s.classList.toggle('on', s.dataset.shot === name));
  };
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const step = e.target as HTMLElement;
      show(step.dataset.shot);
      body.style.setProperty('--glow', step.dataset.glow!);
    });
  }, { rootMargin: '-48% 0px -48% 0px' });
  steps.forEach((s) => io.observe(s));
  steps[0]?.classList.add('on');
})();

// ───────── Ecualizador interactivo (curvas reales de la app) ─────────
(() => {
  const svg = $('#eqSvg');
  if (!svg) return;
  const presets: Record<string, number[]> = {
    'Metalcore': [6, 5, 3, -1, -3, -1, 2, 4, 4, 3],
    'Deathcore': [6, 6, 4, -1, -3, -2, 1, 4, 3, 1],
    'Grindcore': [4, 5, 3, 0, -1, 1, 3, 3, 1, 0],
    'Post-hardcore': [4, 4, 2, -1, -2, 0, 3, 4, 3, 2],
    'Nu metal': [6, 6, 3, -1, -3, -2, 1, 3, 4, 3],
    'Midwest emo': [1, 2, 2, 1, 0, 1, 2, 4, 4, 3],
    'Punk': [2, 3, 3, 1, 1, 2, 3, 3, 2, 1],
    'Metal': [5, 4, 2, 0, -3, -2, 1, 4, 5, 4],
    'Rock': [5, 4, 3, 1, -1, -1, 1, 3, 4, 5],
    'Hip-Hop': [5, 4, 2, 3, -1, -1, 1, -1, 2, 3],
    'Electrónica': [5, 4, 1, 0, -2, 2, 1, 1, 4, 5],
    'Jazz': [4, 3, 1, 2, -1, -1, 0, 1, 3, 4],
    'Plano': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  };
  const H = 300, mid = 150, unit = 150 / 12;
  const xs = Array.from({ length: 10 }, (_, i) => 50 + i * 100);
  const curve = $('#eqCurve')!, area = $('#eqArea')!, dotsG = $('#eqDots')!, barsG = $('#eqBars')!;
  const name = $('#eqName')!, chips = $('#eqChips')!;
  const NS = 'http://www.w3.org/2000/svg';
  const svgEl = (tag: string, attrs: Record<string, number>) => {
    const el = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
    return el;
  };
  const dots = xs.map((x) => { const c = svgEl('circle', { cx: x, r: 9 }); c.classList.add('dot'); dotsG.append(c); return c; });
  const bars = Array.from({ length: 40 }, (_, i) => { const r = svgEl('rect', { x: i * 25 + 3, width: 19, rx: 4 }); barsG.append(r); return r; });
  let current = presets.Metalcore.slice(), target = current.slice();

  // Catmull-Rom → Bézier: la misma curva suave que dibuja la app
  const path = (pts: number[][]) => {
    let d = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const [p0, p1, p2, p3] = [pts[i - 1] || pts[i], pts[i], pts[i + 1], pts[i + 2] || pts[i + 1]];
      d += ` C${p1[0] + (p2[0] - p0[0]) / 6},${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6},${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]},${p2[1]}`;
    }
    return d;
  };
  const gainAt = (x: number) => { // interpola la curva para las barras del "espectro"
    const t = Math.min(9, Math.max(0, (x - 50) / 100));
    const i = Math.floor(t), f = t - i;
    return current[i] + ((current[i + 1] ?? current[i]) - current[i]) * f;
  };
  let visible = false;
  watch(svg, (v) => { visible = v; if (visible) requestAnimationFrame(tick); });

  function render(t: number) {
    const pts = xs.map((x, i) => [x, mid - current[i] * unit]);
    const d = path(pts);
    curve.setAttribute('d', d);
    area.setAttribute('d', `${d} L${xs[9]},${H} L${xs[0]},${H} Z`);
    dots.forEach((c, i) => c.setAttribute('cy', String(pts[i][1])));
    bars.forEach((r, i) => {
      const x = i * 25 + 12;
      const energy = .35 + .65 * Math.abs(Math.sin(t / 380 + i * .7) * Math.cos(t / 610 + i * .3));
      const hgt = Math.max(8, (60 + gainAt(x) * 9) * energy * (reduced ? .6 : 1));
      r.setAttribute('y', String(H - hgt));
      r.setAttribute('height', String(hgt));
    });
  }
  function tick(t: number) {
    current = current.map((g, i) => g + (target[i] - g) * .12);
    render(t);
    if (visible && !reduced) requestAnimationFrame(tick);
  }
  Object.keys(presets).forEach((key, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = key;
    if (i === 0) b.classList.add('on');
    b.addEventListener('click', () => {
      target = presets[key].slice();
      name.textContent = key;
      $$('button', chips).forEach((x) => x.classList.toggle('on', x === b));
      if (reduced) { current = target.slice(); render(0); }
    });
    chips.append(b);
  });
  render(0);
})();

// ───────── Siri escribiendo frases ─────────
(() => {
  const el = $('#siriText');
  if (!el) return;
  const lines = [
    'Oye Siri, pon Bad Omens en iLegato',
    'Pon el álbum Rescue de Silverstein',
    'Pon metalcore en iLegato',
    'Pon música en Legato',
    'Reanuda iLegato',
  ];
  if (reduced) { el.textContent = `"${lines[0]}"`; return; }
  let line = 0, ch = 0, deleting = false, visible = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  watch(el, (v) => { visible = v; if (visible && !timer) step(); });
  function step() {
    timer = null;
    if (!visible) return;
    const text = lines[line];
    ch += deleting ? -1 : 1;
    el!.textContent = `"${text.slice(0, ch)}${ch >= text.length ? '"' : ''}`;
    let wait = deleting ? 28 : 55;
    if (!deleting && ch >= text.length) { deleting = true; wait = 2200; }
    else if (deleting && ch <= 0) { deleting = false; line = (line + 1) % lines.length; wait = 400; }
    timer = setTimeout(step, wait);
  }
})();

// ───────── iPad: se endereza al hacer scroll ─────────
(() => {
  const ipad = $('#ipadDevice');
  if (!ipad || reduced) return;
  let queued = false;
  const update = () => {
    queued = false;
    const r = ipad.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, 1 - (r.top - innerHeight * .15) / (innerHeight * .75)));
    ipad.style.transform = `rotateX(${18 * (1 - p)}deg) scale(${.92 + .08 * p})`;
  };
  addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(update); } }, { passive: true });
  update();
})();

// ───────── iPad: las pantallas rotan solas; tocar el iPad o un segmento cambia ─────────
// El tiempo lo lleva la animación del segmento activo (CSS): al terminar, avanza. Fuera de pantalla se pausa.
(() => {
  const ipad = $('#ipadDevice');
  const dots = $('#ipadDots');
  if (!ipad || !dots) return;
  const shots = $$('.ipad-screens img', ipad);
  const buttons = $$('button', dots);
  let current = 0;
  const show = (i: number) => {
    current = (i + shots.length) % shots.length;
    shots.forEach((img, n) => img.classList.toggle('on', n === current));
    buttons.forEach((b, n) => {
      b.classList.toggle('on', n === current);
      if (n === current) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
    });
  };
  if (reduced) dots.classList.add('still'); // sin avance automático: solo al tocar
  dots.addEventListener('animationend', () => show(current + 1));
  ipad.addEventListener('click', () => show(current + 1));
  ipad.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); show(current + 1); } });
  buttons.forEach((b, n) => b.addEventListener('click', () => show(n)));
  let visible = false;
  const sync = () => dots.classList.toggle('paused', !visible || document.hidden);
  watch(ipad, (v) => { visible = v; sync(); }, .35);
  document.addEventListener('visibilitychange', sync);
  sync();
})();

// ───────── Auto: CarPlay | Android Auto ─────────
(() => {
  const car = $('#car');
  if (!car) return;
  const tabs = $$('[data-car]', car);
  tabs.forEach((tab) => tab.addEventListener('click', () => {
    tabs.forEach((t) => { t.classList.toggle('on', t === tab); t.setAttribute('aria-selected', String(t === tab)); });
    $$('[data-screen]', car).forEach((sc) => sc.classList.toggle('on', sc.dataset.screen === tab.dataset.car));
  }));
})();

// ───────── Marca de onda que fluye (como el WaveMark de la app) ─────────
(() => {
  const wave = $<SVGPathElement>('#wavePath');
  if (!wave || reduced) return;
  let visible = false;
  watch(wave, (v) => { visible = v; if (visible) requestAnimationFrame(flow); });
  function flow(t: number) {
    let d = '';
    for (let x = 4; x <= 116; x += 2) {
      const env = Math.sin(((x - 4) / 112) * Math.PI);
      const y = 20 + Math.sin(x / 9 - t / 260) * 13 * env;
      d += (x === 4 ? 'M' : 'L') + x + ',' + y.toFixed(2) + ' ';
    }
    wave!.setAttribute('d', d);
    if (visible) requestAnimationFrame(flow);
  }
})();
