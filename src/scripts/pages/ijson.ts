// Página de iJson: ventana interactiva del héroe, laboratorio de fidelidad, atajos y campo de símbolos.
import { $, $$, esc } from '../core/dom';
import { reduceMotion as reduce } from '../core/motion';
import { frameLoop } from '../core/loop';
import { initCounters } from '../core/counters';
import { initMagnetic } from '../core/pointer';

type Kind = 'object' | 'array' | 'string' | 'number' | 'bool' | 'null';
type Node = { k: Kind; raw?: string; v?: unknown; kids?: { key: string | null; node: Node }[] };
type ParseError = Error & { line: number; col: number };

/* ---------- parser que conserva los lexemas, como el de la app ---------- */
function parseJSON(src: string): Node {
  let i = 0;
  const fail = (msg: string): never => {
    const before = src.slice(0, i).split("\n");
    const e = new Error(msg) as ParseError; e.line = before.length; e.col = before[before.length - 1].length + 1; throw e;
  };
  const ws = () => { while (i < src.length && " \t\n\r".includes(src[i])) i++; };
  function str(): Node & { v: string } {
    const s = i++;
    while (i < src.length && src[i] !== '"') {
      if (src[i] === "\\") i++;
      else if (src[i] < " ") fail("Carácter de control dentro de un texto");
      i++;
    }
    if (i >= src.length) fail("Falta cerrar el texto con \"");
    i++;
    const raw = src.slice(s, i);
    return { k: "string", raw, v: JSON.parse(raw) };
  }
  function val(): Node {
    ws();
    const c = src[i];
    if (c === "{") {
      i++; const kids: NonNullable<Node["kids"]> = []; ws();
      if (src[i] === "}") { i++; return { k: "object", kids }; }
      for (;;) {
        ws(); if (src[i] !== '"') fail("Se esperaba una clave entre comillas");
        const key = str().v; ws();
        if (src[i] !== ":") fail("Se esperaban dos puntos después de la clave");
        i++; kids.push({ key, node: val() }); ws();
        if (src[i] === ",") { i++; continue; }
        if (src[i] === "}") { i++; return { k: "object", kids }; }
        fail("Se esperaba una coma o }");
      }
    }
    if (c === "[") {
      i++; const kids: NonNullable<Node["kids"]> = []; ws();
      if (src[i] === "]") { i++; return { k: "array", kids }; }
      for (;;) {
        kids.push({ key: null, node: val() }); ws();
        if (src[i] === ",") { i++; continue; }
        if (src[i] === "]") { i++; return { k: "array", kids }; }
        fail("Se esperaba una coma o ]");
      }
    }
    if (c === '"') return str();
    const m = /^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/.exec(src.slice(i, i + 400));
    if (m && m[0]) { i += m[0].length; return { k: "number", raw: m[0] }; }
    for (const [w, k] of [["true", "bool"], ["false", "bool"], ["null", "null"]] as const)
      if (src.startsWith(w, i)) { i += w.length; return { k, raw: w }; }
    return fail(i >= src.length ? "El documento termina antes de tiempo" : "Valor no válido");
  }
  const root = val(); ws();
  if (i < src.length) fail("Hay contenido después del final del JSON");
  return root;
}

function format(node: Node, indent: string, html: boolean) {
  const nl = indent ? "\n" : "", sp = indent ? " " : "";
  const t = (cls: string, s: string) => html ? `<span class="${cls}">${esc(s)}</span>` : s;
  function go(n: Node, d: number): string {
    if (n.k === "object" || n.k === "array") {
      const [o, c] = n.k === "object" ? ["{", "}"] : ["[", "]"];
      if (!n.kids!.length) return t("t-p", o + c);
      const pad = indent.repeat(d + 1);
      const parts = n.kids!.map(({ key, node }) =>
        pad + (key !== null ? t("t-key", JSON.stringify(key)) + t("t-p", ":" + sp) : "") + go(node, d + 1));
      return t("t-p", o) + nl + parts.join(t("t-p", ",") + nl) + nl + indent.repeat(d) + t("t-p", c);
    }
    const cls = ({ string: "t-str", number: "t-num", bool: "t-lit", null: "t-null" } as Record<string, string>)[n.k];
    return t(cls, n.raw!);
  }
  return go(node, 0);
}

