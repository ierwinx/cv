// Home · iPlist: edita un Info.plist (versión, un Integer que sigue siendo Integer, un Boolean),
// despliega un Array y guarda como binario. Se pausa fuera de pantalla o con su pestaña oculta.
import { $, $$, esc } from '../core/dom';
import { reduceMotion, sleep, whileVisible } from '../core/motion';

type Row = { k: string; t: string; v?: string; bool?: boolean; lvl: number; tw?: string; muted?: boolean };
const DATA: Row[] = [
  { k: 'Root', t: 'Dictionary', v: '9 elementos', lvl: 0, tw: '▼', muted: true },
  { k: 'CFBundleIdentifier', t: 'String', v: 'com.ierwinx.iPlist', lvl: 1 },
  { k: 'CFBundleName', t: 'String', v: 'iPlist', lvl: 1 },
  { k: 'CFBundleShortVersionString', t: 'String', v: '1.0', lvl: 1 },
  { k: 'CFBundleVersion', t: 'Integer', v: '42', lvl: 1 },
  { k: 'LSMinimumSystemVersion', t: 'String', v: '27.0', lvl: 1 },
  { k: 'CFBundleDocumentTypes', t: 'Array', v: '2 elementos', lvl: 1, tw: '▶', muted: true },
  { k: 'NSHighResolutionCapable', t: 'Boolean', bool: true, lvl: 1 },
  { k: 'LSApplicationCategoryType', t: 'String', v: 'public.app-category.developer-tools', lvl: 1 },
];
const CHILDREN: Row[] = [
  { k: 'Item 0', t: 'Dictionary', v: '4 elementos', lvl: 2, tw: '▶', muted: true },
  { k: 'Item 1', t: 'Dictionary', v: '4 elementos', lvl: 2, tw: '▶', muted: true },
];
const copy = (rows: Row[]) => rows.map((r) => ({ ...r }));

export function mount(root: HTMLElement) {
  const list = $('#plistRows', root)!, foot = $('#plistFoot', root)!, state = $('#plistState', root)!;
  const segs = $$('#plistSeg b', root);
  const visible = whileVisible(root);
  const wait = async (ms: number) => { await sleep(ms); await visible(); };
  const seg = (i: number) => segs.forEach((b, n) => b.classList.toggle('on', n === i));

  const render = (rows: Row[], sel: number, caret = false) => {
    list.innerHTML = rows.map((r, i) => {
      const value = r.bool !== undefined
        ? `<span class="bool${r.bool ? '' : ' off'}"><i></i>${r.bool ? 'YES' : 'NO'}</span>`
        : `<span class="v${r.muted ? ' n' : ''}">${esc(r.v!)}${caret && i === sel ? '<span class="caret"></span>' : ''}</span>`;
      return `<li class="${i === sel ? 'sel' : ''}"><span class="k" style="--lvl:${r.lvl};--tw:'${r.tw || ''}'">${r.k}</span><span class="t">${r.t}</span>${value}</li>`;
    }).join('');
  };
  const type = async (rows: Row[], i: number, text: string) => {
    while (rows[i].v!.length) { rows[i].v = rows[i].v!.slice(0, -1); render(rows, i, true); await wait(70); }
    for (const ch of text) { rows[i].v += ch; render(rows, i, true); await wait(110); }
  };

  render(DATA, -1);
  if (reduceMotion) return;
  (async () => {
    for (;;) {
      const rows = copy(DATA);
      seg(0);
      state.textContent = 'Abierto';
      foot.textContent = '⌘Z deshace cualquier cambio';
      render(rows, -1);
      await wait(900);

      for (let i = 1; i <= 3; i++) { render(rows, i); await wait(380); }
      state.textContent = 'Editado';
      foot.textContent = 'Editando CFBundleShortVersionString…';
      await type(rows, 3, '1.1');
      render(rows, 4);
      await wait(400);
      foot.textContent = 'Integer se queda Integer';
      await type(rows, 4, '43');
      await wait(500);

      render(rows, 6);
      await wait(450);
      rows[6].tw = '▼';
      rows.splice(7, 0, ...copy(CHILDREN));
      foot.textContent = 'Solo se crean los nodos que ves';
      render(rows, 6);
      await wait(1200);

      const boolRow = rows.findIndex((r) => r.bool !== undefined);
      render(rows, boolRow);
      await wait(400);
      rows[boolRow].bool = false;
      render(rows, boolRow);
      await wait(900);

      seg(1);
      state.textContent = 'Guardado';
      foot.textContent = 'Guardado como binario';
      await wait(1800);

      foot.textContent = '⌘Z ×4 · todo como estaba';
      seg(0);
      render(copy(DATA), -1);
      await wait(2400);
    }
  })();
}
