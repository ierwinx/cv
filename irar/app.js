// iRar · página estática. JavaScript sin dependencias.

// DMG de la última versión (servido junto a esta página).
const DMG = "downloads/iRar-1.0.dmg";

const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

// Enlaces de descarga
$$("[data-download]").forEach((a) => {
  if (a.getAttribute("href") === "#descargar") return; // the nav and hero buttons scroll to the download card first
  a.href = DMG; a.setAttribute("download", "");
});

// Fondo «aurora»: manchas de color que se mueven despacio
(() => {
  const canvas = $("#aurora");
  if (!canvas || reduced) return;
  const ctx = canvas.getContext("2d");
  const blobs = [
    { hue: "255, 194, 26", r: 0.42, x: 0.15, y: 0.1, sx: 0.00011, sy: 0.00013 },
    { hue: "139, 92, 246", r: 0.5, x: 0.85, y: 0.25, sx: 0.00009, sy: 0.00012 },
    { hue: "244, 114, 182", r: 0.35, x: 0.5, y: 0.8, sx: 0.00013, sy: 0.0001 },
    { hue: "34, 211, 238", r: 0.3, x: 0.2, y: 0.7, sx: 0.0001, sy: 0.00008 },
  ];
  let width, height, scrollY = 0;
  const resize = () => {
    const ratio = Math.min(devicePixelRatio, 1.5);
    width = canvas.width = innerWidth * ratio / 2; // half resolution: it is blurred anyway
    height = canvas.height = innerHeight * ratio / 2;
  };
  addEventListener("resize", resize); resize();
  addEventListener("scroll", () => { scrollY = window.scrollY; }, { passive: true });
  const draw = (t) => {
    ctx.fillStyle = "#07060b"; ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = "lighter";
    for (const b of blobs) {
      const x = (b.x + Math.sin(t * b.sx * 6) * 0.12) * width;
      const y = (b.y + Math.cos(t * b.sy * 6) * 0.1) * height - (scrollY * 0.05) % height;
      const radius = b.r * Math.max(width, height);
      const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
      g.addColorStop(0, `rgba(${b.hue}, 0.22)`); g.addColorStop(1, `rgba(${b.hue}, 0)`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, width, height);
    }
    ctx.globalCompositeOperation = "source-over";
    requestAnimationFrame(draw);
  };
  requestAnimationFrame(draw);
})();

// Barra de progreso, navegación compacta y brillo que sigue al cursor
(() => {
  const nav = $(".nav"), bar = $(".progress span"), glow = $(".cursor-glow");
  const onScroll = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.setProperty("--p", max > 0 ? scrollY / max : 0);
    nav.classList.toggle("scrolled", scrollY > 30);
  };
  addEventListener("scroll", onScroll, { passive: true }); onScroll();
  addEventListener("pointermove", (e) => {
    glow.style.setProperty("--x", `${e.clientX}px`); glow.style.setProperty("--y", `${e.clientY}px`);
  }, { passive: true });
})();

// Contadores animados
const animateCount = (el) => {
  const target = parseFloat(el.dataset.count), decimals = +(el.dataset.decimals || 0), suffix = el.dataset.suffix || "";
  const format = (v) => v.toLocaleString("es-MX", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
  if (reduced) { el.textContent = format(target); return; }
  const start = performance.now(), duration = 1600;
  const step = (now) => {
    const k = Math.min((now - start) / duration, 1), eased = 1 - Math.pow(1 - k, 4);
    el.textContent = format(target * eased);
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
};

// Aparición al hacer scroll (con escalonado por grupo)
(() => {
  const groups = new Map();
  $$(".reveal").forEach((el) => {
    const parent = el.parentElement; const index = groups.get(parent) || 0;
    el.style.setProperty("--d", `${Math.min(index, 6) * 0.08}s`); groups.set(parent, index + 1);
  });
  const show = (el) => {
    if (el.classList.contains("visible")) return;
    el.classList.add("visible");
    $$("[data-count]", el).forEach(animateCount);
    $$(".meter-bar i", el).forEach((i) => { i.style.width = `${i.dataset.width}%`; });
    if (el.id === "race") runRace();
    if (el.id === "terminal") typeTerminal();
    if (el.id === "demo") runDemo();
    if (el.classList.contains("shield")) el.classList.add("visible");
  };
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) if (entry.isIntersecting) { show(entry.target); observer.unobserve(entry.target); }
  }, { threshold: 0.18 });
  $$(".reveal").forEach((el) => observer.observe(el));
  // Safety net: if the observer is late (background tab, old browser), show what is already on screen.
  setInterval(() => $$(".reveal:not(.visible)").forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.top < innerHeight && r.bottom > 0) show(el);
  }), 1500);
})();

