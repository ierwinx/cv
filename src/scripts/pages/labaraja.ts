// Página de La Baraja: menú flotante de «Descargar para Linux» (DEB o RPM).
// Es un popover nativo (cierra con Esc o al tocar fuera); aquí solo se coloca bajo el botón y se marca cuál paquete
// recomendar. Firefox suele decir la distribución en el user agent ("X11; Fedora; Linux x86_64"); Chrome no, y entonces
// no se marca ninguno: el menú explica para qué sistema es cada uno.
import { $ } from '../core/dom';

const RPM = /fedora|red hat|rhel|centos|rocky|alma|suse|mageia/i;
const DEB = /ubuntu|debian|mint|pop!_os|elementary|kali/i;

(() => {
  const btn = $<HTMLButtonElement>('#lb-linux-btn');
  const menu = $<HTMLElement>('#lb-linux-menu');
  if (!btn || !menu) return;

  // Recomendado según el sistema (Android también dice "Linux": no cuenta).
  const ua = navigator.userAgent;
  if (/linux/i.test(ua) && !/android/i.test(ua)) {
    const pkg = RPM.test(ua) ? 'rpm' : DEB.test(ua) ? 'deb' : '';
    menu.querySelector(`a[data-pkg="${pkg}"]`)?.classList.add('is-recommended');
  }

  const place = () => {
    const r = btn.getBoundingClientRect();
    const w = menu.offsetWidth;
    menu.style.top = `${Math.round(r.bottom + 8)}px`;
    menu.style.left = `${Math.round(Math.max(8, Math.min(r.left, window.innerWidth - w - 8)))}px`;
  };
  menu.addEventListener('beforetoggle', (e) => {
    const open = (e as ToggleEvent).newState === 'open';
    btn.setAttribute('aria-expanded', String(open));
    if (open) requestAnimationFrame(place);
  });
  // Al mover la página o cambiar el tamaño, el menú se cierra en vez de quedarse flotando lejos del botón.
  const close = () => { if (menu.matches(':popover-open')) menu.hidePopover(); };
  window.addEventListener('scroll', close, { passive: true });
  window.addEventListener('resize', close);
  // Elegir una opción cierra el menú (la descarga ya empezó).
  menu.addEventListener('click', (e) => { if ((e.target as HTMLElement).closest('a')) close(); });
})();
