// Home · iTunes: recreación de su pantalla real (biblioteca de Insite con carátulas de píxeles, lista y
// reproductor). Se dibuja en un búfer de celdas como la app y recorre la lista como alguien usándola.
import { esc } from '../core/dom';
import { reduceMotion, whileVisible } from '../core/motion';

const T = {
  bg: '#14161C', surface: '#1C1F27', selection: '#2D3750', separator: '#2A2E37',
  text: '#C6CAD3', bright: '#FFFFFF', dim: '#878D99', accent: '#7AA2F7', track: '#3B4050',
};
type Style = { fg: string; bg: string; b: boolean };
type Cell = Style & { ch: string };
const St = (fg: string, bg = T.bg, b = false): Style => ({ fg, bg, b });
const W = 96, H = 26, CW = 10, CH = 5;
const sec = (t: string) => { const [m, s] = t.split(':').map(Number); return m * 60 + s; };
const fmt = (s: number) => { s = Math.max(0, Math.floor(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

// Carátula de 10×10 px: ruido suave sobre la paleta del álbum (igual que en /itunes/).
const hash = (s: string) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const rng = (seed: number) => () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const hexToRgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const rgbToHex = (c: number[]) => '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
function makeCover(seedText: string, palette: string[]) {
  const r = rng(hash(seedText)), g = 4, grid = Array.from({ length: g * g }, () => r());
  const cols = palette.map(hexToRgb), px: string[] = [];
  for (let y = 0; y < 10; y++) for (let x = 0; x < 10; x++) {
    const fx = (x / 9) * (g - 1), fy = (y / 9) * (g - 1);
    const x0 = Math.floor(fx), y0 = Math.floor(fy), x1 = Math.min(g - 1, x0 + 1), y1 = Math.min(g - 1, y0 + 1);
    const tx = fx - x0, ty = fy - y0;
    const v = (grid[y0 * g + x0] * (1 - tx) + grid[y0 * g + x1] * tx) * (1 - ty) + (grid[y1 * g + x0] * (1 - tx) + grid[y1 * g + x1] * tx) * ty;
    const p = Math.min(cols.length - 1.001, Math.max(0, (v + (r() - .5) * .35) * (cols.length - 1)));
    const i = Math.floor(p), f = p - i, a = cols[i], b = cols[i + 1];
    px.push(rgbToHex(a.map((c, k) => c + (b[k] - c) * f + (r() - .5) * 18)));
  }
  return px;
}
const album = (title: string, year: number, codec: string, palette: string[], tracks: [string, string][]) => ({
  title, year, codec, cover: makeCover('Insite' + title, palette),
  tracks: tracks.map(([t, d], i) => ({ n: i + 1, title: t, dur: sec(d) })),
});
const ALBUMS = [
  album('Otra Historia EP', 2004, 'FLAC', ['#f2f2f2', '#9a9a9a', '#4a4a4a', '#d0d0d0', '#1a1a1a'], [
    ['Sola', '4:01'], ['Otra Historia', '4:12'], ['Un Dia Mas Sin Ti', '3:21'], ['Quisiera Estar Lejos', '4:34'],
    ['Head Full of Terror', '3:42'], ['Tal Vez y Algun Dia', '4:25'], ['Rojo Azul', '5:48']]),
  album('Una Vida No Es Suficiente', 2007, 'FLAC', ['#5f7a8c', '#9fb2bd', '#c9c2a5', '#3d5566', '#7f97a3'], [
    ['Destrózame', '3:25'], ['Sola', '2:46'], ['Un Día Más Sin Ti', '3:55'], ['Discúlpame Me Rindo', '2:37'],
    ['Preguntas Si Te Amé', '3:27'], ['Contigo Hasta la Muerte', '3:32'], ['Siempre Me Dejas', '3:40'],
    ['Continuación', '5:08']]),
  album('M M X', 2010, 'FLAC', ['#0b1030', '#3d4f9f', '#c0c6e8', '#8a1f2c', '#06070f'], [
    ['Plainsong', '4:49'], ['Las Mismas Cosas', '3:14'], ['Siento Que', '4:08']]),
];
const ARTIST_ROWS = ['H', 'Hawthorne Heights', 'I', 'Ice Nine Kills', 'Insite', 'J', 'James Blunt', 'JerryC',
  'K', 'Killswitch Engage', 'Knocked Loose', 'L', 'Libra CL', 'M', 'Motionless In White', 'Muse', 'My Chemical Romance'];

// Filas de la biblioteca: encabezado de álbum, pistas y relleno hasta la altura de la carátula.
type Item = { type: 'spacer' } | { type: 'album' | 'track' | 'filler'; al: number; t?: number; start: number };
const ROWS: Item[] = [];
ALBUMS.forEach((alb, al) => {
  if (al > 0) ROWS.push({ type: 'spacer' });
  const start = ROWS.length;
  ROWS.push({ type: 'album', al, start });
  alb.tracks.forEach((_, t) => ROWS.push({ type: 'track', al, t, start }));
  for (let n = 1 + alb.tracks.length; n < CH; n++) ROWS.push({ type: 'filler', al, start });
});
const TRACK_ROWS = ROWS.map((r, i) => (r.type === 'track' ? i : -1)).filter((i) => i >= 0);

const m = 2, aw = 22, lx = m + aw + 3, playerTop = H - 6, listH = playerTop - 4;

class Buf {
  cells: Cell[] = Array.from({ length: W * H }, () => ({ ch: ' ', ...St(T.text) }));
  put(ch: string, x: number, y: number, s: Style) { if (x >= 0 && y >= 0 && x < W && y < H) this.cells[y * W + x] = { ch, fg: s.fg, bg: s.bg, b: !!s.b }; }
  text(str: string, x: number, y: number, maxW: number, s: Style) {
    let c = [...str];
    if (maxW <= 0) return 0;
    if (c.length > maxW) c = c.slice(0, Math.max(0, maxW - 1)).concat('…');
    c.forEach((ch, i) => this.put(ch, x + i, y, s));
    return c.length;
  }
  fill(x: number, y: number, w: number, s: Style, ch = ' ') { for (let i = 0; i < w; i++) this.put(ch, x + i, y, s); }
}
const coverRow = (buf: Buf, px: string[], row: number, x: number, y: number) => {
  for (let c = 0; c < CW; c++) buf.put('▀', x + c, y, { fg: px[row * 2 * CW + c], bg: px[(row * 2 + 1) * CW + c], b: false });
};

type State = { cursor: number; offset: number; playing: { al: number; t: number }; elapsed: number; isPlaying: boolean; button: string };

function draw(S: State) {
  const buf = new Buf(), heading = (on: boolean) => St(on ? T.accent : T.dim, T.bg, true);
  const cur = ALBUMS[S.playing.al], tr = cur.tracks[S.playing.t];

  // Encabezado
  let x = m;
  x += buf.text('ılıl ', x, 0, 10, St(T.accent, T.bg, true));
  buf.text('iTunes', x, 0, 10, St(T.bright, T.bg, true));
  const info = '4280 canciones · 114 artistas';
  buf.text(info, W - m - info.length, 0, info.length, St(T.dim));
  buf.fill(m, 1, W - 2 * m, St(T.separator), '─');

  // Artistas
  buf.text('ARTISTAS', m, 2, aw, heading(false));
  buf.text('/ Buscar artista', m + 1, 3, aw, St(T.track));
  ARTIST_ROWS.slice(0, listH).forEach((name, i) => {
    const y = 4 + i;
    if (name.length === 1) { buf.text(name, m, y, aw, St(T.bright, T.bg, true)); return; }
    let s = St(name === 'Insite' ? T.accent : T.dim);
    if (name === 'Insite') { s = St(T.bright, T.surface); buf.fill(m, y, aw, s); }
    buf.text(name, m + 1, y, aw - 2, s);
  });

  // Biblioteca
  const lw = W - m - lx, listX = lx + CW + 2, listW = lw - CW - 2;
  buf.text('BIBLIOTECA · INSITE', lx, 2, lw, heading(true));
  if (S.cursor < S.offset) S.offset = S.cursor;
  if (S.cursor >= S.offset + listH) S.offset = S.cursor - listH + 1;
  for (let line = 0; line < listH; line++) {
    const row = S.offset + line, item = ROWS[row];
    if (!item) break;
    const y = 4 + line;
    if (item.type !== 'spacer' && row - item.start < CH) coverRow(buf, ALBUMS[item.al].cover, row - item.start, lx, y);
    const isCursor = row === S.cursor;
    const bs = isCursor ? St(T.bright, T.selection) : St(T.text);
    if (isCursor) buf.fill(listX, y, listW, bs);
    if (item.type === 'spacer') buf.fill(lx, y, lw, St(T.separator), '─');
    else if (item.type === 'album') {
      const alb = ALBUMS[item.al];
      const summary = `${alb.tracks.length} canciones · ${Math.floor(alb.tracks.reduce((s, t) => s + t.dur, 0) / 60)} min`;
      buf.text([alb.title.toUpperCase(), alb.year, alb.codec].join(' · '), listX + 1, y, listW - summary.length - 4, St(T.dim, bs.bg, true));
      buf.text(summary, listX + listW - summary.length - 1, y, summary.length + 1, St(T.dim, bs.bg));
    } else if (item.type === 'track') {
      const t = ALBUMS[item.al].tracks[item.t!];
      const playing = S.playing.al === item.al && S.playing.t === item.t;
      if (playing) buf.put('▶', listX + 1, y, St(T.accent, bs.bg));
      buf.text(String(t.n).padStart(2, '0'), listX + 3, y, 2, St(T.dim, bs.bg));
      const dur = fmt(t.dur);
      buf.text(t.title, listX + 6, y, listW - 8 - dur.length, playing ? St(T.accent, bs.bg) : bs);
      buf.text(dur, listX + listW - dur.length - 1, y, dur.length + 1, St(T.dim, bs.bg));
    }
  }

  // Reproductor
  buf.fill(m, playerTop, W - 2 * m, St(T.separator), '─');
  for (let r = 0; r < CH; r++) coverRow(buf, cur.cover, r, m, playerTop + 1 + r);
  const ix = m + CW + 2, iw = W - m - ix;
  buf.text('Vol 100%', W - m - 8, playerTop + 1, 8, St(T.dim));
  buf.text('EQ Rock', W - m - 7, playerTop + 2, 7, St(T.accent));
  buf.text(tr.title, ix, playerTop + 1, iw - 10, St(T.bright, T.bg, true));
  buf.text(`Insite · ${cur.title} (${cur.year})`, ix, playerTop + 2, iw - 10, St(T.text));
  buf.text('FLAC · 44.1 kHz · 16 bit', ix, playerTop + 3, iw - 10, St(T.dim));
  let bx = Math.max(ix, Math.floor((W - 33) / 2));
  ([['shuffle', '⇄', T.dim], ['previous', '◀◀', T.text], ['playPause', S.isPlaying ? '❚❚' : '▶', T.accent], ['next', '▶▶', T.text], ['repeat', '↻', T.dim]] as const)
    .forEach(([id, label, fg]) => {
      const s = St(fg, S.button === id ? T.selection : T.bg, id === 'playPause');
      buf.fill(bx, playerTop + 4, 5, s);
      buf.text(label, bx + Math.floor((5 - [...label].length) / 2), playerTop + 4, 5, s);
      bx += 7;
    });
  const now = fmt(S.elapsed), tot = fmt(tr.dur), py = playerTop + 5;
  const barX = ix + tot.length + 1, barW = iw - 2 * (tot.length + 1);
  buf.text(now, barX - 1 - now.length, py, now.length, St(T.dim));
  buf.text(tot, barX + barW + 1, py, tot.length, St(T.dim));
  buf.fill(barX, py, barW, St(T.track), '━');
  buf.fill(barX, py, Math.round((S.elapsed / tr.dur) * barW), St(T.accent), '━');
  return buf;
}

// Caracteres que se dibujan en su propia celda centrada (su ancho real no siempre es el de la fuente mono).
const SOLO = new Set(['▶', '◀', '❚', '⇄', '↻', 'ı', '…', '·', '━', '─']);
function toHtml(buf: Buf) {
  const out: string[] = [];
  for (let y = 0; y < H; y++) {
    let row = '<span class="r">';
    let run: { fg: string; bg: string; b: boolean; n: number; s: string } | null = null;
    const flush = () => {
      if (!run) return;
      row += `<span style="width:${run.n * .6}em;color:${run.fg};background:${run.bg}">${run.b ? '<b>' + run.s + '</b>' : run.s}</span>`;
      run = null;
    };
    for (let x = 0; x < W; x++) {
      const c = buf.cells[y * W + x];
      if (c.ch === '▀') {
        flush();
        row += `<span style="width:.6em;background:linear-gradient(${c.fg} 50%,${c.bg} 50%)"> </span>`;
      } else if (SOLO.has(c.ch)) {
        flush();
        row += `<span style="width:.6em;text-align:center;color:${c.fg};background:${c.bg}">${c.b ? '<b>' + c.ch + '</b>' : c.ch}</span>`;
      } else if (run && run.fg === c.fg && run.bg === c.bg && run.b === c.b) { run.n++; run.s += esc(c.ch); }
      else { flush(); run = { fg: c.fg, bg: c.bg, b: c.b, n: 1, s: esc(c.ch) }; }
    }
    flush();
    out.push(row + '</span>');
  }
  return out.join('');
}

export function mount(root: HTMLElement) {
  const S: State = { cursor: TRACK_ROWS[1], offset: 0, playing: { al: 0, t: 1 }, elapsed: 74, isPlaying: true, button: 'playPause' };
  const render = () => { root.innerHTML = toHtml(draw(S)); };
  const fit = () => root.style.setProperty('--cw', `${Math.max(3, Math.min(8, root.parentElement!.clientWidth / W)).toFixed(3)}px`);
  addEventListener('resize', fit);
  fit();
  render();
  if (reduceMotion) return;

  // Recorre la biblioteca y reproduce de vez en cuando, como alguien usando la app.
  const visible = whileVisible(root);
  let tick = 0, dir = 1;
  (async () => {
    for (;;) {
      await new Promise((r) => setTimeout(r, 500));
      await visible();
      tick++;
      const tr = ALBUMS[S.playing.al].tracks[S.playing.t];
      S.elapsed = Math.min(tr.dur - 1, S.elapsed + 0.5);
      if (tick % 3 === 0) {
        let i = TRACK_ROWS.indexOf(S.cursor) + dir;
        if (i >= TRACK_ROWS.length || i < 0) { dir = -dir; i += 2 * dir; }
        S.cursor = TRACK_ROWS[i];
        if (tick % 15 === 0) {
          const item = ROWS[S.cursor] as { al: number; t: number };
          S.playing = { al: item.al, t: item.t };
          S.elapsed = 0;
        }
      }
      render();
    }
  })();
}
