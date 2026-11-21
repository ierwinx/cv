// Página de iRar: aurora en canvas, formatos en órbita y demo de compresión.
// Los enlaces de descarga ya traen la URL de apps.json en el HTML.
import { $, $$ } from '../core/dom';
import { coarsePointer, reduceMotion as reduced } from '../core/motion';
import { frameLoop } from '../core/loop';
import { countUp } from '../core/counters';
import { initNav } from '../core/nav';
import { initGlyphs } from '../core/glyphs';
import { initMagnetic, tilt } from '../core/pointer';
import { initReveal } from '../core/reveal';
import { onScrollProgress } from '../core/scroll';
import { initCursorGlow } from '../core/cursor';

// Fondo «aurora»: manchas de color que se mueven despacio
(() => {
  const canvas = $<HTMLCanvasElement>("#aurora");
  if (!canvas || reduced) return;
  const ctx = canvas.getContext("2d")!;
  const blobs = [
    { hue: "255, 194, 26", r: 0.42, x: 0.15, y: 0.1, sx: 0.00011, sy: 0.00013 },
    { hue: "139, 92, 246", r: 0.5, x: 0.85, y: 0.25, sx: 0.00009, sy: 0.00012 },
    { hue: "244, 114, 182", r: 0.35, x: 0.5, y: 0.8, sx: 0.00013, sy: 0.0001 },
    { hue: "34, 211, 238", r: 0.3, x: 0.2, y: 0.7, sx: 0.0001, sy: 0.00008 },
  ];
  let width = 0, height = 0, scrollY = 0;
  // Se dibuja a un cuarto de resolución y el navegador lo escala: son degradados difusos y se ven igual
  // (como la aurora de iLegato), pero hay 4 veces menos píxeles que pintar en cada fotograma.
  const resize = () => {
    width = canvas.width = Math.ceil(innerWidth / 4);
    height = canvas.height = Math.ceil(innerHeight / 4);
  };
  addEventListener("resize", resize); resize();
  addEventListener("scroll", () => { scrollY = window.scrollY; }, { passive: true });
  const draw = (t: number) => {
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
  };
  frameLoop(draw, { fps: 30 });   // deriva lenta: 30 fps se ven igual
})();

// Barra de progreso y brillo que sigue al cursor (la nav es la común: core/nav)
initNav();
initGlyphs();
const progressBar = $(".progress span")!;
onScrollProgress((p) => progressBar.style.setProperty("--p", String(p)));
initCursorGlow({ el: $<HTMLElement>(".cursor-glow")!, x: "--x", y: "--y" });

// Contadores animados: data-decimals y data-suffix, formato es-MX
const animateCount = (el: HTMLElement) => countUp(el, {
  duration: 1600,
  format: (v, e) => v.toLocaleString("es-MX", { minimumFractionDigits: +(e.dataset.decimals || 0), maximumFractionDigits: +(e.dataset.decimals || 0) }) + (e.dataset.suffix || ""),
});

// Aparición al hacer scroll (con escalonado por grupo)
initReveal(".reveal", {
  className: "visible", threshold: 0.18, group: true, stagger: 80, maxIndex: 6, delayVar: "--d",
  onEnter: (el) => {
    $$("[data-count]", el).forEach(animateCount);
    $$(".meter-bar i", el).forEach((i) => { i.style.width = `${i.dataset.width}%`; });
    if (el.id === "race") runRace();
    if (el.id === "terminal") typeTerminal();
    if (el.id === "demo") runDemo();
  },
});

// Inclinación 3D y brillo en tarjetas
if (!reduced && !coarsePointer) {
  $$(".tilt").forEach((el) => tilt(el, { degX: 10, degY: 12, x: null, y: null, extra: "translateZ(0)" }));
  $$("[data-glow]").forEach((el) => tilt(el, { rotate: false, x: "--gx", y: "--gy", unit: "px" }));
}

