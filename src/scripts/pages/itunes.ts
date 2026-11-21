/* ==========================================================================
   iTunes.term — demo interactiva + efectos de la landing.
   La demo es un port en JS del renderizado de la app (Layout.swift, ArtistsView,
   LibraryView, PlayerView y Overlays): un buffer de celdas que se pinta como HTML.
   ========================================================================== */
import { $, $$ } from "../core/dom";
import { frameLoop } from "../core/loop";
import { countUp as count, plainCount } from "../core/counters";
import { initNav } from "../core/nav";
import { initGlyphs } from "../core/glyphs";
import { reduceMotion as REDUCED, sleep } from "../core/motion";
import { initReveal } from "../core/reveal";
import { initScrollProgress } from "../core/scroll";
import { initCursorGlow } from "../core/cursor";
import { initMagnetic, tilt } from "../core/pointer";
import { T, St, type Rect, type Style } from "../demos/itunes/theme";
import { Buffer, toHtml } from "../demos/itunes/buffer";
import { ARTISTS, LIBRARY, fmt } from "../demos/itunes/library";
import { BINDINGS, COMMANDS, FREQS, PRESETS, TAG_FIELDS } from "../demos/itunes/keys";

type LibRow = { type: "spacer" | "album" | "track" | "filler"; al: number; t?: number };
type ArtistRow = { letter?: string; artist?: number };
type Input = { text: string; cur: number };
type Field = Input & { key: string; label: string; original: string; mixed: boolean };
type Overlay = "search" | "command" | "seek" | "help" | "eq" | "form" | "roots" | null;
type Repeat = "off" | "all" | "one";
type Focus = "artists" | "library" | "player";
type Step = { key?: string; say?: string; wait: number; do?: () => void };


