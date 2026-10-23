// Home · iRar: los formatos orbitan el ícono y laten al azar mientras se ven.
import { $$ } from '../core/dom';
import { reduceMotion, sleep, whileVisible } from '../core/motion';

export function mount(root: HTMLElement) {
  const formats = $$('.formats span', root);
  formats.forEach((f, i) => {
    const angle = (i / formats.length) * Math.PI * 2 - Math.PI / 2;
    f.style.setProperty('--x', (Math.cos(angle) * 40).toFixed(2) + '%');
    f.style.setProperty('--y', (Math.sin(angle) * 40).toFixed(2) + '%');
    f.style.setProperty('--d', i * 60 + 'ms');
  });
  new IntersectionObserver(([entry], obs) => {
    if (!entry.isIntersecting) return;
    root.classList.add('in');
    obs.disconnect();
  }, { threshold: 0.3 }).observe(root);
  if (reduceMotion) return;

  const visible = whileVisible(root);
  (async () => {
    for (;;) {
      await sleep(700);
      await visible();
      const f = formats[Math.floor(Math.random() * formats.length)];
      f.classList.remove('pulse');
      void f.offsetWidth;
      f.classList.add('pulse');
    }
  })();
}
