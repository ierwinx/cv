// Índice del buscador de un curso: /cursos/<curso>/buscar.json. El navegador lo descarga la primera vez que se
// usa el buscador (scripts/pages/curso.ts), no en cada página.
//   u: URL relativa al curso · t: título · m: módulo · r: resumen · c: texto de la lección, sin Markdown
import type { APIRoute, GetStaticPaths } from 'astro';
import { getCurso, getCursos, sinCodigo } from '../../../lib/cursos';

/** Texto de cada lección que entra en el índice: el principio basta para encontrarla y el JSON no se dispara. */
const MAX_TEXTO = 6000;

export const getStaticPaths: GetStaticPaths = async () =>
  (await getCursos()).map((c) => ({ params: { curso: c.slug } }));

/** Markdown → texto plano para buscar: sin marcas, enlaces ni etiquetas; el código se queda (también se busca). */
function textoPlano(md: string): string {
  return md
    .replace(/^`{3,}.*$/gm, ' ')                 // vallas de los bloques de código
    .replace(/^>\s?(\[![a-z]+\]\s*)?/gm, '')      // citas y marcas de aviso
    .replace(/^#{1,6}\s+/gm, '')                  // títulos
    .replace(/^\s*(?:[-+]|\d+\.)\s+/gm, '')       // viñetas
    .replace(/^\|?[\s:|-]+\|[\s:|-]*$/gm, ' ')    // separadores de tablas
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')    // enlaces
    .replace(/<[^>]+>/g, ' ')                     // etiquetas HTML (<kbd>)
    .replace(/\\([\\`*_[\]|~<>#:.])/g, '$1')      // escapes
    .replace(/[*_`|]+/g, ' ')                     // énfasis, código y celdas
    .replace(/&lt;/g, '<').replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

export const GET: APIRoute = async ({ params }) => {
  const curso = await getCurso(params.curso!);
  const indice = curso.lecciones.map((l) => ({
    u: `${l.modulo.slug}/${l.slug}.html`,
    t: l.entrada.data.titulo,
    m: l.modulo.entrada.data.titulo,
    r: sinCodigo(l.entrada.data.resumen),
    c: textoPlano(l.entrada.body ?? '').slice(0, MAX_TEXTO),
  }));
  return new Response(JSON.stringify(indice), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
