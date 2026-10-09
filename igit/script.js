/* iGit · landing. Efectos y la demo de la terminal, sin dependencias. */
(() => {
  "use strict";
  document.documentElement.classList.remove("no-js");
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(pointer: fine)").matches;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ───────────── Aparición al hacer scroll ───────────── */
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add("in");
      io.unobserve(e.target);
    }
  }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });
  $$(".reveal").forEach((el, i) => {
    el.style.transitionDelay = `${Math.min((i % 6) * 70, 350)}ms`;
    io.observe(el);
  });

  // Anillos, barras y contadores
  const statsIO = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add("in");
      $$("[data-count]", e.target).forEach(countUp);
      statsIO.unobserve(e.target);
    }
  }, { threshold: 0.4 });
  $$(".stat, .race").forEach((el) => statsIO.observe(el));

  function countUp(el) {
    const target = Number(el.dataset.count);
    const start = performance.now();
    const dur = reduced ? 1 : 1600;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 4);
      el.textContent = Math.round(target * eased);
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /* ───────────── Barra de progreso y navegación ───────────── */
  const nav = $(".nav");
  const onScroll = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    document.documentElement.style.setProperty("--scroll", max > 0 ? (scrollY / max).toFixed(4) : 0);
    nav.classList.toggle("scrolled", scrollY > 20);
  };
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ───────────── Foco de luz que sigue al ratón ───────────── */
  if (finePointer && !reduced) {
    addEventListener("pointermove", (e) => {
      document.documentElement.style.setProperty("--mx", `${e.clientX}px`);
      document.documentElement.style.setProperty("--my", `${e.clientY}px`);
    }, { passive: true });
  }

  /* ───────────── Inclinación 3D y brillo de tarjetas ───────────── */
  $$(".tilt").forEach((el) => {
    const isTerm = el.classList.contains("term");
    const strength = isTerm ? 4 : 7;
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      el.style.setProperty("--cx", `${x * 100}%`);
      el.style.setProperty("--cy", `${y * 100}%`);
      if (!finePointer || reduced) return;
      el.style.transform = `rotateX(${(0.5 - y) * strength}deg) rotateY(${(x - 0.5) * strength}deg) translateZ(0)`;
    });
    el.addEventListener("pointerleave", () => {
      el.style.transition = "transform .6s cubic-bezier(.2,.8,.2,1)";
      el.style.transform = "";
      setTimeout(() => (el.style.transition = ""), 600);
    });
  });

  /* ───────────── Botones magnéticos ───────────── */
  if (finePointer && !reduced) {
    $$(".magnetic").forEach((btn) => {
      btn.addEventListener("pointermove", (e) => {
        const r = btn.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        btn.style.transform = `translate(${x * 0.18}px, ${y * 0.3}px)`;
      });
      btn.addEventListener("pointerleave", () => (btn.style.transform = ""));
    });
  }

  /* ───────────── Texto que se «descifra» ───────────── */
  function scramble(el) {
    const final = el.dataset.text;
    const glyphs = "!<>-_/[]{}=+*^?#%&";
    const start = performance.now();
    const dur = 1100;
    const run = () => {
      const t = (performance.now() - start) / dur;
      if (t >= 1) { el.textContent = final; return; }
      el.textContent = [...final].map((ch, i) => {
        if (ch === " " || ch === ",") return ch;
        return t > i / final.length ? ch : glyphs[(Math.random() * glyphs.length) | 0];
      }).join("");
      setTimeout(run, 40);
    };
    run();
  }
  if (!reduced) $$(".scramble").forEach((el) => setTimeout(() => scramble(el), 250));

  /* ───────────── Cielo de partículas ───────────── */
  const sky = $("#stars");
  const sctx = sky.getContext("2d");
  let stars = [];
  let parallax = { x: 0, y: 0 };
  function sizeSky() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    sky.width = innerWidth * dpr;
    sky.height = innerHeight * dpr;
    sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.round((innerWidth * innerHeight) / 9000);
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * innerWidth,
      y: Math.random() * innerHeight,
      z: Math.random() * 0.8 + 0.2,
      t: Math.random() * Math.PI * 2,
    }));
  }
  sizeSky();
  addEventListener("resize", sizeSky);
  if (finePointer) addEventListener("pointermove", (e) => {
    parallax.x = (e.clientX / innerWidth - 0.5) * 30;
    parallax.y = (e.clientY / innerHeight - 0.5) * 30;
  }, { passive: true });
  function drawSky(time) {
    sctx.clearRect(0, 0, innerWidth, innerHeight);
    const drift = reduced ? 0 : time * 0.006;
    for (const s of stars) {
      const x = (s.x + parallax.x * s.z + drift * s.z) % innerWidth;
      const y = (s.y + parallax.y * s.z - scrollY * 0.05 * s.z + innerHeight * 10) % innerHeight;
      const a = 0.25 + Math.sin(time * 0.0015 + s.t) * 0.25 * s.z + s.z * 0.3;
      sctx.fillStyle = `rgba(200, 200, 255, ${a})`;
      sctx.fillRect(x, y, s.z * 1.6, s.z * 1.6);
    }
    if (!reduced) requestAnimationFrame(drawSky);
  }
  requestAnimationFrame(drawSky);

  /* ───────────── Aviso flotante ───────────── */
  const toast = $("#toast");
  let toastTimer;
  function showToast(html) {
    toast.innerHTML = html;
    toast.classList.add("on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("on"), 3800);
  }

  /* ───────────── Confeti ───────────── */
  const confetti = $("#confetti");
  const cctx = confetti.getContext("2d");
  let pieces = [];
  let confettiRunning = false;
  function burst(x, y) {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    confetti.width = innerWidth * dpr;
    confetti.height = innerHeight * dpr;
    cctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const colors = ["#7c5cff", "#3fa9ff", "#2ee6a6", "#ff5ca8", "#ffb547", "#ffffff"];
    for (let i = 0; i < 160; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() * 9;
      pieces.push({
        x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 6,
        w: 6 + Math.random() * 6, h: 3 + Math.random() * 5, r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.4,
        c: colors[(Math.random() * colors.length) | 0], life: 0,
      });
    }
    if (!confettiRunning) { confettiRunning = true; requestAnimationFrame(stepConfetti); }
  }
  function stepConfetti() {
    cctx.clearRect(0, 0, innerWidth, innerHeight);
    pieces = pieces.filter((p) => p.life < 160 && p.y < innerHeight + 40);
    for (const p of pieces) {
      p.life++; p.vy += 0.25; p.vx *= 0.985; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      cctx.save();
      cctx.globalAlpha = Math.max(0, 1 - p.life / 160);
      cctx.translate(p.x, p.y); cctx.rotate(p.r);
      cctx.fillStyle = p.c; cctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      cctx.restore();
    }
    if (pieces.length) requestAnimationFrame(stepConfetti);
    else { confettiRunning = false; cctx.clearRect(0, 0, innerWidth, innerHeight); }
  }

  /* ───────────── Descargar ───────────── */
  // Instalador de la última versión (servido junto a esta página).
  const PKG = "downloads/iGit-1.0.0.pkg";
  $$("[data-download]").forEach((btn) => btn.addEventListener("click", (e) => {
    e.preventDefault();
    const r = btn.getBoundingClientRect();
    if (!reduced) burst(r.left + r.width / 2, r.top + r.height / 2);
    const a = document.createElement("a");
    a.href = PKG; a.setAttribute("download", "");
    document.body.appendChild(a); a.click(); a.remove();
    showToast("✨ <b>¡Gracias!</b> Tu descarga de iGit 1.0.0 ha comenzado.");
  }));

  /* ───────────── Teclado interactivo ───────────── */
  const keyChip = $("#keyChip");
  const keyInfo = $("#keyInfo");
  const keyOut = $(".key-output");
  const keyboardSection = $("#keys");
  function pressKey(btn) {
    if (!btn) return;
    btn.classList.add("down");
    setTimeout(() => btn.classList.remove("down"), 160);
    keyChip.textContent = btn.dataset.key;
    keyInfo.textContent = btn.dataset.info;
    keyOut.classList.remove("flash");
    void keyOut.offsetWidth;
    keyOut.classList.add("flash");
  }
  $$(".key").forEach((btn) => btn.addEventListener("click", () => pressKey(btn)));
  addEventListener("keydown", (e) => {
    if (e.metaKey || e.altKey || e.target.closest?.("input, textarea")) return;
    const r = keyboardSection.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;
    let name = e.key === " " ? "Space" : e.key;
    if (e.ctrlKey) name = "⌃" + e.key.toUpperCase();
    const btn = $$(".key").find((k) => k.dataset.key === name);
    if (!btn) return;
    e.preventDefault();
    pressKey(btn);
  });

  /* ───────────── Demo: la pantalla de iGit ───────────── */
  const tui = $("#tui");
  const keycast = $("#keycast");
  const term = $(".term");
  const COLS = 96;

  function fitTerminal() {
    const w = tui.clientWidth || term.clientWidth;
    const fs = Math.max(5, Math.min(14.5, w / (COLS * 0.602)));
    tui.style.setProperty("--fs", `${fs}px`);
  }
  addEventListener("resize", fitTerminal);

  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const swift = (code) => esc(code)
    .replace(/(&quot;|"[^"]*")/g, '<span class="str">$1</span>')
    .replace(/\b(package|static|let|var|func|return|guard|else|init|struct|enum|try|await|if|for|in|case)\b/g, '<span class="kw">$1</span>')
    .replace(/\b([a-z][A-Za-z]+)(?=\()/g, '<span class="fn">$1</span>');
  const middle = (s, n) => s.length <= n ? s : s.slice(0, Math.ceil((n - 1) * 0.35)) + "…" + s.slice(s.length - Math.floor((n - 1) * 0.65));

  const FILES = [
    { path: "Sources/iGitUI/Keymap/Keymap.swift", kind: "◼", cls: "c-mod", stats: "+4 −1", diff: [
      ["hunk", "", "", "@@ -12,6 +12,9 @@ package struct Keymap {"],
      ["ctx", 12, 12, "    package static let standard = Keymap()"],
      ["del", 13, "", "    static let bindings: [Binding] = defaults"],
      ["add", "", 13, "    let bindings: [Binding]"],
      ["add", "", 14, "    package init(overrides: [AppCommand: [KeyChord]]) {"],
      ["add", "", 15, "        print(\"debug keymap\")"],
      ["add", "", 16, "        bindings = Self.merge(defaults, overrides)"],
      ["ctx", 14, 17, "    }"],
    ] },
    { path: "Sources/iGitCore/Rules/KeymapRules.swift", kind: "✚", cls: "c-add", stats: "+6 −0", diff: [
      ["hunk", "", "", "@@ -0,0 +1,6 @@"],
      ["add", "", 1, "/// Valida el keymap.json del usuario."],
      ["add", "", 2, "package enum KeymapRules {"],
      ["add", "", 3, "    static func resolve(_ file: KeymapFile?) -> Resolved {"],
      ["add", "", 4, "        guard let file else { return Resolved() }"],
      ["add", "", 5, "        return Resolved(parsing: file)"],
      ["add", "", 6, "    }"],
    ] },
    { path: "Sources/iGitApp/Subcommands/CLI.swift", kind: "◼", cls: "c-mod", stats: "+2 −1", diff: [
      ["hunk", "", "", "@@ -28,7 +28,8 @@ enum CLI {"],
      ["ctx", 28, 28, "        case \"doctor\":"],
      ["del", 29, "", "            return await doctor()"],
      ["add", "", 29, "            return await doctor(environment)"],
      ["add", "", 30, "        case \"keymap\": return keymap()"],
      ["ctx", 30, 31, "        default:"],
    ] },
    { path: "docs/decisions/ADR-0023.md", kind: "✚", cls: "c-add", stats: "+3 −0", diff: [
      ["hunk", "", "", "@@ -0,0 +1,3 @@"],
      ["add", "", 1, "# ADR-0023 · Keymap configurable"],
      ["add", "", 2, ""],
      ["add", "", 3, "**Estado:** aceptada"],
    ] },
    { path: "Notas.md", kind: "✚", cls: "c-new", stats: "+1 −0", diff: [
      ["hunk", "", "", "@@ -0,0 +1 @@"],
      ["add", "", 1, "- probar la galería en Terminal.app"],
    ] },
  ];

  const SPIN = "⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏";
  let S;
  function freshState() {
    return {
      files: FILES.map((f, i) => ({ ...f, included: i !== 4, off: new Set() })),
      sel: 0, focus: "files", cursor: -1,
      summary: "", typing: false, ready: false, press: false,
      sync: { icon: "↑", title: "Push origin", sub: "1 commit por subir" }, busy: false, spin: 0,
      toast: "", hint: "files",
    };
  }

  function box(f) {
    if (!f.included) return "☐";
    const changes = f.diff.filter((l) => l[0] === "add" || l[0] === "del").length;
    return f.off.size === 0 ? "☑" : f.off.size < changes ? "◪" : "☐";
  }

  function render() {
    const f = S.files[S.sel];
    const included = S.files.filter((x) => x.included).length;
    const all = included === S.files.length ? "☑" : included === 0 ? "☐" : "◪";
    const rows = S.files.map((x, i) => {
      const cls = ["row", "file", i === S.sel ? "sel" : "", i === S.sel && S.focus === "files" ? "focus" : ""].join(" ");
      return `<div class="${cls}"><span><span class="check">${box(x)}</span> ${esc(middle(x.path, 23))}</span><span class="k ${x.cls}">${x.kind}</span></div>`;
    }).join("");
    const diff = f ? f.diff.map((l, i) => {
      const [kind, o, n, text] = l;
      if (kind === "hunk") return `<div class="dl hunk"><span class="check">${box(f)}</span> ${esc(text)}</div>`;
      const off = f.off.has(i) || !f.included;
      const mark = kind === "ctx" ? " " : off ? "☐" : "☑";
      const sign = kind === "add" ? "+" : kind === "del" ? "−" : " ";
      const cls = ["dl", kind === "ctx" ? "" : kind, off && kind !== "ctx" ? "off" : "", S.focus === "diff" && S.cursor === i ? "cursor" : ""].join(" ");
      return `<div class="${cls}"><span class="check">${mark}</span> <span class="n">${String(o).padStart(2)} ${String(n).padStart(2)}</span><span class="t">${sign} ${swift(text)}</span></div>`;
    }).join("") : "";
    const btnLabel = included ? `Commit ${included} archivo${included === 1 ? "" : "s"} a main` : "Commit a main";
    const hints = S.focus === "summary"
      ? "<span><b>⌃S</b> commit · <b>Tab</b> panel · <b>Esc</b> volver</span>"
      : S.focus === "diff"
        ? "<span><b>↑↓</b> mover · <b>Space</b> incluir · <b>x</b> hunk · <b>Esc</b> volver · <b>⌃P</b> comandos</span>"
        : "<span><b>Tab</b> panel · <b>Space</b> incluir · <b>c</b> mensaje · <b>s</b> sync · <b>/</b> filtrar · <b>⌃P</b> comandos · <b>?</b> ayuda</span>";
    tui.innerHTML = `
      <div class="tb">
        <div class="seg"><small>Repositorio actual</small>◇ iGit<span style="float:right">▾</span></div>
        <div class="seg"><small>Rama actual</small>⎇ main<span style="float:right">▾</span></div>
        <div class="seg ${S.busy ? "busy" : ""}"><small>${S.busy ? "Subiendo a origin…" : S.sync.sub}</small>${S.busy ? `<span class="spin">${SPIN[S.spin % SPIN.length]}</span> Push origin` : `${S.sync.icon} ${S.sync.title}`}</div>
      </div>
      <div class="tabs"><span class="on">Cambios ${S.files.length}</span><span>Historial</span></div>
      <div class="main">
        <div class="left">
          <div class="row hdr">⌕ Filtrar…</div>
          <div class="row hdr"><span class="check">${all}</span> ${S.files.length} archivos cambiados</div>
          <div class="files">${rows}</div>
          <div class="commit">
            <div class="summary ${S.typing ? "typing" : ""}">${S.summary ? esc(middle(S.summary, 26)) + (S.typing ? '<span class="caret">▍</span>' : "") : "◔ Resumen (obligatorio)"}</div>
            <div class="desc">Descripción</div>
            <div class="commit-btn ${S.ready ? "ready" : ""} ${S.press ? "press" : ""}">${btnLabel}</div>
          </div>
        </div>
        <div class="right">
          <div class="diffhead"><span>${f ? esc(f.path) : ""}</span><span class="st"><span class="c-add">${f ? f.stats.split(" ")[0] : ""}</span> <span class="c-del">${f ? f.stats.split(" ")[1] : ""}</span></span></div>
          <div class="diff">${diff}</div>
        </div>
      </div>
      <div class="hints">${hints}<span>main · ${S.files.length} cambios</span></div>
      <div class="ttoast ${S.toast ? "on" : ""}">${S.toast}</div>`.replace(/>\s*\n\s*</g, "><").trim();
  }

  function cast(key, label) {
    const el = document.createElement("span");
    el.innerHTML = `${esc(key)}${label ? `<em>${esc(label)}</em>` : ""}`;
    keycast.appendChild(el);
    setTimeout(() => el.remove(), 1400);
    while (keycast.children.length > 3) keycast.firstChild.remove();
  }

  // La demo solo corre mientras se ve (0 % de CPU fuera de pantalla, como iGit).
  let visible = true;
  new IntersectionObserver(([e]) => (visible = e.isIntersecting), { threshold: 0.05 }).observe(term);
  const wait = async (ms) => {
    await sleep(reduced ? ms * 1.5 : ms);
    while (!visible || document.hidden) await sleep(250);
  };
  const key = async (k, label, fn, ms = 650) => {
    cast(k, label);
    fn && fn();
    render();
    await wait(ms);
  };

  async function demo() {
    for (;;) {
      S = freshState();
      fitTerminal();
      render();
      await wait(1400);
      await key("↓", "", () => (S.sel = 1));
      await key("↓", "", () => (S.sel = 2));
      await key("↓", "", () => (S.sel = 3), 500);
      await key("Space", "excluir", () => (S.files[3].included = false), 900);
      await key("Home", "", () => (S.sel = 0), 700);
      await key("⏎", "al diff", () => { S.focus = "diff"; S.cursor = 1; }, 500);
      for (const c of [2, 3, 4, 5]) await key("↓", "", () => (S.cursor = c), 280);
      await key("Space", "quitar línea", () => S.files[0].off.add(5), 1000);
      await key("c", "mensaje", () => { S.focus = "summary"; S.typing = true; }, 400);
      const msg = "Atajos configurables con keymap.json";
      for (const ch of msg) {
        S.summary += ch;
        S.ready = true;
        render();
        await wait(38 + Math.random() * 40);
      }
      await wait(500);
      await key("⌃S", "commit", () => (S.press = true), 220);
      S.press = false; S.typing = false; S.focus = "files";
      // Lo incluido se va; quedan la línea que no entró, el ADR excluido y Notas.md
      const kept = S.files.filter((x, i) => !x.included || x.off.size > 0 || i === 4);
      S.files = kept.map((x) => x.path.endsWith("Keymap.swift")
        ? { ...x, included: true, off: new Set(), stats: "+1 −0", diff: [["hunk", "", "", "@@ -15,0 +15,1 @@"], ["add", "", 15, "        print(\"debug keymap\")"]] }
        : x);
      S.sel = 0; S.summary = ""; S.ready = false;
      S.sync = { icon: "↑", title: "Push origin", sub: "2 commits por subir" };
      S.toast = "✓ Commit: «Atajos configurables con keymap.json»";
      render();
      await wait(2200);
      S.toast = "";
      await key("s", "sincronizar", () => (S.busy = true), 120);
      for (let i = 0; i < 16; i++) { S.spin++; render(); await sleep(90); }
      S.busy = false;
      S.sync = { icon: "↻", title: "Fetch origin", sub: "hace un momento" };
      S.toast = "✓ Push hecho · GitHub CI ●";
      render();
      await wait(2600);
      S.toast = "";
      render();
      await wait(1200);
      tui.style.transition = "opacity .5s";
      tui.style.opacity = "0";
      await sleep(550);
      tui.style.opacity = "1";
    }
  }
  demo();
})();
