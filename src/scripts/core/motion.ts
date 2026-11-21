export const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
/** Ratón o trackpad (no pantalla táctil). */
export const finePointer = matchMedia('(pointer: fine)').matches;
/** Pantalla táctil como puntero principal. */
export const coarsePointer = matchMedia('(pointer: coarse)').matches;
/** Puntero fino que además puede pasar por encima (hover) de los elementos. */
export const hoverPointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

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
