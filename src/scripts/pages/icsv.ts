// Página de iCSV: rejilla en vivo, sniffer de delimitadores, demo de fidelidad y confeti de delimitadores.
import { $, $$ } from '../core/dom';
import { reduceMotion as reduce, sleep } from '../core/motion';
import { frameLoop } from '../core/loop';
import { confetti, toast } from '../core/celebrate';
import { countUp as count } from '../core/counters';

(() => {

  /* ---- Headline word stagger ---- */
  $$("#headline .word").forEach((w, i) => w.style.animationDelay = (0.15 + i * 0.12) + "s");

  /* ---- Nav + progress ---- */
  const nav = $("#nav")!, progress = $("#progress")!;
  const onScroll = () => {
    const h = document.documentElement;
    progress.style.width = (h.scrollTop / (h.scrollHeight - h.clientHeight) * 100) + "%";
    nav.classList.toggle("scrolled", h.scrollTop > 20);
  };
  addEventListener("scroll", onScroll, { passive: true }); onScroll();

  /* ---- Cursor glow ---- */
  const glow = $("#glow")!;
  addEventListener("pointermove", e => { glow.style.left = e.clientX + "px"; glow.style.top = e.clientY + "px"; }, { passive: true });

  /* ---- Particles: floating delimiters ---- */
  const pc = $<HTMLCanvasElement>("#particles")!, px = pc.getContext("2d")!;
  const glyphs = [",", ";", "|", "⇥", "\"", ":"];
  type Part = { x: number; y: number; s: number; v: number; g: string; a: number; r: number; vr: number; c: string };
  let parts: Part[] = [], W = 0, H = 0;
  const resize = () => {
    W = pc.width = innerWidth * devicePixelRatio; H = pc.height = innerHeight * devicePixelRatio;
    pc.style.width = innerWidth + "px"; pc.style.height = innerHeight + "px";
    const n = Math.min(46, Math.floor(innerWidth / 30));
    parts = Array.from({ length: n }, () => ({
      x: Math.random() * W, y: Math.random() * H, s: (10 + Math.random() * 18) * devicePixelRatio,
      v: (0.15 + Math.random() * 0.45) * devicePixelRatio, g: glyphs[Math.random() * glyphs.length | 0],
      a: 0.05 + Math.random() * 0.12, r: Math.random() * 6.28, vr: (Math.random() - .5) * 0.01,
      c: Math.random() < .25 ? "255,159,0" : "47,224,189"
    }));
  };
  resize(); addEventListener("resize", resize);
  const tick = (_: number, k: number) => {
    px.clearRect(0, 0, W, H);
    for (const p of parts) {
      p.y -= p.v * k; p.r += p.vr * k; if (p.y < -40) { p.y = H + 40; p.x = Math.random() * W; }
      px.save(); px.translate(p.x, p.y); px.rotate(p.r);
      px.font = `700 ${p.s}px JetBrains Mono, monospace`; px.fillStyle = `rgba(${p.c},${p.a})`;
      px.fillText(p.g, 0, 0); px.restore();
    }
  };
  if (!reduce) frameLoop(tick, { fps: 30 });   // fondo lento: 30 fps se ven igual

  /* ---- Window tilt ---- */
  const win = $("#win")!;
  const stage = $(".stage")!;
  let baseTilt = 18;
  const setTilt = (rx: number, ry: number, sc: number) => win.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg) scale(${sc})`;
  const scrollTilt = () => {
    const r = stage.getBoundingClientRect();
    const t = Math.min(1, Math.max(0, 1 - (r.top - innerHeight * .25) / (innerHeight * .6)));
    baseTilt = 18 * (1 - t);
    setTilt(baseTilt, 0, .94 + .06 * t);
  };
  addEventListener("scroll", scrollTilt, { passive: true }); scrollTilt();
  stage.addEventListener("pointermove", e => {
    const r = win.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
    setTilt(baseTilt - y * 6, x * 8, 1);
  });
  stage.addEventListener("pointerleave", scrollTilt);

  /* ---- Live grid ---- */
  const names = ["Ana López", "Carlos Ruiz", "Mariana Ortiz", "Diego Fernández", "Lucía Gómez", "Javier Torres", "Sofía Ramírez", "Pablo Díaz", "Valeria Cruz", "Andrés Molina", "Camila Rojas", "Emilio Vargas", "Renata Silva", "Tomás Herrera"];
  const cities = ["Monterrey", "Madrid", "Bogotá", "CDMX", "Buenos Aires", "Lima", "Santiago", "Sevilla", "Guadalajara", "Quito", "Valencia", "Montevideo"];
  const pad = (n: number) => String(n).padStart(5, "0");
  const rnd = <T,>(a: T[]) => a[Math.random() * a.length | 0];
  const tbody = $<HTMLTableSectionElement>("#grid tbody")!;
  let id = 1;
  const mkRow = () => {
    const tr = document.createElement("tr");
    const d = new Date(2026, Math.random() * 12 | 0, 1 + (Math.random() * 28 | 0));
    const cells = [
      ["gut", id], ["num", pad(id)], ["", rnd(names)], ["", rnd(cities)],
      ["hide-sm", pad(Math.random() * 99999 | 0)], ["num", (Math.random() * 9000 + 50).toFixed(2).replace(".", ",")],
      ["hide-sm", d.toISOString().slice(0, 10)]
    ];
    tr.innerHTML = cells.map(([c, v]) => `<td class="${c}">${v}</td>`).join("");
    id++; return tr;
  };
  for (let i = 0; i < 14; i++) tbody.appendChild(mkRow());

  // Contador rápido de filas, como al abrir un archivo grande. Separador de miles: espacio fino (1 048 576)
  const thin = (v: number) => String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, "\u2009");
  count($("#rowcount")!, { duration: 1600, format: thin });

  // Moving selection + typing into a cell.
  let sel = { r: 2, c: 2 };
  const cellAt = (r: number, c: number) => tbody.rows[r]?.cells[c];
  const paint = () => { $$("td.sel", tbody).forEach(td => td.classList.remove("sel")); cellAt(sel.r, sel.c)?.classList.add("sel"); };
  paint();
  const visibleCols = () => innerWidth <= 600 ? [1, 2, 3, 5] : [1, 2, 3, 4, 5, 6];
  const typeInto = async (td: HTMLElement, text: string) => {
    td.innerHTML = '<span class="caret"></span>';
    for (const ch of text) {
      await sleep(70 + Math.random() * 60);
      td.innerHTML = td.textContent + ch + '<span class="caret"></span>';
    }
    await sleep(400);
    td.textContent = text; td.classList.add("flash"); setTimeout(() => td.classList.remove("flash"), 1000);
  };
  const script = async () => {
    while (true) {
      for (let k = 0; k < 3; k++) {
        await sleep(650);
        const cols = visibleCols();
        const ci = cols.indexOf(sel.c);
        if (Math.random() < .5) sel.c = cols[Math.max(0, Math.min(cols.length - 1, ci + (Math.random() < .5 ? 1 : -1)))];
        else sel.r = Math.max(0, Math.min(8, sel.r + (Math.random() < .5 ? 1 : -1)));
        paint();
      }
      await sleep(500);
      const td = cellAt(sel.r, sel.c);
      const val = sel.c === 2 ? rnd(names) : sel.c === 3 ? rnd(cities) : sel.c === 5 ? (Math.random() * 9000).toFixed(2).replace(".", ",") : sel.c === 1 ? pad(Math.random() * 99999 | 0) : "2026-10-07";
      if (td) await typeInto(td, val);
      // Append a row as if pressing ↩ on the last one.
      await sleep(500);
      tbody.removeChild(tbody.rows[0]);
      tbody.querySelectorAll("td.gut").forEach((g, i) => { g.textContent = String(id - 13 + i); });
      const nr = mkRow(); tbody.appendChild(nr);
      nr.querySelectorAll("td").forEach(td => td.classList.add("flash"));
      paint();
    }
  };
  if (!reduce) script();

  /* ---- Marquee ---- */
  const items = ["CSV", "TSV", "PSV", "UTF-8", "UTF-16 LE", "Windows-1252", "sep=;", "CRLF", "RFC 4180", "ISO-8859-1", "Mac Roman", "\\\"escape\\\"", "BOM", "DSV", "LF", "UTF-32", "CR"];
  const track = $("#marquee")!;
  const html = items.map((t, i) => `<span class="${i % 3 === 1 ? "alt" : ""}">${t}</span><span style="color:#ff9f00">✦</span>`).join("");
  track.innerHTML = html + html;

  /* ---- Reveal + one-shot triggers ---- */
  const once = new Map<Element, () => void>();
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add("in");
    once.get(e.target)?.(); once.delete(e.target);
    io.unobserve(e.target);
  }), { threshold: .15, rootMargin: "0px 0px -40px 0px" });
  $$(".reveal").forEach(el => io.observe(el));
  const when = (el: Element, fn: () => void) => { once.set(el, fn); io.observe(el); };

  // Contadores de las cifras
  when($(".stats")!, () => $$(".count").forEach((el) => count(el, { duration: 1800, power: 3, format: thin })));

  // Speed bars
  when($("#speedo")!, () => setTimeout(() => $$("#speedo i").forEach(i => i.style.width = i.dataset.w + "%"), 200));

  // Terminal sniffer
  const termLines: [string, number][] = [
    ['<span class="c">$ open</span> exportacion_excel.txt', 0],
    ['Codificación &nbsp;<span class="k">UTF-16 LE</span> <span class="c">(BOM)</span> <span class="ok">✓</span>', 1],
    ['Separador &nbsp;&nbsp;&nbsp;<span class="k">tabulador</span> <span class="ok">✓</span>', 1],
    ['Comillas &nbsp;&nbsp;&nbsp;&nbsp;<span class="k">"</span> · escape <span class="k">""</span> <span class="ok">✓</span>', 1],
    ['Fin de línea <span class="k">CRLF</span> <span class="ok">✓</span>', 1],
    ['Encabezado &nbsp;&nbsp;<span class="k">sí</span> <span class="c">(fila 1)</span> <span class="ok">✓</span>', 1],
    ['<span class="ok">→ 248 913 filas listas en 0,08 s</span>', 2]
  ];
  const term = $("#term")!;
  const runTerm = async () => {
    while (true) {
      term.innerHTML = "";
      for (const [l] of termLines) {
        await sleep(420);
        const d = document.createElement("div"); d.innerHTML = l;
        d.style.opacity = "0"; d.style.transform = "translateX(-6px)"; d.style.transition = "all .35s";
        term.appendChild(d); requestAnimationFrame(() => { d.style.opacity = "1"; d.style.transform = "none"; });
      }
      await sleep(4200);
    }
  };
  when(term, () => { if (reduce) term.innerHTML = termLines.map(l => `<div>${l[0]}</div>`).join(""); else runTerm(); });

  // Keycaps pressing
  const kbds = $$("#keys kbd");
  when($("#keys")!, () => reduce || setInterval(() => {
    const k = kbds[Math.random() * kbds.length | 0];
    k.classList.add("press"); setTimeout(() => k.classList.remove("press"), 260);
  }, 700));

  // Undo stack
  const undo = $$("#undo div");
  when($("#undo")!, () => {
    if (reduce) return;
    let i = 0, dir = 1;
    setInterval(() => {
      if (dir === 1) { undo[i].classList.add("gone"); i++; if (i === undo.length) { dir = -1; i--; } }
      else { undo[i].classList.remove("gone"); i--; if (i < 0) { dir = 1; i = 0; } }
    }, 1100);
  });

  /* ---- Fidelity demo ---- */
  const fields = [
    ["Código", "00123", "123"],
    ["Fecha", "2026-03-04", "04/03/2026"],
    ["Importe", "1,50", "1.5"],
    ["Teléfono", "+5215512345678", "5.21551E+12"],
    ["Referencia", "1E5", "100000"],
    ["Gen", "MARCH1", "1-mar"]
  ];
  const badrows = $("#badrows")!, goodrows = $("#goodrows")!;
  fields.forEach(([l, ok]) => {
    badrows.insertAdjacentHTML("beforeend", `<div class="vs-row"><span class="lbl">${l}</span><span class="val">${ok}</span></div>`);
    goodrows.insertAdjacentHTML("beforeend", `<div class="vs-row"><span class="lbl">${l}</span><span class="val">${ok}</span></div>`);
  });
  const scramble = (el: HTMLElement, to: string) => new Promise<void>(res => {
    const chars = "0123456789.,E+-/#";
    let f = 0; const total = 16;
    const it = setInterval(() => {
      f++;
      el.textContent = f < total ? Array.from({ length: Math.max(to.length, 3) }, () => chars[Math.random() * chars.length | 0]).join("") : to;
      if (f >= total) { clearInterval(it); res(); }
    }, 40);
  });
  when(badrows, async () => {
    const vals = $$(".val", badrows);
    for (let i = 0; i < vals.length; i++) {
      await sleep(reduce ? 0 : 350);
      if (reduce) vals[i].textContent = fields[i][2]; else await scramble(vals[i], fields[i][2]);
      vals[i].classList.add("changed");
    }
  });

  /* ---- Card spotlight ---- */
  $$(".card").forEach(c => c.addEventListener("pointermove", e => {
    const r = c.getBoundingClientRect();
    c.style.setProperty("--x", (e.clientX - r.left) + "px"); c.style.setProperty("--y", (e.clientY - r.top) + "px");
  }));

  /* ---- Magnetic buttons + highlight ---- */
  $$(".magnetic").forEach(b => {
    b.addEventListener("pointermove", e => {
      const r = b.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      b.style.setProperty("--mx", x + "px"); b.style.setProperty("--my", y + "px");
      if (!reduce) b.style.transform = `translate(${(x - r.width / 2) * .18}px, ${(y - r.height / 2) * .28}px)`;
    });
    b.addEventListener("pointerleave", () => b.style.transform = "");
  });

  /* ---- Download: ripple + confetti + toast ---- */
  const showToast = (msg: string) => toast(msg, { className: "show", ms: 3200, html: false });
  $$(".js-download").forEach(b => b.addEventListener("click", e => {
    const r = b.getBoundingClientRect();
    const rip = document.createElement("span"); const d = Math.max(r.width, r.height);
    rip.className = "ripple"; rip.style.width = rip.style.height = d + "px";
    rip.style.left = (e.clientX - r.left - d / 2) + "px"; rip.style.top = (e.clientY - r.top - d / 2) + "px";
    b.appendChild(rip); setTimeout(() => rip.remove(), 700);
    confetti($<HTMLCanvasElement>("#confetti"), e.clientX, e.clientY, {
      count: 90, colors: ["#2fe0bd", "#1c9e86", "#ff9f00", "#ffc35c", "#ffffff"], spread: "radial",
      gravity: .35, drag: .985, decay: .009, spin: .3, width: [5, 11], glyphs: [",", ";", "|", "\""],
    });
    showToast("🎉 Descargando iCSV 1.0 — ábrelo y arrastra iCSV a Aplicaciones");
  }));

  /* ---- Copy checksum ---- */
  const checksum = $("#checksum")!;
  checksum.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(checksum.dataset.sha!); showToast("SHA-256 copiado al portapapeles"); }
    catch { showToast("No se pudo copiar el SHA-256"); }
  });
})();
