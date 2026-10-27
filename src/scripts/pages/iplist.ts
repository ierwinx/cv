// Página de iPlist: editor en vivo del héroe, barras de rendimiento y nodos que se materializan.
import { $, $$ } from '../core/dom';
import { reduceMotion as reduce, sleep as wait } from '../core/motion';
import { initReveal } from '../core/reveal';
import { initNav } from '../core/nav';
import { initGlyphs } from '../core/glyphs';
import { initMagnetic } from '../core/pointer';
import { toast } from '../core/celebrate';

document.documentElement.classList.add('js');
initReveal('.rv, .reveal', { threshold: .12, stagger: 0 });
initNav();
initGlyphs();
initMagnetic();

// Las barras del benchmark crecen al verse.
const bars = $('#bars')!;
new IntersectionObserver((es, o) => es.forEach((e) => {
  if (e.isIntersecting) { bars.classList.remove('armed'); o.disconnect(); }
}), { threshold: .3 }).observe(bars);

// Foco del cursor y luz de las tarjetas.
const spot = $('#spot')!;
addEventListener('pointermove', (e) => {
  spot.style.left = e.clientX + 'px'; spot.style.top = e.clientY + 'px';
}, { passive: true });
$$('.card').forEach((c) => c.addEventListener('pointermove', (e) => {
  const r = c.getBoundingClientRect();
  c.style.setProperty('--mx', (e.clientX - r.left) + 'px');
  c.style.setProperty('--my', (e.clientY - r.top) + 'px');
}));

// Inclinación 3D de la ventana del editor.
const stage = $('#stage')!, win = $('#win')!;
if (!reduce && matchMedia('(min-width: 981px)').matches) {
  stage.addEventListener('pointermove', (e) => {
    const r = stage.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
    win.style.transform = `rotateY(${x * 14}deg) rotateX(${-y * 10}deg)`;
  });
  stage.addEventListener('pointerleave', () => { win.style.transform = ''; });
}

// Materialización perezosa: solo se encienden unos cuantos nodos.
const nodes = $('#nodes')!;
for (let i = 0; i < 96; i++) nodes.appendChild(document.createElement('i'));
const cells = [...nodes.children];
const lightNodes = () => {
  cells.forEach((c) => c.classList.remove('on'));
  const start = Math.floor(Math.random() * 70);
  for (let i = 0; i < 6; i++) cells[(start + i * (i < 3 ? 1 : 24)) % 96].classList.add('on');
};
lightNodes();
if (!reduce) setInterval(lightNodes, 1600);

// Edición guionada en la ventana del héroe: seleccionar, escribir, confirmar y deshacer.
const row = $('#target')!, tv = $('#tv')!;
const tKey = $('#toastKey')!, tMsg = $('#toastMsg')!;
const showToast = (k: string, m: string) => {
  tKey.textContent = k; tMsg.textContent = m;
  return toast(undefined, { className: 'show', ms: 1400 });
};
async function loop() {
  for (;;) {
    await wait(1400);
    row.classList.add('sel');
    await wait(700);
    tv.innerHTML = '<span class="edit">1.0<span class="caret"></span></span>';
    const ed = tv.firstElementChild!;
    await wait(500);
    for (const s of ['1.', '1']) { ed.innerHTML = s + '<span class="caret"></span>'; await wait(160); }
    for (const s of ['1.', '1.1']) { ed.innerHTML = s + '<span class="caret"></span>'; await wait(220); }
    await wait(600);
    tv.textContent = '1.1';
    row.classList.remove('sel'); row.classList.add('flash');
    showToast('⏎', 'Valor guardado');
    await wait(2400);
    row.classList.remove('flash');
    tv.textContent = '1.0'; row.classList.add('flash');
    await showToast('⌘Z', 'Deshacer edición');
    await wait(800);
    row.classList.remove('flash');
  }
}
if (!reduce) loop();

// Atajos: se ilumina la tecla que pulsas.
const keys = $$('.key');
addEventListener('keydown', (e) => {
  const combo = [e.shiftKey && 'shift', e.altKey && 'alt', (e.metaKey || e.ctrlKey) && 'meta', e.key.toLowerCase()]
    .filter(Boolean).join('+');
  const k = keys.find((el) => el.dataset.k === combo);
  if (!k) return;
  if (e.metaKey || e.ctrlKey || e.key === 'Backspace') e.preventDefault();
  k.classList.add('hit');
  setTimeout(() => k.classList.remove('hit'), 450);
});
// Mientras nadie teclea y la sección se ve, las teclas se demuestran solas.
let typed = false;
addEventListener('keydown', () => { typed = true; }, { once: true });
let ki = 0;
if (!reduce) setInterval(() => {
  if (typed) return;
  const r = $('#keys')!.getBoundingClientRect();
  if (r.top > innerHeight || r.bottom < 0) return;
  const k = keys[ki++ % keys.length];
  k.classList.add('hit'); setTimeout(() => k.classList.remove('hit'), 500);
}, 900);
