// Página de iSpecter: espectrograma en vivo, comparador, versión del DMG desde downloads/latest.json.
import { $, $$ } from '../core/dom';
import { reduceMotion } from '../core/motion';
import { frameLoop } from '../core/loop';
import { toast } from '../core/celebrate';
import { countUp as count } from '../core/counters';

type Opts = { cut?: number; nyq?: number; holes?: boolean };

(() => {

  // ─── Paleta tipo "Spectrum" (inferno) como tabla de 256 colores ───
  const STOPS = [[0, 0, 0, 4], [.13, 27, 12, 65], [.25, 74, 12, 107], [.38, 120, 28, 109], [.5, 165, 44, 96],
    [.62, 207, 68, 70], [.74, 237, 105, 37], [.86, 251, 155, 6], [.94, 247, 209, 61], [1, 252, 255, 164]];
  const LUT = new Uint8ClampedArray(256 * 3);
  for (let i = 0; i < 256; i++) {
    const t = i / 255; let k = 0;
    while (k < STOPS.length - 2 && t > STOPS[k + 1][0]) k++;
    const [t0, ...a] = STOPS[k], [t1, ...b] = STOPS[k + 1], f = (t - t0) / (t1 - t0);
    for (let c = 0; c < 3; c++) LUT[i * 3 + c] = a[c] + (b[c] - a[c]) * f;
  }

  // ─── Generador procedural de "música" para los espectrogramas de muestra ───
  function rng(seed: number) { return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296); }
  // Devuelve la intensidad (0…1) de la columna `t` para `h` filas; `cut` = fracción de altura donde corta el códec.
  function musicColumn(t: number, h: number, out: Float32Array, rand: () => number, { cut = 1, nyq = 1, holes = false }: Opts) {
    const beat = Math.pow(Math.max(0, Math.sin(t * 0.21)), 18);
    const section = 0.75 + 0.25 * Math.sin(t * 0.013);
    const melody = 0.08 + 0.05 * Math.sin(t * 0.031) + 0.02 * Math.sin(t * 0.11);
    for (let y = 0; y < h; y++) {
      const f = y / h; // 0 = graves, 1 = Nyquist
      let v = 0.86 - 0.7 * Math.pow(f / nyq, 0.65);
      v += (rand() - 0.5) * 0.16;
      v += beat * 0.22 * (1 - f * 0.5);
      for (let k = 1; k <= 7; k++) {
        const hf = melody * k;
        if (Math.abs(f - hf) < 0.004) v += 0.28 / Math.sqrt(k);
      }
      v *= section;
      if (f > nyq) v = 0.02 + rand() * 0.02;
      else if (f > cut) v = Math.max(0.03, v * Math.exp(-(f - cut) * 400)) + rand() * 0.02;
      else if (holes && f > cut * 0.8 && rand() < 0.08) v *= 0.35;
      out[y] = Math.min(1, Math.max(0, v));
    }
  }
  function paintColumn(img: ImageData, x: number, col: Float32Array, w: number, h: number) {
    for (let y = 0; y < h; y++) {
      const li = (col[y] * 255 | 0) * 3, p = ((h - 1 - y) * w + x) * 4;
      img.data[p] = LUT[li]; img.data[p + 1] = LUT[li + 1]; img.data[p + 2] = LUT[li + 2]; img.data[p + 3] = 255;
    }
  }
  function staticSpectrogram(canvas: HTMLCanvasElement, opts: Opts, seed: number) {
    const w = canvas.width, h = canvas.height, ctx = canvas.getContext("2d")!;
    const img = ctx.createImageData(w, h), col = new Float32Array(h), r = rng(seed);
    for (let x = 0; x < w; x++) { musicColumn(x * 1.4, h, col, r, opts); paintColumn(img, x, col, w, h); }
    ctx.putImageData(img, 0, 0);
  }

  // ─── Hero: espectrograma que se dibuja de izquierda a derecha con barrido ───
  (function hero() {
    const c = $<HTMLCanvasElement>("#heroCanvas")!, ctx = c.getContext("2d")!, w = c.width, h = c.height;
    const img = ctx.createImageData(w, h), col = new Float32Array(h), r = rng(7);
    const opts = { cut: 20 / 48, nyq: 1 };
    const scan = $(".scan")!, cut = $("#heroCut")!, verdict = $("#verdict")!;
    let x = 0, t = 0;
    for (let i = 0; i < w * h; i++) img.data[i * 4 + 3] = 255;
    function frame() {
      const step = reduceMotion ? w : 4;
      for (let s = 0; s < step && x < w; s++, x++, t += 1.4) { musicColumn(t, h, col, r, opts); paintColumn(img, x, col, w, h); }
      ctx.putImageData(img, 0, 0);
      scan.style.right = `${100 - (x / w) * 100}%`;
      if (x < w) requestAnimationFrame(frame);
      else {
        scan.style.opacity = "0"; cut.classList.add("show");
        setTimeout(() => verdict.classList.add("show"), 400);
        // Ya completo: sigue "en vivo" desplazando hacia la izquierda.
        if (!reduceMotion) frameLoop(() => {
          ctx.drawImage(c, -1, 0); musicColumn(t += 1.4, h, col, r, opts);
          const one = ctx.createImageData(1, h); paintColumn(one, 0, col, 1, h); ctx.putImageData(one, w - 1, 0);
        }, { fps: 20, visible: c });   // una columna cada 50 ms, como antes, y en pausa fuera de pantalla
      }
    }
    setTimeout(frame, reduceMotion ? 0 : 900);

    // Crosshair con lectura de tiempo, frecuencia y dBFS.
    const wrap = $("#heroSpec")!, readout = $("#readout")!;
    wrap.addEventListener("pointermove", (e) => {
      const r = wrap.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      wrap.style.setProperty("--cx", `${px * 100}%`); wrap.style.setProperty("--cy", `${py * 100}%`);
      const d = ctx.getImageData(Math.min(w - 1, px * w | 0), Math.min(h - 1, py * h | 0), 1, 1).data;
      let best = 0, bd = 1e9;
      for (let i = 0; i < 256; i++) { const dd = (LUT[i * 3] - d[0]) ** 2 + (LUT[i * 3 + 1] - d[1]) ** 2 + (LUT[i * 3 + 2] - d[2]) ** 2; if (dd < bd) { bd = dd; best = i; } }
      const secs = px * 225, khz = (1 - py) * 48, db = -120 + (best / 255) * 120;
      readout.textContent = `${Math.floor(secs / 60)}:${String(Math.floor(secs % 60)).padStart(2, "0")} · ${khz.toFixed(1)} kHz · ${db.toFixed(0)} dBFS`;
    });

    // Inclinación 3D de la ventana según el scroll y el puntero.
    const win = $("#window")!;
    function tiltOnScroll() {
      const r = win.getBoundingClientRect(), p = Math.min(1, Math.max(0, 1 - r.top / innerHeight));
      win.style.setProperty("--rx", `${14 - p * 14}deg`); win.style.setProperty("--ws", (0.94 + p * 0.06).toFixed(3));
    }
    addEventListener("scroll", tiltOnScroll, { passive: true }); tiltOnScroll();
    win.addEventListener("pointermove", (e) => {
      const r = win.getBoundingClientRect();
      win.style.setProperty("--ry", `${((e.clientX - r.left) / r.width - 0.5) * 6}deg`);
    });
    win.addEventListener("pointerleave", () => win.style.setProperty("--ry", "0deg"));
  })();

  // ─── Titular con palabras que suben una a una ───
  (function splitHeadline() {
    const h1 = $("#headline")!, words = h1.textContent!.trim().split(" ");
    h1.innerHTML = words.map((w, i) => {
      const inner = i >= words.length - 2 ? `<span class="grad-text">${w}</span>` : w;
      return `<span class="word"><span style="animation-delay:${0.15 + i * 0.09}s">${inner}</span></span>`;
    }).join(" ");
  })();

  // ─── Frases rotativas ───
  (function rotator() {
    const items = $$("#rotator span"); let i = 0;
    if (reduceMotion) return;
    setInterval(() => { items[i].classList.remove("on"); i = (i + 1) % items.length; items[i].classList.add("on"); }, 2600);
  })();

  // ─── Marquesina de formatos (duplicada para bucle continuo) ───
  (function marquee() {
    const fmts = ["FLAC", "ALAC", "WAV", "AIFF", "CAF", "MP3", "AAC", "M4A", "Opus", "Ogg Vorbis", "WavPack", "Monkey's Audio", "Musepack", "TTA", "Shorten", "DSD · DSF", "DFF", "W64", "RF64", "WMA", "WMA Lossless", "MKA", "MKV", "DTS", "TrueHD", "AC-3", "E-AC-3", "MP2", "TAK", "AU"];
    const html = fmts.map((f) => `<span>${f}</span>`).join("");
    $("#track")!.innerHTML = html + html;
  })();

  // ─── Comparador antes/después ───
  (function compare() {
    const box = $("#compare")!, real = $<HTMLCanvasElement>("#cmpReal")!, lossy = $<HTMLCanvasElement>("#cmpLossy")!;
    for (const c of [real, lossy]) { c.width = 640; c.height = 290; }
    staticSpectrogram(real, { cut: 1, nyq: 1 }, 42);
    staticSpectrogram(lossy, { cut: 0.87, nyq: 1, holes: true }, 42);
    let dragging = false, auto = !reduceMotion, t0 = performance.now();
    const set = (clientX: number) => { const r = box.getBoundingClientRect(); box.style.setProperty("--pos", `${Math.min(100, Math.max(0, (clientX - r.left) / r.width * 100))}%`); };
    box.addEventListener("pointerdown", (e) => { dragging = true; auto = false; box.setPointerCapture(e.pointerId); set(e.clientX); });
    box.addEventListener("pointermove", (e) => { if (dragging) set(e.clientX); });
    box.addEventListener("pointerup", () => { dragging = false; });
    (function sway(now: number) {
      if (!auto) return;
      box.style.setProperty("--pos", `${50 + Math.sin((now - t0) / 1400) * 28}%`);
      requestAnimationFrame(sway);
    })(t0);
  })();

  // ─── Mini espectrograma animado en la tarjeta de Metal ───
  (function mini() {
    const c = $<HTMLCanvasElement>("#miniSpec")!, ctx = c.getContext("2d")!, w = c.width, h = c.height;
    const col = new Float32Array(h), r = rng(3), one = ctx.createImageData(1, h); let t = 0;
    staticSpectrogram(c, { cut: 1, nyq: 1 }, 3);
    if (reduceMotion) return;
    frameLoop(() => {
      for (let k = 0; k < 2; k++) {
        ctx.drawImage(c, -1, 0); musicColumn(t += 1.4, h, col, r, { cut: 1, nyq: 1 });
        paintColumn(one, 0, col, 1, h); ctx.putImageData(one, w - 1, 0);
      }
    }, { visible: c });
  })();

  // ─── Fondo del CTA final: barras de espectro ───
  (function finalBars() {
    const c = $<HTMLCanvasElement>("#finalCanvas")!, ctx = c.getContext("2d")!;
    let w = 0, h = 0; const resize = () => { w = c.width = c.offsetWidth; h = c.height = c.offsetHeight; };
    resize(); addEventListener("resize", resize);
    const n = 64; let t = 0;
    const draw = (_: number, k: number) => {
      t += 0.02 * k; ctx.clearRect(0, 0, w, h);
      const bw = w / n;
      for (let i = 0; i < n; i++) {
        const v = (0.35 + 0.35 * Math.sin(t * 2 + i * 0.35) * Math.sin(t * 0.7 + i * 0.12) + 0.25 * Math.sin(t * 3.1 + i)) * (1 - i / n * 0.55);
        const bh = Math.max(4, v * h * 0.6);
        const li = Math.min(255, Math.max(0, (v * 255) | 0)) * 3;
        ctx.fillStyle = `rgb(${LUT[li]},${LUT[li + 1]},${LUT[li + 2]})`;
        ctx.fillRect(i * bw + 2, h - bh, bw - 4, bh);
      }
    };
    if (reduceMotion) draw(0, 1); else frameLoop(draw, { visible: c });
  })();

  // ─── Partículas que reaccionan al puntero ───
  (function particles() {
    const c = $<HTMLCanvasElement>("#particles")!, ctx = c.getContext("2d")!, dpr = Math.min(2, devicePixelRatio || 1);
    type Pt = { x: number; y: number; vx: number; vy: number; r: number; hue: number };
    let w = 0, h = 0, pts: Pt[] = [];
    const mouse = { x: -999, y: -999 };
    function resize() {
      w = innerWidth; h = innerHeight; c.width = w * dpr; c.height = h * dpr; c.style.width = w + "px"; c.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.min(110, Math.floor(w * h / 14000));
      pts = Array.from({ length: n }, () => ({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - .5) * .25, vy: (Math.random() - .5) * .25, r: Math.random() * 1.6 + .4, hue: Math.random() }));
    }
    resize(); addEventListener("resize", resize);
    addEventListener("pointermove", (e) => {
      mouse.x = e.clientX; mouse.y = e.clientY;
      document.documentElement.style.setProperty("--mx", e.clientX + "px");
      document.documentElement.style.setProperty("--my", e.clientY + "px");
    });
    const draw = (_: number, k: number) => {
      ctx.clearRect(0, 0, w, h);
      const damp = Math.pow(.985, k);
      for (const p of pts) {
        const dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
        if (d2 < 22000) { const f = (22000 - d2) / 22000 * .6; p.vx += dx / 120 * f * .1; p.vy += dy / 120 * f * .1; }
        p.vx *= damp; p.vy *= damp; p.x += (p.vx + Math.sin(p.y * .01) * .05) * k; p.y += p.vy * k;
        if (p.x < 0) p.x = w; if (p.x > w) p.x = 0; if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283);
        ctx.fillStyle = p.hue < .33 ? "rgba(255,170,90,.7)" : p.hue < .66 ? "rgba(230,90,170,.6)" : "rgba(120,220,255,.6)";
        ctx.fill();
      }
      for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
        const a = pts[i], b = pts[j], d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < 110) { ctx.strokeStyle = `rgba(200,150,255,${(1 - d / 110) * .12})`; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
      }
    };
    if (reduceMotion) draw(0, 1); else frameLoop(draw, { fps: 30 });   // fondo lento: 30 fps se ven igual
  })();

  // ─── Navegación, barra de progreso y apariciones ───
  addEventListener("scroll", () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    document.documentElement.style.setProperty("--scroll", (scrollY / max).toFixed(4));
    $("#nav")!.classList.toggle("scrolled", scrollY > 30);
  }, { passive: true });

  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) {
      e.target.classList.add("in");
      $$("[data-count]", e.target).forEach(countUp);
      if (e.target.matches("[data-count]")) countUp(e.target as HTMLElement);
      io.unobserve(e.target);
    }
  }, { threshold: .18, rootMargin: "0px 0px -40px 0px" });
  $$(".reveal").forEach((el) => io.observe(el));

  // Cifras con decimales y formato español (1.234,5)
  const countUp = (el: HTMLElement) => count(el, { duration: 1800, format: (v, e) => v.toLocaleString("es", { minimumFractionDigits: +(e.dataset.dec || 0), maximumFractionDigits: +(e.dataset.dec || 0) }) });

  // ─── Tarjetas: brillo que sigue al puntero + inclinación 3D ───
  $$(".tilt").forEach((card) => {
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      card.style.setProperty("--x", x + "px"); card.style.setProperty("--y", y + "px");
      if (!reduceMotion) card.style.transform = `perspective(900px) rotateX(${(y / r.height - .5) * -7}deg) rotateY(${(x / r.width - .5) * 7}deg) translateY(-4px)`;
    });
    card.addEventListener("pointerleave", () => { card.style.transform = ""; });
  });

  // ─── Botones magnéticos y onda al hacer clic ───
  $$(".magnetic").forEach((b) => {
    if (!reduceMotion) {
      b.addEventListener("pointermove", (e) => {
        const r = b.getBoundingClientRect();
        b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .22}px, ${(e.clientY - r.top - r.height / 2) * .3}px)`;
      });
      b.addEventListener("pointerleave", () => { b.style.transform = ""; });
    }
    b.addEventListener("click", (e) => {
      const r = b.getBoundingClientRect(), s = Math.max(r.width, r.height), ink = document.createElement("span");
      ink.className = "ripple"; ink.style.cssText = `width:${s}px;height:${s}px;left:${e.clientX - r.left - s / 2}px;top:${e.clientY - r.top - s / 2}px`;
      b.appendChild(ink); setTimeout(() => ink.remove(), 800);
    });
  });

  // ─── Atajos: las teclas se iluminan en secuencia y responden al teclado ───
  (function keys() {
    const keys = $$("#keys .key"); let i = 0;
    if (!reduceMotion) setInterval(() => {
      keys.forEach((k) => k.classList.remove("pressed")); keys[i % keys.length].classList.add("pressed"); i++;
    }, 900);
    addEventListener("keydown", (e) => {
      if ((e.target as Element).closest("input, textarea") || e.metaKey || e.ctrlKey) return;
      const k = keys.find((el) => el.querySelector("kbd")!.textContent!.toLowerCase() === e.key.toLowerCase());
      if (k) { k.classList.add("pressed"); setTimeout(() => k.classList.remove("pressed"), 250); }
    });
  })();

  // ─── Descarga: datos de la última versión y aviso si aún no hay DMG ───
  const showToast = (html: string) => toast(html, { className: "show", ms: 5200 });
  let dmgAvailable: boolean | null = null;
  fetch("downloads/latest.json", { cache: "no-store" }).then((r) => r.ok ? r.json() : Promise.reject()).then((info) => {
    dmgAvailable = true;
    $$("[data-version]").forEach((el) => { el.textContent = info.version; });
    $$("[data-size]").forEach((el) => { el.textContent = `DMG · ${info.size}`; });
    $("#sha")!.textContent = `SHA-256 ${info.sha256}`;
  }).catch(() => { dmgAvailable = location.protocol === "file:" ? null : false; });
  $$("[data-download]").forEach((a) => a.addEventListener("click", (e: MouseEvent) => {
    if (dmgAvailable === false) {
      e.preventDefault();
      showToast("Aún no hay un DMG publicado. Genera uno con <code>./scripts/build-release.sh</code>");
    } else {
      showToast("⬇︎ Descargando iSpecter… Arrástralo a Aplicaciones y listo.");
      burst(e.clientX, e.clientY);
    }
  }));
  function burst(x: number, y: number) {
    if (reduceMotion) return;
    for (let i = 0; i < 26; i++) {
      const s = document.createElement("i"), a = Math.random() * 6.283, d = 60 + Math.random() * 110;
      const li = (150 + Math.random() * 105 | 0) * 3;
      s.style.cssText = `position:fixed;left:${x}px;top:${y}px;width:6px;height:6px;border-radius:50%;z-index:90;pointer-events:none;background:rgb(${LUT[li]},${LUT[li + 1]},${LUT[li + 2]});box-shadow:0 0 10px currentColor`;
      document.body.appendChild(s);
      s.animate([{ transform: "translate(-50%,-50%)", opacity: 1 }, { transform: `translate(${Math.cos(a) * d}px,${Math.sin(a) * d}px) scale(.2)`, opacity: 0 }], { duration: 900 + Math.random() * 400, easing: "cubic-bezier(.16,1,.3,1)" }).onfinish = () => s.remove();
    }
  }

})();