// Texto que se «cifra» y descifra
(() => {
  const el = $(".scramble"); if (!el) return;
  const text = el.dataset.text!, glyphs = "▓▒░█#@%&$?¿¡ñ01";
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
  const lanes = $$("#race .lane"), times = lanes.map((l) => parseFloat($(".track i", l)!.dataset.time!));
  const longest = Math.max(...times);
  lanes.forEach((lane, index) => {
    const bar = $(".track i", lane)!;
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
  const pre = $("#terminal-text")!;
  const script = [
    ["p", "$ ", "c", "java -jar app.jar\n"], ["m", "Hola desde iRar: sin recurso\n\n"],
    ["m", "# En iRar: abre app.jar, arrastra saludo.txt y listo.\n"], ["k", "✓ JAR actualizado · verificado\n\n"],
    ["p", "$ ", "c", "java -jar app.jar\n"], ["m", "Hola desde iRar: mensaje añadido 🎉\n\n"],
    ["p", "$ ", "c", "jar tf ofuscado.jar\n"], ["m", "p/a.class\np/A.class   ← ambos se conservan\n"],
  ];
  const parts = script.flatMap((line) => { const out: [string, string][] = []; for (let i = 0; i < line.length; i += 2) out.push([line[i], line[i + 1]]); return out; });
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
  // Como la tabla de la app (ArchiveBrowser.swift): carpeta azul o documento gris, Tamaño y Comprimido
  const FOLDER = '<svg class="dir" viewBox="0 0 24 24"><path d="M3 6.5A2 2 0 0 1 5 4.5h4.2l2 2.2H19a2 2 0 0 1 2 2V17.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>';
  const DOC = '<svg class="doc" viewBox="0 0 24 24"><path d="M13.5 3H7a1.5 1.5 0 0 0-1.5 1.5v15A1.5 1.5 0 0 0 7 21h10a1.5 1.5 0 0 0 1.5-1.5V8zM13.5 3v5h5"/></svg>';
  type Item = { name: string; mb: number; comp: number; dir?: boolean };
  const files: Item[] = [
    { name: "Diseños", mb: 0, comp: 0, dir: true }, { name: "Código", mb: 0, comp: 0, dir: true },
    { name: "portada-final.png", mb: 8.4, comp: 8.1 }, { name: "presentación.mov", mb: 312, comp: 298.5 },
    { name: "informe-2026.pdf", mb: 2.1, comp: 1.7 }, { name: "intro.flac", mb: 36.7, comp: 35.9 },
    { name: "app-release.jar", mb: 14.9, comp: 14.2 }, { name: "notas.md", mb: 0.012, comp: 0.004 },
  ];
  const added: Item = { name: "nuevo-boceto.sketch", mb: 4.2, comp: 3.9 };
  // Tamaños como ByteCountFormatter en español: «8,4 MB», «12 KB»
  const fmt = (mb: number) => mb < 1 ? `${Math.round(mb * 1000)} KB` : `${mb.toLocaleString("es-MX", { maximumFractionDigits: 1 }).replace(".", ",")} MB`;
  const rows = $("#demo-rows")!, demo = $("#demo")!, fly = $("#fly")!, insp = $(".mac-insp", demo)!;
  const foot = $("#demo-foot")!, total = $("#demo-total")!, count = $("#demo-count")!, size = $("#demo-size")!;
  const name = $("#demo-name")!, kind = $("#demo-kind")!, sel = $("#demo-sel")!, comp = $("#demo-comp")!, extract = $("#demo-extract")!;
  const status = $("#demo-op")!, op = $("#demo-op-text")!, bar = $("#demo-bar")!, pct = $("#demo-pct")!, tool = $("#demo-tool-add")!;
  let list: Item[] = [];
  // Como core/sleep, pero sin esperas con movimiento reducido
  const pause = (ms: number) => new Promise((r) => setTimeout(r, reduced ? 0 : ms));
  const rowHTML = (f: Item) => `${'<span class="nm">'}${f.dir ? FOLDER : DOC}<span>${f.name}</span></span><span>${f.dir ? "—" : fmt(f.mb)}</span><span>${f.dir ? "—" : fmt(f.comp)}</span>`;
  const summary = () => {
    const mb = list.reduce((t, f) => t + f.mb, 0);
    count.textContent = String(list.length); size.textContent = fmt(mb); total.textContent = `${fmt(mb)} sin comprimir`;
  };
  // Selección: la fila azul, el pie de la tabla y el inspector, como en la app
  const select = (index: number | null) => {
    [...rows.children].forEach((r, i) => r.classList.toggle("selected", i === index));
    const f = index === null ? null : list[index];
    foot.textContent = `${list.length} elementos${f ? " · 1 seleccionados" : ""}`;
    insp.classList.toggle("has-sel", !!f && !f.dir);
    name.textContent = f ? f.name : "Proyecto-final.7z";
    kind.textContent = f ? "Selección actual" : "Archivo 7z";
    if (f) { sel.textContent = fmt(f.mb); comp.textContent = fmt(f.comp); }
    extract.lastChild!.textContent = f ? "Extraer selección…" : "Extraer todo…";
  };
  const show = () => {
    list = [...files]; rows.innerHTML = "";
    list.forEach((f, i) => {
      const row = document.createElement("div"); row.className = "mac-row"; row.style.animationDelay = `${i * 0.06}s`;
      row.innerHTML = rowHTML(f); rows.appendChild(row);
    });
    summary(); select(null); status.classList.remove("on", "done");
  };
  // Barra de estado: indicador, título, progreso, porcentaje y Cancelar; al terminar, palomita verde y mensaje
  const work = async (label: string, ms: number) => {
    status.classList.add("on"); status.classList.remove("done"); op.textContent = label;
    for (let i = 0; i <= 20; i++) { bar.style.width = `${i * 5}%`; pct.textContent = `${i * 5} %`; await pause(ms / 20); }
  };
  const done = (message: string) => { status.classList.add("done"); op.textContent = message; };
  const press = async (el: Element) => { el.classList.add("hit"); await pause(260); el.classList.remove("hit"); };
  const flyOut = (row: Element) => {
    if (reduced) return;
    const from = row.getBoundingClientRect(), box = demo.getBoundingClientRect();
    for (let i = 0; i < 6; i++) {
      const p = document.createElement("span"); p.className = "fly"; p.innerHTML = DOC;
      p.style.left = `${from.left - box.left + 14}px`; p.style.top = `${from.top - box.top + 6}px`;
      fly.appendChild(p);
      const dx = (Math.random() - 0.3) * 260 + 160, dy = -120 - Math.random() * 160;
      p.animate([{ transform: "translate(0,0) scale(1)", opacity: 1 }, { transform: `translate(${dx}px, ${dy}px) scale(.3) rotate(${dx}deg)`, opacity: 0 }],
        { duration: 900 + i * 90, easing: "cubic-bezier(.2,.8,.2,1)" }).onfinish = () => p.remove();
    }
  };
  const loop = async () => {
    show(); await pause(1500);
    select(4); await pause(900);
    await work("Preparando vista previa…", 900); done("Vista previa de informe-2026.pdf"); await pause(1300);
    select(6); await pause(700); await press(extract);
    flyOut(rows.children[6]); await work("Extrayendo 1 elemento…", 1300); done("1 elemento extraído en Descargas"); await pause(1300);
    select(null); await press(tool);
    await work("Añadiendo 1 elemento a Proyecto-final.7z…", 1100); await work("Verificando el 7z antes de reemplazarlo…", 900);
    list.push(added);
    const row = document.createElement("div"); row.className = "mac-row"; row.innerHTML = rowHTML(added); rows.appendChild(row);
    summary(); select(list.length - 1); done("Proyecto-final.7z actualizado y verificado"); await pause(2800);
    if (!reduced) loop();
  };
  loop();
}

initMagnetic();