/* ---------- ventana del héroe ---------- */
const SAMPLE = `{
  "pedido": "A-1042",
  "cliente": { "nombre": "Ana Ruiz", "vip": true },
  "total": 120.50,
  "id_externo": 12345678901234567890,
  "cupon": null,
  "lineas": [
    { "producto": "Café de Chiapas", "cantidad": 2 },
    { "producto": "Pan de muerto", "cantidad": 1 }
  ]
}`;
const heroTree = parseJSON(SAMPLE);
const BADGE: Record<Kind, string> = { object: "{ }", array: "[ ]", string: "abc", number: "123", bool: "0|1", null: "∅" };
const isIdent = (k: string) => /^[\p{L}_$][\p{L}\p{N}_$]*$/u.test(k);
const expanded = new Set(["$", "$.cliente", "$.lineas", "$.lineas[0]"]);
let selected = "$.cliente.nombre", mode = "tree", userTouched = false, animateRows = true;

type Row = { node: Node; key: string | null; path: string; d: number };
function flatten() {
  const rows: Row[] = [], stack: Row[] = [{ node: heroTree, key: null, path: "$", d: 0 }];
  while (stack.length) {
    const r = stack.pop()!; rows.push(r);
    const n = r.node;
    if ((n.k === "object" || n.k === "array") && expanded.has(r.path))
      for (let j = n.kids!.length - 1; j >= 0; j--) {
        const { key, node } = n.kids![j];
        const path = n.k === "array" ? `${r.path}[${j}]` : isIdent(key!) ? `${r.path}.${key}` : `${r.path}["${key}"]`;
        stack.push({ node, key: n.k === "array" ? String(j) : key, path, d: r.d + 1 });
      }
  }
  return rows;
}
function countNodes(n: Node) { let c = 0; const s = [n]; while (s.length) { const x = s.pop()!; c++; if (x.kids) for (const k of x.kids) s.push(k.node); } return c; }

const pane = $("#pane")!;
function renderPane() {
  const anim = animateRows && !reduce;
  if (mode === "tree") {
    pane.innerHTML = `<div class="rows" role="tree">` + flatten().map((r, idx) => {
      const n = r.node, cont = n.k === "object" || n.k === "array";
      const val = cont ? `<span class="rval meta">${n.k === "object" ? "{" + n.kids!.length + "}" : "[" + n.kids!.length + "]"}</span>`
                       : `<span class="rval">${esc(n.raw!)}</span>`;
      const disc = cont ? `<button class="disc" data-toggle="${esc(r.path)}" aria-expanded="${expanded.has(r.path)}" aria-label="Desplegar"><svg width="9" height="9" viewBox="0 0 10 10"><path d="M3 1l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.8"/></svg></button>` : `<span class="disc ph"></span>`;
      return `<div class="row k-${n.k}" role="treeitem" data-path="${esc(r.path)}" aria-selected="${r.path === selected}" style="--d:${r.d};--i:${anim ? idx : 0};${anim ? "" : "animation:none"}">${disc}<span class="badge">${BADGE[n.k]}</span><span class="rkey">${r.key === null ? "raíz" : esc(r.key)}</span>${val}</div>`;
    }).join("") + `</div>`;
  } else {
    const lines = format(heroTree, "  ", true).split("\n");
    pane.innerHTML = `<div class="code">` + lines.map((l, idx) => `<span class="ln" style="--i:${anim ? idx : 0};${anim ? "" : "animation:none"}">${l}</span>`).join("") + `</div>`;
  }
  $("#st-path")!.textContent = mode === "tree" ? selected : "Línea 1, columna 1";
}
function setMode(m: string) {
  mode = m; animateRows = true;
  $("#seg")!.dataset.mode = m;
  $("#mode-tree")!.setAttribute("aria-pressed", String(m === "tree"));
  $("#mode-text")!.setAttribute("aria-pressed", String(m === "text"));
  renderPane();
}
$("#mode-tree")!.onclick = () => { userTouched = true; setMode("tree"); };
$("#mode-text")!.onclick = () => { userTouched = true; setMode("text"); };
pane.addEventListener("click", e => {
  userTouched = true; animateRows = false;
  const t = (e.target as Element).closest<HTMLElement>("[data-toggle]");
  if (t) { const p = t.dataset.toggle!; if (expanded.has(p)) expanded.delete(p); else expanded.add(p); animateRows = true; renderPane(); return; }
  const row = (e.target as Element).closest<HTMLElement>(".row");
  if (row) { selected = row.dataset.path!; renderPane(); }
});
$("#st-size")!.textContent = new Blob([SAMPLE]).size + " bytes";
$("#st-nodes")!.textContent = countNodes(heroTree) + " nodos";
renderPane();
if (!reduce) setInterval(() => { if (!userTouched) setMode(mode === "tree" ? "text" : "tree"); }, 4200);

