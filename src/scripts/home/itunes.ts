// Home · iTunes: recreación de su pantalla real (biblioteca de Insite con carátulas de píxeles, lista y
// reproductor). Se dibuja en un búfer de celdas como la app y recorre la lista como alguien usándola.
import { reduceMotion, whileVisible } from '../core/motion';
import { T, St } from '../demos/itunes/theme';
import { Buffer, toHtml } from '../demos/itunes/buffer';
import { ARTISTS, fmt } from '../demos/itunes/library';

const W = 96, H = 26, CW = 10, CH = 5;

// Los álbumes de Insite de la biblioteca de /itunes/ (las mismas carátulas), con menos pistas para que quepan.
const INSITE = ARTISTS.find((a) => a.name === 'Insite')!.albums;
const pick = (title: string, tracks?: number) => {
  const al = INSITE.find((x) => x.title === title)!;
  return { ...al, cover: al.cover!, tracks: tracks ? al.tracks.slice(0, tracks) : al.tracks };
};
const ALBUMS = [pick('Otra Historia EP'), pick('Una Vida No Es Suficiente', 8), pick('M M X', 3)];
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

const coverRow = (buf: Buffer, px: string[], row: number, x: number, y: number) => {
  for (let c = 0; c < CW; c++) buf.put('▀', x + c, y, { fg: px[row * 2 * CW + c], bg: px[(row * 2 + 1) * CW + c], b: false });
};

type State = { cursor: number; offset: number; playing: { al: number; t: number }; elapsed: number; isPlaying: boolean; button: string };

function draw(S: State) {
  const buf = new Buffer(W, H), heading = (on: boolean) => St(on ? T.accent : T.dim, T.background, true);
  const cur = ALBUMS[S.playing.al], tr = cur.tracks[S.playing.t];

  // Encabezado
  let x = m;
  x += buf.text('ılıl ', x, 0, 10, St(T.accent, T.background, true));
  buf.text('iTunes', x, 0, 10, St(T.bright, T.background, true));
  const info = '4280 canciones · 114 artistas';
  buf.text(info, W - m - info.length, 0, info.length, St(T.dim));
  buf.fill({ x: m, y: 1, w: W - 2 * m, h: 1 }, St(T.separator), '─');

  // Artistas
  buf.text('ARTISTAS', m, 2, aw, heading(false));
  buf.text('/ Buscar artista', m + 1, 3, aw, St(T.track));
  ARTIST_ROWS.slice(0, listH).forEach((name, i) => {
    const y = 4 + i;
    if (name.length === 1) { buf.text(name, m, y, aw, St(T.bright, T.background, true)); return; }
    let s = St(name === 'Insite' ? T.accent : T.dim);
    if (name === 'Insite') { s = St(T.bright, T.surface); buf.fill({ x: m, y, w: aw, h: 1 }, s); }
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
    if (isCursor) buf.fill({ x: listX, y, w: listW, h: 1 }, bs);
    if (item.type === 'spacer') buf.fill({ x: lx, y, w: lw, h: 1 }, St(T.separator), '─');
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
  buf.fill({ x: m, y: playerTop, w: W - 2 * m, h: 1 }, St(T.separator), '─');
  for (let r = 0; r < CH; r++) coverRow(buf, cur.cover, r, m, playerTop + 1 + r);
  const ix = m + CW + 2, iw = W - m - ix;
  buf.text('Vol 100%', W - m - 8, playerTop + 1, 8, St(T.dim));
  buf.text('EQ Rock', W - m - 7, playerTop + 2, 7, St(T.accent));
  buf.text(tr.title, ix, playerTop + 1, iw - 10, St(T.bright, T.background, true));
  buf.text(`Insite · ${cur.title} (${cur.year})`, ix, playerTop + 2, iw - 10, St(T.text));
  buf.text('FLAC · 44.1 kHz · 16 bit', ix, playerTop + 3, iw - 10, St(T.dim));
  let bx = Math.max(ix, Math.floor((W - 33) / 2));
  ([['shuffle', '⇄', T.dim], ['previous', '◀◀', T.text], ['playPause', S.isPlaying ? '❚❚' : '▶', T.accent], ['next', '▶▶', T.text], ['repeat', '↻', T.dim]] as const)
    .forEach(([id, label, fg]) => {
      const s = St(fg, S.button === id ? T.selection : T.background, id === 'playPause');
      buf.fill({ x: bx, y: playerTop + 4, w: 5, h: 1 }, s);
      buf.text(label, bx + Math.floor((5 - [...label].length) / 2), playerTop + 4, 5, s);
      bx += 7;
    });
  const now = fmt(S.elapsed), tot = fmt(tr.dur), py = playerTop + 5;
  const barX = ix + tot.length + 1, barW = iw - 2 * (tot.length + 1);
  buf.text(now, barX - 1 - now.length, py, now.length, St(T.dim));
  buf.text(tot, barX + barW + 1, py, tot.length, St(T.dim));
  buf.fill({ x: barX, y: py, w: barW, h: 1 }, St(T.track), '━');
  buf.fill({ x: barX, y: py, w: Math.round((S.elapsed / tr.dur) * barW), h: 1 }, St(T.accent), '━');
  return buf;
}

// Caracteres que se dibujan en su propia celda centrada (su ancho real no siempre es el de la fuente mono).
const SOLO = new Set(['▶', '◀', '❚', '⇄', '↻', 'ı', '…', '·', '━', '─']);
export function mount(root: HTMLElement) {
  const S: State = { cursor: TRACK_ROWS[1], offset: 0, playing: { al: 0, t: 1 }, elapsed: 74, isPlaying: true, button: 'playPause' };
  const render = () => { root.innerHTML = toHtml(draw(S), { solo: SOLO }); };
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
