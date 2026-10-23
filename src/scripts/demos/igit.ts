// Demo de iGit: recreación de su pantalla real. Elige archivos y líneas, escribe el mensaje, hace commit
// y sube a GitHub, con las teclas en pantalla. La usan /igit/ y la home (components/demos/IgitDemo.astro).
import { reduceMotion, sleep, whileVisible } from '../core/motion';

const COLS = 96;
const SPIN = '⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏';

type Line = [kind: 'hunk' | 'ctx' | 'add' | 'del', old: number | '', now: number | '', text: string];
type File = { path: string; kind: string; cls: string; stats: string; diff: Line[] };

const FILES: File[] = [
  { path: 'Sources/iGitUI/Keymap/Keymap.swift', kind: '◼', cls: 'c-mod', stats: '+4 −1', diff: [
    ['hunk', '', '', '@@ -12,6 +12,9 @@ package struct Keymap {'],
    ['ctx', 12, 12, '    package static let standard = Keymap()'],
    ['del', 13, '', '    static let bindings: [Binding] = defaults'],
    ['add', '', 13, '    let bindings: [Binding]'],
    ['add', '', 14, '    package init(overrides: [AppCommand: [KeyChord]]) {'],
    ['add', '', 15, '        print("debug keymap")'],
    ['add', '', 16, '        bindings = Self.merge(defaults, overrides)'],
    ['ctx', 14, 17, '    }'],
  ] },
  { path: 'Sources/iGitCore/Rules/KeymapRules.swift', kind: '✚', cls: 'c-add', stats: '+6 −0', diff: [
    ['hunk', '', '', '@@ -0,0 +1,6 @@'],
    ['add', '', 1, '/// Valida el keymap.json del usuario.'],
    ['add', '', 2, 'package enum KeymapRules {'],
    ['add', '', 3, '    static func resolve(_ file: KeymapFile?) -> Resolved {'],
    ['add', '', 4, '        guard let file else { return Resolved() }'],
    ['add', '', 5, '        return Resolved(parsing: file)'],
    ['add', '', 6, '    }'],
  ] },
  { path: 'Sources/iGitApp/Subcommands/CLI.swift', kind: '◼', cls: 'c-mod', stats: '+2 −1', diff: [
    ['hunk', '', '', '@@ -28,7 +28,8 @@ enum CLI {'],
    ['ctx', 28, 28, '        case "doctor":'],
    ['del', 29, '', '            return await doctor()'],
    ['add', '', 29, '            return await doctor(environment)'],
    ['add', '', 30, '        case "keymap": return keymap()'],
    ['ctx', 30, 31, '        default:'],
  ] },
  { path: 'docs/decisions/ADR-0023.md', kind: '✚', cls: 'c-add', stats: '+3 −0', diff: [
    ['hunk', '', '', '@@ -0,0 +1,3 @@'],
    ['add', '', 1, '# ADR-0023 · Keymap configurable'],
    ['add', '', 2, ''],
    ['add', '', 3, '**Estado:** aceptada'],
  ] },
  { path: 'Notas.md', kind: '✚', cls: 'c-new', stats: '+1 −0', diff: [
    ['hunk', '', '', '@@ -0,0 +1 @@'],
    ['add', '', 1, '- probar la galería en Terminal.app'],
  ] },
];

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const swift = (code: string) => esc(code)
  .replace(/("[^"]*")/g, '<span class="str">$1</span>')
  .replace(/\b(package|static|let|var|func|return|guard|else|init|struct|enum|try|await|if|for|in|case)\b/g, '<span class="kw">$1</span>')
  .replace(/\b([a-z][A-Za-z]+)(?=\()/g, '<span class="fn">$1</span>');
const middle = (s: string, n: number) => s.length <= n ? s : s.slice(0, Math.ceil((n - 1) * 0.35)) + '…' + s.slice(s.length - Math.floor((n - 1) * 0.65));

type FileState = File & { included: boolean; off: Set<number> };
const freshState = () => ({
  files: FILES.map((f, i): FileState => ({ ...f, included: i !== 4, off: new Set() })),
  sel: 0, focus: 'files' as 'files' | 'diff' | 'summary', cursor: -1,
  summary: '', typing: false, ready: false, press: false,
  sync: { icon: '↑', title: 'Push origin', sub: '1 commit por subir' }, busy: false, spin: 0,
  toast: '',
});

function box(f: FileState) {
  if (!f.included) return '☐';
  const changes = f.diff.filter((l) => l[0] === 'add' || l[0] === 'del').length;
  return f.off.size === 0 ? '☑' : f.off.size < changes ? '◪' : '☐';
}

function html(S: ReturnType<typeof freshState>) {
  const f = S.files[S.sel];
  const included = S.files.filter((x) => x.included).length;
  const all = included === S.files.length ? '☑' : included === 0 ? '☐' : '◪';
  const rows = S.files.map((x, i) => {
    const cls = ['row', 'file', i === S.sel ? 'sel' : '', i === S.sel && S.focus === 'files' ? 'focus' : ''].join(' ');
    return `<div class="${cls}"><span><span class="check">${box(x)}</span> ${esc(middle(x.path, 23))}</span><span class="k ${x.cls}">${x.kind}</span></div>`;
  }).join('');
  const diff = f ? f.diff.map(([kind, o, n, text], i) => {
    if (kind === 'hunk') return `<div class="dl hunk"><span class="check">${box(f)}</span> ${esc(text)}</div>`;
    const off = f.off.has(i) || !f.included;
    const mark = kind === 'ctx' ? ' ' : off ? '☐' : '☑';
    const sign = kind === 'add' ? '+' : kind === 'del' ? '−' : ' ';
    const cls = ['dl', kind === 'ctx' ? '' : kind, off && kind !== 'ctx' ? 'off' : '', S.focus === 'diff' && S.cursor === i ? 'cursor' : ''].join(' ');
    return `<div class="${cls}"><span class="check">${mark}</span> <span class="n">${String(o).padStart(2)} ${String(n).padStart(2)}</span><span class="t">${sign} ${swift(text)}</span></div>`;
  }).join('') : '';
  const btnLabel = included ? `Commit ${included} archivo${included === 1 ? '' : 's'} a main` : 'Commit a main';
  const hints = S.focus === 'summary'
    ? '<span><b>⌃S</b> commit · <b>Tab</b> panel · <b>Esc</b> volver</span>'
    : S.focus === 'diff'
      ? '<span><b>↑↓</b> mover · <b>Space</b> incluir · <b>x</b> hunk · <b>Esc</b> volver · <b>⌃P</b> comandos</span>'
      : '<span><b>Tab</b> panel · <b>Space</b> incluir · <b>c</b> mensaje · <b>s</b> sync · <b>/</b> filtrar · <b>⌃P</b> comandos · <b>?</b> ayuda</span>';
  const [plus, minus] = f ? f.stats.split(' ') : ['', ''];
  return `
    <div class="tb">
      <div class="seg"><small>Repositorio actual</small>◇ iGit<span style="float:right">▾</span></div>
      <div class="seg"><small>Rama actual</small>⎇ main<span style="float:right">▾</span></div>
      <div class="seg ${S.busy ? 'busy' : ''}"><small>${S.busy ? 'Subiendo a origin…' : S.sync.sub}</small>${S.busy ? `<span class="spin">${SPIN[S.spin % SPIN.length]}</span> Push origin` : `${S.sync.icon} ${S.sync.title}`}</div>
    </div>
    <div class="tabs"><span class="on">Cambios ${S.files.length}</span><span>Historial</span></div>
    <div class="main">
      <div class="left">
        <div class="row hdr">⌕ Filtrar…</div>
        <div class="row hdr"><span class="check">${all}</span> ${S.files.length} archivos cambiados</div>
        <div class="files">${rows}</div>
        <div class="commit">
          <div class="summary ${S.typing ? 'typing' : ''}">${S.summary ? esc(middle(S.summary, 26)) + (S.typing ? '<span class="tcaret">▍</span>' : '') : '◔ Resumen (obligatorio)'}</div>
          <div class="desc">Descripción</div>
          <div class="commit-btn ${S.ready ? 'ready' : ''} ${S.press ? 'press' : ''}">${btnLabel}</div>
        </div>
      </div>
      <div class="right">
        <div class="diffhead"><span>${f ? esc(f.path) : ''}</span><span class="st"><span class="c-add">${plus}</span> <span class="c-del">${minus}</span></span></div>
        <div class="diff">${diff}</div>
      </div>
    </div>
    <div class="hints">${hints}<span>main · ${S.files.length} cambios</span></div>
    <div class="ttoast ${S.toast ? 'on' : ''}">${S.toast}</div>`.replace(/>\s*\n\s*</g, '><').trim();
}

/** `root` contiene [data-tui] (la pantalla) y [data-keycast] (las teclas pulsadas). */
export function mount(root: HTMLElement) {
  const tui = root.querySelector<HTMLElement>('[data-tui]')!;
  const keycast = root.querySelector<HTMLElement>('[data-keycast]')!;
  const visible = whileVisible(root);
  let S = freshState();

  const fit = () => tui.style.setProperty('--fs', `${Math.max(4, Math.min(14.5, tui.clientWidth / (COLS * 0.602)))}px`);
  const render = () => { tui.innerHTML = html(S); };
  addEventListener('resize', fit);
  fit();
  render();
  if (reduceMotion) return;

  const cast = (k: string, label: string) => {
    const el = document.createElement('span');
    el.innerHTML = `${esc(k)}${label ? `<em>${esc(label)}</em>` : ''}`;
    keycast.appendChild(el);
    setTimeout(() => el.remove(), 1400);
    while (keycast.children.length > 3) keycast.firstChild!.remove();
  };
  // Solo corre mientras se ve (0 % de CPU fuera de pantalla).
  const wait = async (ms: number) => { await sleep(ms); await visible(); };
  const press = async (k: string, label: string, fn?: () => void, ms = 650) => {
    cast(k, label);
    fn?.();
    render();
    await wait(ms);
  };

  (async () => {
    for (;;) {
      S = freshState();
      fit();
      render();
      await wait(1400);
      await press('↓', '', () => (S.sel = 1));
      await press('↓', '', () => (S.sel = 2));
      await press('↓', '', () => (S.sel = 3), 500);
      await press('Space', 'excluir', () => (S.files[3].included = false), 900);
      await press('Home', '', () => (S.sel = 0), 700);
      await press('⏎', 'al diff', () => { S.focus = 'diff'; S.cursor = 1; }, 500);
      for (const c of [2, 3, 4, 5]) await press('↓', '', () => (S.cursor = c), 280);
      await press('Space', 'quitar línea', () => S.files[0].off.add(5), 1000);
      await press('c', 'mensaje', () => { S.focus = 'summary'; S.typing = true; }, 400);
      for (const ch of 'Atajos configurables con keymap.json') {
        S.summary += ch;
        S.ready = true;
        render();
        await wait(38 + Math.random() * 40);
      }
      await wait(500);
      await press('⌃S', 'commit', () => (S.press = true), 220);
      S.press = false; S.typing = false; S.focus = 'files';
      // Lo incluido se va; quedan la línea que no entró, el ADR excluido y Notas.md
      const kept = S.files.filter((x, i) => !x.included || x.off.size > 0 || i === 4);
      S.files = kept.map((x) => x.path.endsWith('Keymap.swift')
        ? { ...x, included: true, off: new Set(), stats: '+1 −0', diff: [['hunk', '', '', '@@ -15,0 +15,1 @@'], ['add', '', 15, '        print("debug keymap")']] }
        : x);
      S.sel = 0; S.summary = ''; S.ready = false;
      S.sync = { icon: '↑', title: 'Push origin', sub: '2 commits por subir' };
      S.toast = '✓ Commit: «Atajos configurables con keymap.json»';
      render();
      await wait(2200);
      S.toast = '';
      await press('s', 'sincronizar', () => (S.busy = true), 120);
      for (let i = 0; i < 16; i++) { S.spin++; render(); await sleep(90); }
      S.busy = false;
      S.sync = { icon: '↻', title: 'Fetch origin', sub: 'hace un momento' };
      S.toast = '✓ Push hecho · GitHub CI ●';
      render();
      await wait(2600);
      S.toast = '';
      render();
      await wait(1200);
      tui.style.transition = 'opacity .5s';
      tui.style.opacity = '0';
      await sleep(550);
      tui.style.opacity = '1';
    }
  })();
}
