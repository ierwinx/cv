// Home (/): nav, menú de apps, órbita del hero, rotador, color ambiente por sección, pestañas de los
// editores, carrusel de capturas y dock. Es el único script de la página: también monta las demos.
import { $, $$ } from '../core/dom';
import { reduceMotion, sleep, whileVisible } from '../core/motion';
import { initCounters } from '../core/counters';
import { initMagnetic } from '../core/pointer';
import { initReveal } from '../core/reveal';
import { mount as igit } from '../demos/igit';
import { mount as iconverter } from '../demos/iconverter';
import { mount as irar } from '../home/irar';
import { mount as itunes } from '../home/itunes';
import { mount as spectrogram } from '../home/spectrogram';
import { mount as plist } from '../home/plist';
import { mount as json } from '../home/json';
import { mount as csv } from '../home/csv';
import { mount as xml } from '../home/xml';
import { mount as academy } from '../home/academy';

const finePointer = matchMedia('(pointer: fine)').matches;
const root = document.documentElement;

// ── Demos: cada visual de la home con su mount(root) ──
const DEMOS: [selector: string, mount: (root: HTMLElement) => void][] = [
  ['[data-irar]', irar], ['[data-tui]', (tui) => igit(tui.parentElement!)], ['[data-itunes]', itunes],
  ['.window--spec', spectrogram], ['[data-iconverter]', iconverter], ['.window--plist', plist],
  ['.window--json', json], ['.window--csv', csv], ['.window--xml', xml], ['#code', academy],
];
for (const [selector, mount] of DEMOS) $$(selector).forEach(mount);

// ── Básicos ──
// Años de oficio: la página trae el año de inicio (data-since, de cv.json) y aquí se cuenta hasta hoy.
$$('[data-since]').forEach((el) => { el.dataset.count = String(new Date().getFullYear() - +el.dataset.since!); });
$$('.hero-title .word').forEach((w, i) => w.style.setProperty('--i', String(i)));
requestAnimationFrame(() => document.body.classList.add('loaded'));

// ── Nav y barra de progreso ──
(() => {
  const nav = $('#nav')!, progress = $('.progress')!;
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const max = root.scrollHeight - innerHeight;
      progress.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
      nav.classList.toggle('scrolled', scrollY > 30);
      ticking = false;
    });
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

// ── Menú «Apps»: se cierra al elegir; en teléfonos se abre con un toque ──
(() => {
  const dd = $('.dd')!, trigger = $('.dd-trigger', dd)!;
  $$('.dd-panel a', dd).forEach((link) => link.addEventListener('click', () => {
    link.blur();
    dd.classList.remove('open');
    dd.classList.add('closing');
    setTimeout(() => dd.classList.remove('closing'), 600);
  }));
  const phone = matchMedia('(max-width: 680px)');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.addEventListener('click', (e) => {
    if (!phone.matches) return;
    e.preventDefault();
    trigger.setAttribute('aria-expanded', String(dd.classList.toggle('open')));
  });
  document.addEventListener('click', (e) => {
    if (dd.classList.contains('open') && !dd.contains(e.target as Node)) {
      dd.classList.remove('open');
      trigger.setAttribute('aria-expanded', 'false');
    }
  });
})();

// ── Foco del cursor y paralaje de la órbita ──
if (finePointer && !reduceMotion) {
  const orbit = $('#orbit')!;
  addEventListener('pointermove', (e) => {
    root.style.setProperty('--mx', e.clientX + 'px');
    root.style.setProperty('--my', e.clientY + 'px');
    if (scrollY < innerHeight) {
      const x = e.clientX / innerWidth - 0.5, y = e.clientY / innerHeight - 0.5;
      orbit.style.transform = `rotateX(${y * -18}deg) rotateY(${x * 22}deg)`;
    }
  }, { passive: true });
}

// ── Aparición escalonada entre hermanos, contadores y botones magnéticos ──
$$('.reveal').forEach((el) => {
  const siblings = [...el.parentElement!.children].filter((c) => c.classList.contains('reveal'));
  el.style.setProperty('--delay', Math.min(siblings.indexOf(el) * 80, 480) + 'ms');
});
initReveal('.reveal', { threshold: 0.12, rootMargin: '0px 0px -40px 0px', stagger: 0 });
initCounters();
if (finePointer) initMagnetic();

