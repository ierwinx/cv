// Home · iCSV: salta a la fila 4 812 337 de 10 millones sin parpadear y recorre celdas (sin perder ceros).
import { $, esc } from '../core/dom';
import { reduceMotion, sleep, whileVisible } from '../core/motion';

const TOTAL = 10000000;
const VISIBLE = 9;
const NAMES = ['Ana López', 'Luis Pérez', 'Sofía Ramos', 'Diego Torres', 'Valeria Cruz', 'Mateo Díaz', 'Camila Ortiz', 'Javier Ruiz', 'Lucía Méndez', 'Emilio Vega'];
const CITIES = ['CDMX', 'Monterrey', 'Guadalajara', 'Puebla', 'Mérida', 'Querétaro', 'Toluca', 'Oaxaca'];
const ZIPS = ['06720', '01000', '03100', '04510', '06600', '09000', '07300', '05120'];
const fmt = (n: number) => n.toLocaleString('en-US').replace(/,/g, ' ');

/** Fila n, siempre la misma (hash de n). */
function row(n: number) {
  const h = (n * 2654435761) >>> 0;
  return [fmt(n), NAMES[h % NAMES.length], CITIES[(h >>> 5) % CITIES.length], ZIPS[(h >>> 9) % ZIPS.length], ((h % 900000) / 100 + 10).toFixed(2)];
}

export function mount(root: HTMLElement) {
  const grid = $('#csvGrid', root)!, foot = $('#csvFoot', root)!;
  const visible = whileVisible(root);
  const wait = async (ms: number) => { await sleep(ms); await visible(); };

  const render = (top: number, selRow = -1, selCol = -1) => {
    let body = '';
    for (let r = 0; r < VISIBLE; r++) {
      body += '<div class="csv-row">' + row(top + r).map((c, ci) => {
        const cls = [ci === 3 ? 'zip' : '', ci === 4 ? 'num' : '', r === selRow && ci === selCol ? 'cell-sel' : ''].join(' ').trim();
        return `<span${cls ? ` class="${cls}"` : ''}>${esc(c)}</span>`;
      }).join('') + '</div>';
    }
    grid.innerHTML = '<div class="csv-row csv-row--head"><span>#</span><span>cliente</span><span>ciudad</span><span>código_postal</span><span>importe</span></div>' + body;
  };

  render(1);
  if (reduceMotion) return;
  (async () => {
    for (;;) {
      render(1);
      foot.textContent = `Fila 1 de ${fmt(TOTAL)}`;
      await wait(1200);

      grid.classList.add('scrolling');
      let top = 1;
      const target = 4812337;
      for (let i = 1; i <= 24; i++) {
        top = Math.round(1 + (target - 1) * (1 - Math.pow(1 - i / 24, 3)));
        render(top);
        foot.textContent = `Fila ${fmt(top)} de ${fmt(TOTAL)}`;
        await wait(55);
      }
      grid.classList.remove('scrolling');

      for (const [r, c] of [[2, 1], [2, 2], [3, 2], [3, 3], [4, 3], [4, 4]]) {
        render(top, r, c);
        foot.textContent = c === 3 ? `código_postal = ${row(top + r)[c]} · sin ceros perdidos` : `Fila ${fmt(top + r)} de ${fmt(TOTAL)}`;
        await wait(650);
      }
      await wait(2200);
    }
  })();
}
