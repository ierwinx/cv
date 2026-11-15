// Cursor personalizado: un punto que sigue al ratón con un rastro que lo sigue con
// ligera demora. Al pasar sobre enlaces o botones cambia de color y crece.
// Se desactiva en pantallas táctiles y con prefers-reduced-motion.
import { reduceMotion } from './motion';

const HOVERABLES = 'a, button, [role="button"], [data-download], input, select, textarea, [tabindex]';

export function initCursor() {
  if (reduceMotion) return;

  const cursor = document.getElementById('custom-cursor');
  const trail = document.getElementById('custom-cursor-trail');
  if (!cursor || !trail) return;

  let mouseX = 0, mouseY = 0, trailX = 0, trailY = 0;

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    cursor.style.left = mouseX + 'px';
    cursor.style.top = mouseY + 'px';
  });

  const animateTrail = () => {
    trailX += (mouseX - trailX) * 0.15;
    trailY += (mouseY - trailY) * 0.15;
    trail.style.left = trailX + 'px';
    trail.style.top = trailY + 'px';
    requestAnimationFrame(animateTrail);
  };
  animateTrail();

  const setHover = (on: boolean) => (e: Event) => {
    const target = (e.target as Element).closest?.(HOVERABLES);
    if (!target) return;
    cursor.classList.toggle('custom-cursor--hover', on);
    trail.classList.toggle('custom-cursor--trail--hover', on);
  };

  document.addEventListener('mouseover', setHover(true));
  document.addEventListener('mouseout', setHover(false));
}
