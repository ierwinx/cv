// Página de iConverter: pipeline de conversión, calculadora y FAQ. La ventana animada es components/demos/IconverterDemo;
// versión, tamaño y año los pone la página al compilar (apps.json).
import { $, $$ } from '../core/dom';
import { reduceMotion as reduce } from '../core/motion';
import { initMagnetic } from '../core/pointer';
import { frameLoop } from '../core/loop';
import { toast } from '../core/celebrate';
import { initCounters, plainCount } from '../core/counters';
import { mount as mountDemo } from '../demos/iconverter';
import { initContactForms } from '../core/contact';

const finePointer = matchMedia('(pointer: fine)').matches;
$$('[data-iconverter]').forEach(mountDemo);

/* ── Aviso al descargar ── */
$$('[data-download]').forEach((b) => {
  b.addEventListener('click', () => toast('⬇️ Descargando iConverter… Ábrelo y arrástralo a Aplicaciones.', { className: 'show', ms: 3200, html: false }));
});

/* ── Nav + barra de scroll ── */
const nav = $('#nav')!, sbar = $('.scroll-bar')!;
function onScroll() {
  const y = scrollY, h = document.documentElement.scrollHeight - innerHeight;
  nav.classList.toggle('scrolled', y > 20);
  sbar.style.transform = `scaleX(${h > 0 ? y / h : 0})`;
}
addEventListener('scroll', onScroll, { passive: true }); onScroll();

/* ── Brillo que sigue al cursor ── */
const glow = $('.cursor-glow')!;
if (finePointer && !reduce) {
  let gx = 0, gy = 0, tx = 0, ty = 0;
  addEventListener('pointermove', (e) => { tx = e.clientX; ty = e.clientY; });
  (function loop() { gx += (tx - gx) * .12; gy += (ty - gy) * .12; glow.style.left = gx + 'px'; glow.style.top = gy + 'px'; requestAnimationFrame(loop); })();
} else glow.remove();

/* ── Rotador de palabras ── */
(() => {
  const items = $$('#rotator span'); let i = 0;
  if (reduce) return;
  setInterval(() => {
    const cur = items[i]; cur.classList.remove('on'); cur.classList.add('off');
    setTimeout(() => cur.classList.remove('off'), 700);
    i = (i + 1) % items.length; items[i].classList.add('on');
  }, 2600);
})();

/* ── Icono 3D con inclinación ── */
(() => {
  const stage = $('#stage')!, icon = $('#icon3d')!;
  if (!finePointer || reduce) return;
  stage.addEventListener('pointermove', (e) => {
    const r = stage.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
    icon.style.transform = `rotateY(${x * 28}deg) rotateX(${-y * 28}deg) translateZ(30px)`;
    icon.style.setProperty('--gx', (x + .5) * 100 + '%'); icon.style.setProperty('--gy', (y + .5) * 100 + '%');
  });
  stage.addEventListener('pointerleave', () => { icon.style.transform = ''; });
})();

