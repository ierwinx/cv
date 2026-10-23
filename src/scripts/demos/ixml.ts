// Demo de iXML: el árbol aparece fila a fila y el código escribe `libro[id=2 idioma]` y lo expande con ⇥.
import { reduceMotion, sleep, whileVisible } from '../core/motion';

const TREE: [name: string, color: string, attr: string, badge: string, depth: number][] = [
  ['biblioteca', '#b9a8ff', '', '2', 0],
  ['libro', '#ff9be9', 'id="1"', '3', 1],
  ['titulo', '#8fe9ff', '', '', 2],
  ['autor', '#7dffc4', '', '', 2],
  ['año', '#ffd98a', '', '', 2],
  ['libro', '#ff9be9', 'id="2"', '3', 1],
];

const LINES = [
  '<span class="p">&lt;?</span><span class="t">xml</span> <span class="at">version</span><span class="p">=</span><span class="v">"1.0"</span><span class="p">?&gt;</span>',
  '<span class="t">&lt;biblioteca&gt;</span>',
  '  <span class="cm">&lt;!-- Clásicos --&gt;</span>',
  '  <span class="t">&lt;libro</span> <span class="at">id</span><span class="p">=</span><span class="v">"1"</span><span class="t">&gt;</span>',
  '    <span class="t">&lt;titulo&gt;</span>Cien años de soledad<span class="t">&lt;/titulo&gt;</span>',
  '    <span class="t">&lt;autor&gt;</span>García Márquez<span class="t">&lt;/autor&gt;</span>',
  '    <span class="t">&lt;año&gt;</span>1967<span class="t">&lt;/año&gt;</span>',
  '  <span class="t">&lt;/libro&gt;</span>',
];
const TYPED = 'libro[id=2 idioma]';
const EXPANDED = '  <span class="t">&lt;libro</span> <span class="at">id</span><span class="p">=</span><span class="v">"2"</span> <span class="at">idioma</span><span class="p">=</span><span class="v">"<span class="caret"></span>"</span><span class="t">&gt;&lt;/libro&gt;</span>';

export function mount(root: HTMLElement) {
  const tree = root.querySelector<HTMLElement>('[data-tree]')!;
  const code = root.querySelector<HTMLElement>('[data-code]')!;
  const keycap = root.querySelector<HTMLElement>('[data-keycap]')!;
  const visible = whileVisible(root);

  TREE.forEach(([n, c, a, b, d], i) => {
    const r = document.createElement('div');
    r.className = 'row' + (i === 5 ? ' sel' : '');
    r.style.paddingLeft = 8 + d * 16 + 'px';
    r.innerHTML = `<span class="ic" style="background:${c}">${n[0].toUpperCase()}</span><span>${n}</span>${a ? `<span class="chip">${a}</span>` : ''}${b ? `<span class="badge">${b}</span>` : ''}`;
    tree.appendChild(r);
    setTimeout(() => r.classList.add('show'), 600 + i * 140);
  });

  const render = (extra: string) => {
    code.innerHTML = [...LINES, extra, '<span class="t">&lt;/biblioteca&gt;</span>']
      .map((l, i) => `<span class="ln">${i + 1}</span>${l}`).join('\n');
  };

  if (reduceMotion) { render(EXPANDED); return; }
  (async () => {
    await sleep(900);
    for (;;) {
      await visible();
      keycap.classList.remove('on');
      for (let i = 0; i <= TYPED.length; i++) {
        render('  <span class="ghost">' + TYPED.slice(0, i) + '</span><span class="caret"></span>');
        await sleep(70 + Math.random() * 60);
      }
      await sleep(500);
      keycap.classList.add('on'); render(EXPANDED);
      await sleep(3700);
    }
  })();
}