/* inclinación 3D de la ventana */
const win = $("#win")!;
if (!reduce && matchMedia("(pointer: fine)").matches) {
  win.parentElement!.addEventListener("pointermove", e => {
    const b = win.getBoundingClientRect();
    const x = (e.clientX - b.left) / b.width, y = (e.clientY - b.top) / b.height;
    win.style.setProperty("--ry", (x - .5) * 10 + "deg");
    win.style.setProperty("--rx", (.5 - y) * 8 + "deg");
    win.style.setProperty("--gx", x * 100 + "%");
    win.style.setProperty("--gy", y * 100 + "%");
  });
  win.parentElement!.addEventListener("pointerleave", () => { win.style.setProperty("--ry", "0deg"); win.style.setProperty("--rx", "0deg"); });
}

/* ---------- marquesina ---------- */
const items: [Kind, string][] = [["object", "Objetos"], ["array", "Arreglos"], ["string", "Textos"], ["number", "Números exactos"], ["bool", "Booleanos"], ["null", "Nulos"],
  ["object", "Árbol ⌘1"], ["string", "Texto ⌘2"], ["number", "100 MB en 0,42 s"], ["array", "Deshacer sin límite"], ["bool", "Validación en vivo"], ["null", "Cero dependencias"]];
const strip = items.map(([k, l]) => `<span><span class="badge k-${k}">${BADGE[k]}</span>${l}</span>`).join("");
$("#track")!.innerHTML = strip + strip;

/* ---------- laboratorio de fidelidad ---------- */
const LAB = `{
  "pedido": "A-1042",
  "total": 120.50,
  "descuento": 0.0,
  "id_externo": 12345678901234567890,
  "distancia_m": 1e4,
  "lineas": {
    "3": "café",
    "10": "pan",
    "1": "leche"
  }
}`;
const src = $<HTMLTextAreaElement>("#src")!; src.value = LAB;
let labIndent = "  ";

function genericOutput(tree: Node, value: unknown) {
  // Recorre el valor que devuelve JSON.parse y marca lo que ya no coincide con el original.
  let numbers = 0, moved = 0;
  const lookup = (n: Node | undefined, key: string | number) => n && n.k === "object" ? [...n.kids!].reverse().find(k => k.key === key)?.node : n?.kids?.[key as number]?.node;
  function go(v: unknown, n: Node | undefined, d: number): string {
    const pad = "  ".repeat(d + 1), end = "  ".repeat(d);
    if (Array.isArray(v)) {
      if (!v.length) return `<span class="t-p">[]</span>`;
      return `<span class="t-p">[</span>\n` + v.map((x, j) => pad + go(x, lookup(n, j), d + 1)).join(`<span class="t-p">,</span>\n`) + `\n${end}<span class="t-p">]</span>`;
    }
    if (v && typeof v === "object") {
      const keys = Object.keys(v);
      if (!keys.length) return `<span class="t-p">{}</span>`;
      const orig = n && n.k === "object" ? [...new Set(n.kids!.map(k => k.key))] : keys;
      return `<span class="t-p">{</span>\n` + keys.map((k, j) => {
        const wasMoved = orig[j] !== k; if (wasMoved) moved++;
        const kh = `<span class="t-key${wasMoved ? " diff" : ""}">${esc(JSON.stringify(k))}</span>`;
        return pad + kh + `<span class="t-p">: </span>` + go((v as Record<string, unknown>)[k], lookup(n, k), d + 1);
      }).join(`<span class="t-p">,</span>\n`) + `\n${end}<span class="t-p">}</span>`;
    }
    if (typeof v === "number") {
      const out = JSON.stringify(v), changed = n && n.k === "number" && n.raw !== out;
      if (changed) numbers++;
      return `<span class="t-num${changed ? " diff" : ""}">${out}</span>`;
    }
    if (typeof v === "string") return `<span class="t-str">${esc(JSON.stringify(v))}</span>`;
    return `<span class="${v === null ? "t-null" : "t-lit"}">${v}</span>`;
  }
  const html = go(value, tree, 0);
  let dupes = 0; const s = [tree];
  while (s.length) { const x = s.pop()!; if (x.kids) { if (x.k === "object") dupes += x.kids.length - new Set(x.kids.map(k => k.key)).size; for (const k of x.kids) s.push(k.node); } }
  return { html, numbers, moved, dupes };
}

