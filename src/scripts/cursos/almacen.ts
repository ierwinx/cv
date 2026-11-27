// Lo que los cursos guardan en el navegador del lector: el tema, las lecciones completadas y la última leída.
// Lo usan las páginas de un curso (scripts/pages/curso.ts) y la lista de cursos (scripts/pages/cursos.ts).
// localStorage lanza excepciones en modo privado o con los datos del sitio bloqueados: sin él, sin memoria.

export const CLAVE_TEMA = 'curso-tema'; // compartida entre cursos: el tema es del lector, no del curso
const clave = (curso: string, que: 'progreso' | 'ultima-leccion') => `curso-${que}:${curso}`;

export function leer(clave: string): string | null {
  try { return localStorage.getItem(clave); } catch { return null; }
}

export function escribir(clave: string, valor: string) {
  try { localStorage.setItem(clave, valor); } catch { /* sin memoria */ }
}

/** El curso de Python vivía en /python/ con claves sin el nombre del curso: se conserva lo que el lector llevaba. */
function migrar(curso: string) {
  if (curso !== 'python' || leer(clave(curso, 'progreso')) !== null) return;
  const viejo = leer('curso-progreso');
  if (viejo) escribir(clave(curso, 'progreso'), viejo);
  const ultima = leer('curso-ultima-leccion');
  if (ultima) escribir(clave(curso, 'ultima-leccion'), ultima);
}

/** Lecciones completadas del curso, como «modulo/leccion». */
export function leerProgreso(curso: string): string[] {
  migrar(curso);
  try {
    const lista: unknown = JSON.parse(leer(clave(curso, 'progreso')) ?? '[]');
    return Array.isArray(lista) ? lista.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export const guardarProgreso = (curso: string, lista: string[]) => escribir(clave(curso, 'progreso'), JSON.stringify(lista));

export function leerUltima(curso: string): string | null {
  migrar(curso);
  return leer(clave(curso, 'ultima-leccion'));
}

export const guardarUltima = (curso: string, leccion: string) => escribir(clave(curso, 'ultima-leccion'), leccion);

/** El botón ☼/☽ cambia el tema y lo recuerda (components/cursos/TemaInicial lo aplica antes de pintar). */
export function initBotonTema(boton: Element | null) {
  boton?.addEventListener('click', () => {
    const html = document.documentElement;
    const nuevo = html.dataset.tema === 'oscuro' ? 'claro' : 'oscuro';
    html.dataset.tema = nuevo;
    escribir(CLAVE_TEMA, nuevo);
  });
}
