// Demo de iBridge: primero un Android en «Música», luego se salta al iPhone desde
// «Otros dispositivos» y se elige un mes de fotos. Las miniaturas son ilustraciones.
import { reduceMotion, sleep, whileVisible } from '../core/motion';

const ICONS = {
  photos: '<rect x="3" y="6" width="15" height="12" rx="2"/><path d="M6 6V4h15v12h-3"/><circle cx="8" cy="10.5" r="1.3"/><path d="M18 16l-4-4-7 6"/>',
  downloads: '<circle cx="12" cy="12" r="9"/><path d="M12 7v9M8 12l4 4 4-4"/>',
  docs: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/>',
  whatsapp: '<path d="M4 6h12v8H9l-3 3v-3H4z"/><path d="M16 9h4v8h-2v3l-3-3h-5v-3"/>',
  music: '<path d="M9 18V5l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="15" r="2.5"/>',
  apps: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
  folder: '<path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>',
  phone: '<rect x="7" y="3" width="10" height="18" rx="2.5"/>',
};
type IconName = keyof typeof ICONS;
const svg = (p: string) => `<svg viewBox="0 0 24 24">${p}</svg>`;
const FOLDER = '<svg class="folder" viewBox="0 0 76 58" style="stroke:none"><path d="M4 8a5 5 0 015-5h17l6 6h35a5 5 0 015 5v3H4z" fill="#c9403b"/><rect x="2" y="13" width="72" height="43" rx="5" fill="#e5534b"/><rect x="2" y="13" width="72" height="3" rx="1.5" fill="#f07a72"/></svg>';
const scene = (sky1: string, sky2: string, ground: string, sun: [number, number, string], w: number, h: number) =>
  `<div class="thumb" style="width:${w}px;height:${h}px"><svg viewBox="0 0 100 100" preserveAspectRatio="none"><defs><linearGradient id="s${sky1.slice(1)}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky1}"/><stop offset="1" stop-color="${sky2}"/></linearGradient></defs><rect width="100" height="100" fill="url(#s${sky1.slice(1)})"/><circle cx="${sun[0]}" cy="${sun[1]}" r="11" fill="${sun[2]}"/><path d="M0 72 L28 48 L48 66 L70 42 L100 70 V100 H0Z" fill="${ground}" opacity=".85"/><path d="M0 84 Q30 74 55 82 T100 80 V100 H0Z" fill="${ground}"/></svg></div>`;

type Device = {
  name: string; color: string; free: string; cap: string; section: string; place: string;
  places: [IconName, string][]; items: { art: string; name: string; count?: string }[];
  summary: string; hint: string; picks: number[]; chosen: string; copying: string; months: boolean;
};

const DEVICES: Record<'android' | 'iphone', Device> = {
  android: {
    name: 'Galaxy de Papá', color: '#4f8ef7', free: '218,15 GB libres', cap: '22%', section: 'En el teléfono', place: 'Música',
    places: [['photos', 'Fotos y videos'], ['downloads', 'Descargas'], ['docs', 'Documentos'], ['whatsapp', 'WhatsApp'], ['music', 'Música'], ['folder', 'Todas las carpetas']],
    items: ['Accidents', 'AFI', 'Alesana', 'Apocalyptica', 'Architects', 'Atreyu', 'Avatar', 'Bad Omens', 'Beta', 'blink-182', 'Ghost', 'Muse'].map((n) => ({ art: FOLDER, name: n })),
    summary: '105 elementos', hint: 'Toca algo para elegirlo. Para elegir varios, mantén ⌘ y toca.',
    picks: [1, 4, 9], chosen: '3 carpetas elegidas', copying: 'Copiando a tu Mac', months: false,
  },
  iphone: {
    name: 'iPhone de Mamá', color: '#a78bfa', free: '190,62 GB libres', cap: '28%', section: 'En el iPhone', place: 'Fotos y videos',
    places: [['photos', 'Fotos y videos'], ['apps', 'Archivos de apps'], ['folder', 'Todas las carpetas']],
    items: ([
      ['Octubre 2026', '23 fotos y 6 videos', scene('#ff9a62', '#ffd36e', '#5b3a6b', [70, 30, '#fff4c2'], 54, 72)],
      ['Septiembre 2026', '24 fotos', scene('#5ac8fa', '#bfe9ff', '#2f7d4f', [24, 26, '#fff'], 72, 54)],
      ['Agosto 2026', '3 fotos', scene('#1e2a5a', '#7c5cff', '#141a33', [72, 24, '#e8e6ff'], 72, 48)],
      ['Julio 2026', '6 fotos', scene('#ffb36b', '#ff6f91', '#6a2c4a', [50, 40, '#ffe3a3'], 72, 54)],
      ['Junio 2026', '3 fotos', scene('#9be7ff', '#e6fbff', '#3ddc84', [30, 28, '#fff7c2'], 54, 72)],
      ['Mayo 2026', '11 fotos', scene('#7fd1ff', '#d8f3ff', '#1f8a8a', [74, 26, '#fff'], 72, 54)],
      ['Abril 2026', '5 fotos', scene('#ffd6e7', '#fff1f6', '#e86a92', [30, 30, '#fff'], 60, 72)],
      ['Marzo 2026', '3 fotos', scene('#2b1b4a', '#ff7b54', '#1a1030', [52, 52, '#ffcf6b'], 72, 54)],
      ['Febrero 2026', '2 fotos', scene('#d9ecff', '#ffffff', '#8aa4c8', [70, 24, '#fff'], 72, 48)],
      ['Enero 2026', '9 fotos', scene('#0f3d3e', '#3a9d8f', '#082323', [28, 30, '#d6fff6'], 72, 54)],
      ['Diciembre 2025', '2 fotos', scene('#14213d', '#3f5aa8', '#0b1020', [70, 28, '#fff'], 54, 72)],
      ['Noviembre 2025', '10 fotos', scene('#ffcc70', '#ff8c42', '#7a3b12', [36, 36, '#fff3c4'], 72, 54)],
    ] as const).map(([name, count, art]) => ({ art, name, count })),
    summary: '14 meses', hint: 'Toca un mes para ver sus fotos',
    picks: [0], chosen: '1 mes elegido', copying: 'Copiando a tu Mac', months: true,
  },
};

