// iGit · landing. Efectos de la página; la demo de la terminal es components/demos/IgitDemo.
import { $, $$ } from '../core/dom';
import { reduceMotion as reduced } from '../core/motion';
import { initMagnetic } from '../core/pointer';
import { frameLoop } from '../core/loop';
import { confetti, toast } from '../core/celebrate';
import { countUp, plainCount } from '../core/counters';
import { mount as mountDemo } from '../demos/igit';

const finePointer = matchMedia('(pointer: fine)').matches;
const root = document.documentElement;
root.classList.remove('no-js');
$$('[data-tui]').forEach((tui) => mountDemo(tui.parentElement!));

/* ───────────── Aparición al hacer scroll ───────────── */
const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    e.target.classList.add('in');
    io.unobserve(e.target);
  }
}, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
$$('.reveal').forEach((el, i) => {
  el.style.transitionDelay = `${Math.min((i % 6) * 70, 350)}ms`;
  io.observe(el);
});

// Anillos, barras y contadores
const statsIO = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    e.target.classList.add('in');
    $$('[data-count]', e.target).forEach((el) => countUp(el, { duration: 1600, format: plainCount }));
    statsIO.unobserve(e.target);
  }
}, { threshold: 0.4 });
$$('.stat, .race').forEach((el) => statsIO.observe(el));

/* ───────────── Barra de progreso y navegación ───────────── */
const nav = $('.nav')!;
const onScroll = () => {
  const max = root.scrollHeight - innerHeight;
  root.style.setProperty('--scroll', max > 0 ? (scrollY / max).toFixed(4) : '0');
  nav.classList.toggle('scrolled', scrollY > 20);
};
addEventListener('scroll', onScroll, { passive: true });
onScroll();

/* ───────────── Foco de luz que sigue al ratón ───────────── */
if (finePointer && !reduced) {
  addEventListener('pointermove', (e) => {
    root.style.setProperty('--mx', `${e.clientX}px`);
    root.style.setProperty('--my', `${e.clientY}px`);
  }, { passive: true });
}

/* ───────────── Inclinación 3D y brillo de tarjetas ───────────── */
$$('.tilt').forEach((el) => {
  const strength = el.classList.contains('term') ? 4 : 7;
  el.addEventListener('pointermove', (e) => {
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.setProperty('--cx', `${x * 100}%`);
    el.style.setProperty('--cy', `${y * 100}%`);
    if (!finePointer || reduced) return;
    el.style.transform = `rotateX(${(0.5 - y) * strength}deg) rotateY(${(x - 0.5) * strength}deg) translateZ(0)`;
  });
  el.addEventListener('pointerleave', () => {
    el.style.transition = 'transform .6s cubic-bezier(.2,.8,.2,1)';
    el.style.transform = '';
    setTimeout(() => (el.style.transition = ''), 600);
  });
});

/* ───────────── Botones magnéticos ───────────── */
if (finePointer) initMagnetic();

/* ───────────── Texto que se «descifra» ───────────── */
function scramble(el: HTMLElement) {
  const final = el.dataset.text!;
  const glyphs = '!<>-_/[]{}=+*^?#%&';
  const start = performance.now();
  const dur = 1100;
  const run = () => {
    const t = (performance.now() - start) / dur;
    if (t >= 1) { el.textContent = final; return; }
    el.textContent = [...final].map((ch, i) => {
      if (ch === ' ' || ch === ',') return ch;
      return t > i / final.length ? ch : glyphs[(Math.random() * glyphs.length) | 0];
    }).join('');
    setTimeout(run, 40);
  };
  run();
}
if (!reduced) $$('.scramble').forEach((el) => setTimeout(() => scramble(el), 250));

/* ───────────── Cielo de partículas ───────────── */
(() => {
  const sky = $<HTMLCanvasElement>('#stars')!;
  const sctx = sky.getContext('2d')!;
  let stars: { x: number; y: number; z: number; t: number }[] = [];
  const parallax = { x: 0, y: 0 };
  function sizeSky() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    sky.width = innerWidth * dpr;
    sky.height = innerHeight * dpr;
    sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.round((innerWidth * innerHeight) / 9000);
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * innerWidth, y: Math.random() * innerHeight, z: Math.random() * 0.8 + 0.2, t: Math.random() * Math.PI * 2,
    }));
  }
  sizeSky();
  addEventListener('resize', sizeSky);
  if (finePointer) addEventListener('pointermove', (e) => {
    parallax.x = (e.clientX / innerWidth - 0.5) * 30;
    parallax.y = (e.clientY / innerHeight - 0.5) * 30;
  }, { passive: true });
  function drawSky(time: number) {
    sctx.clearRect(0, 0, innerWidth, innerHeight);
    const drift = reduced ? 0 : time * 0.006;
    for (const s of stars) {
      const x = (s.x + parallax.x * s.z + drift * s.z) % innerWidth;
      const y = (s.y + parallax.y * s.z - scrollY * 0.05 * s.z + innerHeight * 10) % innerHeight;
      const a = 0.25 + Math.sin(time * 0.0015 + s.t) * 0.25 * s.z + s.z * 0.3;
      sctx.fillStyle = `rgba(200, 200, 255, ${a})`;
      sctx.fillRect(x, y, s.z * 1.6, s.z * 1.6);
    }
  }
  if (reduced) drawSky(0); else frameLoop(drawSky, { fps: 30 });   // fondo lento: 30 fps se ven igual
})();

/* ───────────── Descargar ───────────── */
// Cada botón trae en data-download la URL del instalador (apps.json → release).
$$('[data-download]').forEach((btn) => btn.addEventListener('click', (e) => {
  e.preventDefault();
  const r = btn.getBoundingClientRect();
  confetti($<HTMLCanvasElement>('#confetti'), r.left + r.width / 2, r.top + r.height / 2, {
    count: 160, colors: ['#7c5cff', '#3fa9ff', '#2ee6a6', '#ff5ca8', '#ffb547', '#ffffff'], spread: 'radial',
    gravity: 0.25, drag: 0.985, decay: 1 / 160, width: [6, 12], height: [3, 8],
  });
  const a = document.createElement('a');
  a.href = btn.dataset.download!; a.setAttribute('download', '');
  document.body.appendChild(a); a.click(); a.remove();
  toast('✨ <b>¡Gracias!</b> Tu descarga de iGit 1.0.0 ha comenzado.', { ms: 3800 });
}));

/* ───────────── Teclado interactivo ───────────── */
const keyChip = $('#keyChip')!;
const keyInfo = $('#keyInfo')!;
const keyOut = $('.key-output')!;
const keyboardSection = $('#keys')!;
const keys = $$('.key');
function pressKey(btn: HTMLElement) {
  btn.classList.add('down');
  setTimeout(() => btn.classList.remove('down'), 160);
  keyChip.textContent = btn.dataset.key!;
  keyInfo.textContent = btn.dataset.info!;
  keyOut.classList.remove('flash');
  void keyOut.offsetWidth;
  keyOut.classList.add('flash');
}
keys.forEach((btn) => btn.addEventListener('click', () => pressKey(btn)));
addEventListener('keydown', (e) => {
  if (e.metaKey || e.altKey || (e.target as Element).closest?.('input, textarea')) return;
  const r = keyboardSection.getBoundingClientRect();
  if (r.bottom < 0 || r.top > innerHeight) return;
  let name = e.key === ' ' ? 'Space' : e.key;
  if (e.ctrlKey) name = '⌃' + e.key.toUpperCase();
  const btn = keys.find((k) => k.dataset.key === name);
  if (!btn) return;
  e.preventDefault();
  pressKey(btn);
});
