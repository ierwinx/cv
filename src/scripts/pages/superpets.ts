// Super Pets · animaciones e interacción de todas sus páginas (las monta components/superpets/SuperpetsShell).
import { $, $$ } from '../core/dom';
import { hoverPointer as finePointer, reduceMotion as reduced } from '../core/motion';
import { confetti } from '../core/celebrate';
import { countUp } from '../core/counters';
import { initContactForms } from '../core/contact';
import { initNav } from '../core/nav';
import { initGlyphs } from '../core/glyphs';
import { initReveal, onceVisible } from '../core/reveal';
import { initScrollProgress } from '../core/scroll';
import { initMagnetic, tilt } from '../core/pointer';

(() => {
    const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

    initNav();
    initGlyphs();

    initScrollProgress($('.scroll-progress'));

    // ── Títulos palabra por palabra ──────────
    $$('.split').forEach((el) => {
        let i = 0;
        const wrap = (node: Node) => {
            const word = document.createElement('span');
            word.className = 'word';
            const inner = document.createElement('span');
            inner.style.setProperty('--i', String(i++));
            inner.appendChild(node);
            word.appendChild(inner);
            return word;
        };
        [...el.childNodes].forEach((node) => {
            if (node.nodeType === Node.TEXT_NODE) {
                const frag = document.createDocumentFragment();
                node.textContent!.split(/(\s+)/).forEach((part) => {
                    if (!part) return;
                    frag.appendChild(/\s/.test(part) ? document.createTextNode(' ') : wrap(document.createTextNode(part)));
                });
                node.replaceWith(frag);
            } else if (!(node instanceof Element && node.classList.contains('sr-only'))) {
                // Un <em> con degradado se anima como una sola pieza para conservar el degradado
                const placeholder = document.createComment('');
                node.replaceWith(placeholder);
                placeholder.replaceWith(wrap(node));
            }
        });
        requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('is-in')));
    });

    // ── Aparición al hacer scroll ────────────
    // data-format="es" agrupa miles con coma (1,234); si no, la cifra va tal cual
    const runCounter = (el: HTMLElement) => countUp(el, {
        duration: 1800,
        format: (v, e) => (e.dataset.format === 'es' ? Math.round(v).toLocaleString('en-US') : String(Math.round(v))),
    });

    // Páginas legales y de soporte: los bloques también aparecen con scroll
    $$('.legal > *, .support > *').forEach((el, i) => {
        el.classList.add('reveal');
        el.style.setProperty('--d', `${Math.min(i, 6) * 0.05}s`);
    });

    initReveal('.reveal', {
        className: 'is-in', stagger: 0, rootMargin: '0px 0px -40px 0px',
        onEnter: (el) => {
            $$('[data-count]', el).forEach(runCounter);
            if (el.matches('[data-count]')) runCounter(el);
            // Quita el retraso de entrada para que el hover responda al instante
            setTimeout(() => { el.style.transitionDelay = '0s'; }, 1400);
        },
    });

    // ── Hero: parallax con el mouse ──────────
    const stage = $('#heroStage');
    if (stage && finePointer && !reduced) {
        const layers = $$('[data-depth]', stage);
        $('.hero')!.addEventListener('mousemove', (e) => {
            const x = e.clientX / innerWidth - 0.5;
            const y = e.clientY / innerHeight - 0.5;
            layers.forEach((l) => {
                const d = +l.dataset.depth!;
                l.style.setProperty('--tx', `${x * 34 * d}px`);
                l.style.setProperty('--ty', `${y * 26 * d}px`);
            });
        });
    }

    // ── Tarjetas: brillo que sigue al cursor + inclinación 3D ──
    if (finePointer) {
        // Solo las .card ya aparecidas se inclinan; .support-card solo lleva el brillo
        $$('.card, .support-card').forEach((card) => tilt(card, {
            degX: 7, degY: 9, x: '--mx', y: '--my', extra: 'translateY(-4px)',
            rotate: (el) => !reduced && el.classList.contains('card') && el.classList.contains('is-in'),
        }));
    }

    // ── Botones magnéticos ───────────────────
    if (finePointer) initMagnetic('.magnetic', { fx: 0.22, fy: 0.32 });

    // ── Huellitas que siguen al cursor ───────
    if (finePointer && !reduced) {
        let lastX = 0, lastY = 0, left = false;
        addEventListener('mousemove', (e) => {
            const dx = e.clientX - lastX, dy = e.clientY - lastY;
            if (dx * dx + dy * dy < 90 * 90) return;
            const angle = Math.atan2(dy, dx) * 180 / Math.PI + 90;
            lastX = e.clientX; lastY = e.clientY;
            left = !left;
            const paw = document.createElement('span');
            paw.className = 'paw';
            paw.textContent = '🐾';
            const off = left ? -8 : 8;
            const rad = (angle) * Math.PI / 180;
            paw.style.left = `${e.clientX + Math.cos(rad) * off}px`;
            paw.style.top = `${e.clientY + Math.sin(rad) * off}px`;
            paw.style.setProperty('--r', `${angle}deg`);
            document.body.appendChild(paw);
            paw.addEventListener('animationend', () => paw.remove());
        }, { passive: true });
    }

    // ── Recorrido: teléfono fijo que cambia de pantalla ──
    const screens = $$('.tour-screen');
    const steps = $$('.tour-step');
    if (screens.length && steps.length) {
        const stepObs = new IntersectionObserver((entries) => {
            entries.forEach((e) => {
                if (!e.isIntersecting) return;
                const idx = +(e.target as HTMLElement).dataset.step!;
                steps.forEach((s) => s.classList.toggle('is-active', s === e.target));
                screens.forEach((img, i) => img.classList.toggle('is-active', i === idx));
            });
        }, { rootMargin: '-45% 0px -45% 0px' });
        steps.forEach((s) => stepObs.observe(s));
        steps[0].classList.add('is-active');
    }

    // ── Galería tipo coverflow ───────────────
    const track = $('#galleryTrack');
    if (track) {
        const shots = $$('.shot', track);
        let ticking = false;

        const paint = () => {
            ticking = false;
            const tr = track.getBoundingClientRect();
            const center = tr.left + tr.width / 2;
            shots.forEach((s) => {
                const r = s.getBoundingClientRect();
                const o = clamp((r.left + r.width / 2 - center) / r.width, -3, 3);
                const a = Math.abs(o);
                if (reduced) { s.style.setProperty('--cap', a < 0.5 ? '1' : '0'); return; }
                s.style.transform = `translateZ(${-a * 90}px) rotateY(${clamp(-o * 32, -55, 55)}deg) scale(${1 - Math.min(a, 2) * 0.1})`;
                s.style.filter = `brightness(${1 - Math.min(a, 2) * 0.25})`;
                s.style.zIndex = String(100 - Math.round(a * 10));
                s.style.setProperty('--cap', String(clamp(1 - a * 1.5, 0, 1)));
            });
        };
        const request = () => { if (!ticking) { ticking = true; requestAnimationFrame(paint); } };
        track.addEventListener('scroll', request, { passive: true });
        addEventListener('resize', request);

        // Empieza en la segunda captura (Inicio)
        requestAnimationFrame(() => {
            const first = shots[1];
            track.scrollLeft = first.offsetLeft - (track.clientWidth - first.offsetWidth) / 2;
            paint();
        });

        const step = () => shots[0].offsetWidth + 10;
        $('.gallery-btn--prev')?.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
        $('.gallery-btn--next')?.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));

        // Arrastrar con el mouse
        let down = false, moved = false, startX = 0, startScroll = 0;
        track.addEventListener('pointerdown', (e) => {
            if (e.pointerType !== 'mouse') return;
            down = true; moved = false;
            startX = e.clientX; startScroll = track.scrollLeft;
        });
        addEventListener('pointermove', (e) => {
            if (!down) return;
            const dx = e.clientX - startX;
            if (Math.abs(dx) > 5) { moved = true; track.classList.add('is-dragging'); }
            track.scrollLeft = startScroll - dx;
        });
        addEventListener('pointerup', () => {
            if (!down) return;
            down = false;
            track.classList.remove('is-dragging');
            // Ajusta a la captura más cercana
            const tr = track.getBoundingClientRect();
            const center = tr.left + tr.width / 2;
            const nearest = shots.reduce<{ s: HTMLElement | null; d: number }>((best, s) => {
                const r = s.getBoundingClientRect();
                const d = Math.abs(r.left + r.width / 2 - center);
                return d < best.d ? { s, d } : best;
            }, { s: null, d: Infinity }).s;
            nearest?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        });

        // Lightbox
        const lightbox = $('#lightbox')!;
        const lightboxImg = $<HTMLImageElement>('#lightboxImg')!;
        const close = () => { lightbox.hidden = true; document.body.style.overflow = ''; };
        shots.forEach((s) => s.addEventListener('click', () => {
            if (moved) return;
            const img = $<HTMLImageElement>('img', s)!;
            lightboxImg.src = img.src;
            lightboxImg.alt = img.alt;
            lightbox.hidden = false;
            document.body.style.overflow = 'hidden';
        }));
        lightbox.addEventListener('click', (e) => { if (e.target === lightbox || (e.target as Element).closest('.lightbox-close')) close(); });
        addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !lightbox.hidden) close();
            if (document.activeElement === document.body || track.contains(document.activeElement)) {
                if (e.key === 'ArrowRight' && lightbox.hidden) track.scrollBy({ left: step(), behavior: 'smooth' });
                if (e.key === 'ArrowLeft' && lightbox.hidden) track.scrollBy({ left: -step(), behavior: 'smooth' });
            }
        });
    }

    // ── Confeti en la llamada final ──────────
    const canvas = $<HTMLCanvasElement>('#ctaConfetti');
    if (canvas && !reduced) {
        const burst = (x: number, y: number, count = 140) => confetti(canvas, x, y, {
            count, colors: ['#8b6cff', '#ff6ad5', '#ffc861', '#53e0ff', '#5cf2b0', '#ffffff'], spread: 'radial',
            gravity: 0.28, drag: 0.985, dragY: true, spin: 0.3, width: [6, 12], height: [8, 16], flip: true,
        });

        const card = $('#ctaCard')!;
        onceVisible(card, () => setTimeout(() => {
            burst(canvas.offsetWidth * 0.2, canvas.offsetHeight * 0.6, 90);
            burst(canvas.offsetWidth * 0.8, canvas.offsetHeight * 0.6, 90);
        }, 400), { threshold: 0.5 });

        let last = 0;
        $('.ui-btn', card)?.addEventListener('mouseenter', (e) => {
            if (performance.now() - last < 1200) return;
            last = performance.now();
            const r = card.getBoundingClientRect();
            burst(e.clientX - r.left, e.clientY - r.top, 70);
        });
    }
})();

// ── Formulario de contacto (soporte y eliminar cuenta) ──
initContactForms();