(() => {
  const params = new URLSearchParams(location.search);
  const SHOT = params.get("shot");

  const base = St(T.text), dimmed = St(T.dim), title = St(T.bright, T.background, true);
  const rule = St(T.separator), overlay = St(T.text, T.surface);

  const artistIndex = (name: string) => ARTISTS.findIndex((a) => a.name === name);
  const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

  const artistRows: ArtistRow[] = [];
  ARTISTS.forEach((a, i) => {
    const letter = fold(a.name)[0].toUpperCase();
    if (!artistRows.some((r) => r.letter === letter)) artistRows.push({ letter });
    artistRows.push({ artist: i });
  });

  /* ------------------------------------------------------------------------
     Layout (Layout.swift)
     ------------------------------------------------------------------------ */
  const W = 140, H = 44;
  const COVER = { w: 10, h: 5 };
  const BUTTONS = ["shuffle", "previous", "playPause", "next", "repeatMode"];

  function makeLayout(w: number, h: number) {
    const m = 2;
    const L = { w, h } as { w: number; h: number; header: Rect; headerRule: number; artists: Rect; library: Rect; artistsSearch: Rect; artistsList: Rect; libraryList: Rect; playerRule: number; cover: Rect; nowPlaying: Rect; buttons: Record<string, Rect>; progress: Rect };
    L.header = { x: m, y: 0, w: w - 2 * m, h: 1 };
    L.headerRule = 1;
    const playerTop = Math.max(2, h - 6), bodyH = Math.max(0, playerTop - 2);
    const aw = Math.min(40, Math.max(22, Math.floor(w * 30 / 100)));
    L.artists = { x: m, y: 2, w: aw, h: bodyH };
    const lx = m + aw + 3;
    L.library = { x: lx, y: 2, w: w - m - lx, h: bodyH };
    L.artistsSearch = { x: m, y: 3, w: aw, h: 1 };
    L.artistsList = { x: m, y: 4, w: aw, h: bodyH - 2 };
    L.libraryList = { x: lx, y: 4, w: w - m - lx, h: bodyH - 2 };
    L.playerRule = playerTop;
    L.cover = { x: m, y: playerTop + 1, w: COVER.w, h: COVER.h };
    const infoX = m + COVER.w + 2;
    L.nowPlaying = { x: infoX, y: playerTop + 1, w: w - m - infoX, h: 3 };
    const total = 5 * 5 + 4 * 2;
    let x = Math.max(infoX, Math.floor((w - total) / 2));
    L.buttons = {};
    for (const b of BUTTONS) { L.buttons[b] = { x, y: playerTop + 4, w: 5, h: 1 }; x += 7; }
    L.progress = { x: infoX, y: playerTop + 5, w: w - m - infoX, h: 1 };
    return L;
  }
  const L = makeLayout(W, H);
  const inRect = (r: Rect, x: number, y: number) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;

  /* ------------------------------------------------------------------------
     Estado
     ------------------------------------------------------------------------ */
  const silver = artistIndex("Silverstein"), insite = artistIndex("Insite");
  const S: {
    focus: Focus; artistCursor: number; artistOffset: number; shown: number; libCursor: number; libOffset: number;
    playing: { a: number; al: number; t: number } | null; isPlaying: boolean; elapsed: number;
    volume: number; muted: boolean; shuffle: boolean; repeat: Repeat;
    eqEnabled: boolean; eqPreset: string; eqGains: number[]; eqBand: number;
    overlay: Overlay; input: Input; searchMiss: boolean; searchBackup: number | null;
    form: { ids: string[]; focused: number; fields: Field[] } | null; marked: Set<string>; lyricsVisible: boolean; lyricsOffset: number;
    status: { text: string; error: boolean; until: number } | null; playerButton: string; helpOffset: number;
    roots: string[]; rootsCursor: number; indexing: { done: number; total: number } | null;
  } = {
    focus: "artists",
    artistCursor: artistRows.findIndex((r) => r.artist === insite),
    artistOffset: 0,
    shown: insite,
    libCursor: 0, libOffset: 0,
    playing: { a: silver, al: 0, t: 8 },
    isPlaying: true, elapsed: 51,
    volume: 1, muted: false, shuffle: false, repeat: "off",
    eqEnabled: true, eqPreset: "Rock", eqGains: PRESETS[1][1].slice(), eqBand: 0,
    overlay: null, input: { text: "", cur: 0 }, searchMiss: false, searchBackup: null,
    form: null, marked: new Set(), lyricsVisible: false, lyricsOffset: 0,
    status: null, playerButton: "playPause", helpOffset: 0,
    roots: ["~/Music", "/Volumes/Musica/FLAC"], rootsCursor: 0, indexing: null,
  };
  S.artistOffset = Math.max(0, S.artistCursor - 1);

  const curTrack = () => { const p = S.playing; return p ? { ...ARTISTS[p.a].albums[p.al].tracks[p.t], album: ARTISTS[p.a].albums[p.al], artist: ARTISTS[p.a] } : null; };
  const formatSummary = (codec: string) => codec === "FLAC" ? "FLAC · 44.1 kHz · 16 bit" : "MP3 · 44.1 kHz";
  const trackId = (a: number, al: number, t: number) => `${a}/${al}/${t}`;

  function libraryRows() {
    const rows: LibRow[] = [];
    ARTISTS[S.shown].albums.forEach((alb, al) => {
      if (al > 0) rows.push({ type: "spacer", al: -1 });
      rows.push({ type: "album", al });
      alb.tracks.forEach((_, t) => rows.push({ type: "track", al, t }));
      for (let n = 1 + alb.tracks.length; n < COVER.h; n++) rows.push({ type: "filler", al });
    });
    return rows;
  }
  const selectable = (r: LibRow | undefined) => r && (r.type === "album" || r.type === "track");

  function report(text: string, error = false, ms = 3200) { S.status = { text, error, until: performance.now() + ms }; }

  /* ------------------------------------------------------------------------
     Dibujo
     ------------------------------------------------------------------------ */
  function heading(focused: boolean) { return St(focused ? T.accent : T.dim, T.background, true); }

  function draw() {
    const buf = new Buffer(W, H);
    drawHeader(buf);
    drawArtists(buf);
    if (S.lyricsVisible) drawLyrics(buf); else drawLibrary(buf);
    drawPlayer(buf);
    const cursor = drawOverlays(buf);
    return { buf, cursor };
  }

  function drawHeader(buf: Buffer) {
    const r = L.header;
    let x = r.x;
    x += buf.text("ılıl ", x, r.y, r.w, St(T.accent, T.background, true));
    x += buf.text("iTunes", x, r.y, r.x + r.w - x, title);
    let text: string, style: Style;
    if (S.indexing) { text = `Indexando ${S.indexing.done}/${S.indexing.total}`; style = St(T.accent); }
    else if (S.status && S.status.until > performance.now()) { text = S.status.text; style = St(S.status.error ? T.error : T.accent); }
    else { text = "4280 canciones · 114 artistas"; style = dimmed; }
    const avail = r.x + r.w - x - 2, width = Math.min([...text].length, avail);
    buf.text(text, r.x + r.w - width, r.y, avail, style);
    buf.fill({ x: r.x, y: L.headerRule, w: r.w, h: 1 }, rule, "─");
  }

  function visibleStart(cursor: number, offset: number, count: number, height: number) {
    if (cursor < offset) offset = cursor;
    if (cursor >= offset + height) offset = cursor - height + 1;
    return Math.max(0, Math.min(offset, Math.max(0, count - height)));
  }

  function drawArtists(buf: Buffer) {
    const p = L.artists, focused = S.focus === "artists";
    buf.text("ARTISTAS", p.x, p.y, p.w, heading(focused));
    if (S.overlay !== "search") buf.text("/ Buscar artista", L.artistsSearch.x + 1, L.artistsSearch.y, p.w, St(T.track));
    const list = L.artistsList;
    S.artistOffset = visibleStart(S.artistCursor, S.artistOffset, artistRows.length, list.h);
    const playingArtist = S.playing ? S.playing.a : -1;
    for (let line = 0; line < list.h; line++) {
      const row = S.artistOffset + line, item = artistRows[row];
      if (!item) break;
      const y = list.y + line;
      if (item.letter) { buf.text(item.letter, list.x, y, list.w, title); continue; }
      let style = St(item.artist === playingArtist ? T.accent : T.dim);
      if (row === S.artistCursor) {
        style = St(T.bright, focused ? T.selection : T.surface);
        buf.fill({ x: list.x, y, w: list.w, h: 1 }, style);
      }
      buf.text(ARTISTS[item.artist!].name, list.x + 1, y, list.w - 2, style);
    }
  }

  function drawLibrary(buf: Buffer) {
    const p = L.library, focused = S.focus === "library";
    const artist = ARTISTS[S.shown];
    let t = "BIBLIOTECA · " + artist.name.toUpperCase();
    if (S.marked.size) t += ` · ${S.marked.size} marcadas`;
    buf.text(t, p.x, p.y, p.w, heading(focused));

    const rows = libraryRows();
    const full = L.libraryList, gutter = COVER.w + 2;
    const list = { x: full.x + gutter, y: full.y, w: full.w - gutter, h: full.h };
    const albumStart: Record<number, number> = {};
    rows.forEach((r, i) => { if (r.al !== undefined && albumStart[r.al] === undefined && r.type !== "spacer") albumStart[r.al] = i; });
    S.libOffset = visibleStart(S.libCursor, S.libOffset, rows.length, list.h);

    for (let line = 0; line < list.h; line++) {
      const row = S.libOffset + line, item = rows[row];
      if (!item) break;
      const y = list.y + line;
      if (item.al !== undefined && item.type !== "spacer") {
        const start = albumStart[item.al];
        if (row - start < COVER.h) coverRow(buf, artist.albums[item.al].cover, row - start, full.x, y);
      }
      const isCursor = row === S.libCursor;
      const bs = isCursor ? St(T.bright, focused ? T.selection : T.surface) : base;
      if (isCursor) buf.fill({ x: list.x, y, w: list.w, h: 1 }, bs);

      if (item.type === "spacer") buf.fill({ x: full.x, y, w: full.w, h: 1 }, rule, "─");
      else if (item.type === "album") {
        const alb = artist.albums[item.al];
        const header = [alb.title.toUpperCase(), String(alb.year), alb.codec].join(" · ");
        const minutes = Math.floor(alb.tracks.reduce((s, x) => s + x.dur, 0) / 60);
        const summary = `${alb.tracks.length} canciones · ${minutes} min`;
        const right = summary.length + 1;
        buf.text(header, list.x + 1, y, list.w - right - 3, St(isCursor ? T.bright : T.dim, bs.bg, true));
        buf.text(summary, list.x + list.w - right, y, right, St(T.dim, bs.bg));
      } else if (item.type === "track") {
        const tr = artist.albums[item.al].tracks[item.t!];
        const id = trackId(S.shown, item.al, item.t!);
        const playing = S.playing && S.playing.a === S.shown && S.playing.al === item.al && S.playing.t === item.t;
        const marked = S.marked.has(id);
        if (playing) buf.put("▶", list.x + 1, y, St(T.accent, bs.bg));
        else if (marked) buf.put("●", list.x + 1, y, St(T.marked, bs.bg));
        buf.text(String(tr.n).padStart(2, "0"), list.x + 3, y, 2, St(T.dim, bs.bg));
        const dur = fmt(tr.dur), right = dur.length + 1;
        const ts = { ...bs };
        if (playing) ts.fg = T.accent; else if (marked) ts.fg = T.marked;
        buf.text(tr.title, list.x + 6, y, list.w - 6 - right - 1, ts);
        buf.text(dur, list.x + list.w - right, y, right, St(T.dim, bs.bg));
      }
    }
  }

  const LYRICS = [
    "♪ Letra de demostración",
    "",
    "La letra se guarda dentro del propio archivo (tag LYRICS / USLT)",
    "y aparece aquí, en el panel principal, mientras suena la canción.",
    "",
    "Pulsa  L  para escribirla o pegarla en tu $EDITOR:",
    "vim, nano, Helix, VS Code… el que tengas configurado.",
    "",
    "Usa ↑ ↓ o la rueda del ratón para desplazarte",
    "y vuelve a pulsar  l  para regresar a la biblioteca.",
  ];
  function drawLyrics(buf: Buffer) {
    const p = L.library, tr = curTrack();
    buf.text("LETRA" + (tr ? " · " + tr.title.toUpperCase() : ""), p.x, p.y, p.w, heading(S.focus === "library"));
    const list = L.libraryList;
    LYRICS.slice(S.lyricsOffset, S.lyricsOffset + list.h).forEach((t, i) => {
      buf.text(t, list.x, list.y + i, list.w, i === 0 && S.lyricsOffset === 0 ? St(T.accent, T.background, true) : base);
    });
  }

  function coverRow(buf: Buffer, pixels: string[] | null | undefined, row: number, x: number, y: number) {
    if (!pixels) {
      buf.fill({ x, y, w: COVER.w, h: 1 }, overlay);
      if (row === Math.floor(COVER.h / 2)) buf.put("♪", x + COVER.w / 2, y, St(T.dim, T.surface));
      return;
    }
    for (let c = 0; c < COVER.w; c++) {
      buf.put("▀", x + c, y, { fg: pixels[row * 2 * COVER.w + c], bg: pixels[(row * 2 + 1) * COVER.w + c] });
    }
  }

  function drawPlayer(buf: Buffer) {
    buf.fill({ x: L.header.x, y: L.playerRule, w: L.header.w, h: 1 }, rule, "─");
    const tr = curTrack();
    for (let r = 0; r < COVER.h; r++) coverRow(buf, tr ? tr.album.cover : null, r, L.cover.x, L.cover.y + r);

    const r = L.nowPlaying;
    const vol = S.muted ? "Silencio" : `Vol ${Math.round(S.volume * 100)}%`;
    const eq = S.eqEnabled ? `EQ ${S.eqPreset}` : "EQ off";
    const side = Math.max(vol.length, eq.length), tw = r.w - side - 2;
    buf.text(vol, r.x + r.w - vol.length, r.y, side, dimmed);
    buf.text(eq, r.x + r.w - eq.length, r.y + 1, side, St(S.eqEnabled ? T.accent : T.dim));
    if (!tr) {
      buf.text("Nada en reproducción", r.x, r.y, tw, title);
      buf.text("Elige una canción y pulsa Enter", r.x, r.y + 1, tw, dimmed);
    } else {
      buf.text(tr.title, r.x, r.y, tw, title);
      buf.text(`${tr.artist.name} · ${tr.album.title} (${tr.album.year})`, r.x, r.y + 1, tw, base);
      buf.text(formatSummary(tr.album.codec), r.x, r.y + 2, tw, dimmed);
    }

    for (const b of BUTTONS) {
      const br = L.buttons[b];
      const sel = S.focus === "player" && S.playerButton === b;
      const s = St(T.text, sel ? T.selection : T.background);
      let label: string;
      if (b === "shuffle") { label = "⇄"; s.fg = S.shuffle ? T.accent : T.dim; }
      else if (b === "previous") label = "◀◀";
      else if (b === "playPause") { label = S.isPlaying ? "❚❚" : "▶"; s.fg = T.accent; s.b = true; }
      else if (b === "next") label = "▶▶";
      else { label = S.repeat === "one" ? "↻1" : "↻"; s.fg = S.repeat === "off" ? T.dim : T.accent; }
      buf.fill(br, s);
      buf.text(label, br.x + Math.floor((br.w - [...label].length) / 2), br.y, br.w, s);
    }

    const dur = tr ? tr.dur : 0, bar = barRect(dur);
    const cur = fmt(S.elapsed), tot = fmt(dur);
    buf.text(cur, bar.x - 1 - cur.length, L.progress.y, cur.length, dimmed);
    buf.text(tot, bar.x + bar.w + 1, L.progress.y, tot.length, dimmed);
    const filled = dur > 0 ? Math.round((S.elapsed / dur) * bar.w) : 0;
    buf.fill(bar, St(T.track), "━");
    buf.fill({ ...bar, w: Math.min(bar.w, filled) }, St(T.accent), "━");
  }
  function barRect(dur: number) { const label = fmt(dur).length + 1; return { x: L.progress.x + label, y: L.progress.y, w: Math.max(0, L.progress.w - 2 * label), h: 1 }; }

  /* ---------- overlays ---------- */
  function centered(w: number, h: number) { w = Math.min(w, W - 2); h = Math.min(h, H - 2); return { x: Math.floor((W - w) / 2), y: Math.floor((H - h) / 2), w, h }; }
  function frame(buf: Buffer, r: Rect, t: string, footer: string) {
    const border = St(T.accent, T.surface);
    buf.fill(r, overlay);
    for (let x = r.x; x < r.x + r.w; x++) { buf.put("─", x, r.y, border); buf.put("─", x, r.y + r.h - 1, border); }
    for (let y = r.y; y < r.y + r.h; y++) { buf.put("│", r.x, y, border); buf.put("│", r.x + r.w - 1, y, border); }
    buf.put("╭", r.x, r.y, border); buf.put("╮", r.x + r.w - 1, r.y, border);
    buf.put("╰", r.x, r.y + r.h - 1, border); buf.put("╯", r.x + r.w - 1, r.y + r.h - 1, border);
    buf.text(` ${t} `, r.x + 2, r.y, r.w - 4, St(T.bright, T.surface, true));
    buf.text(` ${footer} `, r.x + 2, r.y + r.h - 1, r.w - 4, St(T.dim, T.surface));
  }
  function drawField(buf: Buffer, prefix: string, r: Rect, style: Style) {
    buf.fill(r, style);
    buf.text(prefix, r.x + 1, r.y, r.w - 2, St(T.accent, style.bg, true));
    const x = r.x + 1 + [...prefix].length;
    const room = Math.max(1, r.x + r.w - x - 1), skip = Math.max(0, S.input.cur - room + 1);
    buf.text([...S.input.text].slice(skip).join(""), x, r.y, room, style);
    return { x: x + S.input.cur - skip, y: r.y };
  }

  function drawOverlays(buf: Buffer): { x: number; y: number } | null {
    switch (S.overlay) {
      case "search": return drawField(buf, "/ ", L.artistsSearch, St(S.searchMiss ? T.error : T.bright, T.selection));
      case "command": case "seek":
        return drawField(buf, S.overlay === "seek" ? "Ir a (m:ss): " : ":", { x: 0, y: H - 1, w: W, h: 1 }, St(T.bright, T.surface));
      case "help": drawHelp(buf); return null;
      case "eq": drawEq(buf); return null;
      case "form": return drawForm(buf);
      case "roots": drawRoots(buf); return null;
    }
    return null;
  }

  function helpLines() {
    const lines: [string, string, boolean][] = [];
    for (const [section, list] of BINDINGS) {
      if (lines.length) lines.push(["", "", false]);
      lines.push([section.toUpperCase(), "", true]);
      for (const [keys, help] of list) lines.push([keys.join(" "), help, false]);
    }
    lines.push(["", "", false], ["COMANDOS", "", true]);
    COMMANDS.forEach(([k, v]) => lines.push([k, v, false]));
    return lines;
  }
  function drawHelp(buf: Buffer) {
    const lines = helpLines(), cw = 46, kw = 14;
    const columns = Math.max(1, Math.min(3, Math.floor((W - 6) / cw)));
    const per = Math.ceil(lines.length / columns);
    const box = centered(columns * cw + 4, per + 3), visible = box.h - 3;
    const offset = Math.min(S.helpOffset, Math.max(0, per - visible));
    frame(buf, box, "AYUDA", per > visible ? "↑↓ desplazar · otra tecla cierra" : "cualquier tecla para cerrar");
    lines.forEach((l, i) => {
      const col = Math.floor(i / per), row = (i % per) - offset;
      if (row < 0 || row >= visible) return;
      const x = box.x + 2 + col * cw, y = box.y + 1 + row;
      if (l[2]) { buf.text(l[0], x, y, cw - 2, St(T.accent, T.surface, true)); return; }
      const k = l[0].length > kw ? l[0] + "  " : l[0];
      const used = buf.text(k, x, y, cw - 2, St(T.bright, T.surface));
      const tx = x + Math.max(kw + 1, used);
      buf.text(l[1], tx, y, x + cw - 2 - tx, overlay);
    });
  }

  function drawEq(buf: Buffer) {
    const bandW = 6, barRows = 13;
    const box = centered(FREQS.length * bandW + 8, barRows + 7);
    frame(buf, box, `ECUALIZADOR · ${S.eqPreset} · ${S.eqEnabled ? "ON" : "OFF"}`, "←→ banda  ↑↓ ±1 dB  p preset  b on/off  0 plano  Esc cerrar");
    const top = box.y + 2, zero = top + Math.floor(barRows / 2), ds = St(T.dim, T.surface);
    buf.text("+12", box.x + 1, top, 3, ds); buf.text("  0", box.x + 1, zero, 3, ds); buf.text("-12", box.x + 1, top + barRows - 1, 3, ds);
    FREQS.forEach((f, band) => {
      const x = box.x + 6 + band * bandW, selected = band === S.eqBand, gain = S.eqGains[band];
      const color = !S.eqEnabled ? T.dim : selected ? T.accent : T.text;
      const height = Math.round(gain / 2);
      for (let row = 0; row < barRows; row++) {
        const level = Math.floor(barRows / 2) - row;
        const lit = (height > 0 && level > 0 && level <= height) || (height < 0 && level < 0 && level >= height);
        const ch = lit ? "█" : level === 0 ? "─" : "·";
        buf.text(ch.repeat(3), x, top + row, 3, St(lit || level === 0 ? color : T.separator, T.surface));
      }
      const v = gain === 0 ? "0" : (gain > 0 ? "+" : "") + gain;
      buf.text(v, x + Math.floor((3 - v.length) / 2), top + barRows, 4, St(selected ? T.bright : T.dim, T.surface, selected));
      const label = f >= 1000 ? `${f / 1000}k` : String(f);
      buf.text(label, x + Math.floor((3 - label.length) / 2), top + barRows + 1, 4, St(selected ? T.accent : T.dim, T.surface, selected));
    });
  }

  function drawForm(buf: Buffer) {
    const f = S.form!, lw = 18;
    const box = centered(Math.min(W - 4, 76), f.fields.length + 4);
    frame(buf, box, `EDITAR TAGS · ${f.ids.length === 1 ? "1 pista" : f.ids.length + " pistas"}`, "Tab/↑↓ campo · Enter guardar · Esc cancelar");
    let cursor: { x: number; y: number } | null = null;
    const ix = box.x + 2 + lw + 1, iw = box.x + box.w - ix - 2;
    f.fields.forEach((fd, i) => {
      const y = box.y + 2 + i, focused = i === f.focused;
      buf.text(fd.label, box.x + 2, y, lw, St(focused ? T.accent : T.dim, T.surface, focused));
      const touched = fd.text !== fd.original;
      const fs = St(touched ? T.marked : T.bright, focused ? T.selection : T.background);
      buf.fill({ x: ix, y, w: iw, h: 1 }, fs);
      if (fd.mixed && !fd.text) buf.text("<varios>", ix + 1, y, iw - 2, St(T.dim, fs.bg));
      else {
        const skip = Math.max(0, fd.cur - (iw - 3));
        buf.text([...fd.text].slice(skip).join(""), ix + 1, y, iw - 2, fs);
        if (focused) cursor = { x: ix + 1 + fd.cur - skip, y };
      }
      if (focused && !cursor) cursor = { x: ix + 1, y };
    });
    return cursor;
  }

  function drawRoots(buf: Buffer) {
    const box = centered(Math.min(W - 4, 80), Math.max(S.roots.length, 1) + 4);
    frame(buf, box, "CARPETAS DE MÚSICA", "a agregar · d quitar · r reindexar · Esc cerrar");
    if (!S.roots.length) { buf.text("No hay carpetas. Pulsa a para agregar una.", box.x + 2, box.y + 2, box.w - 4, St(T.dim, T.surface)); return; }
    S.roots.forEach((root, i) => {
      const y = box.y + 2 + i, sel = i === S.rootsCursor;
      const s = St(sel ? T.bright : T.text, sel ? T.selection : T.surface);
      buf.fill({ x: box.x + 1, y, w: box.w - 2, h: 1 }, s);
      buf.text(root, box.x + 2, y, box.w - 4, s);
    });
  }

  /* ------------------------------------------------------------------------
     Buffer → HTML
     ------------------------------------------------------------------------ */
  const tui = $("#tui");
  const SOLO = new Set(["▀", "█", "❚", "▶", "◀", "⇄", "↻", "♪", "●", "…", "ı"]);
  let blinkOn = true;

  function render() {
    if (!tui) return;
    const { buf, cursor } = draw();
    tui.innerHTML = toHtml(buf, { solo: SOLO, cursor: blinkOn ? cursor : null });
  }

  /* ------------------------------------------------------------------------
     Acciones (AppController)
     ------------------------------------------------------------------------ */
  function play(a: number, al: number, t: number) {
    S.playing = { a, al, t }; S.elapsed = 0; S.isPlaying = true;
    pulseWindow();
  }
  function step(dir: number) {
    if (!S.playing) return;
    const alb = ARTISTS[S.playing.a].albums[S.playing.al];
    if (dir < 0 && S.elapsed > 3) { S.elapsed = 0; return; }
    let t = S.shuffle ? Math.floor(Math.random() * alb.tracks.length) : S.playing.t + dir;
    if (t >= alb.tracks.length) t = 0;
    if (t < 0) t = alb.tracks.length - 1;
    play(S.playing.a, S.playing.al, t);
  }
  function seekTo(s: number) { const tr = curTrack(); if (tr) S.elapsed = Math.max(0, Math.min(tr.dur - 1, s)); }
  function setVolume(v: number) { S.volume = Math.max(0, Math.min(1, Math.round(v * 100) / 100)); S.muted = false; }

  function moveArtist(delta: number) {
    let i = S.artistCursor;
    const dir = Math.sign(delta) || 1;
    for (let n = Math.abs(delta); n > 0;) {
      const j = i + dir;
      if (j < 0 || j >= artistRows.length) break;
      i = j;
      if (artistRows[i].artist !== undefined) n--;
    }
    if (artistRows[i].artist === undefined) i = S.artistCursor;
    selectArtistRow(i);
  }
  function selectArtistRow(i: number) {
    if (artistRows[i]?.artist === undefined) return;
    S.artistCursor = i;
    if (S.shown !== artistRows[i].artist) { S.shown = artistRows[i].artist!; S.libCursor = 0; S.libOffset = 0; }
  }
  function moveLib(delta: number) {
    const rows = libraryRows();
    let i = S.libCursor;
    const dir = Math.sign(delta) || 1;
    for (let n = Math.abs(delta); n > 0;) {
      const j = i + dir;
      if (j < 0 || j >= rows.length) break;
      i = j;
      if (selectable(rows[i])) n--;
    }
    if (selectable(rows[i])) S.libCursor = i;
  }
  function libSelectionIds() {
    const rows = libraryRows(), r = rows[S.libCursor];
    if (S.marked.size) return [...S.marked];
    if (!r) return [];
    if (r.type === "album") return ARTISTS[S.shown].albums[r.al].tracks.map((_, t) => trackId(S.shown, r.al, t));
    return [trackId(S.shown, r.al, r.t!)];
  }
  const trackById = (id: string) => { const [a, al, t] = id.split("/").map(Number); return { a, al, t, alb: ARTISTS[a].albums[al], tr: ARTISTS[a].albums[al].tracks[t] }; };

  function openForm() {
    const ids = S.focus === "library" ? libSelectionIds() : S.playing ? [trackId(S.playing.a, S.playing.al, S.playing.t)] : [];
    if (!ids.length) return report("Selecciona una canción, un álbum o un artista", true);
    const props = ids.map((id): Record<string, string> => {
      const { a, alb, tr } = trackById(id);
      return { TITLE: tr.title, ARTIST: ARTISTS[a].name, ALBUMARTIST: ARTISTS[a].name, ALBUM: alb.title, DATE: String(alb.year),
        TRACKNUMBER: String(tr.n), DISCNUMBER: "1", GENRE: alb.genre, COMPOSER: "", COMMENT: "" };
    });
    S.form = {
      ids, focused: 0,
      fields: TAG_FIELDS.map(([key, label]) => {
        const values = props.map((p) => p[key]);
        const shared = values.every((v) => v === values[0]) ? values[0] : null;
        return { key, label, text: shared ?? "", original: shared ?? "", mixed: shared === null, cur: (shared ?? "").length };
      }),
    };
    S.overlay = "form";
  }
  function saveForm() {
    const changed = S.form!.fields.filter((f) => f.text !== f.original);
    S.overlay = null;
    if (!changed.length) return report("Sin cambios");
    for (const id of S.form!.ids) {
      const { alb, tr } = trackById(id);
      for (const f of changed) {
        if (f.key === "TITLE" && f.text) tr.title = f.text;
        if (f.key === "ALBUM" && f.text) alb.title = f.text;
        if (f.key === "DATE" && +f.text) alb.year = +f.text;
        if (f.key === "GENRE") alb.genre = f.text;
      }
    }
    report("Guardando tags…", false, 600);
    setTimeout(() => { report("Tags guardados"); render(); }, 600);
  }

  function reindex() {
    let done = 0;
    S.indexing = { done, total: 4280 };
    const id = setInterval(() => {
      done = Math.min(4280, done + 173 + Math.floor(Math.random() * 120));
      S.indexing!.done = done;
      if (done >= 4280) { clearInterval(id); S.indexing = null; report("Biblioteca al día: 4280 archivos · 12 leídos · 0 quitados (1 s)"); }
      render();
    }, 60);
  }

  function runCommand(line: string): void {
    const trimmed = line.trim(), name = (trimmed.split(" ")[0] || "").toLowerCase();
    const arg = trimmed.slice(name.length).trim().replace(/^(["'])(.*)\1$/, "$2");
    switch (name) {
      case "add": case "agregar":
        if (!arg) return report("Falta el argumento: ruta", true);
        S.roots.push(arg); report(`Carpeta agregada: ${arg}`); return reindex();
      case "rm": case "remove": case "quitar":
        if (!arg) { S.overlay = "roots"; return; }
        S.roots = S.roots.filter((r) => r !== arg); return report(`Carpeta quitada: ${arg}`);
      case "paths": case "rutas": S.overlay = "roots"; return;
      case "reindex": case "reindexar": case "reindex!": case "reindexar!": return reindex();
      case "eq": {
        const a = arg.toLowerCase();
        if (!a) { S.overlay = "eq"; return; }
        if (a === "on" || a === "off") { S.eqEnabled = a === "on"; return; }
        if (a.startsWith("save ")) { S.eqPreset = arg.slice(5).trim(); return report(`Preset guardado: ${S.eqPreset}`); }
        const p = PRESETS.find(([n]) => fold(n) === fold(arg));
        if (!p) return report(`No existe el preset ${arg}. Disponibles: ${PRESETS.map(([n]) => n).join(", ")}`, true);
        S.eqPreset = p[0]; S.eqGains = p[1].slice(); S.eqEnabled = true; return report(`EQ ${p[0]}`);
      }
      case "seek": case "ir": {
        const s = parseTime(arg);
        if (s === null) return report("Valor inválido para tiempo: usa 1:42", true);
        return seekTo(s);
      }
      case "vol": case "volumen": {
        const v = parseFloat(arg);
        if (isNaN(v) || v < 0 || v > 100) return report("Valor inválido para volumen: 0–100", true);
        return setVolume(v / 100);
      }
      case "cover": case "caratula": case "carátula":
        if (!arg) return report("Falta el argumento: imagen o remove", true);
        return report(["remove", "quitar"].includes(arg.toLowerCase()) ? "Carátula eliminada" : "Carátula actualizada");
      case "q": case "quit": case "salir": return report("Demo: aquí se cerraría la app 👋");
      case "help": case "ayuda": case "h": S.overlay = "help"; S.helpOffset = 0; return;
      default: return report(`Comando desconocido: ${name} (usa :help)`, true);
    }
  }
  function parseTime(text: string) {
    const parts = text.split(":").map((p) => Number(p.trim()));
    if (!text || parts.length > 3 || parts.some((p) => isNaN(p) || p < 0)) return null;
    return parts.reduce((a, p) => a * 60 + p, 0);
  }

  function searchUpdate() {
    const q = fold(S.input.text);
    if (!q) { S.searchMiss = false; return; }
    let i = artistRows.findIndex((r) => r.artist !== undefined && fold(ARTISTS[r.artist].name).startsWith(q));
    if (i < 0) i = artistRows.findIndex((r) => r.artist !== undefined && fold(ARTISTS[r.artist].name).includes(q));
    S.searchMiss = i < 0;
    if (i >= 0) selectArtistRow(i);
  }

  function editInput(inp: Input, key: string) {
    const chars = [...inp.text];
    if (key === "Backspace") { if (inp.cur > 0) { chars.splice(inp.cur - 1, 1); inp.cur--; } }
    else if (key === "Delete") chars.splice(inp.cur, 1);
    else if (key === "left") inp.cur = Math.max(0, inp.cur - 1);
    else if (key === "right") inp.cur = Math.min(chars.length, inp.cur + 1);
    else if (key === "Home") inp.cur = 0;
    else if (key === "End") inp.cur = chars.length;
    else if ([...key].length === 1) { chars.splice(inp.cur, 0, key); inp.cur++; }
    else return false;
    inp.text = chars.join("");
    return true;
  }

  function pressButton(b: string) {
    S.playerButton = b;
    if (b === "playPause") S.isPlaying = !S.isPlaying;
    else if (b === "previous") step(-1);
    else if (b === "next") step(1);
    else if (b === "shuffle") S.shuffle = !S.shuffle;
    else S.repeat = ({ off: "all", all: "one", one: "off" } as const)[S.repeat];
  }

  const FOCUS: Focus[] = ["artists", "library", "player"];

  /** Una tecla, como la entrega InputDecoder: "up", "Enter", "Tab", "BackTab", "e", " ", … */
  function handleKey(key: string): boolean {
    switch (S.overlay) {
      case "search":
        if (key === "Escape") { S.overlay = null; if (S.searchBackup !== null) selectArtistRow(S.searchBackup); }
        else if (key === "Enter") { S.overlay = null; if (!S.searchMiss) S.focus = "library"; }
        else if (editInput(S.input, key)) searchUpdate();
        return true;
      case "command": case "seek":
        if (key === "Escape") S.overlay = null;
        else if (key === "Enter") {
          const kind = S.overlay, text = S.input.text;
          S.overlay = null;
          if (kind === "seek") { const s = parseTime(text); if (s === null) report("Tiempo inválido: usa 1:42", true); else seekTo(s); }
          else runCommand(text);
        } else editInput(S.input, key);
        return true;
      case "help":
        if (key === "up") S.helpOffset = Math.max(0, S.helpOffset - 1);
        else if (key === "down") S.helpOffset++;
        else S.overlay = null;
        return true;
      case "eq": {
        const custom = () => { S.eqPreset = "Personalizado"; };
        if (key === "Escape" || key === "=" || key === "q") S.overlay = null;
        else if (key === "left") S.eqBand = (S.eqBand + FREQS.length - 1) % FREQS.length;
        else if (key === "right") S.eqBand = (S.eqBand + 1) % FREQS.length;
        else if (key === "up" || key === "k") { S.eqGains[S.eqBand] = Math.min(12, S.eqGains[S.eqBand] + 1); custom(); }
        else if (key === "down" || key === "j") { S.eqGains[S.eqBand] = Math.max(-12, S.eqGains[S.eqBand] - 1); custom(); }
        else if (key === "p") { const i = (PRESETS.findIndex(([n]) => n === S.eqPreset) + 1) % PRESETS.length; S.eqPreset = PRESETS[i][0]; S.eqGains = PRESETS[i][1].slice(); }
        else if (key === "b") S.eqEnabled = !S.eqEnabled;
        else if (key === "0") { S.eqPreset = "Plano"; S.eqGains = PRESETS[0][1].slice(); }
        return true;
      }
      case "form": {
        const f = S.form!, fd = f.fields[f.focused];
        if (key === "Escape") S.overlay = null;
        else if (key === "Enter") saveForm();
        else if (key === "Tab" || key === "down") f.focused = (f.focused + 1) % f.fields.length;
        else if (key === "BackTab" || key === "up") f.focused = (f.focused + f.fields.length - 1) % f.fields.length;
        else editInput(fd, key);
        return true;
      }
      case "roots":
        if (key === "Escape") S.overlay = null;
        else if (key === "up") S.rootsCursor = Math.max(0, S.rootsCursor - 1);
        else if (key === "down") S.rootsCursor = Math.min(S.roots.length - 1, S.rootsCursor + 1);
        else if (key === "d" && S.roots.length) { report(`Carpeta quitada: ${S.roots[S.rootsCursor]}`); S.roots.splice(S.rootsCursor, 1); S.rootsCursor = Math.max(0, Math.min(S.rootsCursor, S.roots.length - 1)); }
        else if (key === "r") { S.overlay = null; reindex(); }
        else if (key === "a") { S.overlay = "command"; S.input = { text: "add ", cur: 4 }; }
        return true;
    }

    const tr = curTrack();
    switch (key) {
      case "Tab": S.focus = FOCUS[(FOCUS.indexOf(S.focus) + 1) % 3]; break;
      case "BackTab": S.focus = FOCUS[(FOCUS.indexOf(S.focus) + 2) % 3]; break;
      case "left":
        if (S.focus === "player") S.playerButton = BUTTONS[Math.max(0, BUTTONS.indexOf(S.playerButton) - 1)];
        else S.focus = "artists";
        break;
      case "right":
        if (S.focus === "player") S.playerButton = BUTTONS[Math.min(4, BUTTONS.indexOf(S.playerButton) + 1)];
        else S.focus = "library";
        break;
      case "up": case "k": case "down": case "j": {
        const d = key === "up" || key === "k" ? -1 : 1;
        if (S.focus === "artists") moveArtist(d);
        else if (S.focus === "library") { if (S.lyricsVisible) S.lyricsOffset = Math.max(0, Math.min(LYRICS.length - 1, S.lyricsOffset + d)); else moveLib(d); }
        else setVolume(S.volume - d * .05);
        break;
      }
      case "PageUp": case "PageDown": {
        const d = (key === "PageUp" ? -1 : 1) * (L.artistsList.h - 1);
        if (S.focus === "artists") moveArtist(d); else moveLib(d);
        break;
      }
      case "Home": if (S.focus === "artists") moveArtist(-999); else moveLib(-999); break;
      case "End": if (S.focus === "artists") moveArtist(999); else moveLib(999); break;
      case "Enter":
        if (S.focus === "artists") S.focus = "library";
        else if (S.focus === "library") {
          const r = libraryRows()[S.libCursor];
          if (r) play(S.shown, r.al, r.type === "track" ? r.t! : 0);
        } else pressButton(S.playerButton);
        break;
      case "/": S.overlay = "search"; S.input = { text: "", cur: 0 }; S.searchMiss = false; S.searchBackup = S.artistCursor; S.focus = "artists"; break;
      case " ": case "F8": S.isPlaying = !S.isPlaying; pulseWindow(); break;
      case "n": case "F9": step(1); break;
      case "p": case "F7": step(-1); break;
      case ",": seekTo(S.elapsed - 5); break;
      case ".": seekTo(S.elapsed + 5); break;
      case "<": seekTo(S.elapsed - 30); break;
      case ">": seekTo(S.elapsed + 30); break;
      case "t": S.overlay = "seek"; S.input = { text: "", cur: 0 }; break;
      case "+": setVolume(S.volume + .05); break;
      case "-": setVolume(S.volume - .05); break;
      case "m": S.muted = !S.muted; break;
      case "s": S.shuffle = !S.shuffle; report(S.shuffle ? "Aleatorio activado" : "Aleatorio desactivado"); break;
      case "r": S.repeat = ({ off: "all", all: "one", one: "off" } as const)[S.repeat]; report({ off: "Repetir: no", all: "Repetir: todo", one: "Repetir: una" }[S.repeat]); break;
      case "=": S.overlay = "eq"; break;
      case "x": {
        const ids = (() => { const r = libraryRows()[S.libCursor]; if (!r) return []; return r.type === "album" ? ARTISTS[S.shown].albums[r.al].tracks.map((_, t) => trackId(S.shown, r.al, t)) : [trackId(S.shown, r.al, r.t!)]; })();
        const all = ids.every((id) => S.marked.has(id));
        ids.forEach((id) => { if (all) S.marked.delete(id); else S.marked.add(id); });
        S.focus = "library";
        break;
      }
      case "ShiftUp": case "ShiftDown": {
        S.focus = "library";
        const r = libraryRows()[S.libCursor];
        if (r && r.type === "track") S.marked.add(trackId(S.shown, r.al, r.t!));
        moveLib(key === "ShiftUp" ? -1 : 1);
        const r2 = libraryRows()[S.libCursor];
        if (r2 && r2.type === "track") S.marked.add(trackId(S.shown, r2.al, r2.t!));
        break;
      }
      case "Escape": S.marked.clear(); break;
      case "e": openForm(); break;
      case "E": report("Demo: abriría todos los tags en $EDITOR"); break;
      case "l": S.lyricsVisible = !S.lyricsVisible; S.lyricsOffset = 0; break;
      case "L": report("Demo: abriría la letra en $EDITOR"); break;
      case ":": S.overlay = "command"; S.input = { text: "", cur: 0 }; break;
      case "?": S.overlay = "help"; S.helpOffset = 0; break;
      case "q": case "Ctrl+C": report("Demo: aquí se cerraría la app 👋"); break;
      default:
        if (/^[0-9]$/.test(key) && tr) { seekTo(tr.dur * Number(key) / 10); break; }
        return false;
    }
    return true;
  }

  /* ------------------------------------------------------------------------
     Entrada: teclado y ratón
     ------------------------------------------------------------------------ */
  const win = $("#window");
  const keyhud = $("#keyhud");
  const caption = $("#caption");
  const KEYMAP: Record<string, string> = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" };
  const KEYLABEL: Record<string, string> = { " ": "Espacio", up: "↑", down: "↓", left: "←", right: "→", Enter: "⏎ Enter", Tab: "⇥ Tab", BackTab: "⇧⇥", Escape: "Esc", Backspace: "⌫", ShiftUp: "⇧↑", ShiftDown: "⇧↓" };

  function showKey(key: string) {
    if (!keyhud) return;
    const k = document.createElement("kbd");
    k.textContent = KEYLABEL[key] ?? key;
    keyhud.appendChild(k);
    while (keyhud.children.length > 4) keyhud.firstChild!.remove();
    setTimeout(() => k.remove(), 1400);
  }
  function pulseWindow() {
    if (!win || REDUCED) return;
    win.animate([{ transform: "scale(1)" }, { transform: "scale(1.006)" }, { transform: "scale(1)" }], { duration: 260, easing: "ease-out" });
  }

  function normalize(e: KeyboardEvent) {
    if (e.metaKey || e.altKey) return null;
    if (e.ctrlKey) return e.key.toLowerCase() === "c" ? "Ctrl+C" : null;
    if (e.key === "Tab") return e.shiftKey ? "BackTab" : "Tab";
    if (e.shiftKey && e.key === "ArrowUp") return "ShiftUp";
    if (e.shiftKey && e.key === "ArrowDown") return "ShiftDown";
    return KEYMAP[e.key] ?? (e.key.length === 1 || /^(Enter|Escape|Backspace|Delete|Home|End|PageUp|PageDown|F7|F8|F9)$/.test(e.key) ? e.key : null);
  }

  if (tui && !SHOT) {
    tui.addEventListener("keydown", (e) => {
      const key = normalize(e);
      if (!key) return;
      stopScene();
      if (handleKey(key)) { e.preventDefault(); showKey(key); blinkOn = true; render(); }
    });
    tui.addEventListener("focus", () => win!.classList.add("focused"));
    tui.addEventListener("blur", () => win!.classList.remove("focused"));
    const badge = $("#focus-badge")!;
    badge.addEventListener("click", () => tui.focus());
    tui.addEventListener("focus", () => { badge.textContent = "teclado activo · ? ayuda"; });
    tui.addEventListener("blur", () => { badge.textContent = "clic para usar el teclado"; });

    const cellAt = (e: MouseEvent) => {
      const row = tui.querySelector(".r");
      if (!row) return null;
      const rr = row.getBoundingClientRect();
      const cw = rr.width / W, ch = rr.height;
      return { x: Math.floor((e.clientX - rr.left) / cw), y: Math.floor((e.clientY - rr.top) / ch) };
    };
    let lastClick = 0;
    tui.addEventListener("mousedown", (e) => {
      const c = cellAt(e);
      if (!c) return;
      stopScene();
      const dbl = performance.now() - lastClick < 350;
      lastClick = performance.now();
      if (S.overlay === "help") { S.overlay = null; return render(); }
      if (S.overlay) return;
      if (inRect(L.artistsList, c.x, c.y)) {
        S.focus = "artists";
        selectArtistRow(S.artistOffset + c.y - L.artistsList.y);
      } else if (inRect(L.libraryList, c.x, c.y) && !S.lyricsVisible) {
        S.focus = "library";
        const i = S.libOffset + c.y - L.libraryList.y, rows = libraryRows();
        if (selectable(rows[i])) { S.libCursor = i; if (dbl) handleKey("Enter"); }
      } else if (inRect(L.artistsSearch, c.x, c.y)) {
        handleKey("/");
      } else {
        const b = BUTTONS.find((b) => inRect(L.buttons[b], c.x, c.y));
        const tr = curTrack();
        if (b) { pressButton(b); showKey(b === "playPause" ? (S.isPlaying ? "▶ clic" : "❚❚ clic") : "clic"); pulseWindow(); }
        else if (tr && c.y === L.progress.y) {
          const bar = barRect(tr.dur);
          if (c.x >= bar.x && c.x < bar.x + bar.w) seekTo(((c.x - bar.x) / bar.w) * tr.dur);
        }
      }
      render();
    });
    tui.addEventListener("wheel", (e) => {
      if (document.activeElement !== tui) return;
      const c = cellAt(e);
      if (!c) return;
      e.preventDefault();
      const d = e.deltaY > 0 ? 3 : -3;
      if (inRect(L.artists, c.x, c.y)) { S.artistOffset = Math.max(0, Math.min(artistRows.length - L.artistsList.h, S.artistOffset + d)); S.artistCursor = Math.max(S.artistOffset, Math.min(S.artistCursor, S.artistOffset + L.artistsList.h - 1)); while (artistRows[S.artistCursor].artist === undefined) S.artistCursor++; selectArtistRow(S.artistCursor); }
      else if (inRect(L.library, c.x, c.y)) S.lyricsVisible ? (S.lyricsOffset = Math.max(0, Math.min(LYRICS.length - 1, S.lyricsOffset + Math.sign(d)))) : moveLib(d);
      render();
    }, { passive: false });
  }

  /* ------------------------------------------------------------------------
     Tamaño de la terminal
     ------------------------------------------------------------------------ */
  function fit() {
    if (!tui) return;
    const box = tui.parentElement!.clientWidth - (SHOT ? 0 : 20);
    const cw = Math.max(5.4, Math.min(SHOT ? 14 : 9.6, box / W));
    tui.style.setProperty("--cw", cw.toFixed(3) + "px");
  }
  addEventListener("resize", fit);

  /* ------------------------------------------------------------------------
     Reloj de reproducción
     ------------------------------------------------------------------------ */
  let last = performance.now();
  if (!SHOT) {
    setInterval(() => {
      const now = performance.now(), dt = (now - last) / 1000;
      last = now;
      blinkOn = !blinkOn;
      const tr = curTrack();
      if (S.isPlaying && tr) {
        S.elapsed += dt;
        if (S.elapsed >= tr.dur) {
          if (S.repeat === "one") S.elapsed = 0; else step(1);
        }
      }
      render();
    }, 500);
  }

  /* ------------------------------------------------------------------------
     Escenas guiadas
     ------------------------------------------------------------------------ */
  let sceneTimers: ReturnType<typeof setTimeout>[] = [], sceneActive: string | null = null;
  function stopScene() {
    sceneTimers.forEach(clearTimeout); sceneTimers = [];
    if (sceneActive) { $$(".scene").forEach((b) => b.classList.remove("active")); sceneActive = null; }
    caption?.classList.remove("show");
  }
  function say(text: string) { if (!caption) return; caption.textContent = text; caption.classList.add("show"); }
  const typeKeys = (s: string): Step[] => [...s].map((c) => ({ key: c, wait: 110 }));
  const SCENES: Record<string, Step[]> = {
    play: [
      { say: "La canción está sonando…", wait: 1400 },
      { key: " ", say: "Espacio → pausa (el botón cambia a ▶)", wait: 1800 },
      { key: " ", say: "Espacio otra vez → play (❚❚)", wait: 1600 },
      { key: "Tab", wait: 350 }, { key: "Tab", say: "Tab hasta el reproductor: los botones se pueden pulsar", wait: 1200 },
      { key: "Enter", say: "Enter sobre ❚❚ → pausa", wait: 1500 },
      { key: "Enter", say: "Enter otra vez → play", wait: 1300 },
      { key: "n", say: "n → siguiente canción", wait: 1500 },
      { key: "p", say: "p → anterior", wait: 1300 },
      { key: "5", say: "5 → salta al 50 % de la canción", wait: 1500 },
      { key: "s", say: "s → aleatorio", wait: 1200 },
      { key: "s", wait: 600 },
    ],
    edit: [
      { do: () => { S.focus = "library"; S.libCursor = 2; }, say: "Selecciona una canción en la biblioteca…", wait: 1400 },
      { key: "e", say: "e → abre el formulario de tags", wait: 1600 },
      ...Array.from({ length: 11 }, () => ({ key: "Backspace", wait: 45 })),
      { say: "Escribe el nuevo título: el campo cambia a ámbar", wait: 200 },
      ...typeKeys("Missing You (2024)"),
      { key: "Tab", wait: 300 }, { key: "Tab", wait: 300 }, { key: "Tab", wait: 300 }, { key: "Tab", say: "Tab para ir al siguiente campo", wait: 900 },
      ...Array.from({ length: 4 }, () => ({ key: "Backspace", wait: 60 })),
      ...typeKeys("2024"),
      { say: "Enter → guarda solo los campos que cambiaste", wait: 1100 },
      { key: "Enter", wait: 2200 },
    ],
    eq: [
      { key: "=", say: "= → ecualizador de 10 bandas", wait: 1500 },
      { key: "right", wait: 300 }, { key: "right", wait: 300 }, { key: "right", say: "← → elige la banda", wait: 800 },
      { key: "up", wait: 200 }, { key: "up", wait: 200 }, { key: "up", wait: 200 }, { key: "up", say: "↑ ↓ ±1 dB (pasa a «Personalizado»)", wait: 1300 },
      { key: "p", say: "p → recorre los presets", wait: 1000 }, { key: "p", wait: 1000 }, { key: "p", wait: 1000 }, { key: "p", wait: 1000 },
      { key: "b", say: "b → apaga / enciende el EQ", wait: 1200 }, { key: "b", wait: 900 },
      { do: () => { S.eqPreset = "Rock"; S.eqGains = PRESETS[1][1].slice(); }, wait: 600 },
      { key: "Escape", say: "Esc → cerrar", wait: 900 },
    ],
    search: [
      { key: "/", say: "/ → buscar artista", wait: 1000 },
      ...typeKeys("sil"),
      { say: "Salta al artista mientras escribes", wait: 1300 },
      { key: "Enter", say: "Enter → abre su biblioteca", wait: 1500 },
      { key: "down", wait: 250 }, { key: "down", wait: 250 }, { key: "down", wait: 600 },
      { key: "Enter", say: "Enter → reproduce", wait: 1800 },
      { key: "/", wait: 600 }, ...typeKeys("zzz"), { say: "Si no hay coincidencias se pinta en rojo", wait: 1600 },
      { key: "Escape", wait: 300 }, { key: "/", wait: 300 }, ...typeKeys("ins"), { key: "Enter", wait: 800 },
    ],
    lyrics: [
      { key: "l", say: "l → muestra la letra en el panel principal", wait: 2600 },
      { key: "L", say: "L → la edita en tu $EDITOR", wait: 2000 },
      { key: "l", say: "l otra vez → vuelve a la biblioteca", wait: 1500 },
    ],
    help: [
      { key: "?", say: "? → ayuda con todos los atajos", wait: 3500 },
      { key: "down", wait: 400 }, { key: "down", wait: 900 },
      { key: "q", say: "Cualquier tecla para cerrar", wait: 1000 },
    ],
    command: [
      { key: ":", say: ": → línea de comandos (en español también)", wait: 900 },
      ...typeKeys("eq jazz"), { key: "Enter", say: "El preset cambia al instante", wait: 1600 },
      { key: ":", wait: 500 }, ...typeKeys("vol 80"), { key: "Enter", say: "Volumen al 80 %", wait: 1500 },
      { key: ":", wait: 500 }, ...typeKeys("seek 3:30"), { key: "Enter", say: "Ir a un minuto exacto", wait: 1500 },
      { key: ":", wait: 500 }, ...typeKeys("reindex"), { key: "Enter", say: "Reindexado incremental", wait: 2200 },
      { key: ":", wait: 400 }, ...typeKeys("eq rock"), { key: "Enter", wait: 800 },
      { key: ":", wait: 400 }, ...typeKeys("vol 100"), { key: "Enter", wait: 800 },
    ],
  };
  function runScene(name: string) {
    stopScene();
    sceneActive = name;
    document.querySelector(`.scene[data-scene="${name}"]`)?.classList.add("active");
    S.overlay = null; S.lyricsVisible = false;
    if (!S.isPlaying) S.isPlaying = true;
    render();
    let t = 300;
    for (const s of SCENES[name]) {
      sceneTimers.push(setTimeout(() => {
        if (s.do) s.do();
        if (s.say) say(s.say);
        if (s.key) { handleKey(s.key); showKey(s.key); }
        render();
      }, t));
      t += s.wait;
    }
    sceneTimers.push(setTimeout(() => { caption?.classList.remove("show"); document.querySelector(`.scene[data-scene="${name}"]`)?.classList.remove("active"); sceneActive = null; }, t + 400));
  }
  $$(".scene").forEach((b) => b.addEventListener("click", () => runScene(b.dataset.scene!)));

  /* ------------------------------------------------------------------------
     Modo captura: ?shot=editar|eq|pausa|ayuda|buscar|letra
     ------------------------------------------------------------------------ */
  if (SHOT) {
    document.body.classList.add("shot-mode");
    const shots: Record<string, () => void> = {
      biblioteca: () => {},
      pausa: () => { S.isPlaying = false; S.focus = "player"; S.elapsed = 131; },
      editar: () => {
        S.focus = "library"; S.libCursor = 2; openForm();
        const f = S.form!.fields[0]; f.text = "Missing You (2024)"; f.cur = f.text.length;
        const y = S.form!.fields[4]; y.text = "2024"; y.cur = 4; S.form!.focused = 4;
      },
      eq: () => { S.overlay = "eq"; S.eqBand = 3; },
      ayuda: () => { S.overlay = "help"; },
      buscar: () => { S.overlay = "search"; S.input = { text: "sil", cur: 3 }; searchUpdate(); S.libCursor = 3; },
      letra: () => { S.lyricsVisible = true; S.focus = "library"; },
    };
    (shots[SHOT] || (() => {}))();
    blinkOn = true;
  }

  fit();
  render();

  /* ========================================================================
     Efectos de la página
     ======================================================================== */
  if (SHOT) return;

  // Cursor glow + barra de progreso (la nav es la común: core/nav)
  initNav();
  initGlyphs();
  initCursorGlow();
  initScrollProgress($(".scroll-progress"));
  // La ventana de la terminal entra con una ligera inclinación 3D.
  if (win && !REDUCED) {
    const onScroll = () => {
      const r = win.getBoundingClientRect(), p = Math.max(0, Math.min(1, (innerHeight - r.top) / (innerHeight * .7)));
      win.style.transform = p < 1 ? `rotateX(${(1 - p) * 18}deg) scale(${.94 + p * .06})` : "";
    };
    addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  // Reveal al hacer scroll (con escalonado por grupo)
  const countUp = (el: HTMLElement) => count(el, { duration: 1400, power: 3, format: plainCount });
  initReveal(".reveal", {
    group: true, stagger: 70, maxIndex: 6, delayVar: "--d",
    onEnter: (el) => {
      const n = $("[data-count]", el) || (el.dataset.count !== undefined ? el : null);
      if (n) countUp(n);
    },
  });

  // Texto que se escribe solo en el hero
  const typed = $("#typed")!;
  const lines = ["itunes ~/Music", ":eq rock", ":cover portada.jpg", ":add /Volumes/FLAC", "itunes"];
  (async function typeLoop() {
    for (let i = 0; ; i = (i + 1) % lines.length) {
      for (const c of lines[i]) { typed.textContent += c; await sleep(70 + Math.random() * 60); }
      await sleep(1600);
      while (typed.textContent) { typed.textContent = typed.textContent.slice(0, -1); await sleep(28); }
      await sleep(300);
    }
  })();

  // Botones magnéticos
  initMagnetic(".magnetic", { fx: .18, fy: .3 });

  // Tarjetas con tilt 3D y brillo que sigue al cursor
  $$(".tilt").forEach((card) => tilt(card, { deg: 10, extra: "translateY(-4px)" }));
  $$(".format-chips span").forEach((s, i) => s.style.setProperty("--i", String(i)));

  // Carátula pixelada animada en la tarjeta
  const pc = $("#pixel-cover");
  if (pc) {
    const covers = ARTISTS.filter((a) => LIBRARY[a.name]).flatMap((a) => a.albums.map((al) => al.cover));
    pc.innerHTML = "<i></i>".repeat(100);
    const cells = [...pc.children] as HTMLElement[];
    let ci = 0;
    const paint = () => { covers[ci]!.forEach((c, i) => { cells[i].style.background = c; }); ci = (ci + 1) % covers.length; };
    paint(); setInterval(paint, 2200);
  }

  // Atajos generados desde la misma tabla que la ayuda de la app
  const kg = $("#keys-grid");
  if (kg) {
    kg.innerHTML = BINDINGS.map(([section, list]) => `
      <div class="keys-group reveal in">
        <h3>${section.toUpperCase()}</h3>
        ${list.map(([keys, help]) => `<div class="keys-row"><span class="caps">${keys.map((k) => `<kbd>${k}</kbd>`).join("")}</span><span>${help}</span></div>`).join("")}
      </div>`).join("");
    $("#commands-list")!.innerHTML = COMMANDS.map(([c, d]) => `<div><code>${c.replace(/</g, "&lt;")}</code>${d}</div>`).join("");
  }

  // Lightbox de capturas
  const lb = $("#lightbox")!, lbImg = $<HTMLImageElement>("img", lb)!;
  $$(".shot").forEach((s) => s.addEventListener("click", () => {
    lbImg.src = s.dataset.full!;
    lbImg.alt = $<HTMLImageElement>("img", s)!.alt;
    lb.hidden = false;
  }));
  lb.addEventListener("click", () => { lb.hidden = true; });
  addEventListener("keydown", (e) => { if (e.key === "Escape") lb.hidden = true; });

  if (REDUCED) return;

  // Fondo: constelación de partículas que reacciona al cursor
  const bg = $<HTMLCanvasElement>("#bg-canvas")!, ctx = bg.getContext("2d")!;
  let pts: { x: number; y: number; vx: number; vy: number; r: number }[] = [];
  const mouse = { x: -999, y: -999 };
  function resizeBg() {
    const dpr = Math.min(2, devicePixelRatio || 1);
    bg.width = innerWidth * dpr; bg.height = innerHeight * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round(Math.min(90, innerWidth * innerHeight / 16000));
    pts = Array.from({ length: n }, () => ({ x: Math.random() * innerWidth, y: Math.random() * innerHeight, vx: (Math.random() - .5) * .3, vy: (Math.random() - .5) * .3, r: Math.random() * 1.6 + .4 }));
  }
  addEventListener("resize", resizeBg); resizeBg();
  addEventListener("pointermove", (e) => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
  function drawBg(_: number, k: number) {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of pts) {
      p.x += p.vx * k; p.y += p.vy * k;
      if (p.x < 0 || p.x > innerWidth) p.vx *= -1;
      if (p.y < 0 || p.y > innerHeight) p.vy *= -1;
      const dx = p.x - mouse.x, dy = p.y - mouse.y, d = Math.hypot(dx, dy);
      if (d < 140) { p.x += dx / d * .8 * k; p.y += dy / d * .8 * k; }
      ctx.fillStyle = "rgba(122,162,247,.55)";
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    }
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
      const a = pts[i], b = pts[j], d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d < 120) { ctx.strokeStyle = `rgba(122,162,247,${(1 - d / 120) * .18})`; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
    }
  }
  frameLoop(drawBg, { fps: 30 });   // fondo lento: 30 fps se ven igual

  // Visualizador del hero: late más fuerte cuando la demo está reproduciendo
  const viz = $<HTMLCanvasElement>("#viz")!, vctx = viz.getContext("2d")!;
  let energy = 1;
  function resizeViz() { const dpr = Math.min(2, devicePixelRatio || 1); viz.width = viz.clientWidth * dpr; viz.height = viz.clientHeight * dpr; vctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
  addEventListener("resize", resizeViz); resizeViz();
  function drawViz(t: number, k: number) {
    const w = viz.clientWidth, h = viz.clientHeight;
    vctx.clearRect(0, 0, w, h);
    energy += ((S.isPlaying ? 1 : .15) - energy) * (1 - Math.pow(.95, k));
    const n = Math.max(32, Math.floor(w / 18)), bw = w / n;
    const g = vctx.createLinearGradient(0, h, 0, 0);
    g.addColorStop(0, "#7aa2f7"); g.addColorStop(.5, "#bb9af7"); g.addColorStop(1, "#f7768e");
    vctx.fillStyle = g;
    for (let i = 0; i < n; i++) {
      const v = (Math.sin(t / 380 + i * .45) + Math.sin(t / 230 + i * 1.3) * .6 + Math.sin(t / 620 - i * .2) * .8 + 2.4) / 4.8;
      const bh = Math.max(4, v * h * .9 * energy * (1 - Math.abs(i / n - .5) * .6));
      vctx.beginPath();
      vctx.roundRect(i * bw + 3, h - bh, bw - 6, bh, 4);
      vctx.fill();
    }
  }
  frameLoop(drawViz, { visible: viz });
})();
