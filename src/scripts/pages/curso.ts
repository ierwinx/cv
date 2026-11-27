// Comportamiento de las páginas de un curso (/cursos/<curso>/…): tema, menú lateral, copiar código, progreso,
// índice de la página, buscador y atajos de teclado. El marcado sale de CursoLayout y sus componentes.
import { $, $$, esc } from '../core/dom';
import { initGlyphs } from '../core/glyphs';
import { guardarProgreso, guardarUltima, initBotonTema, leerProgreso, leerUltima } from '../cursos/almacen';

const raiz = $('.curso')!;
const CURSO = raiz.dataset.curso!;
const RAIZ = raiz.dataset.raiz!;            // /cursos/python/
const BUSCADOR = raiz.dataset.buscador!;    // /cursos/python/buscar.json
const LECCION = raiz.dataset.leccion;       // fundamentos/variables (solo en una lección)

initBotonTema($('.boton-tema'));
initGlyphs();

// --- Menú lateral en el móvil ------------------------------------------------

const botonMenu = $('.boton-menu');
const velo = $('.velo');

function abrirMenu(abierto: boolean) {
  document.body.classList.toggle('menu-abierto', abierto);
  if (velo) velo.hidden = !abierto;
  botonMenu?.setAttribute('aria-expanded', String(abierto));
}
botonMenu?.addEventListener('click', () => abrirMenu(!document.body.classList.contains('menu-abierto')));
velo?.addEventListener('click', () => abrirMenu(false));

// --- Módulos plegables del índice lateral ------------------------------------

for (const boton of $$('.titulo-grupo')) {
  boton.addEventListener('click', () => {
    const grupo = boton.closest<HTMLElement>('.grupo-modulo')!;
    const abierto = grupo.dataset.abierto === 'si';
    grupo.dataset.abierto = abierto ? 'no' : 'si';
    boton.setAttribute('aria-expanded', String(!abierto));
  });
}

// Deja a la vista la lección que se lee.
const enlaceActual = $('.enlace-leccion.actual');
const lateral = $('.lateral');
if (enlaceActual && lateral) {
  const arriba = enlaceActual.offsetTop - lateral.clientHeight / 2;
  if (arriba > 0) lateral.scrollTop = arriba;
}

// --- Copiar bloques de código ------------------------------------------------

for (const boton of $$<HTMLButtonElement>('.boton-copiar')) {
  boton.addEventListener('click', async () => {
    const codigo = boton.closest('.bloque-codigo')?.querySelector('code');
    if (!codigo) return;
    try {
      await navigator.clipboard.writeText(codigo.innerText);
    } catch {
      return; // sin permiso para el portapapeles: el lector puede seleccionar el texto
    }
    boton.textContent = 'Copiado';
    boton.classList.add('copiado');
    setTimeout(() => {
      boton.textContent = 'Copiar';
      boton.classList.remove('copiado');
    }, 1600);
  });
}

// --- Progreso de las lecciones -----------------------------------------------

const botonCompletar = $<HTMLButtonElement>('#boton-completar');

function pintarProgreso() {
  const hechas = new Set(leerProgreso(CURSO));
  const enlaces = $$('.enlace-leccion');
  const contador = $('#progreso-hechas');
  const relleno = $('#relleno-progreso');
  // Solo cuentan las lecciones que siguen existiendo (una lección borrada no suma).
  const total = enlaces.filter((e) => hechas.has(e.dataset.leccion!)).length;
  if (contador) contador.textContent = String(total);
  if (relleno && enlaces.length) relleno.style.width = `${(total / enlaces.length) * 100}%`;

  for (const e of enlaces) e.classList.toggle('completada', hechas.has(e.dataset.leccion!));
  for (const t of $$('.tarjeta-leccion')) t.classList.toggle('completada', hechas.has(t.dataset.leccion!));

  if (botonCompletar && LECCION) {
    const hecha = hechas.has(LECCION);
    botonCompletar.classList.toggle('hecha', hecha);
    botonCompletar.textContent = hecha ? 'Completada' : 'Marcar como completada';
    botonCompletar.setAttribute('aria-pressed', String(hecha));
  }
}

if (botonCompletar && LECCION) {
  botonCompletar.addEventListener('click', () => {
    const hechas = leerProgreso(CURSO);
    const i = hechas.indexOf(LECCION);
    if (i === -1) hechas.push(LECCION);
    else hechas.splice(i, 1);
    guardarProgreso(CURSO, hechas);
    pintarProgreso();
  });
}

$('#reiniciar-progreso')?.addEventListener('click', () => {
  if (confirm('Se borrará tu progreso en todas las lecciones de este curso. ¿Continuar?')) {
    guardarProgreso(CURSO, []);
    pintarProgreso();
  }
});

if (LECCION) guardarUltima(CURSO, LECCION);
pintarProgreso();

// «Continuar donde lo dejaste» en la portada.
const continuar = $<HTMLAnchorElement>('#continuar-curso');
const ultima = leerUltima(CURSO);
if (continuar && ultima && $(`.enlace-leccion[data-leccion="${CSS.escape(ultima)}"]`)) {
  continuar.href = `${RAIZ}${ultima}.html`;
  continuar.hidden = false;
}

// --- Índice de la página: resalta la sección visible -------------------------

