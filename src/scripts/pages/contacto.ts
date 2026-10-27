// /contacto/: si llega con ?app=<slug> de una app conocida, la muestra y la manda como «origen».
import { $ } from '../core/dom';
import { initContactForms } from '../core/contact';

const apps: Record<string, [name: string, icon: string]> = JSON.parse($('#contenido')!.dataset.apps!);
const slug = new URLSearchParams(location.search).get('app') ?? '';
const app = apps[slug];

if (app) {
  const [name, icon] = app;
  const chip = $<HTMLAnchorElement>('#ctApp')!;
  chip.href = `/${slug}/`;
  chip.querySelector('img')!.src = icon;
  chip.querySelector('span')!.textContent = name;
  chip.hidden = false;
  $<HTMLFormElement>('form[data-contact]')!.dataset.origen = slug;
  const back = $<HTMLAnchorElement>('#ctBack')!;
  back.href = `/${slug}/`;
  back.textContent = `← Volver a ${name}`;
}

initContactForms();
