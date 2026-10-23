// Bucle de animación común para canvas: limita los fps y se detiene fuera de pantalla o con la pestaña oculta.
// Los fondos que se mueven despacio no necesitan 60 fps: a 30 se ven igual y cuestan la mitad.

type Frame = (time: number, k: number) => void;
type Options = {
  fps?: number;                 // fotogramas por segundo como máximo (60 por defecto)
  visible?: Element;            // si se da, solo dibuja mientras el elemento esté en pantalla
};

/**
 * Llama a `draw(time, k)` en cada fotograma. `k` es el tiempo transcurrido en «fotogramas de 60 fps»
 * (1 a 60 fps, 2 a 30 fps): multiplica por él lo que antes avanzaba una cantidad fija por fotograma,
 * así la velocidad no cambia al bajar los fps. Devuelve una función que detiene el bucle.
 */
export function frameLoop(draw: Frame, { fps = 60, visible }: Options = {}) {
  const minGap = 1000 / fps - 2;  // margen para no saltarse fotogramas por redondeos del vsync
  let last = 0, onScreen = !visible, running = true, id = 0;

  const tick = (time: number) => {
    id = 0;
    if (!running || !onScreen || document.hidden) return;
    id = requestAnimationFrame(tick);
    if (last && time - last < minGap) return;
    const k = last ? Math.min((time - last) / (1000 / 60), 4) : 1;
    last = time;
    draw(time, k);
  };
  const resume = () => { if (running && onScreen && !document.hidden && !id) { last = 0; id = requestAnimationFrame(tick); } };

  if (visible) new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; resume(); }).observe(visible);
  document.addEventListener('visibilitychange', resume);
  resume();
  return () => { running = false; if (id) cancelAnimationFrame(id); };
}