const enlacesIndice = $$<HTMLAnchorElement>('.indice-pagina a');
if (enlacesIndice.length) {
  const porId = new Map(enlacesIndice.map((a) => [decodeURIComponent(a.hash.slice(1)), a]));
  const visibles = new Set<string>();
  const io = new IntersectionObserver((entradas) => {
    for (const e of entradas) {
      if (e.isIntersecting) visibles.add(e.target.id);
      else visibles.delete(e.target.id);
    }
    const primera = [...porId.keys()].find((id) => visibles.has(id));
    if (!primera) return;
    for (const a of enlacesIndice) a.classList.remove('activo');
    porId.get(primera)!.classList.add('activo');
  }, { rootMargin: '-80px 0px -70% 0px' });
  for (const id of porId.keys()) {
    const destino = document.getElementById(id);
    if (destino) io.observe(destino);
  }
}

// --- Buscador ----------------------------------------------------------------

interface Entrada { u: string; t: string; m: string; r: string; c: string }
interface Preparada extends Entrada { tn: string; rn: string; cn: string }

const campo = $<HTMLInputElement>('#campo-busqueda');
const panel = $('#resultados-busqueda');
let indice: Promise<Preparada[]> | undefined;
let seleccionado = -1;

const normalizar = (texto: string) => texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** El índice (un JSON por curso) se pide la primera vez que hace falta y se normaliza una sola vez. */
function cargarIndice(): Promise<Preparada[]> {
  indice ??= fetch(BUSCADOR)
    .then((r) => (r.ok ? r.json() as Promise<Entrada[]> : []))
    .then((lista) => lista.map((e) => ({ ...e, tn: normalizar(e.t), rn: normalizar(e.r), cn: normalizar(e.c) })))
    .catch(() => {
      indice = undefined; // sin red: se reintenta en la próxima búsqueda
      return [];
    });
  return indice;
}

function extracto(texto: string, termino: string): string {
  const posicion = normalizar(texto).indexOf(termino);
  if (posicion === -1) return `${esc(texto.slice(0, 120))}...`;
  const desde = Math.max(0, posicion - 45);
  const trozo = texto.slice(desde, desde + 160);
  const inicio = posicion - desde;
  return `${desde > 0 ? '...' : ''}${esc(trozo.slice(0, inicio))}<mark>${esc(trozo.slice(inicio, inicio + termino.length))}</mark>${esc(trozo.slice(inicio + termino.length))}...`;
}

function buscar(lista: Preparada[], consulta: string): Preparada[] {
  const palabras = normalizar(consulta.trim()).split(/\s+/).filter(Boolean);
  return lista
    .map((e) => {
      let puntos = 0;
      for (const p of palabras) {
        if (e.tn.includes(p)) puntos += 12;
        if (e.rn.includes(p)) puntos += 5;
        const apariciones = e.cn.split(p).length - 1;
        if (apariciones) puntos += Math.min(apariciones, 6);
        if (!apariciones && !e.tn.includes(p)) puntos -= 20;
      }
      return { e, puntos };
    })
    .filter((x) => x.puntos > 0)
    .sort((a, b) => b.puntos - a.puntos)
    .slice(0, 12)
    .map((x) => x.e);
}

function pintarResultados(resultados: Preparada[], termino: string) {
  if (!panel) return;
  seleccionado = -1;
  panel.innerHTML = resultados.length
    ? resultados.map((e) =>
      `<a class="resultado" href="${RAIZ}${esc(e.u)}"><span class="resultado-titulo">${esc(e.t)}</span>` +
      `<span class="resultado-ruta">${esc(e.m)}</span><span class="resultado-extracto">${extracto(e.c, termino)}</span></a>`).join('')
    : '<p class="sin-resultados">No hay lecciones que hablen de eso.</p>';
  panel.hidden = false;
}

if (campo && panel) {
  campo.addEventListener('focus', () => void cargarIndice(), { once: true });

  campo.addEventListener('input', async () => {
    const consulta = campo.value;
    if (consulta.trim().length < 2) {
      panel.hidden = true;
      return;
    }
    const lista = await cargarIndice();
    if (campo.value !== consulta) return; // ya escribió otra cosa mientras llegaba el índice
    pintarResultados(buscar(lista, consulta), normalizar(consulta.trim().split(/\s+/)[0]));
  });

  campo.addEventListener('keydown', (evento) => {
    const opciones = $$<HTMLAnchorElement>('.resultado', panel);
    if (evento.key === 'Escape') {
      panel.hidden = true;
      campo.blur();
      return;
    }
    if (!opciones.length) return;
    if (evento.key === 'ArrowDown') seleccionado = (seleccionado + 1) % opciones.length;
    else if (evento.key === 'ArrowUp') seleccionado = (seleccionado - 1 + opciones.length) % opciones.length;
    else if (evento.key === 'Enter') {
      evento.preventDefault();
      opciones[Math.max(seleccionado, 0)].click();
      return;
    } else return;
    evento.preventDefault();
    opciones.forEach((o, i) => o.classList.toggle('activo', i === seleccionado));
    opciones[seleccionado].scrollIntoView({ block: 'nearest' });
  });

  document.addEventListener('click', (evento) => {
    if (!(evento.target as Element).closest('.caja-busqueda')) panel.hidden = true;
  });
}

// --- Atajos de teclado -------------------------------------------------------
// «/» enfoca el buscador; ← → (o p / n) pasan a la lección anterior o siguiente.

document.addEventListener('keydown', (evento) => {
  const escribiendo = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName ?? '');
  if (evento.key === '/' && !escribiendo && campo) {
    evento.preventDefault();
    campo.focus();
    return;
  }
  if (escribiendo || evento.metaKey || evento.ctrlKey || evento.altKey) return;
  const destino = evento.key === 'ArrowRight' || evento.key === 'n' ? $<HTMLAnchorElement>('.tarjeta-navegacion.siguiente')
    : evento.key === 'ArrowLeft' || evento.key === 'p' ? $<HTMLAnchorElement>('.tarjeta-navegacion.anterior')
    : null;
  if (destino) location.href = destino.href;
});
