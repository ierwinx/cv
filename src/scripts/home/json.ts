// Home · iJson: recorre el árbol de un pedido, despliega un elemento y cambia a la vista de texto (⌘2).
import { $, $$, esc } from '../core/dom';
import { reduceMotion, sleep, whileVisible } from '../core/motion';

const s = (cls: string, t: string) => `<span class="${cls}">${esc(t)}</span>`;
const TEXT = [
  s('jv-p', '{'),
  `  ${s('jv-k', '"id"')}${s('jv-p', ':')} ${s('jv-n', '1042')}${s('jv-p', ',')}`,
  `  ${s('jv-k', '"cliente"')}${s('jv-p', ':')} ${s('jv-s', '"Ana López"')}${s('jv-p', ',')}`,
  `  ${s('jv-k', '"total"')}${s('jv-p', ':')} ${s('jv-n', '1.0')}${s('jv-p', ',')}`,
  `  ${s('jv-k', '"pagado"')}${s('jv-p', ':')} ${s('jv-b', 'true')}${s('jv-p', ',')}`,
  `  ${s('jv-k', '"items"')}${s('jv-p', ': [')}`,
  `    ${s('jv-p', '{')} ${s('jv-k', '"sku"')}${s('jv-p', ':')} ${s('jv-s', '"IJ-01"')}${s('jv-p', ',')} ${s('jv-k', '"cant"')}${s('jv-p', ':')} ${s('jv-n', '2')} ${s('jv-p', '},')}`,
  `    ${s('jv-p', '{')} ${s('jv-k', '"sku"')}${s('jv-p', ':')} ${s('jv-s', '"IP-07"')}${s('jv-p', ',')} ${s('jv-k', '"cant"')}${s('jv-p', ':')} ${s('jv-n', '1')} ${s('jv-p', '}')}`,
  `  ${s('jv-p', '],')}`,
  `  ${s('jv-k', '"notas"')}${s('jv-p', ':')} ${s('jv-z', 'null')}`,
  s('jv-p', '}'),
].join('\n');

type Row = { lvl: number; key: string; tw?: string; cnt?: string; val?: [string, string] };
const BASE: Row[] = [
  { lvl: 0, tw: '▼', key: 'raíz', cnt: '{6}' },
  { lvl: 1, key: 'id', val: ['jv-n', '1042'] },
  { lvl: 1, key: 'cliente', val: ['jv-s', '"Ana López"'] },
  { lvl: 1, key: 'total', val: ['jv-n', '1.0'] },
  { lvl: 1, key: 'pagado', val: ['jv-b', 'true'] },
  { lvl: 1, tw: '▼', key: 'items', cnt: '[2]' },
  { lvl: 2, tw: '▶', key: '0', cnt: '{2}' },
  { lvl: 2, tw: '▶', key: '1', cnt: '{2}' },
  { lvl: 1, key: 'notas', val: ['jv-z', 'null'] },
];

export function mount(root: HTMLElement) {
  const views = $('.json-views', root)!, tree = $('#jsonTree', root)!;
  const segs = $$('#jsonSeg b', root);
  const visible = whileVisible(root);
  const wait = async (ms: number) => { await sleep(ms); await visible(); };
  const seg = (i: number) => segs.forEach((b, n) => b.classList.toggle('on', n === i));
  $('#jsonText', root)!.innerHTML = TEXT;

  const render = (rows: Row[], sel: number) => {
    tree.innerHTML = rows.map((r, i) => `
      <li class="${i === sel ? 'sel' : ''}" style="--lvl:${r.lvl}">
        <span class="tw">${r.tw || ''}</span><span class="key">${esc(r.key)}</span>
        ${r.val ? s(r.val[0], r.val[1]) : `<span class="cnt">${r.cnt}</span>`}
      </li>`).join('');
  };

  render(BASE, -1);
  if (reduceMotion) return;
  (async () => {
    for (;;) {
      const rows = BASE.map((r) => ({ ...r }));
      views.classList.remove('text');
      seg(0);
      render(rows, -1);
      await wait(700);
      for (let i = 1; i <= 6; i++) { render(rows, i); await wait(420); }
      rows[6].tw = '▼';
      rows.splice(7, 0, { lvl: 3, key: 'sku', val: ['jv-s', '"IJ-01"'] }, { lvl: 3, key: 'cant', val: ['jv-n', '2'] });
      render(rows, 6);
      await wait(900);
      render(rows, 3);
      await wait(1100);
      views.classList.add('text');
      seg(1);
      await wait(3800);
    }
  })();
}
