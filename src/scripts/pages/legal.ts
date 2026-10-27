// Privacidad, términos y soporte de las apps (components/legal/LegalShell).
import { initAmbient } from '../core/ambient';
import { initNav } from '../core/nav';
import { initGlyphs } from '../core/glyphs';
import { initReveal } from '../core/reveal';
import { initMagnetic } from '../core/pointer';
import { initContactForms } from '../core/contact';

initAmbient();
initNav();
initGlyphs();
initReveal('.reveal', { stagger: 0 });
initMagnetic();
initContactForms();
