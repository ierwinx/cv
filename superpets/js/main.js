// Super Pets · animaciones e interacción. JavaScript sin dependencias.
(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
    const $ = (selector, root = document) => root.querySelector(selector);
    const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
    const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

    // Fondo aurora, grano y barra de progreso (decorativos, iguales en todas las páginas)
    document.body.insertAdjacentHTML('afterbegin',
        '<div class="bg-aurora" aria-hidden="true"><span></span><span></span><span></span></div>' +
        '<div class="bg-grain" aria-hidden="true"></div>' +
        '<div class="scroll-progress" aria-hidden="true"></div>');

    // ── Navegación ───────────────────────────
    const nav = $('.nav');
    const menuBtn = $('#navMenuBtn');
    const navLinks = $('#navLinks');

    menuBtn?.addEventListener('click', () => {
        const open = navLinks.classList.toggle('active');
        menuBtn.classList.toggle('is-open', open);
        menuBtn.setAttribute('aria-expanded', open);
    });

    $$('a', navLinks || document.createElement('div')).forEach((a) => a.addEventListener('click', () => {
        navLinks.classList.remove('active');
        menuBtn?.classList.remove('is-open');
    }));

    // Marca el enlace de la página actual en las páginas secundarias
    const page = location.pathname.split('/').pop() || 'index.html';
    $$('.nav-links a').forEach((a) => { if (a.getAttribute('href') === page && page !== 'index.html') a.classList.add('is-active'); });

    const progress = $('.scroll-progress');
    const onScroll = () => {
        const y = scrollY;
        nav?.classList.toggle('is-scrolled', y > 20);
        const max = document.documentElement.scrollHeight - innerHeight;
        progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    };
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // Enlace activo según la sección visible
    const sectionLinks = $$('.nav-links a[href^="#"]');
    if (sectionLinks.length) {
        const spy = new IntersectionObserver((entries) => {
            entries.forEach((e) => {
                if (!e.isIntersecting) return;
                sectionLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === `#${e.target.id}`));
            });
        }, { rootMargin: '-45% 0px -50% 0px' });
        sectionLinks.forEach((a) => { const s = $(a.getAttribute('href')); if (s) spy.observe(s); });
    }

    // ── Títulos palabra por palabra ──────────
    $$('.split').forEach((el) => {
        let i = 0;
        const wrap = (node) => {
            const word = document.createElement('span');
            word.className = 'word';
            const inner = document.createElement('span');
            inner.style.setProperty('--i', i++);
            inner.appendChild(node);
            word.appendChild(inner);
            return word;
        };
        [...el.childNodes].forEach((node) => {
            if (node.nodeType === Node.TEXT_NODE) {
                const frag = document.createDocumentFragment();
                node.textContent.split(/(\s+)/).forEach((part) => {
                    if (!part) return;
                    frag.appendChild(/\s/.test(part) ? document.createTextNode(' ') : wrap(document.createTextNode(part)));
                });
                node.replaceWith(frag);
            } else {
                // Un <em> con degradado se anima como una sola pieza para conservar el degradado
                const placeholder = document.createComment('');
                node.replaceWith(placeholder);
                placeholder.replaceWith(wrap(node));
            }
        });
        requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('is-in')));
    });

    // ── Aparición al hacer scroll ────────────
    const counters = new WeakSet();
    const runCounter = (el) => {
        if (counters.has(el)) return;
        counters.add(el);
        const target = +el.dataset.count;
        const fmt = (n) => (el.dataset.format === 'es' ? n.toLocaleString('en-US') : String(n));
        if (reduced) { el.textContent = fmt(target); return; }
        const start = performance.now();
        const dur = 1800;
        const tick = (now) => {
            const t = clamp((now - start) / dur, 0, 1);
            const eased = 1 - Math.pow(1 - t, 4);
            el.textContent = fmt(Math.round(target * eased));
            if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    };

    const revealObs = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
            if (!e.isIntersecting) return;
            const el = e.target;
            el.classList.add('is-in');
            $$('[data-count]', el).forEach(runCounter);
            if (el.matches('[data-count]')) runCounter(el);
            // Quita el retraso de entrada para que el hover responda al instante
            setTimeout(() => { el.style.transitionDelay = '0s'; }, 1400);
            revealObs.unobserve(el);
        });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

    $$('.reveal').forEach((el) => revealObs.observe(el));

    // Páginas legales y de soporte: los bloques también aparecen con scroll
    $$('.legal > *, .support > *').forEach((el, i) => {
        el.classList.add('reveal');
        el.style.setProperty('--d', `${Math.min(i, 6) * 0.05}s`);
        revealObs.observe(el);
    });

    // ── Hero: parallax con el mouse ──────────
    const stage = $('#heroStage');
    if (stage && finePointer && !reduced) {
        const layers = $$('[data-depth]', stage);
        $('.hero').addEventListener('mousemove', (e) => {
            const x = e.clientX / innerWidth - 0.5;
            const y = e.clientY / innerHeight - 0.5;
            layers.forEach((l) => {
                const d = +l.dataset.depth;
                l.style.setProperty('--tx', `${x * 34 * d}px`);
                l.style.setProperty('--ty', `${y * 26 * d}px`);
            });
        });
    }

    // ── Tarjetas: brillo que sigue al cursor + inclinación 3D ──
    if (finePointer) {
        $$('.card, .support-card').forEach((card) => {
            card.addEventListener('mousemove', (e) => {
                const r = card.getBoundingClientRect();
                const px = (e.clientX - r.left) / r.width;
                const py = (e.clientY - r.top) / r.height;
                card.style.setProperty('--mx', `${px * 100}%`);
                card.style.setProperty('--my', `${py * 100}%`);
                if (!reduced && card.classList.contains('card') && card.classList.contains('is-in')) {
                    card.style.transform = `perspective(900px) rotateX(${(0.5 - py) * 7}deg) rotateY(${(px - 0.5) * 9}deg) translateY(-4px)`;
                }
            });
            card.addEventListener('mouseleave', () => { card.style.transform = ''; });
        });
    }

    // ── Botones magnéticos ───────────────────
    if (finePointer && !reduced) {
        $$('.magnetic').forEach((el) => {
            el.addEventListener('mousemove', (e) => {
                const r = el.getBoundingClientRect();
                const x = e.clientX - r.left - r.width / 2;
                const y = e.clientY - r.top - r.height / 2;
                el.style.transform = `translate(${x * 0.22}px, ${y * 0.32}px)`;
            });
            el.addEventListener('mouseleave', () => { el.style.transform = ''; });
        });
    }

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
                const idx = +e.target.dataset.step;
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
                if (reduced) { s.style.setProperty('--cap', a < 0.5 ? 1 : 0); return; }
                s.style.transform = `translateZ(${-a * 90}px) rotateY(${clamp(-o * 32, -55, 55)}deg) scale(${1 - Math.min(a, 2) * 0.1})`;
                s.style.filter = `brightness(${1 - Math.min(a, 2) * 0.25})`;
                s.style.zIndex = String(100 - Math.round(a * 10));
                s.style.setProperty('--cap', clamp(1 - a * 1.5, 0, 1));
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
            const nearest = shots.reduce((best, s) => {
                const r = s.getBoundingClientRect();
                const d = Math.abs(r.left + r.width / 2 - center);
                return d < best.d ? { s, d } : best;
            }, { s: null, d: Infinity }).s;
            nearest?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        });

        // Lightbox
        const lightbox = $('#lightbox');
        const lightboxImg = $('#lightboxImg');
        const close = () => { lightbox.hidden = true; document.body.style.overflow = ''; };
        shots.forEach((s) => s.addEventListener('click', () => {
            if (moved) return;
            const img = $('img', s);
            lightboxImg.src = img.src;
            lightboxImg.alt = img.alt;
            lightbox.hidden = false;
            document.body.style.overflow = 'hidden';
        }));
        lightbox?.addEventListener('click', (e) => { if (e.target === lightbox || e.target.closest('.lightbox-close')) close(); });
        addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !lightbox.hidden) close();
            if (document.activeElement === document.body || track.contains(document.activeElement)) {
                if (e.key === 'ArrowRight' && lightbox.hidden) track.scrollBy({ left: step(), behavior: 'smooth' });
                if (e.key === 'ArrowLeft' && lightbox.hidden) track.scrollBy({ left: -step(), behavior: 'smooth' });
            }
        });
    }

    // ── Confeti en la llamada final ──────────
    const canvas = $('#ctaConfetti');
    if (canvas && !reduced) {
        const ctx = canvas.getContext('2d');
        const colors = ['#8b6cff', '#ff6ad5', '#ffc861', '#53e0ff', '#5cf2b0', '#ffffff'];
        let parts = [];
        let running = false;

        const resize = () => {
            const dpr = Math.min(devicePixelRatio || 1, 2);
            canvas.width = canvas.offsetWidth * dpr;
            canvas.height = canvas.offsetHeight * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };

        const burst = (x, y, n = 140) => {
            for (let i = 0; i < n; i++) {
                const a = Math.random() * Math.PI * 2;
                const v = 4 + Math.random() * 9;
                parts.push({
                    x, y,
                    vx: Math.cos(a) * v,
                    vy: Math.sin(a) * v - 6,
                    w: 6 + Math.random() * 6,
                    h: 8 + Math.random() * 8,
                    r: Math.random() * Math.PI,
                    vr: (Math.random() - 0.5) * 0.3,
                    c: colors[(Math.random() * colors.length) | 0],
                    life: 1
                });
            }
            if (!running) { running = true; requestAnimationFrame(loop); }
        };

        const loop = () => {
            ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
            parts = parts.filter((p) => p.life > 0);
            parts.forEach((p) => {
                p.vy += 0.28; p.vx *= 0.985; p.vy *= 0.985;
                p.x += p.vx; p.y += p.vy; p.r += p.vr;
                p.life -= 0.008;
                ctx.save();
                ctx.globalAlpha = Math.max(p.life, 0);
                ctx.translate(p.x, p.y);
                ctx.rotate(p.r);
                ctx.fillStyle = p.c;
                ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 2)));
                ctx.restore();
            });
            if (parts.length) requestAnimationFrame(loop); else running = false;
        };

        const card = $('#ctaCard');
        new IntersectionObserver((entries, obs) => {
            if (!entries[0].isIntersecting) return;
            resize();
            setTimeout(() => {
                burst(canvas.offsetWidth * 0.2, canvas.offsetHeight * 0.6, 90);
                burst(canvas.offsetWidth * 0.8, canvas.offsetHeight * 0.6, 90);
            }, 400);
            obs.disconnect();
        }, { threshold: 0.5 }).observe(card);

        addEventListener('resize', resize);

        let last = 0;
        $('.btn-store', card)?.addEventListener('mouseenter', (e) => {
            if (performance.now() - last < 1200) return;
            last = performance.now();
            const r = card.getBoundingClientRect();
            burst(e.clientX - r.left, e.clientY - r.top, 70);
        });
    }
})();