function renderLab() {
  const text = src.value;
  let tree: Node;
  try { tree = parseJSON(text); }
  catch (err) {
    const e = err as ParseError;
    $("#out-ijson")!.innerHTML = `<span class="err-line">Línea ${e.line}, columna ${e.col}\n${esc(e.message)}</span>`;
    $("#v-ijson")!.innerHTML = `<span class="chip badc">JSON no válido</span>`;
    $("#out-generic")!.innerHTML = `<span class="err-line">SyntaxError</span>`;
    $("#v-generic")!.innerHTML = `<span class="chip">Sin línea ni columna útiles</span>`;
    return;
  }
  $("#out-ijson")!.innerHTML = format(tree, labIndent, true);
  $("#v-ijson")!.innerHTML = `<span class="chip goodc">✓ Números y orden conservados</span>`;
  const g = genericOutput(tree, JSON.parse(text));
  $("#out-generic")!.innerHTML = g.html;
  const chips: string[] = [];
  if (g.numbers) chips.push(`${g.numbers} ${g.numbers === 1 ? "número reescrito" : "números reescritos"}`);
  if (g.moved) chips.push(`${g.moved} ${g.moved === 1 ? "clave movida" : "claves movidas"}`);
  if (g.dupes) chips.push(`${g.dupes} ${g.dupes === 1 ? "clave duplicada perdida" : "claves duplicadas perdidas"}`);
  $("#v-generic")!.innerHTML = chips.length ? chips.map(c => `<span class="chip badc">✕ ${c}</span>`).join("") : `<span class="chip">Sin diferencias con este ejemplo</span>`;
}
let labTimer: ReturnType<typeof setTimeout>; src.addEventListener("input", () => { clearTimeout(labTimer); labTimer = setTimeout(renderLab, 150); });
for (const [id, ind] of [["#st-pretty", "  "], ["#st-compact", ""]])
  $(id)!.onclick = () => { labIndent = ind; $("#st-pretty")!.setAttribute("aria-pressed", String(ind !== "")); $("#st-compact")!.setAttribute("aria-pressed", String(ind === "")); renderLab(); };
renderLab();

/* ---------- atajos ---------- */
const KEYS: [string[], string][] = [[["⌘", "1"], "Ver como árbol"], [["⌘", "2"], "Ver como texto"], [["⌥", "⌘", "B"], "Embellecer"], [["⌥", "⌘", "M"], "Compactar"],
  [["⌘", "↩"], "Insertar debajo"], [["⇧", "⌘", "↩"], "Insertar hijo"], [["⌘", "D"], "Duplicar"], [["⌥", "⌘", "↑"], "Mover arriba"],
  [["⇧", "⌘", "C"], "Copiar ruta"], [["⇧", "⌘", "V"], "Pegar JSON como nodo"], [["⌘", "L"], "Ir a línea"], [["⇧", "⌘", "E"], "Exportar bonito"]];
$("#keys")!.innerHTML = KEYS.map(([caps, l]) => `<div class="key"><div class="caps">${caps.map(c => `<kbd class="cap">${c}</kbd>`).join("")}</div><span>${l}</span></div>`).join("");

