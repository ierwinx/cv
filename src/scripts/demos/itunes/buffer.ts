// Búfer de celdas de la terminal (ScreenBuffer) y su paso a HTML. Lo comparten /itunes/ y la home.
import { T, St, type Cell, type Rect, type Style } from './theme';

/* ------------------------------------------------------------------------
   ScreenBuffer
   ------------------------------------------------------------------------ */
export class Buffer {
  cells: Cell[];
  constructor(public w: number, public h: number) { this.cells = Array.from({ length: w * h }, () => ({ ch: " ", ...St(T.text) })); }
  put(ch: string, x: number, y: number, s: Partial<Style> & { fg: string; bg: string }) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.cells[y * this.w + x] = { ch, fg: s.fg, bg: s.bg, b: !!s.b };
  }
  text(str: string, x: number, y: number, maxW: number, s: Style) {
    let chars = [...str];
    if (maxW <= 0) return 0;
    if (chars.length > maxW) chars = chars.slice(0, Math.max(0, maxW - 1)).concat("…");
    chars.forEach((c, i) => this.put(c, x + i, y, s));
    return chars.length;
  }
  fill(r: Rect, s: Style, ch = " ") { for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) this.put(ch, x, y, s); }
}

const escChar = (c: string) => c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '&' ? '&amp;' : c;

/** Filas de <span>: une las celdas seguidas con el mismo estilo. `solo`: caracteres que van en su propia celda
 *  centrada (su ancho real no siempre es el de la fuente mono). `cursor`: celda con el cursor de texto encendido. */
export function toHtml(buf: Buffer, { solo, cursor }: { solo: Set<string>; cursor?: { x: number; y: number } | null }) {
  const out: string[] = [];
  for (let y = 0; y < buf.h; y++) {
    let row = '<span class="r">';
    let run: { fg: string; bg: string; b: boolean; n: number; s: string } | null = null;
    const flush = () => {
      if (!run) return;
      row += `<span style="width:${run.n * .6}em;color:${run.fg};background:${run.bg}">${run.b ? '<b>' + run.s + '</b>' : run.s}</span>`;
      run = null;
    };
    for (let x = 0; x < buf.w; x++) {
      let c = buf.cells[y * buf.w + x];
      if (cursor && cursor.x === x && cursor.y === y) c = { ...c, fg: c.bg, bg: T.bright };
      if (c.ch === '▀' || c.ch === '█') {
        flush();
        const bg = c.ch === '▀' ? `linear-gradient(${c.fg} 50%,${c.bg} 50%)` : c.fg;
        row += `<span style="width:.6em;background:${bg}"> </span>`;
      } else if (solo.has(c.ch)) {
        flush();
        row += `<span style="width:.6em;text-align:center;color:${c.fg};background:${c.bg}">${c.b ? '<b>' + c.ch + '</b>' : c.ch}</span>`;
      } else if (run && run.fg === c.fg && run.bg === c.bg && run.b === c.b) { run.n++; run.s += escChar(c.ch); }
      else { flush(); run = { fg: c.fg, bg: c.bg, b: c.b, n: 1, s: escChar(c.ch) }; }
    }
    flush();
    out.push(row + '</span>');
  }
  return out.join('');
}
