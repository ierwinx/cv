// Comportamiento común de todas las páginas. Se activa con clases y atributos:
// .reveal, .tilt, .magnetic, [data-count], [data-download], [data-scroll-tilt], #progress, #stars.
import { initAmbient } from './core/ambient';
import { initDownloads } from './core/celebrate';
import { initCounters } from './core/counters';
import { initMagnetic, initTilt } from './core/pointer';
import { initReveal } from './core/reveal';

initAmbient();
initReveal();
initTilt();
initMagnetic();
initCounters();
initDownloads();