/* ── Ondas de audio en canvas alrededor del icono ── */
(() => {
  const c = $<HTMLCanvasElement>('#waves')!, ctx = c.getContext('2d')!;
  let w = 0, h = 0, t = 0;
  function size() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    w = c.clientWidth; h = c.clientHeight; c.width = w * dpr; c.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  size(); addEventListener('resize', size);
  const colors = ['#4f8cff', '#8b5cf6', '#d946ef', '#ec4899'];
  function draw(_: number, step: number) {
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2, base = Math.min(w, h) * .33;
    colors.forEach((col, k) => {
      ctx.beginPath();
      for (let a = 0; a <= Math.PI * 2 + .01; a += Math.PI / 90) {
        const n = Math.sin(a * (5 + k) + t * (1 + k * .3)) * 10 + Math.sin(a * 11 - t * 1.7 + k) * 6 + Math.sin(a * 3 + t * .5) * 8;
        const r = base + k * 14 + n;
        const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
        if (a === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = col; ctx.globalAlpha = .55 - k * .1; ctx.lineWidth = 1.6;
      ctx.shadowColor = col; ctx.shadowBlur = 16; ctx.stroke();
    });
    // partículas
    for (let i = 0; i < 40; i++) {
      const a = i / 40 * Math.PI * 2 + t * .15, r = base * 1.45 + Math.sin(t * 2 + i) * 14;
      ctx.globalAlpha = .4 + Math.sin(t * 3 + i) * .3; ctx.fillStyle = colors[i % 4];
      ctx.beginPath(); ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 1.6, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;
    t += reduce ? 0 : .016 * step;
  }
  if (reduce) draw(0, 1); else frameLoop(draw, { fps: 30, visible: c });
})();

/* ── Marquee ── */
(() => {
  const items: [name: string, tag?: string, highlight?: boolean][] = [['FLAC', 'lossless', true], ['→'], ['M4A', 'AAC', true], ['WAV', 'lossless'], ['AIFF', 'lossless'], ['MP3', 'copia'], ['OGG', 'copia'], ['Opus', 'copia'], ['WMA', 'copia'], ['Apple Music', 'auto', true], ['320 kbps', 'máx']];
  const html = items.map(([n, t, hl]) => `<div class="marquee-item${hl ? ' hl' : ''}">${n}${t ? `<em>${t}</em>` : ''}</div>`).join('');
  $('#marquee')!.innerHTML = html + html;
})();

/* ── Botones magnéticos ── */
if (finePointer) initMagnetic();

/* ── Spotlight + tilt en tarjetas ── */
if (finePointer && !reduce) $$('.tilt').forEach((c) => {
  c.addEventListener('pointermove', (e) => {
    const r = c.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    c.style.setProperty('--mx', x + 'px'); c.style.setProperty('--my', y + 'px');
    c.style.transform = `perspective(900px) rotateX(${(y / r.height - .5) * -5}deg) rotateY(${(x / r.width - .5) * 5}deg)`;
  });
  c.addEventListener('pointerleave', () => { c.style.transform = ''; });
});

/* ── Visuales de las tarjetas ── */
$('#cores')!.innerHTML = Array.from({ length: 20 }, (_, i) => `<i style="animation-delay:${(i % 10) * .12 + Math.floor(i / 10) * .5}s"></i>`).join('');
$('#eq')!.innerHTML = Array.from({ length: 22 }, () => `<i style="animation-delay:${-Math.random()}s;animation-duration:${.6 + Math.random() * .8}s"></i>`).join('');

/* ── Reveal al hacer scroll ── */
const io = new IntersectionObserver((es) => es.forEach((e) => {
  if (!e.isIntersecting) return;
  e.target.classList.add('in'); io.unobserve(e.target);
}), { threshold: .15, rootMargin: '0px 0px -60px 0px' });
$$('.reveal').forEach((el) => io.observe(el));

/* ── Contadores ── */
initCounters('[data-count]', { duration: 1600, threshold: .5, format: plainCount });

/* ── Calculadora de ahorro ── */
(() => {
  const gb = $<HTMLInputElement>('#gb')!, FLAC_KBPS = 900; let k = 256;
  const fmt = (v: number) => v >= 1000 ? (v / 1000).toFixed(v >= 10000 ? 0 : 2) + ' TB' : Math.round(v) + ' GB';
  const out = (id: string, text: string) => { $(id)!.textContent = text; };
  function upd() {
    const g = +gb.value, aac = g * k / FLAC_KBPS;
    gb.style.setProperty('--p', (g - +gb.min) / (+gb.max - +gb.min) * 100 + '%');
    out('#gbOut', fmt(g)); out('#flacOut', fmt(g)); out('#aacOut', fmt(aac)); out('#savedOut', fmt(g - aac));
    $('#aacBar')!.style.width = Math.max(aac / g * 100, 2) + '%';
  }
  gb.addEventListener('input', upd);
  const buttons = $$('#brs button');
  buttons.forEach((b) => b.addEventListener('click', () => {
    buttons.forEach((x) => x.classList.remove('on'));
    b.classList.add('on'); k = +b.dataset.k!; upd();
  }));
  upd();
})();

/* ── Ola animada del CTA final ── */
(() => {
  const p1 = $('#wavePath')!, p2 = $('#wavePath2')!; let t = 0;
  function path(off: number, amp: number, f: number) {
    let d = 'M0 220 L0 120 ';
    for (let x = 0; x <= 1440; x += 24) d += `L${x} ${110 + Math.sin(x * f + t + off) * amp + Math.sin(x * f * 2.3 - t * 1.3) * amp * .4} `;
    return d + 'L1440 220 Z';
  }
  const draw = (_: number, k: number) => { p1.setAttribute('d', path(0, 34, .006)); p2.setAttribute('d', path(2, 46, .0045)); t += .02 * k; };
  if (reduce) draw(0, 0); else frameLoop(draw, { visible: $('.final')! });
})();

// Formulario de contacto
initContactForms();
