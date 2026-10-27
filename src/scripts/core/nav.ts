// Nav común de las páginas de app (components/layout/Nav.astro): se encoge al hacer scroll, abre el menú
// en móvil y marca el enlace de la sección visible.
import { $, $$ } from './dom';

export function initNav() {
  const nav = $('[data-ui-nav]');
  if (!nav) return;
  const links = $('.ui-nav-links', nav)!;
  const menu = $('.ui-nav-menu', nav)!;

  const setOpen = (open: boolean) => {
    links.classList.toggle('is-open', open);
    menu.classList.toggle('is-open', open);
    menu.setAttribute('aria-expanded', String(open));
  };
  menu.addEventListener('click', () => setOpen(!links.classList.contains('is-open')));
  $$('a', links).forEach((a) => a.addEventListener('click', () => setOpen(false)));

  const onScroll = () => nav.classList.toggle('is-scrolled', scrollY > 20);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Enlace activo según la sección visible
  const anchors = $$<HTMLAnchorElement>('a[href^="#"]', links);
  if (!anchors.length) return;
  const spy = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      anchors.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === `#${e.target.id}`));
    }
  }, { rootMargin: '-45% 0px -50% 0px' });
  anchors.forEach((a) => { const s = document.getElementById(a.getAttribute('href')!.slice(1)); if (s) spy.observe(s); });
}