// ── Rotador del hero ──
if (!reduceMotion) {
  const rotator = $('#rotator')!;
  const words = ['Mac.', 'iPhone.', 'iPad.', 'Apple Watch.', 'CarPlay.', 'terminal.', 'música.', 'mascota.'];
  let w = 0;
  setInterval(() => {
    rotator.classList.add('out');
    setTimeout(() => {
      w = (w + 1) % words.length;
      rotator.textContent = words[w];
      rotator.classList.remove('out');
    }, 350);
  }, 2200);
}

// ── El color ambiente sigue a la sección ──
const accentObserver = new IntersectionObserver((entries) => {
  entries.forEach((e) => { if (e.isIntersecting) root.style.setProperty('--glow', (e.target as HTMLElement).dataset.accent!); });
}, { threshold: 0.35 });
$$('[data-accent]').forEach((el) => accentObserver.observe(el));

// ── Editores (iPlist · iJson · iCSV · iXML): pestañas que rotan solas hasta que eliges una ──
(() => {
  const trio = $('#nuevas')!, tabList = $('.tabs', trio)!;
  const tabs = $$('.tab', trio), panels = $$('.spot--panel', trio);
  const names = tabs.map((t) => t.dataset.tab!);
  const TAB_TIME = 9000;
  let current = names[0];
  let timer: ReturnType<typeof setTimeout> | undefined;
  let paused = reduceMotion;
  let visible = false;
  if (paused) tabList.classList.add('paused');
  tabList.style.setProperty('--tab-time', TAB_TIME + 'ms');

  const scheduleNext = () => {
    clearTimeout(timer);
    if (paused || !visible) return;
    timer = setTimeout(() => activate(names[(names.indexOf(current) + 1) % names.length]), TAB_TIME);
  };

  function activate(name: string, byUser = false) {
    current = name;
    tabs.forEach((t) => {
      const on = t.dataset.tab === name;
      t.classList.toggle('active', on);
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      if (on) { // reinicia la barra para que vaya a la par del temporizador
        const bar = $('.tab-progress', t)!;
        bar.style.animation = 'none';
        void bar.offsetWidth;
        bar.style.animation = '';
      }
    });
    panels.forEach((p) => {
      const on = p.id === name;
      p.hidden = !on;
      p.classList.toggle('active', on);
      if (on && visible) root.style.setProperty('--glow', p.dataset.accent!);
    });
    if (byUser) { paused = true; tabList.classList.add('paused'); }
    scheduleNext();
  }

  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible) activate(current);
    else clearTimeout(timer);
  }, { threshold: 0.15 }).observe(trio);

  tabs.forEach((t) => t.addEventListener('click', () => activate(t.dataset.tab!, true)));
  tabList.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const step = e.key === 'ArrowRight' ? 1 : -1;
    const next = names[(names.indexOf(current) + step + names.length) % names.length];
    activate(next, true);
    $(`.tab[data-tab="${next}"]`, tabList)!.focus();
  });

  // Los enlaces a #iplist, #ijson… (menú, dock) abren su pestaña.
  const open = (name: string, smooth: boolean) => {
    activate(name, true);
    trio.scrollIntoView({ behavior: smooth && !reduceMotion ? 'smooth' : 'auto' });
  };
  document.addEventListener('click', (e) => {
    const link = (e.target as Element).closest('a[href^="#"]');
    const name = link?.getAttribute('href')!.slice(1);
    if (!name || !names.includes(name)) return;
    e.preventDefault();
    history.replaceState(null, '', '#' + name);
    open(name, true);
  });
  if (names.includes(location.hash.slice(1))) open(location.hash.slice(1), false);
})();

// ── Teléfonos: las capturas rotan mientras se ven ──
if (!reduceMotion) {
  $$('.phone-screen').forEach((screen) => {
    const shots = $$('img', screen);
    const visible = whileVisible(screen);
    let s = 0;
    (async () => {
      for (;;) {
        await sleep(3200);
        await visible();
        shots[s].classList.remove('on');
        s = (s + 1) % shots.length;
        shots[s].classList.add('on');
      }
    })();
  });
}

// ── Dock con aumento ──
if (finePointer && !reduceMotion) {
  const dock = $('#dock')!, items = $$('a', dock);
  dock.addEventListener('pointermove', (e) => {
    items.forEach((item) => {
      const r = item.getBoundingClientRect();
      const d = Math.abs(e.clientX - (r.left + r.width / 2));
      item.style.setProperty('--s', (1 + 0.55 * Math.max(0, 1 - d / 140)).toFixed(3));
    });
  });
  dock.addEventListener('pointerleave', () => items.forEach((item) => item.style.setProperty('--s', '1')));
}