// Inclinación 3D y brillo en tarjetas
(() => {
  if (reduced || matchMedia("(pointer: coarse)").matches) return;
  $$(".tilt").forEach((el) => {
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform = `perspective(900px) rotateX(${-py * 10}deg) rotateY(${px * 12}deg) translateZ(0)`;
    });
    el.addEventListener("pointerleave", () => { el.style.transform = ""; });
  });
  $$("[data-glow]").forEach((el) => el.addEventListener("pointermove", (e) => {
    const r = el.getBoundingClientRect();
    el.style.setProperty("--gx", `${e.clientX - r.left}px`); el.style.setProperty("--gy", `${e.clientY - r.top}px`);
  }));
  // Botones magnéticos
  $$(".magnetic").forEach((el) => {
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${(e.clientX - r.left - r.width / 2) * 0.25}px`);
      el.style.setProperty("--my", `${(e.clientY - r.top - r.height / 2) * 0.35}px`);
    });
    el.addEventListener("pointerleave", () => { el.style.setProperty("--mx", "0px"); el.style.setProperty("--my", "0px"); });
  });
})();

// Texto que se «cifra» y descifra
(() => {
  const el = $(".scramble"); if (!el) return;
  const text = el.dataset.text, glyphs = "▓▒░█#@%&$?¿¡ñ01";
  let frame = 0, ciphered = true;
  const tick = () => {
    frame++;
    const progress = Math.min(frame / 40, 1);
    el.textContent = [...text].map((c, i) => {
      const settled = ciphered ? i / text.length > progress : i / text.length < progress;
      return settled ? c : glyphs[(Math.random() * glyphs.length) | 0];
    }).join("");
    if (progress < 1) requestAnimationFrame(tick);
    else setTimeout(() => { ciphered = !ciphered; frame = 0; requestAnimationFrame(tick); }, 1800);
  };
  if (reduced) el.textContent = "▓▒░█▓▒░█▓▒░█▓▒░█▓"; else tick();
})();

// Carrera de velocidad (escala logarítmica: si no, ZSTD sería invisible)
function runRace() {
  const lanes = $$("#race .lane"), times = lanes.map((l) => parseFloat($(".track i", l).dataset.time));
  const longest = Math.max(...times);
  lanes.forEach((lane, index) => {
    const bar = $(".track i", lane);
    lane.classList.remove("done"); bar.style.transition = "none"; bar.style.width = "0";
    const width = 100 * Math.log10(1 + times[index] * 9) / Math.log10(1 + longest * 9);
    const duration = reduced ? 0 : 400 + 3200 * (times[index] / longest) ** 0.5;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      bar.style.transition = `width ${duration}ms cubic-bezier(.2,.8,.2,1)`;
      bar.style.width = `${Math.max(width, 6)}%`;
      setTimeout(() => lane.classList.add("done"), duration);
    }));
  });
}
$("#race-again")?.addEventListener("click", runRace);

// Terminal que se escribe sola
let typed = false;
function typeTerminal() {
  if (typed) return; typed = true;
  const pre = $("#terminal-text");
  const script = [
    ["p", "$ ", "c", "java -jar app.jar\n"], ["m", "Hola desde iRar: sin recurso\n\n"],
    ["m", "# En iRar: abre app.jar, arrastra saludo.txt y listo.\n"], ["k", "✓ JAR actualizado · verificado\n\n"],
    ["p", "$ ", "c", "java -jar app.jar\n"], ["m", "Hola desde iRar: mensaje añadido 🎉\n\n"],
    ["p", "$ ", "c", "jar tf ofuscado.jar\n"], ["m", "p/a.class\np/A.class   ← ambos se conservan\n"],
  ];
  const parts = script.flatMap((line) => { const out = []; for (let i = 0; i < line.length; i += 2) out.push([line[i], line[i + 1]]); return out; });
  if (reduced) { pre.innerHTML = parts.map(([c, t]) => `<span class="${c}">${t}</span>`).join(""); return; }
  let part = 0, char = 0, html = "";
  const tick = () => {
    if (part >= parts.length) { pre.innerHTML = html + '<span class="caret"></span>'; return; }
    const [cls, text] = parts[part];
    const instant = cls !== "c";
    if (instant) { html += `<span class="${cls}">${text}</span>`; part++; setTimeout(tick, cls === "m" ? 260 : 60); }
    else {
      char++;
      pre.innerHTML = html + `<span class="c">${text.slice(0, char)}</span><span class="caret"></span>`;
      if (char >= text.length) { html += `<span class="c">${text}</span>`; part++; char = 0; setTimeout(tick, 380); }
      else setTimeout(tick, 38 + Math.random() * 60);
    }
  };
  tick();
}

// Demo de la ventana de iRar
let demoStarted = false;
function runDemo() {
  if (demoStarted) return; demoStarted = true;
  const files = [
    ["📁", "Diseños", "—", "Carpeta"], ["📁", "Código", "—", "Carpeta"], ["🖼️", "portada-final.png", "8.4 MB", "PNG"],
    ["🎬", "presentación.mov", "312 MB", "Video"], ["📄", "informe-año-2026.pdf", "2.1 MB", "PDF"],
    ["🎵", "intro.flac", "36.7 MB", "Audio"], ["📦", "app-release.jar", "14.9 MB", "JAR"], ["📝", "notas.md", "12 KB", "Texto"],
  ];
  const rows = $("#demo-rows"), count = $("#demo-count"), size = $("#demo-size");
  const op = $("#demo-op-text"), bar = $("#demo-bar"), fly = $("#fly"), demo = $("#demo");
  const sizes = [0, 0, 8.4, 312, 2.1, 36.7, 14.9, 0.012];
  const show = () => {
    rows.innerHTML = ""; let total = 0;
    files.forEach((f, i) => {
      const row = document.createElement("div"); row.className = "row"; row.style.animationDelay = `${i * 0.07}s`;
      row.innerHTML = `<span>${f[0]}</span><span>${f[1]}</span><span class="size">${f[2]}</span><span class="kind">${f[3]}</span>`;
      rows.appendChild(row); total += sizes[i];
    });
    count.textContent = files.length; size.textContent = `${total.toFixed(0)} MB`;
  };
  const sleep = (ms) => new Promise((r) => setTimeout(r, reduced ? 0 : ms));
  const progress = async (label, ms) => {
    op.textContent = label; bar.style.width = "0";
    for (let i = 1; i <= 20; i++) { bar.style.width = `${i * 5}%`; await sleep(ms / 20); }
  };
  const flyOut = (row) => {
    if (reduced) return;
    const from = row.getBoundingClientRect(), box = demo.getBoundingClientRect();
    for (let i = 0; i < 6; i++) {
      const p = document.createElement("span"); p.className = "fly"; p.textContent = row.firstChild.textContent;
      p.style.left = `${from.left - box.left + 10}px`; p.style.top = `${from.top - box.top}px`;
      fly.appendChild(p);
      const dx = (Math.random() - 0.3) * 260 + 160, dy = -120 - Math.random() * 160;
      p.animate([{ transform: "translate(0,0) scale(1)", opacity: 1 }, { transform: `translate(${dx}px, ${dy}px) scale(.3) rotate(${dx}deg)`, opacity: 0 }],
        { duration: 900 + i * 90, easing: "cubic-bezier(.2,.8,.2,1)" }).onfinish = () => p.remove();
    }
  };
  const loop = async () => {
    show(); await sleep(1400);
    const target = rows.children[4]; target.classList.add("selected"); await sleep(700);
    await progress("Preparando vista previa…", 900); op.textContent = "Vista previa lista ✓"; await sleep(1100);
    target.classList.remove("selected");
    const jar = rows.children[6]; jar.classList.add("selected"); await sleep(600);
    flyOut(jar); await progress("Extrayendo 1 elemento a Finder…", 1300); op.textContent = "1 elemento extraído a Finder ✓"; await sleep(1200);
    jar.classList.remove("selected");
    await progress("Añadiendo archivos a Proyecto-final.7z · verificando…", 1800);
    const added = document.createElement("div"); added.className = "row selected"; added.innerHTML = '<span>✨</span><span>nuevo-boceto.sketch</span><span class="size">4.2 MB</span><span class="kind">Diseño</span>';
    rows.appendChild(added); count.textContent = files.length + 1; op.textContent = "7z actualizado ✓"; await sleep(2600);
    if (!reduced) loop();
  };
  loop();
}
