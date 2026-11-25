// CV bilingüe (/CV/): idioma, tema, secciones generadas desde src/data/cv.json, formulario y efectos.
// El formulario envía al micro Backierwinx solo en el build de producción; en local simula el envío.
import cv from '../../data/cv.json';
import { $, $$ } from '../core/dom';
import { initContactForm } from '../core/contact';
import { initReveal } from '../core/reveal';
import { lightDismiss } from '../core/dialog';

type Lang = 'en' | 'es';
type Texts = (typeof cv.web)['en'];
type Project = Texts['projects']['list'][number];

const now = new Date().getFullYear();
const years = now - cv.careerStart;

let lang: Lang = detectLang();
let t: Texts = cv.web[lang];

function detectLang(): Lang {
  const saved = localStorage.getItem('lang');
  if (saved === 'en' || saved === 'es') return saved;
  return (navigator.language || '').startsWith('es') ? 'es' : 'en';
}

function setLang(next: Lang) {
  lang = next;
  t = cv.web[lang];
  localStorage.setItem('lang', lang);
  document.documentElement.lang = lang;
  applyTranslations();
  renderDynamic();
}

const lookup = (path: string) => path.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], t);

function applyTranslations() {
  $$('[data-i18n]').forEach((el) => {
    const value = lookup(el.dataset.i18n!);
    if (typeof value === 'string') el.textContent = value.replace('{years}', String(years));
  });
  const cvLink = $<HTMLAnchorElement>('#downloadCV');
  if (cvLink) cvLink.href = `pdf/?lang=${lang}`;
}

function renderDynamic() {
  renderProjects();
  renderExperience();
  renderDegree();
  renderCerts();
  renderReferences();
}

const projectCard = (p: Project, i: number) => {
  const tag = p.url ? 'a' : 'div';
  const attrs = p.url ? `href="${p.url}" target="_blank" rel="noopener"` : '';
  return `
      <${tag} class="project-card" ${attrs}>
        <div class="project-preview project-preview--${i + 1} project-preview--placeholder">${p.emoji}</div>
        <div class="project-info">
          <div class="project-name">${p.name}</div>
          <div class="project-role">${p.role}</div>
          <div class="project-desc">${p.description}</div>
          <div class="project-tags">${p.tags.map((tag) => `<span class="project-tag">${tag}</span>`).join('')}</div>
        </div>
      </${tag}>`;
};

function renderProjects() {
  $('#projectsGrid')!.innerHTML = t.projects.list.map(projectCard).join('');
}

// El texto de cada puesto sale de la hoja PDF (cv.pdf, la fuente de la verdad): mismo orden de empresas en ambas listas.
// Un logro por párrafo cuando es una lista; un solo párrafo cuando es texto corrido.
function renderExperience() {
  const texts = cv.pdf[lang].experience.jobs;
  $('#experienceTimeline')!.innerHTML = t.experience.jobs.map((job, i) => {
    const desc = texts[i].description;
    const paragraphs = (Array.isArray(desc) ? desc : [desc]).map((p) => `<p class="timeline-desc">${p}</p>`).join('');
    return `
      <div class="timeline-item">
        <div class="timeline-period">${job.period}</div>
        <div>
          <div class="timeline-company">${job.company}</div>
          <div class="timeline-roles">${job.roles.map((r) => `<span class="timeline-role">${r}</span>`).join('')}</div>
          ${paragraphs}
        </div>
      </div>`;
  }).join('');
}

function renderDegree() {
  const d = t.education.degree;
  // <button>: el título se abre con Tab + Enter y el foco vuelve aquí al cerrar el modal.
  $('#degreeContent')!.innerHTML = `
      <button type="button" class="degree-open" aria-haspopup="dialog">
        <span class="degree-institution">${d.institution}</span>
        <span class="degree-career">${d.career}</span>
        <span class="degree-specialty">${d.specialtyLabel}: ${d.specialty}</span>
        <span class="degree-period">${d.period}</span>
      </button>`;
}

function renderCerts() {
  $('#certsGrid')!.innerHTML = t.education.certs.map((c) => `
      <button type="button" class="cert-item" aria-haspopup="dialog" data-img="${'img' in c ? c.img : ''}" data-pdf="${'pdf' in c ? c.pdf : ''}">
        <span class="cert-year">${c.year}</span>
        <span>
          <span class="cert-name">${c.name}</span>
          <span class="cert-inst">${c.institution}</span>
        </span>
      </button>`).join('');
}

function renderReferences() {
  $('#refsContent')!.innerHTML = `<div class="ref-list">${t.references.list.map((r) => `
          <div class="ref-item">
            <div class="ref-name">${r.name}</div>
            <div class="ref-role">${r.role}</div>
            <a class="ref-phone" href="tel:${r.phone.replace(/\s/g, '')}">${r.phone}</a>
          </div>`).join('')}
      </div>`;
}