export function mount(win: HTMLElement) {
  const $id = (id: string) => win.querySelector<HTMLElement>('#' + id)!;
  const files = $id('files'), cursor = $id('cursor'), status = $id('status');
  const transfer = $id('transfer'), tBar = $id('tBar'), tTitle = $id('tTitle'), tLeft = $id('tLeft');
  const visible = whileVisible(win);

  const show = (key: keyof typeof DEVICES) => {
    const d = DEVICES[key], other = DEVICES[key === 'android' ? 'iphone' : 'android'];
    win.style.setProperty('--dc', d.color);
    $id('dName').textContent = d.name; $id('dFree').textContent = d.free; $id('dCap').style.width = d.cap;
    $id('hPlaces').textContent = d.section;
    $id('tDev').textContent = d.name; $id('tPlace').textContent = d.place;
    $id('cDev').textContent = d.name; $id('cPlace').textContent = d.place;
    $id('viewBy').hidden = !d.months;
    $id('newFolder').classList.toggle('off', d.months);
    $id('places').innerHTML = d.places.map(([ic, n]) => `<div class="it${n === d.place ? ' on' : ''}">${svg(ICONS[ic])}${n}</div>`).join('');
    $id('others').innerHTML = `<div class="it dev" id="otherDev" style="--c:${other.color}">${svg(ICONS.phone)}${other.name}</div>`;
    files.innerHTML = d.items.map((it) =>
      `<div class="f"><div class="art">${it.art}</div><b>${it.name}</b>${it.count ? `<small>${it.count}</small>` : ''}</div>`).join('');
    status.classList.remove('ready');
    $id('sMain').textContent = d.summary; $id('sHint').textContent = d.hint;
  };

  const moveTo = (el: Element) => {
    const w = win.getBoundingClientRect(), r = el.getBoundingClientRect(), k = w.width / win.offsetWidth;
    cursor.style.transform = `translate(${(r.left - w.left + r.width * 0.5) / k}px,${(r.top - w.top + r.height * 0.55) / k}px)`;
  };
  const click = async (el: Element) => {
    moveTo(el); await sleep(900);
    cursor.classList.remove('click'); void cursor.offsetWidth; cursor.classList.add('click');
  };

  const copy = async (d: Device) => {
    await click($id('btnCopy'));
    tTitle.textContent = d.copying; tLeft.textContent = 'Quedan unos segundos';
    tBar.style.transition = 'none'; tBar.style.width = '0';
    transfer.classList.add('on');
    await sleep(60);
    tBar.style.transition = 'width 2.4s cubic-bezier(.4,0,.2,1)'; tBar.style.width = '100%';
    await sleep(1600); tLeft.textContent = 'Ya casi termina';
    await sleep(900); tTitle.textContent = '✓ Listo, ya está en Descargas'; tLeft.textContent = '';
    await sleep(1500);
    transfer.classList.remove('on');
  };

  const play = async (key: keyof typeof DEVICES) => {
    const d = DEVICES[key];
    for (const [n, i] of d.picks.entries()) {
      const el = files.children[i];
      await click(el);
      el.classList.add('sel');
      status.classList.add('ready');
      $id('sMain').textContent = n + 1 === d.picks.length ? d.chosen : `${n + 1} carpeta${n ? 's elegidas' : ' elegida'}`;
      $id('sHint').textContent = 'También puedes arrastrar lo elegido a una carpeta del Finder';
    }
    await copy(d);
  };

  const run = async () => {
    show('android');
    if (reduceMotion) {
      DEVICES.android.picks.forEach((i) => files.children[i].classList.add('sel'));
      status.classList.add('ready'); $id('sMain').textContent = DEVICES.android.chosen;
      return;
    }
    for (;;) {
      await visible();   // fuera de pantalla la demo espera: 0 % de CPU
      cursor.style.opacity = '1';
      await sleep(700);
      await play('android');
      const other = $id('otherDev');
      await click(other); other.classList.add('flash');
      await sleep(250); show('iphone');
      await sleep(700);
      await play('iphone');
      await click($id('otherDev'));
      await sleep(250); show('android');
      await sleep(400);
    }
  };
  setTimeout(run, 700);
}
