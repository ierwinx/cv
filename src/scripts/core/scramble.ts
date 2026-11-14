import { $$ } from './dom';
import { reduceMotion } from './motion';

/** Texto que se «descifra»: los caracteres pasan por símbolos de código hasta quedar en `data-text`. */
export function scramble(el: HTMLElement) {
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

/** Descifra todos los `.scramble` de la página, salvo con «Reducir movimiento». */
export function initScramble() {
  if (!reduceMotion) $$<HTMLElement>('.scramble').forEach((el) => setTimeout(() => scramble(el), 250));
}
