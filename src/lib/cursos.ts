// Arma un curso a partir de src/content/cursos: sus módulos y lecciones en orden, las URLs, los totales y la
// lección anterior y siguiente. Lo usan las páginas de src/pages/cursos y el índice del buscador.
import { getCollection, type CollectionEntry } from 'astro:content';

export type EntradaCurso = CollectionEntry<'cursos'>;
export type EntradaModulo = CollectionEntry<'modulos'>;
export type EntradaLeccion = CollectionEntry<'lecciones'>;

export interface Leccion {
  entrada: EntradaLeccion;
  slug: string;      // variables
  modulo: Modulo;
  clave: string;     // fundamentos/variables: identifica la lección en el progreso guardado
  url: string;       // /cursos/python/fundamentos/variables.html
  numero: number;    // posición dentro del módulo, desde 1
}

export interface Modulo {
  entrada: EntradaModulo;
  slug: string;      // fundamentos
  numero: number;    // el «orden» del módulo: «Módulo 1»
  url: string;       // /cursos/python/fundamentos/index.html
  lecciones: Leccion[];
  minutos: number;
}

export interface Curso {
  entrada: EntradaCurso;
  slug: string;      // python
  url: string;       // /cursos/python/
  modulos: Modulo[];
  lecciones: Leccion[]; // todas, en orden de lectura
  minutos: number;
}

/** Orden por el campo `orden`; si empatan, por nombre de archivo, para que nunca dependa del disco. */
const porOrden = <T extends { id: string; data: { orden: number } }>(a: T, b: T) =>
  a.data.orden - b.data.orden || a.id.localeCompare(b.id);

/** Último segmento de un id de colección: python/fundamentos/variables → variables */
const ultimo = (id: string) => id.slice(id.lastIndexOf('/') + 1);

let cache: Promise<Curso[]> | undefined;

/** Todos los cursos publicados, en el orden de /cursos/. */
export function getCursos(): Promise<Curso[]> {
  cache ??= armar();
  return cache;
}

export async function getCurso(slug: string): Promise<Curso> {
  const curso = (await getCursos()).find((c) => c.slug === slug);
  if (!curso) throw new Error(`No existe el curso «${slug}» en src/content/cursos`);
  return curso;
}

async function armar(): Promise<Curso[]> {
  const [cursos, modulos, lecciones] = await Promise.all([
    getCollection('cursos', ({ data }) => !data.borrador),
    getCollection('modulos'),
    getCollection('lecciones'),
  ]);

  return cursos.sort(porOrden).map((entrada) => {
    const slug = entrada.id;
    const url = `/cursos/${slug}/`;
    const mods: Modulo[] = modulos
      .filter((m) => m.id.startsWith(`${slug}/`))
      .sort(porOrden)
      .map((m) => {
        const modSlug = ultimo(m.id);
        const modulo: Modulo = { entrada: m, slug: modSlug, numero: m.data.orden, url: `${url}${modSlug}/index.html`, lecciones: [], minutos: 0 };
        modulo.lecciones = lecciones
          .filter((l) => l.id.startsWith(`${slug}/${modSlug}/`))
          .sort(porOrden)
          .map((l, i) => {
            const lecSlug = ultimo(l.id);
            return { entrada: l, slug: lecSlug, modulo, clave: `${modSlug}/${lecSlug}`, url: `${url}${modSlug}/${lecSlug}.html`, numero: i + 1 };
          });
        modulo.minutos = modulo.lecciones.reduce((s, l) => s + l.entrada.data.minutos, 0);
        return modulo;
      });

    // Una lección huérfana (su carpeta no tiene <modulo>.md) no se publicaría: mejor fallar al compilar.
    for (const l of lecciones.filter((l) => l.id.startsWith(`${slug}/`))) {
      const mod = l.id.split('/')[1];
      if (!mods.some((m) => m.slug === mod)) throw new Error(`La lección ${l.id} no tiene módulo: falta ${slug}/${mod}.md`);
    }

    const todas = mods.flatMap((m) => m.lecciones);
    if (!todas.some((l) => l.clave === entrada.data.primeraLeccion)) {
      throw new Error(`${slug}.md: primeraLeccion «${entrada.data.primeraLeccion}» no existe`);
    }
    return { entrada, slug, url, modulos: mods, lecciones: todas, minutos: todas.reduce((s, l) => s + l.entrada.data.minutos, 0) };
  });
}

/** La lección anterior y la siguiente en orden de lectura (cruzan de un módulo al siguiente). */
export function vecinas(curso: Curso, leccion: Leccion) {
  const i = curso.lecciones.indexOf(leccion);
  return { anterior: curso.lecciones[i - 1], siguiente: curso.lecciones[i + 1] };
}

/** El módulo anterior y el siguiente. */
export function modulosVecinos(curso: Curso, modulo: Modulo) {
  const i = curso.modulos.indexOf(modulo);
  return { anterior: curso.modulos[i - 1], siguiente: curso.modulos[i + 1] };
}

/** Texto con `código` en línea (resúmenes del frontmatter) → HTML seguro. */
export function conCodigo(texto: string): string {
  const escapar = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return texto.split(/(`[^`]+`)/).map((p) => (p.startsWith('`') && p.endsWith('`') && p.length > 1 ? `<code>${escapar(p.slice(1, -1))}</code>` : escapar(p))).join('');
}

/** Texto plano de un resumen (sin las comillas del código): para <meta> y el buscador. */
export const sinCodigo = (texto: string) => texto.replace(/`/g, '');

/** Colores (tokens de styles/pages/curso.css) de lo que flota en el fondo: ui/GlyphField. */
export const SIMBOLOS_COLORES = '--c1-vivo,--c2,--enlace,--c1-vivo,--acento-texto';

/** Tokens de color del curso para <html style> (los lee styles/pages/curso.css). */
export function varsCurso(curso: Curso): Record<string, string> {
  const c = curso.entrada.data.colores;
  return {
    '--c1': c.primario,
    '--c1-vivo': c.primarioVivo,
    '--c1-hondo': c.primarioHondo,
    '--c2': c.acento,
    '--c2-claro': c.acentoClaro,
    '--c2-hondo': c.acentoHondo,
    '--sobre-c2': c.sobreAcento,
    '--enlace-claro': c.enlaceClaro,
    '--enlace-oscuro': c.enlaceOscuro,
    '--acento-texto-claro': c.acentoTextoClaro,
    '--acento-texto-oscuro': c.acentoTextoOscuro,
    // Aro del cursor de BaseLayout (document.css) con los colores del curso.
    '--a1': c.primarioVivo,
    '--a3': c.acento,
  };
}
