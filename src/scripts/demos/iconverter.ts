// Demo de iConverter: elige el bitrate, pulsa Iniciar y convierte un álbum de 14 pistas con su registro.
// La usan /iconverter/ y la home (components/demos/IconverterDemo.astro).
import { reduceMotion, sleep, whileVisible } from '../core/motion';

const SONGS = ['Amanecer', 'Ondas', 'Neón', 'Gravedad', 'Marea Alta', 'Satélite', 'Eco', 'Prisma', 'Medianoche', 'Órbita', 'Ondas (Reprise)', 'Despedida'];
const LOSSY = ['01 Bonus.mp3', '02 Live.mp3'];
const TOTAL = SONGS.length + LOSSY.length;
const PLAY = '<svg width="14" height="14" viewBox="0 0 24 24" fill="#fff"><path d="M6 4l14 8-14 8z"/></svg>Iniciar';
const n2 = (i: number) => String(i + 1).padStart(2, '0');

export function mount(root: HTMLElement) {
  // Ganchos data-ic-*: no chocan con [data-count] ni con otros atributos que usan las páginas.
  const $ = (k: string) => root.querySelector<HTMLElement>(`[data-ic-${k}]`)!;
  const log = $('log'), fill = $('fill'), count = $('count'), state = $('state'), go = $('go'), bit = $('bit');
  const segs = [...$('seg').children] as HTMLElement[];
  const visible = whileVisible(root);

  const add = (text: string) => {
    const line = document.createElement('div');
    line.textContent = text;
    log.appendChild(line);
    while (log.children.length > 8) log.firstChild!.remove();
  };
  const progress = (done: number) => {
    count.textContent = `${done} / ${TOTAL}`;
    fill.style.width = (done / TOTAL) * 100 + '%';
  };

  if (reduceMotion) {
    SONGS.slice(-7).forEach((name, i) => add(`✅ ${n2(i + 5)} ${name}.m4a`));
    add('🏁 Conversión finalizada');
    progress(TOTAL);
    state.textContent = '✅ Conversión completada';
    return;
  }

  // Solo avanza mientras se ve (0 % de CPU fuera de pantalla).
  const wait = async (ms: number) => { await sleep(ms); await visible(); };
  (async () => {
    for (;;) {
      await visible();
      log.innerHTML = '';
      progress(0);
      state.textContent = 'Listo para convertir';
      go.innerHTML = PLAY;
      // Cambia el bitrate para mostrar el selector
      const pick = [3, 2, 3][Math.floor(Math.random() * 3)];
      segs.forEach((seg, i) => seg.classList.toggle('on', i === pick));
      bit.textContent = segs[pick].textContent + ' kbps';
      await wait(1400);

      go.style.transform = 'scale(.96)';
      await sleep(140);
      go.style.transform = '';
      go.innerHTML = '<span class="spin"></span>Convirtiendo…';

      let done = 0;
      for (const f of LOSSY) {
        add(`📋 Copiado: ${f}`);
        progress(++done);
        await wait(260);
      }
      for (let i = 0; i < SONGS.length; i++) {
        state.textContent = `🎧 Convirtiendo: ${n2(i)} ${SONGS[i]}`;
        await wait(380 + Math.random() * 260);
        add(`✅ ${n2(i)} ${SONGS[i]}.m4a`);
        progress(++done);
      }
      add('🏁 Conversión finalizada');
      state.textContent = '✅ Conversión completada';
      go.innerHTML = PLAY;
      await wait(4200);
    }
  })();
}
