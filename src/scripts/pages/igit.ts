// iGit · landing. Efectos de la página; la demo de la terminal es components/demos/IgitDemo.
import { $, $$ } from '../core/dom';
import { finePointer, reduceMotion as reduced } from '../core/motion';
import { initMagnetic, tilt } from '../core/pointer';
import { initReveal } from '../core/reveal';
import { initScrollVar } from '../core/scroll';
import { initCursorGlow } from '../core/cursor';
import { initNav } from '../core/nav';
import { initGlyphs } from '../core/glyphs';
import { frameLoop } from '../core/loop';
import { confetti, toast } from '../core/celebrate';
import { countUp, plainCount } from '../core/counters';
import { initScramble } from '../core/scramble';
import { mount as mountDemo } from '../demos/igit';

document.documentElement.classList.remove('no-js');
$$('[data-tui]').forEach((tui) => mountDemo(tui.parentElement!));

/* ───────────── Aparición al hacer scroll ───────────── */
initReveal('.reveal', { stagger: 70, every: 6, maxDelay: 350, rootMargin: '0px 0px -40px 0px' });

// Anillos, barras y contadores
initReveal('.stat, .race', {
  stagger: 0, threshold: 0.4,
  onEnter: (el) => $$('[data-count]', el).forEach((n) => countUp(n, { duration: 1600, format: plainCount })),
});

/* ───────────── Barra de progreso (la nav es la común: core/nav) ───────────── */
initScrollVar();

/* ───────────── Foco de luz que sigue al ratón ───────────── */
initCursorGlow({ fineOnly: true, respectReduce: true });

/* ───────────── Inclinación 3D y brillo de tarjetas ───────────── */
$$('.tilt').forEach((el) => {
  tilt(el, {
    deg: el.classList.contains('term') ? 4 : 7, perspective: 0, x: '--cx', y: '--cy', extra: 'translateZ(0)',
    rotate: finePointer && !reduced,
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
initScramble();

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
// Los botones de descarga (ui/DownloadButton) enlazan al instalador de GitHub Releases.
$$('[data-download]').forEach((btn) => btn.addEventListener('click', (e) => {
  e.preventDefault();
  const r = btn.getBoundingClientRect();
  confetti($<HTMLCanvasElement>('#confetti'), r.left + r.width / 2, r.top + r.height / 2, {
    count: 160, colors: ['#7c5cff', '#3fa9ff', '#2ee6a6', '#ff5ca8', '#ffb547', '#ffffff'], spread: 'radial',
    gravity: 0.25, drag: 0.985, decay: 1 / 160, width: [6, 12], height: [3, 8],
  });
  const a = document.createElement('a');
  a.href = (btn as HTMLAnchorElement).href; a.setAttribute('download', '');
  document.body.appendChild(a); a.click(); a.remove();
  toast(`✨ <b>¡Gracias!</b> Tu descarga de iGit ${btn.dataset.appVersion ?? ''} ha comenzado.`, { ms: 3800 });
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

initNav();
initGlyphs();
