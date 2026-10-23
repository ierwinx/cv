export const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Observa si `el` está en pantalla. Devuelve una función que espera hasta que lo esté:
 *  las demos la llaman en cada vuelta para no gastar CPU fuera de pantalla. */
export function whileVisible(el: Element) {
  let visible = false;
  let wake: (() => void) | null = null;
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && wake) { wake(); wake = null; }
  }).observe(el);
  return () => (visible ? Promise.resolve() : new Promise<void>((r) => { wake = r; }));
}
