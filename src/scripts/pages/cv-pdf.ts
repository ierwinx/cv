// CV en PDF: toma la hoja del idioma (<template id="cv-en|es">), la rasteriza con html2canvas, arma el PDF
// con jsPDF (la foto va aparte, en alta calidad) y lo muestra en el <iframe>.
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { $ } from '../core/dom';

const lang = new URLSearchParams(location.search).get('lang') === 'es' ? 'es' : 'en';
const now = new Date().getFullYear();
const source = $<HTMLTemplateElement>(`#cv-${lang}`)!;
const el = $('#cv-render')!;
const { careerStart, iosStart, photo } = el.dataset;   // los pone la página desde cv.json

document.documentElement.lang = lang;
document.title = `Erwin-cv-${lang.toUpperCase()}`;
$('#loader-text')!.textContent = source.dataset.loader!;
el.innerHTML = source.innerHTML
  .replaceAll('{years}', String(now - +careerStart!))
  .replaceAll('{iosYears}', String(now - +iosStart!));

// Foto circular de alta calidad. La original mide ~3000 px y reducirla de un solo drawImage
// se ve dentada, así que primero se divide a la mitad paso a paso.
async function loadPhoto(src: string, size: number) {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = src;
  });
  const side = Math.min(img.naturalWidth, img.naturalHeight);
  let cur = document.createElement('canvas');
  cur.width = cur.height = side;
  cur.getContext('2d')!.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, side, side);
  while (cur.width / 2 >= size) {
    const next = document.createElement('canvas');
    next.width = next.height = Math.round(cur.width / 2);
    const ctx = next.getContext('2d')!;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(cur, 0, 0, next.width, next.height);
    cur = next;
  }
  const out = document.createElement('canvas');
  out.width = out.height = size;
  const ctx = out.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, size, size);
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.clip();
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(cur, 0, 0, size, size);
  return out.toDataURL('image/jpeg', 0.95);
}

const photoReady = loadPhoto(photo!, 600).catch(() => null);

async function render() {
  const [, photoData] = await Promise.all([document.fonts.ready, photoReady]);
  const canvas = await html2canvas(el, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    onclone: (cloneDoc, cloneEl) => {
      Object.assign(cloneEl.style, { position: 'static', left: 'auto', top: 'auto', width: '794px' });
      cloneDoc.body.style.overflow = 'visible';
      cloneDoc.documentElement.style.overflow = 'visible';
    },
  });

  const widthMM = 210;
  const heightMM = (canvas.height / canvas.width) * widthMM;
  const doc = new jsPDF({ unit: 'mm', format: [widthMM, heightMM], orientation: 'portrait' });
  doc.setProperties({ title: `Erwin-cv-${lang.toUpperCase()}` });
  doc.addImage(canvas.toDataURL('image/jpeg', 0.99), 'JPEG', 0, 0, widthMM, heightMM);

  if (photoData) {
    const pxToMM = widthMM / el.offsetWidth;
    const photo = $('.cv-photo', el)!.getBoundingClientRect();
    const box = el.getBoundingClientRect();
    doc.addImage(photoData, 'JPEG',
      (photo.left - box.left) * pxToMM, (photo.top - box.top) * pxToMM,
      photo.width * pxToMM, photo.height * pxToMM);
  }

  const frame = $<HTMLIFrameElement>('#pdf-frame')!;
  frame.src = URL.createObjectURL(doc.output('blob'));
  frame.style.display = 'block';
  $('#loader')!.style.display = 'none';
  el.style.display = 'none';
}

render();
