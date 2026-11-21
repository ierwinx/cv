// Demo de LiveWallpapers: el puntero elige un video, pulsa «Poner como fondo y pantalla de bloqueo» y el escritorio
// cambia; después bloquea el Mac (el mismo video con la hora) o abre el menú de la barra. La usan /livewallpapers/ y
// la home (components/demos/LivewallpapersDemo.astro). Con movimiento reducido se queda el primer cuadro del marcado.
import { reduceMotion, sleep, whileVisible } from '../core/motion';

export function mount(root: HTMLElement) {
  // Ganchos data-lw-*: no chocan con [data-count] ni con otros atributos que usan las páginas.
  const hook = (k: string) => root.querySelector<HTMLElement>(`[data-lw-${k}]`)!;
  const layers = [...hook('wall').children] as HTMLElement[];
  const cards = [...root.querySelectorAll<HTMLElement>('[data-lw-card]')];
  const names = cards.map((c) => c.querySelector('span')!.textContent ?? '');
  const status = hook('status'), apply = hook('apply'), cursor = hook('cursor'), extra = hook('extra'), current = hook('current');
  const visible = whileVisible(root);
  if (reduceMotion || !cards.length) return;

  // Posición de un elemento dentro de la demo en %, con offsetLeft/Top: no les afecta la inclinación 3D del hero.
  const point = (el: HTMLElement) => {
    let x = el.offsetWidth * 0.55, y = el.offsetHeight * 0.6;
    for (let n: HTMLElement | null = el; n && n !== root; n = n.offsetParent as HTMLElement | null) { x += n.offsetLeft; y += n.offsetTop; }
    cursor.style.setProperty('--x', (x / root.offsetWidth) * 100 + '%');
    cursor.style.setProperty('--y', (y / root.offsetHeight) * 100 + '%');
  };
  const click = async (el: HTMLElement) => {
    point(el);
    await sleep(850);
    cursor.classList.add('click'); el.classList.add('press');
    await sleep(170);
    cursor.classList.remove('click'); el.classList.remove('press');
  };

  (async () => {
    await sleep(1200);
    for (let n = 1; ; n++) {
      await visible();
      const i = n % cards.length, name = names[i];
      await click(cards[i].querySelector<HTMLElement>('.lw-thumb')!);
      cards.forEach((c, j) => c.classList.toggle('sel', i === j));
      status.textContent = `Seleccionado: ${name}`;
      await sleep(700);

      await click(apply);
      root.classList.add('busy');
      status.textContent = 'Aplicando…';
      await sleep(1100);
      layers.forEach((l, j) => l.classList.toggle('on', i === j));
      root.classList.remove('busy');
      status.textContent = `Listo: «${name}» aplicado.`;
      current.textContent = name;
      await sleep(2300);

      if (n % 2) {
        // Bloqueo: el mismo video, ahora en la pantalla de bloqueo
        root.classList.add('locked');
        await sleep(2800);
        root.classList.remove('locked');
        await sleep(900);
      } else {
        // El menú de la barra: la app vive ahí, sin ícono en el Dock
        await click(extra);
        root.classList.add('menu');
        await sleep(2400);
        root.classList.remove('menu');
        await sleep(500);
      }
      status.textContent = `En escritorio: ${name}`;
    }
  })();
}
