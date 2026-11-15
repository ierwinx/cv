// Comportamiento común de todas las páginas. Se activa con clases y atributos:
// .reveal, .tilt, .magnetic, [data-count], [data-download], [data-scroll-tilt], #progress, #stars,
// la nav común ([data-ui-nav]) y los símbolos flotantes ([data-glyph-field]).
// (El cursor personalizado va inline en BaseLayout.astro para que funcione en todas las páginas.)
import { initAmbient } from './core/ambient';
import { initDownloads } from './core/celebrate';
import { initGlyphs } from './core/glyphs';
import { initNav } from './core/nav';
import { initCounters } from './core/counters';
import { initMagnetic, initTilt } from './core/pointer';
import { initReveal } from './core/reveal';

initAmbient();
initNav();
initGlyphs();
initReveal();
initTilt();
initMagnetic();
initCounters();
initDownloads();
