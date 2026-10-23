// Home · Academia: un programa de FastAPI que se escribe solo, con resaltado de Python.
import { esc } from '../core/dom';
import { reduceMotion, sleep, whileVisible } from '../core/motion';

const SOURCE = [
  'from fastapi import FastAPI',
  '',
  'app = FastAPI()',
  '',
  '@app.get("/suite")',
  'def suite():',
  '    # Toda la suite ierwinx, como JSON',
  '    return ["iRar", "iGit", "iTunes", "iSpecter",',
  '            "iConverter", "Super Pets"]',
  '',
].join('\n');
const OUTPUT = '\n<span class="c">$ uvicorn main:app</span>\n<span class="o">✓ Listo en http://127.0.0.1:8000</span>';

// Un solo recorrido: lo que se marca para un token nunca lo vuelve a tocar otro.
function highlight(src: string) {
  const token = /(#[^\n]*)|("[^"\n]*"?)|\b(from|import|def|return)\b|(@app\.get|FastAPI(?=\())/g;
  let html = '', last = 0, m: RegExpExecArray | null;
  while ((m = token.exec(src))) {
    html += esc(src.slice(last, m.index));
    const cls = m[1] ? 'c' : m[2] ? 's' : m[3] ? 'k' : 'f';
    html += `<span class="${cls}">${esc(m[0])}</span>`;
    last = token.lastIndex;
  }
  return html + esc(src.slice(last));
}

export function mount(root: HTMLElement) {
  if (reduceMotion) { root.innerHTML = highlight(SOURCE) + OUTPUT; return; }
  const visible = whileVisible(root);
  (async () => {
    for (;;) {
      for (let i = 0; i <= SOURCE.length; i++) {
        await visible();
        root.innerHTML = highlight(SOURCE.slice(0, i)) + '<span class="caret"></span>';
        await sleep(SOURCE[i - 1] === '\n' ? 160 : 28 + Math.random() * 40);
      }
      await sleep(500);
      root.innerHTML = highlight(SOURCE) + OUTPUT + '<span class="caret"></span>';
      await sleep(4500);
    }
  })();
}
