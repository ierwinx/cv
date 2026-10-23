// Home · iXML: árbol y texto sincronizados, y una abreviatura que se expande con ⇥.
import { $, esc } from '../core/dom';
import { reduceMotion, sleep, whileVisible } from '../core/motion';

const s = (cls: string, t: string) => `<span class="${cls}">${esc(t)}</span>`;
const tag = (t: string) => s('xv-t', t);
const attr = (k: string, v: string) => `${s('xv-a', k)}${s('xv-p', '=')}${s('xv-v', `"${v}"`)}`;
const LINES = [
  `${s('xv-p', '<?')}${s('xv-t', 'xml')} ${attr('version', '1.0')}${s('xv-p', '?>')}`,
  tag('<biblioteca>'),
  `  ${s('xv-c', '<!-- Clásicos -->')}`,
  `  ${tag('<libro')} ${attr('id', '1')}${tag('>')}`,
  `    ${tag('<titulo>')}Cien años de soledad${tag('</titulo>')}`,
  `    ${tag('<autor>')}García Márquez${tag('</autor>')}`,
  `    ${tag('<año>')}1967${tag('</año>')}`,
  `  ${tag('</libro>')}`,
];
const CLOSE = tag('</biblioteca>');
const TYPED = 'libro[id=2 idioma]';
const EXPANDED = `  ${tag('<libro')} ${attr('id', '2')} ${s('xv-a', 'idioma')}${s('xv-p', '=')}${s('xv-v', '"')}<span class="caret"></span>${s('xv-v', '"')}${tag('></libro>')}`;

type Node = { name: string; color: string; lvl: number; line: number; at?: string; fresh?: boolean };
const NODES: Node[] = [
  { name: 'biblioteca', color: '#b9a8ff', lvl: 0, line: 1 },
  { name: 'libro', color: '#ff9be9', lvl: 1, line: 3, at: 'id="1"' },
  { name: 'titulo', color: '#8fe9ff', lvl: 2, line: 4 },
  { name: 'autor', color: '#7dffc4', lvl: 2, line: 5 },
  { name: 'año', color: '#ffd98a', lvl: 2, line: 6 },
];
const FRESH: Node = { name: 'libro', color: '#ff9be9', lvl: 1, line: 8, at: 'id="2" idioma=""', fresh: true };

export function mount(root: HTMLElement) {
  const tree = $('#xmlTree', root)!, code = $('#xmlCode', root)!, foot = $('#xmlFoot', root)!, state = $('#xmlState', root)!;
  const visible = whileVisible(root);
  const wait = async (ms: number) => { await sleep(ms); await visible(); };

  const render = (extra: string | null, nodes: Node[], sel = -1) => {
    const lines = extra === null ? [...LINES, CLOSE] : [...LINES, extra, CLOSE];
    const selLine = sel >= 0 ? nodes[sel].line : -1;
    code.innerHTML = lines.map((l, i) => `<span class="${i === selLine ? 'sel' : ''}"><span class="ln">${i + 1}</span>${l}</span>`).join('');
    tree.innerHTML = nodes.map((n, i) => `
      <li class="${[i === sel ? 'sel' : '', n.fresh ? 'new' : ''].join(' ').trim()}" style="--lvl:${n.lvl}">
        <span class="ic" style="background:${n.color}">${n.name[0].toUpperCase()}</span><span>${n.name}</span>${n.at ? `<span class="at">${esc(n.at)}</span>` : ''}
      </li>`).join('');
  };

  if (reduceMotion) { render(EXPANDED, [...NODES, FRESH]); return; }
  render(null, NODES);
  (async () => {
    for (;;) {
      state.textContent = 'Abierto';
      foot.textContent = 'Árbol y texto, sincronizados';
      render(null, NODES);
      await wait(900);
      for (let i = 0; i < NODES.length; i++) { render(null, NODES, i); await wait(520); }

      state.textContent = 'Editado';
      foot.textContent = 'Escribe la abreviatura…';
      for (let i = 0; i <= TYPED.length; i++) {
        render(`  ${s('xv-g', TYPED.slice(0, i))}<span class="caret"></span>`, NODES);
        await wait(85);
      }
      render(`  ${s('xv-g', TYPED)}<span class="caret"></span><span class="kc">⇥ Tab</span>`, NODES);
      await wait(700);
      const nodes = [...NODES, FRESH];
      foot.textContent = '…y la etiqueta se cierra sola';
      render(EXPANDED, nodes, nodes.length - 1);
      await wait(2600);
      foot.textContent = '⌘Z deshace la expansión de una vez';
      await wait(1600);
    }
  })();
}