/* ---------- tarjetas con foco de luz; botones magnéticos y contadores comunes ---------- */
$$(".card").forEach(c => c.addEventListener("pointermove", e => {
  const b = c.getBoundingClientRect();
  c.style.setProperty("--mx", e.clientX - b.left + "px"); c.style.setProperty("--my", e.clientY - b.top + "px");
}));
initMagnetic();
// Cifras como en la app: miles con espacio y decimales con coma (100 000 · 0,42)
const fmtNum = (v: number, el: HTMLElement) => {
  const dec = +(el.dataset.dec || 0);
  return v.toLocaleString('es-MX', { minimumFractionDigits: dec, maximumFractionDigits: dec }).replace(/,/g, ' ').replace(/\./g, ',');
};
initCounters('[data-count]', { duration: 1300, power: 3, threshold: .35, format: fmtNum });

/* ---------- barras: el valor final ya está a la vista; al entrar en pantalla se reanima ---------- */
if (!reduce) {
  const io = new IntersectionObserver(entries => entries.forEach(en => {
    if (!en.isIntersecting) return;
    io.unobserve(en.target);
    $$(".fill", en.target).forEach(f => { f.classList.remove("grow"); void f.offsetWidth; f.classList.add("grow"); });
  }), { threshold: .35 });
  document.querySelectorAll(".perf").forEach(el => io.observe(el));
}

/* ---------- campo de símbolos JSON en el fondo ---------- */
(() => {
  const cv = $<HTMLCanvasElement>("#field")!, ctx = cv.getContext("2d")!;
  const GLYPHS = ["{", "}", "[", "]", ":", ",", '""', "0", "1", "null", "true"];
  type Glyph = { x: number; y: number; z: number; g: string; c: number; r: number; vr: number };
  let W = 0, H = 0, dpr = 1, parts: Glyph[] = [], colors: string[] = [];
  const mouse = { x: -999, y: -999 };
  const readColors = () => {
    const cs = getComputedStyle(document.documentElement);
    colors = ["--k-object", "--k-array", "--k-string", "--k-number", "--k-bool", "--muted"].map(v => cs.getPropertyValue(v).trim());
  };
  const resize = () => {
    dpr = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round(Math.min(70, W * H / 22000));
    parts = Array.from({ length: n }, () => ({
      x: Math.random() * W, y: Math.random() * H, z: .3 + Math.random() * .9,
      g: GLYPHS[Math.random() * GLYPHS.length | 0], c: Math.random() * 6 | 0, r: Math.random() * Math.PI, vr: (Math.random() - .5) * .004
    }));
  };
  const draw = (_ = 0, k = 1) => {
    ctx.clearRect(0, 0, W, H);
    const sy = scrollY;
    for (const p of parts) {
      if (!reduce) { p.y -= .18 * p.z * k; p.r += p.vr * k; if (p.y < -40) { p.y = H + 40; p.x = Math.random() * W; } }
      const y = ((p.y - sy * .15 * p.z) % (H + 80) + H + 80) % (H + 80) - 40;
      const dx = p.x - mouse.x, dy = y - mouse.y, dist = Math.hypot(dx, dy);
      const near = Math.max(0, 1 - dist / 220);
      ctx.save();
      ctx.translate(p.x + (near ? dx / dist * near * 18 : 0), y + (near ? dy / dist * near * 18 : 0));
      ctx.rotate(p.r);
      ctx.globalAlpha = .08 + .1 * p.z + near * .5;
      ctx.fillStyle = colors[p.c];
      ctx.font = `${Math.round(12 + 16 * p.z)}px "JetBrains Mono", ui-monospace, monospace`;
      ctx.fillText(p.g, 0, 0);
      ctx.restore();
    }
  };
  readColors(); resize();
  if (reduce) draw(); else frameLoop(draw, { fps: 30 });   // fondo lento: 30 fps se ven igual
  addEventListener("resize", () => { resize(); if (reduce) draw(); });
  addEventListener("pointermove", e => { mouse.x = e.clientX; mouse.y = e.clientY; });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { readColors(); if (reduce) draw(); });
  new MutationObserver(() => { readColors(); if (reduce) draw(); }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
})();