// ── Certificados y título: se abren en el modal ──
// <dialog> nativo: Esc, foco atrapado y regreso del foco los da el navegador; el botón cierra con <form method="dialog">.
function openCertificate(html: string) {
  $('#certModalTitle')!.textContent = t.education.certificateAlt;
  $('#certModalBody')!.innerHTML = html;
  $<HTMLDialogElement>('#certModal')!.showModal();
}

function initModal() {
  const modal = $<HTMLDialogElement>('#certModal')!;
  lightDismiss(modal);
  // Al cerrar se vacía: un PDF en un <iframe> oculto seguiría ocupando memoria.
  modal.addEventListener('close', () => $('#certModalBody')!.replaceChildren());

  const degree = $('#degreeContent')!;
  degree.addEventListener('click', () => openCertificate(`<img src="img/certificados/titulo.webp" alt="${t.education.certificateAlt}">`));

  // Delegación: las tarjetas se regeneran al cambiar de idioma.
  $('#certsGrid')!.addEventListener('click', (e) => {
    const item = (e.target as Element).closest<HTMLElement>('.cert-item');
    if (!item) return;
    const { img, pdf } = item.dataset;
    openCertificate(pdf
      ? `<iframe class="cert-pdf" src="img/certificados/${pdf}.pdf#toolbar=0&view=FitH" title="${t.education.certificateAlt}"></iframe>`
      : `<img src="img/certificados/${img}.webp" alt="${t.education.certificateAlt}">`);
  });
}

// ── Tema ──
const SUN = '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>';
const MOON = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
const isDark = () => document.documentElement.dataset.theme === 'dark';
const updateThemeIcon = () => { $('#themeIcon')!.innerHTML = isDark() ? SUN : MOON; };

function toggleTheme() {
  const dark = !isDark();
  if (dark) document.documentElement.dataset.theme = 'dark';
  else delete document.documentElement.dataset.theme;
  localStorage.setItem('theme', dark ? 'dark' : 'light');
  // El navegador pinta sus controles (inputs, scroll, autocompletado) con el tema elegido.
  $<HTMLMetaElement>('meta[name="color-scheme"]')!.content = dark ? 'dark' : 'light';
  updateThemeIcon();
}

// ── Formulario de contacto ──
function showStatus(form: HTMLFormElement, ok: boolean, text: string) {
  const status = $('#formStatus')!;
  form.style.display = 'none';
  status.style.display = 'flex';
  status.className = `form-status form-status--${ok ? 'success' : 'error'}`;
  status.textContent = text;
  setTimeout(() => { status.style.display = 'none'; form.style.display = 'grid'; }, 4000);
}

function initForm() {
  // Envía al micro Backierwinx; en local simula el envío (lo decide la página al compilar)
  const form = $<HTMLFormElement>('#contactForm')!;
  const error = $('#errorRecaptcha')!;
  initContactForm(form, {
    texts: () => ({ sending: t.contact.sending, success: t.contact.success, error: t.contact.error, captcha: t.contact.recaptchaError }),
    onError: (text) => { error.textContent = text; },
    onDone: (ok, text) => showStatus(form, ok, text),
  });
}

// ── Efectos ──
function initScrollAnimations() {
  initReveal('.card', { className: 'visible', threshold: 0.05, stagger: 0, batchDelay: 80 });
}

function initScrollTop() {
  const btn = $('#scrollTop');
  if (!btn) return;
  addEventListener('scroll', () => btn.classList.toggle('visible', scrollY > 400), { passive: true });
  btn.addEventListener('click', () => scrollTo({ top: 0, behavior: 'smooth' }));
}

/** El nombre aparece en la barra superior cuando el título del hero sale de pantalla. */
function initTopbarName() {
  const hero = $('.hero-title');
  const name = $('#topbarName');
  if (!hero || !name) return;
  new IntersectionObserver(([e]) => name.classList.toggle('visible', !e.isIntersecting)).observe(hero);
}


/** Subtítulo del hero que se escribe y se borra solo. */
function typeEffect() {
  const el = $('#typingText');
  if (!el) return;
  let title = 0, chars = 0, deleting = false;
  const step = () => {
    const current = cv.titles[title];
    if (!deleting) {
      el.textContent = current.substring(0, ++chars);
      if (chars === current.length) { deleting = true; setTimeout(step, 2000); return; }
      setTimeout(step, 80);
    } else {
      el.textContent = current.substring(0, --chars);
      if (chars === 0) { deleting = false; title = (title + 1) % cv.titles.length; setTimeout(step, 500); return; }
      setTimeout(step, 40);
    }
  };
  step();
}

updateThemeIcon();
setLang(lang);
initForm();
initScrollAnimations();
initModal();
$('#langBtn')!.addEventListener('click', () => setLang(lang === 'en' ? 'es' : 'en'));
$('#themeBtn')!.addEventListener('click', toggleTheme);
initScrollTop();
initTopbarName();
setTimeout(typeEffect, 600);
