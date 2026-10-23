import { $$ } from './dom';

type Options = { threshold?: number; stagger?: number; rootMargin?: string };

/** Los elementos de `selector` reciben .in al entrar en pantalla (el CSS de cada diseño los anima).
 *  stagger: ms entre vecinos (de 4 en 4); 0 para ninguno. */
export function initReveal(selector = '.reveal', { threshold = 0.15, stagger = 80, rootMargin }: Options = {}) {
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      // Un salto con ancla puede pasar de largo sin intersectar; lo que queda arriba también se revela.
      if (!e.isIntersecting && e.boundingClientRect.top > 0) continue;
      e.target.classList.add('in');
      io.unobserve(e.target);
    }
  }, { threshold, rootMargin });
  $$(selector).forEach((el, i) => {
    if (stagger) el.style.transitionDelay = (i % 4) * stagger + 'ms';
    io.observe(el);
  });
}
