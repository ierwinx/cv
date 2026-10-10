/* ==========================================================================
   iTunes.term — demo interactiva + efectos de la landing.
   La demo es un port en JS del renderizado de la app (Layout.swift, ArtistsView,
   LibraryView, PlayerView y Overlays): un buffer de celdas que se pinta como HTML.
   ========================================================================== */
(() => {
  "use strict";

  const params = new URLSearchParams(location.search);
  const SHOT = params.get("shot");
  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ------------------------------------------------------------------------
     Tema (Theme.swift)
     ------------------------------------------------------------------------ */
  const T = {
    background: "#14161C", surface: "#1C1F27", selection: "#2D3750", separator: "#2A2E37",
    text: "#C6CAD3", bright: "#FFFFFF", dim: "#878D99", accent: "#7AA2F7",
    marked: "#E0AF68", error: "#F7768E", track: "#3B4050",
  };
  const St = (fg, bg = T.background, b = false) => ({ fg, bg, b });
  const base = St(T.text), dimmed = St(T.dim), title = St(T.bright, T.background, true);
  const rule = St(T.separator), overlay = St(T.text, T.surface);

  /* ------------------------------------------------------------------------
     Atajos y comandos (KeyBindings.swift) — la ayuda y la sección de atajos salen de aquí
     ------------------------------------------------------------------------ */
  const BINDINGS = [
    ["Navegación", [
      [["Tab"], "Siguiente panel"], [["Shift+Tab"], "Panel anterior"],
      [["←"], "Panel izquierdo · botón ant."], [["→"], "Panel derecho · botón sig."],
      [["↑", "k"], "Subir (Reproductor: vol +)"], [["↓", "j"], "Bajar (Reproductor: vol −)"],
      [["RePág"], "Página arriba"], [["AvPág"], "Página abajo"],
      [["Inicio"], "Ir al principio"], [["Fin"], "Ir al final"],
      [["Enter"], "Abrir · reproducir · pulsar"], [["/"], "Buscar artista"],
    ]],
    ["Reproducción", [
      [["Espacio", "F8"], "Play / pausa"], [["n", "F9"], "Siguiente"], [["p", "F7"], "Anterior (o reiniciar)"],
      [[","], "Retroceder 5 s"], [["."], "Avanzar 5 s"], [["<"], "Retroceder 30 s"], [[">"], "Avanzar 30 s"],
      [["0–9"], "Saltar al 0 %–90 %"], [["t"], "Ir a minuto (1:42)"],
      [["+"], "Subir volumen"], [["-"], "Bajar volumen"], [["m"], "Silenciar"],
      [["s"], "Aleatorio"], [["r"], "Repetir: no → todo → una"], [["="], "Ecualizador"],
    ]],
    ["Edición", [
      [["x"], "Marcar pista / álbum"], [["Shift+↑"], "Extender selección arriba"],
      [["Shift+↓"], "Extender selección abajo"], [["Esc"], "Limpiar selección"],
      [["e"], "Editar tags (formulario)"], [["E"], "Todos los tags en $EDITOR"],
      [["l"], "Ver letra"], [["L"], "Editar letra en $EDITOR"],
    ]],
    ["General", [
      [[":"], "Comandos (:help)"], [["?"], "Esta ayuda"], [["q", "Ctrl+C"], "Salir"],
    ]],
  ];
  const COMMANDS = [
    [":add <ruta>", "Agregar carpeta y reindexar"], [":rm <ruta>", "Quitar carpeta y reindexar"],
    [":paths", "Ver / quitar carpetas"], [":reindex[!]", "Reindexar (! relee todo)"],
    [":eq [preset|on|off]", "Ecualizador"], [":eq save <nombre>", "Guardar preset propio"],
    [":seek 1:42", "Ir a minuto"], [":vol 80", "Volumen"],
    [":cover <imagen>", "Poner carátula a la selección"], [":cover remove", "Quitar carátula"], [":q", "Salir"],
  ];

  /* ------------------------------------------------------------------------
     Ecualizador (Equalizer.swift)
     ------------------------------------------------------------------------ */
  const FREQS = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
  const PRESETS = [
    ["Plano", [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]], ["Rock", [5, 4, 3, 1, -1, -1, 1, 3, 4, 5]],
    ["Pop", [-1, 0, 2, 4, 5, 4, 2, 0, -1, -1]], ["Jazz", [4, 3, 1, 2, -1, -1, 0, 1, 3, 4]],
    ["Clásica", [5, 4, 3, 2, -1, -1, 0, 2, 3, 4]], ["Electrónica", [5, 4, 1, 0, -2, 2, 1, 1, 4, 5]],
    ["Más graves", [6, 5, 4, 2, 1, 0, 0, 0, 0, 0]], ["Voces", [-2, -3, -3, 1, 4, 4, 3, 1, 0, -2]],
    ["Acústica", [4, 4, 3, 1, 2, 1, 3, 3, 3, 2]],
  ];
  const TAG_FIELDS = [
    ["TITLE", "Título"], ["ARTIST", "Artista"], ["ALBUMARTIST", "Artista del álbum"], ["ALBUM", "Álbum"],
    ["DATE", "Año"], ["TRACKNUMBER", "Pista"], ["DISCNUMBER", "Disco"], ["GENRE", "Género"],
    ["COMPOSER", "Compositor"], ["COMMENT", "Comentario"],
  ];

  /* ------------------------------------------------------------------------
     Biblioteca de ejemplo
     ------------------------------------------------------------------------ */
  const sec = (t) => { const [m, s] = t.split(":").map(Number); return m * 60 + s; };
  const album = (title, year, codec, genre, palette, tracks) => ({
    title, year, codec, genre, palette,
    tracks: tracks.map(([t, d], i) => ({ n: i + 1, title: t, dur: sec(d) })),
  });

  const LIBRARY = {
    "Insite": [
      album("Insite", 2003, "MP3", "Rock", ["#f4f4f4", "#e8e6e6", "#c9c4c4", "#d9a0a0", "#ffffff"], [
        ["Breathe (Crispy)", "3:23"], ["Missing You", "3:00"], ["Since You Left", "4:27"],
        ["Through My Eyes", "4:08"], ["Forever", "4:52"], ["Stay", "3:56"]]),
      album("Otra Historia EP", 2004, "FLAC", "Rock", ["#f2f2f2", "#9a9a9a", "#4a4a4a", "#d0d0d0", "#1a1a1a"], [
        ["Sola", "4:01"], ["Otra Historia", "4:12"], ["Un Dia Mas Sin Ti", "3:21"], ["Quisiera Estar Lejos", "4:34"],
        ["Head Full of Terror", "3:42"], ["Tal Vez y Algun Dia", "4:25"], ["Rojo Azul", "5:48"]]),
      album("Una Vida No Es Suficiente", 2007, "FLAC", "Rock", ["#5f7a8c", "#9fb2bd", "#c9c2a5", "#3d5566", "#7f97a3"], [
        ["Destrózame", "3:25"], ["Sola", "2:46"], ["Un Día Más Sin Ti", "3:55"], ["Discúlpame Me Rindo", "2:37"],
        ["Preguntas Si Te Amé", "3:27"], ["Contigo Hasta la Muerte", "3:32"], ["Siempre Me Dejas", "3:40"],
        ["Continuación", "5:08"], ["Quisiera Estar Lejos", "3:36"], ["Luces", "3:26"],
        ["Cielos Que Lloran", "2:53"], ["Y Soñar", "4:10"]]),
      album("Esperando a Que Amanezca", 2008, "FLAC", "Rock", ["#111111", "#f0f0f0", "#5a4a44", "#2a2a2a", "#c8c8c8"], [
        ["Renacer", "3:16"], ["Piensa en Que", "3:06"], ["Zero", "3:31"], ["Un Lugar Mejor", "3:49"],
        ["Lluvia-Vida", "3:30"], ["Tus Últimas Horas", "3:33"], ["Todo Gris", "4:01"],
        ["Me Amarás al Amanecer", "3:56"], ["Me Enseñaste Bien", "3:00"], ["No Me Verás Volver", "3:21"],
        ["Copas de Mentiras", "3:40"], ["Mi Peor Historia", "12:45"]]),
      album("Rojo Azul Remasterizado", 2008, "MP3", "Rock", ["#bcd2e8", "#e9e4dc", "#8a6a55", "#d9b49a", "#6f8fb5"], [
        ["RojoAzul Remasterizado", "5:45"]]),
      album("Sigo Esperando A Que Hoy Neve", 2009, "MP3", "Rock", ["#8fb0d6", "#5d6f86", "#a68a73", "#dfe6ee", "#3e4d63"], [
        ["Sigo Esperando A Que Hoy Neve", "4:25"]]),
      album("M M X", 2010, "FLAC", "Rock", ["#0b1030", "#3d4f9f", "#c0c6e8", "#8a1f2c", "#06070f"], [
        ["Plainsong", "4:49"], ["Las Mismas Cosas", "3:14"], ["Siento Que", "4:08"],
        ["Y en Eso Apareces", "4:07"], ["Discúlpame Me Rindo (Acústica)", "3:21"]]),
      album("Ahora Soy Yo Contra el Mundo", 2012, "FLAC", "Rock", ["#05070d", "#11203f", "#2c5bb5", "#0a0f1c", "#4f86e0"], [
        ["¿que Será de Mi ?", "3:56"], ["Si Algún Día", "3:46"], ["Vida Nueva", "4:33"],
        ["Ahora Soy Yo Contra el Mundo", "4:32"], ["Déjame Vivir", "4:14"]]),
    ],
    "Silverstein": [
      album("When Broken Is Easily Fixed", 2003, "FLAC", "Post-hardcore", ["#e8c35a", "#b07a3a", "#f3e2a0", "#5e6b8a", "#d79a52"], [
        ["Smashed into Pieces", "3:22"], ["Red Light Pledge", "3:41"], ["Giving Up", "3:54"],
        ["Bleeds No More", "3:05"], ["Last Days of Summer", "3:52"], ["November", "3:47"],
        ["Wish I Could Forget You", "3:51"], ["The Weak and the Wounded", "4:05"],
        ["When Broken Is Easily Fixed", "4:20"], ["Friends in Fall Colors", "4:31"]]),
      album("Discovering the Waterfront", 2005, "FLAC", "Post-hardcore", ["#2f4a5c", "#7fa6b8", "#e0d3b8", "#1b2a33", "#b8c9cf"], [
        ["Your Sword Versus My Dagger", "3:34"], ["Smile in Your Sleep", "3:56"], ["The Ides of March", "3:50"],
        ["My Heroine", "3:43"], ["Fist Wrapped in Blood", "3:12"], ["Already Dead", "3:49"],
        ["Defend You", "4:13"], ["Call It Karma", "4:20"], ["Discovering the Waterfront", "4:28"],
        ["Three Hours Back", "3:16"], ["Always and Never", "3:47"]]),
    ],
  };

  const ARTIST_NAMES = [
    "A Day To Remember", "Alesana", "Asking Alexandria", "Avenged Sevenfold",
    "Blessthefall", "Bring Me The Horizon", "Bullet For My Valentine",
    "Chiodos", "Crown The Empire", "Dance Gavin Dance", "Escape The Fate",
    "Fall Out Boy", "Falling In Reverse", "Green Day", "Hawthorne Heights",
    "Ice Nine Kills", "Insite", "James Blunt", "JerryC", "Kar Accidents", "Killswitch Engage", "Knocked Loose",
    "Libra CL", "Motionless In White", "Movements", "Moving On", "Muse", "My Chemical Romance",
    "Nightwish", "Olivia Rodrigo", "Orianthi", "Panda", "Panic! At The Disco", "Papa Roach", "Paul Gilbert",
    "Pierce The Veil", "Poppy", "QBO", "Queen", "Red", "Ryan Gosling, Emma Stone", "Saint Asonia", "Saosin",
    "Scary Kids Scaring Kids", "Seether", "Siempre Me Dejas", "Silverstein", "Sleep Token",
    "Sleeping With Sirens", "Slipknot", "Spiritbox", "Stravaganzza", "Taylor Acorn", "Tempting Paris",
    "The Alan Parsons Project", "The Devil Wears Prada", "The Horrors", "The Killers", "The Plot In You",
    "The Verve", "Thermo", "Thirty Seconds To Mars", "This Wild Life", "Too Close To Touch", "Trivium", "TX2",
    "Underoath", "While She Sleeps", "Wolves At The Gate", "Yellowcard",
  ];

  // PRNG con semilla para que las carátulas de demo sean siempre iguales.
  const hash = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const hexToRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const rgbToHex = (c) => "#" + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");

  const GENERIC_PALETTES = [
    ["#2b1d3a", "#6d3fa0", "#e2a3c7", "#140c1e", "#a3708f"], ["#1d2b22", "#4f8a5c", "#d8e6c9", "#0d140f", "#9fbf8a"],
    ["#3a1d1d", "#a04040", "#f0c9a0", "#1a0a0a", "#d98a5a"], ["#1d2a3a", "#4070a0", "#c9dcf0", "#0a121a", "#8ab0d9"],
    ["#33301d", "#a09040", "#f0e6a0", "#14120a", "#d9c25a"], ["#202020", "#707070", "#e0e0e0", "#080808", "#b0b0b0"],
  ];
  const GENERIC_TITLES = ["Sesiones", "En Vivo", "Lados B", "Acústico", "Rarezas", "Demos"];

  /** Carátula de 10×10 px: ruido suave sobre la paleta del álbum (se ve como las carátulas reales reducidas). */
  function makeCover(seedText, palette) {
    const r = rng(hash(seedText));
    const g = 4, grid = Array.from({ length: g * g }, () => r());
    const cols = palette.map(hexToRgb);
    const px = [];
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 10; x++) {
        const fx = (x / 9) * (g - 1), fy = (y / 9) * (g - 1);
        const x0 = Math.floor(fx), y0 = Math.floor(fy), x1 = Math.min(g - 1, x0 + 1), y1 = Math.min(g - 1, y0 + 1);
        const tx = fx - x0, ty = fy - y0;
        const v = (grid[y0 * g + x0] * (1 - tx) + grid[y0 * g + x1] * tx) * (1 - ty) +
                  (grid[y1 * g + x0] * (1 - tx) + grid[y1 * g + x1] * tx) * ty;
        const p = Math.min(cols.length - 1.001, Math.max(0, (v + (r() - .5) * .35) * (cols.length - 1)));
        const i = Math.floor(p), f = p - i, a = cols[i], b = cols[i + 1];
        px.push(rgbToHex(a.map((c, k) => c + (b[k] - c) * f + (r() - .5) * 18)));
      }
    }
    return px;
  }

  const ARTISTS = ARTIST_NAMES.map((name) => {
    let albums = LIBRARY[name];
    if (!albums) {
      const r = rng(hash(name));
      const count = 1 + Math.floor(r() * 3);
      let year = 2004 + Math.floor(r() * 12);
      albums = Array.from({ length: count }, (_, i) => {
        const n = 4 + Math.floor(r() * 7);
        year += 1 + Math.floor(r() * 3);
        const pal = GENERIC_PALETTES[Math.floor(r() * GENERIC_PALETTES.length)];
        return album(i === 0 ? name : GENERIC_TITLES[(i + Math.floor(r() * 6)) % 6], year, r() > .4 ? "FLAC" : "MP3", "Rock", pal,
          Array.from({ length: n }, (_, k) => [`Pista ${String(k + 1).padStart(2, "0")}`, `${2 + Math.floor(r() * 3)}:${String(Math.floor(r() * 60)).padStart(2, "0")}`]));
      });
    }
    albums.forEach((a) => { a.cover = makeCover(name + a.title, a.palette); });
    return { name, albums };
  });
  const artistIndex = (name) => ARTISTS.findIndex((a) => a.name === name);
  const fold = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

  const artistRows = [];
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

  function makeLayout(w, h) {
    const m = 2;
    const L = { w, h };
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
  const inRect = (r, x, y) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;

  /* ------------------------------------------------------------------------
     ScreenBuffer
     ------------------------------------------------------------------------ */
  class Buffer {
    constructor(w, h) { this.w = w; this.h = h; this.cells = Array.from({ length: w * h }, () => ({ ch: " ", ...base })); }
    put(ch, x, y, s) {
      if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
      this.cells[y * this.w + x] = { ch, fg: s.fg, bg: s.bg, b: !!s.b };
    }
    text(str, x, y, maxW, s) {
      let chars = [...str];
      if (maxW <= 0) return 0;
      if (chars.length > maxW) chars = chars.slice(0, Math.max(0, maxW - 1)).concat("…");
      chars.forEach((c, i) => this.put(c, x + i, y, s));
      return chars.length;
    }
    fill(r, s, ch = " ") { for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) this.put(ch, x, y, s); }
  }

  /* ------------------------------------------------------------------------
     Estado
     ------------------------------------------------------------------------ */
  const silver = artistIndex("Silverstein"), insite = artistIndex("Insite");
  const S = {
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
  const fmt = (s) => { s = Math.max(0, Math.floor(s)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60; return h ? `${h}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}` : `${m}:${String(ss).padStart(2, "0")}`; };
  const formatSummary = (codec) => codec === "FLAC" ? "FLAC · 44.1 kHz · 16 bit" : "MP3 · 44.1 kHz";
  const trackId = (a, al, t) => `${a}/${al}/${t}`;

  function libraryRows() {
    const rows = [];
    ARTISTS[S.shown].albums.forEach((alb, al) => {
      if (al > 0) rows.push({ type: "spacer" });
      rows.push({ type: "album", al });
      alb.tracks.forEach((_, t) => rows.push({ type: "track", al, t }));
      for (let n = 1 + alb.tracks.length; n < COVER.h; n++) rows.push({ type: "filler", al });
    });
    return rows;
  }
  const selectable = (r) => r && (r.type === "album" || r.type === "track");

  function report(text, error = false, ms = 3200) { S.status = { text, error, until: performance.now() + ms }; }

  /* ------------------------------------------------------------------------
     Dibujo
     ------------------------------------------------------------------------ */
  function heading(focused) { return St(focused ? T.accent : T.dim, T.background, true); }

  function draw() {
    const buf = new Buffer(W, H);
    drawHeader(buf);
    drawArtists(buf);
    S.lyricsVisible ? drawLyrics(buf) : drawLibrary(buf);
    drawPlayer(buf);
    const cursor = drawOverlays(buf);
    return { buf, cursor };
  }

  function drawHeader(buf) {
    const r = L.header;
    let x = r.x;
    x += buf.text("ılıl ", x, r.y, r.w, St(T.accent, T.background, true));
    x += buf.text("iTunes", x, r.y, r.x + r.w - x, title);
    let text, style;
    if (S.indexing) { text = `Indexando ${S.indexing.done}/${S.indexing.total}`; style = St(T.accent); }
    else if (S.status && S.status.until > performance.now()) { text = S.status.text; style = St(S.status.error ? T.error : T.accent); }
    else { text = "4280 canciones · 114 artistas"; style = dimmed; }
    const avail = r.x + r.w - x - 2, width = Math.min([...text].length, avail);
    buf.text(text, r.x + r.w - width, r.y, avail, style);
    buf.fill({ x: r.x, y: L.headerRule, w: r.w, h: 1 }, rule, "─");
  }

  function visibleStart(cursor, offset, count, height) {
    if (cursor < offset) offset = cursor;
    if (cursor >= offset + height) offset = cursor - height + 1;
    return Math.max(0, Math.min(offset, Math.max(0, count - height)));
  }

  function drawArtists(buf) {
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
      buf.text(ARTISTS[item.artist].name, list.x + 1, y, list.w - 2, style);
    }
  }

  function drawLibrary(buf) {
    const p = L.library, focused = S.focus === "library";
    const artist = ARTISTS[S.shown];
    let t = "BIBLIOTECA · " + artist.name.toUpperCase();
    if (S.marked.size) t += ` · ${S.marked.size} marcadas`;
    buf.text(t, p.x, p.y, p.w, heading(focused));

    const rows = libraryRows();
    const full = L.libraryList, gutter = COVER.w + 2;
    const list = { x: full.x + gutter, y: full.y, w: full.w - gutter, h: full.h };
    const albumStart = {};
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
        const tr = artist.albums[item.al].tracks[item.t];
        const id = trackId(S.shown, item.al, item.t);
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
  function drawLyrics(buf) {
    const p = L.library, tr = curTrack();
    buf.text("LETRA" + (tr ? " · " + tr.title.toUpperCase() : ""), p.x, p.y, p.w, heading(S.focus === "library"));
    const list = L.libraryList;
    LYRICS.slice(S.lyricsOffset, S.lyricsOffset + list.h).forEach((t, i) => {
      buf.text(t, list.x, list.y + i, list.w, i === 0 && S.lyricsOffset === 0 ? St(T.accent, T.background, true) : base);
    });
  }

  function coverRow(buf, pixels, row, x, y) {
    if (!pixels) {
      buf.fill({ x, y, w: COVER.w, h: 1 }, overlay);
      if (row === Math.floor(COVER.h / 2)) buf.put("♪", x + COVER.w / 2, y, St(T.dim, T.surface));
      return;
    }
    for (let c = 0; c < COVER.w; c++) {
      buf.put("▀", x + c, y, { fg: pixels[row * 2 * COVER.w + c], bg: pixels[(row * 2 + 1) * COVER.w + c] });
    }
  }

  function drawPlayer(buf) {
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
      let label;
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
  function barRect(dur) { const label = fmt(dur).length + 1; return { x: L.progress.x + label, y: L.progress.y, w: Math.max(0, L.progress.w - 2 * label), h: 1 }; }

  /* ---------- overlays ---------- */
  function centered(w, h) { w = Math.min(w, W - 2); h = Math.min(h, H - 2); return { x: Math.floor((W - w) / 2), y: Math.floor((H - h) / 2), w, h }; }
  function frame(buf, r, t, footer) {
    const border = St(T.accent, T.surface);
    buf.fill(r, overlay);
    for (let x = r.x; x < r.x + r.w; x++) { buf.put("─", x, r.y, border); buf.put("─", x, r.y + r.h - 1, border); }
    for (let y = r.y; y < r.y + r.h; y++) { buf.put("│", r.x, y, border); buf.put("│", r.x + r.w - 1, y, border); }
    buf.put("╭", r.x, r.y, border); buf.put("╮", r.x + r.w - 1, r.y, border);
    buf.put("╰", r.x, r.y + r.h - 1, border); buf.put("╯", r.x + r.w - 1, r.y + r.h - 1, border);
    buf.text(` ${t} `, r.x + 2, r.y, r.w - 4, St(T.bright, T.surface, true));
    buf.text(` ${footer} `, r.x + 2, r.y + r.h - 1, r.w - 4, St(T.dim, T.surface));
  }
  function drawField(buf, prefix, r, style) {
    buf.fill(r, style);
    buf.text(prefix, r.x + 1, r.y, r.w - 2, St(T.accent, style.bg, true));
    const x = r.x + 1 + [...prefix].length;
    const room = Math.max(1, r.x + r.w - x - 1), skip = Math.max(0, S.input.cur - room + 1);
    buf.text([...S.input.text].slice(skip).join(""), x, r.y, room, style);
    return { x: x + S.input.cur - skip, y: r.y };
  }

  function drawOverlays(buf) {
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
    const lines = [];
    for (const [section, list] of BINDINGS) {
      if (lines.length) lines.push(["", "", false]);
      lines.push([section.toUpperCase(), "", true]);
      for (const [keys, help] of list) lines.push([keys.join(" "), help, false]);
    }
    lines.push(["", "", false], ["COMANDOS", "", true]);
    COMMANDS.forEach(([k, v]) => lines.push([k, v, false]));
    return lines;
  }
  function drawHelp(buf) {
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

  function drawEq(buf) {
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

  function drawForm(buf) {
    const f = S.form, lw = 18;
    const box = centered(Math.min(W - 4, 76), f.fields.length + 4);
    frame(buf, box, `EDITAR TAGS · ${f.ids.length === 1 ? "1 pista" : f.ids.length + " pistas"}`, "Tab/↑↓ campo · Enter guardar · Esc cancelar");
    let cursor = null;
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

  function drawRoots(buf) {
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
  const tui = document.getElementById("tui");
  const esc = (c) => c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === "&" ? "&amp;" : c;
  const SOLO = new Set(["▀", "█", "❚", "▶", "◀", "⇄", "↻", "♪", "●", "…", "ı"]);
  let blinkOn = true;

  function render() {
    if (!tui) return;
    const { buf, cursor } = draw();
    const out = [];
    for (let y = 0; y < H; y++) {
      let row = '<span class="r">', run = null;
      const flush = () => {
        if (!run) return;
        row += `<span style="width:${run.n * .6}em;color:${run.fg};background:${run.bg}">${run.b ? "<b>" + run.s + "</b>" : run.s}</span>`;
        run = null;
      };
      for (let x = 0; x < W; x++) {
        let c = buf.cells[y * W + x];
        if (cursor && blinkOn && cursor.x === x && cursor.y === y) c = { ...c, fg: c.bg, bg: T.bright };
        if (c.ch === "▀" || c.ch === "█") {
          flush();
          const bg = c.ch === "▀" ? `linear-gradient(${c.fg} 50%,${c.bg} 50%)` : c.fg;
          row += `<span style="width:.6em;background:${bg}"> </span>`;
        } else if (SOLO.has(c.ch)) {
          flush();
          row += `<span style="width:.6em;text-align:center;color:${c.fg};background:${c.bg}">${c.b ? "<b>" + c.ch + "</b>" : c.ch}</span>`;
        } else {
          if (run && run.fg === c.fg && run.bg === c.bg && run.b === c.b) { run.n++; run.s += esc(c.ch); }
          else { flush(); run = { fg: c.fg, bg: c.bg, b: c.b, n: 1, s: esc(c.ch) }; }
        }
      }
      flush();
      out.push(row + "</span>");
    }
    tui.innerHTML = out.join("");
  }

  /* ------------------------------------------------------------------------
     Acciones (AppController)
     ------------------------------------------------------------------------ */
  function play(a, al, t) {
    S.playing = { a, al, t }; S.elapsed = 0; S.isPlaying = true;
    pulseWindow();
  }
  function step(dir) {
    if (!S.playing) return;
    const alb = ARTISTS[S.playing.a].albums[S.playing.al];
    if (dir < 0 && S.elapsed > 3) { S.elapsed = 0; return; }
    let t = S.shuffle ? Math.floor(Math.random() * alb.tracks.length) : S.playing.t + dir;
    if (t >= alb.tracks.length) t = 0;
    if (t < 0) t = alb.tracks.length - 1;
    play(S.playing.a, S.playing.al, t);
  }
  function seekTo(s) { const tr = curTrack(); if (tr) S.elapsed = Math.max(0, Math.min(tr.dur - 1, s)); }
  function setVolume(v) { S.volume = Math.max(0, Math.min(1, Math.round(v * 100) / 100)); S.muted = false; }

  function moveArtist(delta) {
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
  function selectArtistRow(i) {
    if (artistRows[i]?.artist === undefined) return;
    S.artistCursor = i;
    if (S.shown !== artistRows[i].artist) { S.shown = artistRows[i].artist; S.libCursor = 0; S.libOffset = 0; }
  }
  function moveLib(delta) {
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
    return [trackId(S.shown, r.al, r.t)];
  }
  const trackById = (id) => { const [a, al, t] = id.split("/").map(Number); return { a, al, t, alb: ARTISTS[a].albums[al], tr: ARTISTS[a].albums[al].tracks[t] }; };

  function openForm() {
    const ids = S.focus === "library" ? libSelectionIds() : S.playing ? [trackId(S.playing.a, S.playing.al, S.playing.t)] : [];
    if (!ids.length) return report("Selecciona una canción, un álbum o un artista", true);
    const props = ids.map((id) => {
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
    const changed = S.form.fields.filter((f) => f.text !== f.original);
    S.overlay = null;
    if (!changed.length) return report("Sin cambios");
    for (const id of S.form.ids) {
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
      S.indexing.done = done;
      if (done >= 4280) { clearInterval(id); S.indexing = null; report("Biblioteca al día: 4280 archivos · 12 leídos · 0 quitados (1 s)"); }
      render();
    }, 60);
  }

  function runCommand(line) {
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
  function parseTime(text) {
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

  function editInput(inp, key) {
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

  function pressButton(b) {
    S.playerButton = b;
    if (b === "playPause") S.isPlaying = !S.isPlaying;
    else if (b === "previous") step(-1);
    else if (b === "next") step(1);
    else if (b === "shuffle") S.shuffle = !S.shuffle;
    else S.repeat = { off: "all", all: "one", one: "off" }[S.repeat];
  }

  const FOCUS = ["artists", "library", "player"];

  /** Una tecla, como la entrega InputDecoder: "up", "Enter", "Tab", "BackTab", "e", " ", … */
  function handleKey(key) {
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
          if (kind === "seek") { const s = parseTime(text); s === null ? report("Tiempo inválido: usa 1:42", true) : seekTo(s); }
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
        const f = S.form, fd = f.fields[f.focused];
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
        else if (S.focus === "library") S.lyricsVisible ? (S.lyricsOffset = Math.max(0, Math.min(LYRICS.length - 1, S.lyricsOffset + d))) : moveLib(d);
        else setVolume(S.volume - d * .05);
        break;
      }
      case "PageUp": case "PageDown": {
        const d = (key === "PageUp" ? -1 : 1) * (L.artistsList.h - 1);
        S.focus === "artists" ? moveArtist(d) : moveLib(d);
        break;
      }
      case "Home": S.focus === "artists" ? moveArtist(-999) : moveLib(-999); break;
      case "End": S.focus === "artists" ? moveArtist(999) : moveLib(999); break;
      case "Enter":
        if (S.focus === "artists") S.focus = "library";
        else if (S.focus === "library") {
          const r = libraryRows()[S.libCursor];
          if (r) play(S.shown, r.al, r.type === "track" ? r.t : 0);
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
      case "r": S.repeat = { off: "all", all: "one", one: "off" }[S.repeat]; report({ off: "Repetir: no", all: "Repetir: todo", one: "Repetir: una" }[S.repeat]); break;
      case "=": S.overlay = "eq"; break;
      case "x": {
        const ids = (() => { const r = libraryRows()[S.libCursor]; if (!r) return []; return r.type === "album" ? ARTISTS[S.shown].albums[r.al].tracks.map((_, t) => trackId(S.shown, r.al, t)) : [trackId(S.shown, r.al, r.t)]; })();
        const all = ids.every((id) => S.marked.has(id));
        ids.forEach((id) => all ? S.marked.delete(id) : S.marked.add(id));
        S.focus = "library";
        break;
      }
      case "ShiftUp": case "ShiftDown": {
        S.focus = "library";
        const r = libraryRows()[S.libCursor];
        if (r && r.type === "track") S.marked.add(trackId(S.shown, r.al, r.t));
        moveLib(key === "ShiftUp" ? -1 : 1);
        const r2 = libraryRows()[S.libCursor];
        if (r2 && r2.type === "track") S.marked.add(trackId(S.shown, r2.al, r2.t));
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
  const win = document.getElementById("window");
  const keyhud = document.getElementById("keyhud");
  const caption = document.getElementById("caption");
  const KEYMAP = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" };
  const KEYLABEL = { " ": "Espacio", up: "↑", down: "↓", left: "←", right: "→", Enter: "⏎ Enter", Tab: "⇥ Tab", BackTab: "⇧⇥", Escape: "Esc", Backspace: "⌫", ShiftUp: "⇧↑", ShiftDown: "⇧↓" };

  function showKey(key) {
    if (!keyhud) return;
    const k = document.createElement("kbd");
    k.textContent = KEYLABEL[key] ?? key;
    keyhud.appendChild(k);
    while (keyhud.children.length > 4) keyhud.firstChild.remove();
    setTimeout(() => k.remove(), 1400);
  }
  function pulseWindow() {
    if (!win || REDUCED) return;
    win.animate([{ transform: "scale(1)" }, { transform: "scale(1.006)" }, { transform: "scale(1)" }], { duration: 260, easing: "ease-out" });
  }

  function normalize(e) {
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
    tui.addEventListener("focus", () => win.classList.add("focused"));
    tui.addEventListener("blur", () => win.classList.remove("focused"));
    document.getElementById("focus-badge").addEventListener("click", () => tui.focus());
    const badge = document.getElementById("focus-badge");
    tui.addEventListener("focus", () => { badge.textContent = "teclado activo · ? ayuda"; });
    tui.addEventListener("blur", () => { badge.textContent = "clic para usar el teclado"; });

    const cellAt = (e) => {
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
    const box = tui.parentElement.clientWidth - (SHOT ? 0 : 20);
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
  let sceneTimers = [], sceneActive = null;
  function stopScene() {
    sceneTimers.forEach(clearTimeout); sceneTimers = [];
    if (sceneActive) { document.querySelectorAll(".scene").forEach((b) => b.classList.remove("active")); sceneActive = null; }
    caption?.classList.remove("show");
  }
  function say(text) { if (!caption) return; caption.textContent = text; caption.classList.add("show"); }
  const typeKeys = (s) => [...s].map((c) => ({ key: c, wait: 110 }));
  const SCENES = {
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
  function runScene(name) {
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
    sceneTimers.push(setTimeout(() => { caption.classList.remove("show"); document.querySelector(`.scene[data-scene="${name}"]`)?.classList.remove("active"); sceneActive = null; }, t + 400));
  }
  document.querySelectorAll(".scene").forEach((b) => b.addEventListener("click", () => runScene(b.dataset.scene)));

  /* ------------------------------------------------------------------------
     Modo captura: ?shot=editar|eq|pausa|ayuda|buscar|letra
     ------------------------------------------------------------------------ */
  if (SHOT) {
    document.body.classList.add("shot-mode");
    const shots = {
      biblioteca: () => {},
      pausa: () => { S.isPlaying = false; S.focus = "player"; S.elapsed = 131; },
      editar: () => {
        S.focus = "library"; S.libCursor = 2; openForm();
        const f = S.form.fields[0]; f.text = "Missing You (2024)"; f.cur = f.text.length;
        const y = S.form.fields[4]; y.text = "2024"; y.cur = 4; S.form.focused = 4;
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

  // Cursor glow + barra de progreso + nav
  const root = document.documentElement;
  addEventListener("pointermove", (e) => { root.style.setProperty("--mx", e.clientX + "px"); root.style.setProperty("--my", e.clientY + "px"); }, { passive: true });
  const progress = document.querySelector(".scroll-progress"), nav = document.querySelector(".nav");
  const navLinks = [...document.querySelectorAll(".nav-links a")];
  const sections = navLinks.map((a) => document.querySelector(a.getAttribute("href")));
  function onScroll() {
    const max = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
    nav.classList.toggle("scrolled", scrollY > 40);
    let active = -1;
    sections.forEach((s, i) => { if (s && s.getBoundingClientRect().top < innerHeight * .4) active = i; });
    navLinks.forEach((a, i) => a.classList.toggle("active", i === active));
    // La ventana de la terminal entra con una ligera inclinación 3D.
    if (win && !REDUCED) {
      const r = win.getBoundingClientRect(), p = Math.max(0, Math.min(1, (innerHeight - r.top) / (innerHeight * .7)));
      win.style.transform = p < 1 ? `rotateX(${(1 - p) * 18}deg) scale(${.94 + p * .06})` : "";
    }
  }
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // Reveal al hacer scroll (con escalonado por grupo)
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      en.target.classList.add("in");
      io.unobserve(en.target);
      const count = en.target.querySelector("[data-count]") || (en.target.dataset.count !== undefined ? en.target : null);
      if (count) countUp(count);
    });
  }, { threshold: .15 });
  document.querySelectorAll(".reveal").forEach((el) => {
    const sibs = [...el.parentElement.children].filter((c) => c.classList.contains("reveal"));
    el.style.setProperty("--d", `${Math.min(sibs.indexOf(el), 6) * .07}s`);
    io.observe(el);
  });
  function countUp(el) {
    const target = Number(el.dataset.count), suffix = el.dataset.suffix || "";
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / 1400), v = Math.round(target * (1 - Math.pow(1 - p, 3)));
      el.textContent = v + suffix;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // Texto que se escribe solo en el hero
  const typed = document.getElementById("typed");
  const lines = ["itunes ~/Music", ":eq rock", ":cover portada.jpg", ":add /Volumes/FLAC", "itunes"];
  (async function typeLoop() {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    for (let i = 0; ; i = (i + 1) % lines.length) {
      for (const c of lines[i]) { typed.textContent += c; await sleep(70 + Math.random() * 60); }
      await sleep(1600);
      while (typed.textContent) { typed.textContent = typed.textContent.slice(0, -1); await sleep(28); }
      await sleep(300);
    }
  })();

  // Botones magnéticos
  document.querySelectorAll(".magnetic").forEach((b) => {
    b.addEventListener("pointermove", (e) => {
      const r = b.getBoundingClientRect();
      b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .18}px, ${(e.clientY - r.top - r.height / 2) * .3}px)`;
    });
    b.addEventListener("pointerleave", () => { b.style.transform = ""; });
  });

  // Tarjetas con tilt 3D y brillo que sigue al cursor
  document.querySelectorAll(".tilt").forEach((card) => {
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      card.style.setProperty("--x", `${x * 100}%`); card.style.setProperty("--y", `${y * 100}%`);
      if (!REDUCED) card.style.transform = `perspective(900px) rotateY(${(x - .5) * 10}deg) rotateX(${(.5 - y) * 10}deg) translateY(-4px)`;
    });
    card.addEventListener("pointerleave", () => { card.style.transform = ""; });
  });
  document.querySelectorAll(".format-chips span").forEach((s, i) => s.style.setProperty("--i", i));

  // Carátula pixelada animada en la tarjeta
  const pc = document.getElementById("pixel-cover");
  if (pc) {
    const covers = ARTISTS.filter((a) => LIBRARY[a.name]).flatMap((a) => a.albums.map((al) => al.cover));
    pc.innerHTML = "<i></i>".repeat(100);
    const cells = [...pc.children];
    let ci = 0;
    const paint = () => { covers[ci].forEach((c, i) => { cells[i].style.background = c; }); ci = (ci + 1) % covers.length; };
    paint(); setInterval(paint, 2200);
  }

  // Atajos generados desde la misma tabla que la ayuda de la app
  const kg = document.getElementById("keys-grid");
  if (kg) {
    kg.innerHTML = BINDINGS.map(([section, list]) => `
      <div class="keys-group reveal in">
        <h3>${section.toUpperCase()}</h3>
        ${list.map(([keys, help]) => `<div class="keys-row"><span class="caps">${keys.map((k) => `<kbd>${k}</kbd>`).join("")}</span><span>${help}</span></div>`).join("")}
      </div>`).join("");
    document.getElementById("commands-list").innerHTML = COMMANDS.map(([c, d]) => `<div><code>${c.replace(/</g, "&lt;")}</code>${d}</div>`).join("");
  }

  // Lightbox de capturas
  const lb = document.getElementById("lightbox");
  document.querySelectorAll(".shot").forEach((s) => s.addEventListener("click", () => {
    lb.querySelector("img").src = s.dataset.full;
    lb.querySelector("img").alt = s.querySelector("img").alt;
    lb.hidden = false;
  }));
  lb.addEventListener("click", () => { lb.hidden = true; });
  addEventListener("keydown", (e) => { if (e.key === "Escape") lb.hidden = true; });

  if (REDUCED) return;

  // Fondo: constelación de partículas que reacciona al cursor
  const bg = document.getElementById("bg-canvas"), ctx = bg.getContext("2d");
  let pts = [], mouse = { x: -999, y: -999 };
  function resizeBg() {
    const dpr = Math.min(2, devicePixelRatio || 1);
    bg.width = innerWidth * dpr; bg.height = innerHeight * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round(Math.min(90, innerWidth * innerHeight / 16000));
    pts = Array.from({ length: n }, () => ({ x: Math.random() * innerWidth, y: Math.random() * innerHeight, vx: (Math.random() - .5) * .3, vy: (Math.random() - .5) * .3, r: Math.random() * 1.6 + .4 }));
  }
  addEventListener("resize", resizeBg); resizeBg();
  addEventListener("pointermove", (e) => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
  function drawBg() {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of pts) {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > innerWidth) p.vx *= -1;
      if (p.y < 0 || p.y > innerHeight) p.vy *= -1;
      const dx = p.x - mouse.x, dy = p.y - mouse.y, d = Math.hypot(dx, dy);
      if (d < 140) { p.x += dx / d * .8; p.y += dy / d * .8; }
      ctx.fillStyle = "rgba(122,162,247,.55)";
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    }
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
      const a = pts[i], b = pts[j], d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d < 120) { ctx.strokeStyle = `rgba(122,162,247,${(1 - d / 120) * .18})`; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
    }
    requestAnimationFrame(drawBg);
  }
  drawBg();

  // Visualizador del hero: late más fuerte cuando la demo está reproduciendo
  const viz = document.getElementById("viz"), vctx = viz.getContext("2d");
  let energy = 1;
  function resizeViz() { const dpr = Math.min(2, devicePixelRatio || 1); viz.width = viz.clientWidth * dpr; viz.height = viz.clientHeight * dpr; vctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
  addEventListener("resize", resizeViz); resizeViz();
  function drawViz(t) {
    const w = viz.clientWidth, h = viz.clientHeight;
    vctx.clearRect(0, 0, w, h);
    energy += ((S.isPlaying ? 1 : .15) - energy) * .05;
    const n = Math.max(32, Math.floor(w / 18)), bw = w / n;
    const g = vctx.createLinearGradient(0, h, 0, 0);
    g.addColorStop(0, "#7aa2f7"); g.addColorStop(.5, "#bb9af7"); g.addColorStop(1, "#f7768e");
    vctx.fillStyle = g;
    for (let i = 0; i < n; i++) {
      const v = (Math.sin(t / 380 + i * .45) + Math.sin(t / 230 + i * 1.3) * .6 + Math.sin(t / 620 - i * .2) * .8 + 2.4) / 4.8;
      const bh = Math.max(4, v * h * .9 * energy * (1 - Math.abs(i / n - .5) * .6));
      vctx.beginPath();
      vctx.roundRect ? vctx.roundRect(i * bw + 3, h - bh, bw - 6, bh, 4) : vctx.rect(i * bw + 3, h - bh, bw - 6, bh);
      vctx.fill();
    }
    requestAnimationFrame(drawViz);
  }
  requestAnimationFrame(drawViz);
})();
