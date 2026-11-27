// Colecciones de contenido. Hoy solo los cursos (/cursos/<curso>/…), escritos en Markdown:
//
//   src/content/cursos/<curso>.md                      el curso: nombre, colores, textos de la portada (cuerpo)
//   src/content/cursos/<curso>/<modulo>.md             un módulo: título, ícono, orden, resumen y su presentación
//   src/content/cursos/<curso>/<modulo>/<leccion>.md   una lección: título, resumen, minutos y orden
//
// La URL sale del nombre del archivo: python/fundamentos/variables.md → /cursos/python/fundamentos/variables.html
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const BASE = './src/content/cursos';
const hex = z.string().regex(/^#[0-9a-f]{6}$/i, 'color en hexadecimal: #rrggbb');

const cursos = defineCollection({
  loader: glob({ pattern: '*.md', base: BASE }),
  schema: z.object({
    nombre: z.string(),                  // «Curso de Python»
    lenguaje: z.string(),                // «Python»: lo que se aprende (aparece en la lista de cursos)
    icono: z.string(),                   // emoji: favicon, marca de la cabecera y tarjeta en /cursos/
    etiqueta: z.string(),                // la píldora sobre el título de la portada
    lema: z.string(),                    // subtítulo de la portada (y de su <title>)
    descripcion: z.string(),             // <meta name="description"> de la portada y texto de /cursos/
    primeraLeccion: z.string(),          // «modulo/leccion» del botón «Empezar desde cero»
    orden: z.number().int(),             // posición en /cursos/
    borrador: z.boolean().default(false), // true: no se publica
    // Lo que flota en el fondo de sus páginas (ui/GlyphField): palabras del lenguaje y emojis del curso.
    // Repetir uno lo hace salir más a menudo.
    simbolos: z.array(z.string()).min(1),
    // Paleta del curso. El vidrio, las luces del fondo y el código salen de estos colores (styles/pages/curso.css).
    colores: z.object({
      primario: hex,         // color de la marca (Python: azul)
      primarioVivo: hex,     // versión clara para degradados y botones
      primarioHondo: hex,    // versión oscura para degradados
      acento: hex,           // segundo color (Python: amarillo): progreso, completado, palabras clave del código
      acentoClaro: hex,
      acentoHondo: hex,
      sobreAcento: hex,      // texto encima del acento
      enlaceClaro: hex,      // enlaces y texto con color, legibles sobre el tema claro…
      enlaceOscuro: hex,     // …y sobre el oscuro
      acentoTextoClaro: hex, // el acento como texto legible en el tema claro…
      acentoTextoOscuro: hex, // …y en el oscuro
    }),
  }),
});

const modulos = defineCollection({
  loader: glob({ pattern: '*/*.md', base: BASE }),
  schema: z.object({
    titulo: z.string(),
    icono: z.string(),
    orden: z.number().int(), // también es su número: «Módulo 1»
    resumen: z.string(),     // admite `código` en línea
  }),
});

const lecciones = defineCollection({
  loader: glob({ pattern: '*/*/*.md', base: BASE }),
  schema: z.object({
    titulo: z.string(),
    resumen: z.string(),     // admite `código` en línea; también es la <meta name="description">
    minutos: z.number().int().positive(),
    orden: z.number().int(),
  }),
});

export const collections = { cursos, modulos, lecciones };
