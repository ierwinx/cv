// Markdown de los cursos (src/content/cursos): plugins de Sätteri y transformador de Shiki.
// Lo carga astro.config.mjs. Un autor escribe Markdown normal y esto lo convierte en el marcado del curso:
//
//   ```python title="saludo.py"     → bloque de código con barra (lenguaje o nombre de archivo) y botón «Copiar»
//   ```salida                       → «Salida en pantalla» pegada al bloque anterior
//   > [!consejo] Título             → caja de aviso (nota, consejo, aviso, error, ejercicio, resumen, objetivo)
//   > texto…
//   ## Título                        → id sin acentos (para-que-sirven) y enlace «#» para compartir la sección
//   | tabla |                        → envuelta para desplazarse en horizontal en el móvil

/** Lenguajes que Shiki no colorea: los pinta el plugin como texto plano. */
export const SIN_COLOREAR = ['salida', 'texto'];

/** Nombres que usan los cursos → gramática de Shiki. La barra muestra el nombre original. */
export const ALIAS = { consola: 'shellsession' };

const TIPOS_AVISO = new Set(['nota', 'consejo', 'aviso', 'error', 'ejercicio', 'resumen', 'objetivo']);

const el = (tagName, properties, children = []) => ({ type: 'element', tagName, properties, children });
const txt = (value) => ({ type: 'text', value });

const clases = (node) => {
  const c = node.properties?.className ?? node.properties?.class ?? [];
  return Array.isArray(c) ? c.map(String) : String(c).split(/\s+/).filter(Boolean);
};

/** Shiki: guarda en el <pre> el nombre de archivo de ```lenguaje title="archivo.py". */
export const transformadorTitulo = {
  name: 'cursos-titulo',
  pre(node) {
    const titulo = this.options.meta?.__raw?.match(/title="([^"]*)"/)?.[1];
    if (titulo) node.properties['data-titulo'] = titulo;
  },
};

function barra(nombre) {
  return el('div', { className: ['barra-codigo'] }, [
    el('span', { className: ['nombre-codigo'] }, [txt(nombre)]),
    el('button', { className: ['boton-copiar'], type: 'button' }, [txt('Copiar')]),
  ]);
}

const codigo = {
  name: 'cursos-codigo',
  element: {
    filter: ['pre'],
    visit(node, ctx) {
      const props = node.properties ?? {};
      // Ya coloreado por Shiki: <pre class="astro-code" data-language="python" data-titulo="…">
      if (clases(node).includes('astro-code')) {
        const lenguaje = String(props.dataLanguage ?? props['data-language'] ?? 'text');
        const titulo = props.dataTitulo ?? props['data-titulo'];
        return el('div', { className: ['bloque-codigo'] }, [barra(String(titulo ?? lenguaje)), node]);
      }
      // Sin colorear: <pre><code class="language-salida">…
      const code = node.children?.find((c) => c.type === 'element' && c.tagName === 'code');
      if (!code) return;
      const lenguaje = clases(code).find((c) => c.startsWith('language-'))?.slice('language-'.length) ?? 'text';
      const texto = ctx.textContent(code).replace(/\n$/, '');
      const pre = el('pre', {}, [el('code', {}, [txt(texto)])]);
      if (lenguaje === 'salida') {
        return el('div', { className: ['bloque-salida'] }, [
          el('span', { className: ['etiqueta-salida'] }, [txt('Salida en pantalla')]),
          pre,
        ]);
      }
      const titulo = String(code.data?.meta ?? '').match(/title="([^"]*)"/)?.[1];
      return el('div', { className: ['bloque-codigo'] }, [barra(titulo ?? lenguaje), pre]);
    },
  },
};

const avisos = {
  name: 'cursos-avisos',
  element: {
    filter: ['blockquote'],
    visit(node) {
      const hijos = (node.children ?? []).filter((c) => !(c.type === 'text' && !c.value.trim()));
      const primero = hijos[0];
      if (primero?.type !== 'element' || primero.tagName !== 'p') return;
      const inicio = primero.children?.[0];
      const marca = inicio?.type === 'text' ? inicio.value.match(/^\[!([a-z]+)\]\s*/) : null;
      if (!marca || !TIPOS_AVISO.has(marca[1])) return;
      const resto = inicio.value.slice(marca[0].length);
      const tituloHijos = [...(resto ? [txt(resto)] : []), ...primero.children.slice(1)];
      return el('aside', { className: ['aviso', `aviso-${marca[1]}`] }, [
        ...(tituloHijos.length ? [el('p', { className: ['titulo-aviso'] }, tituloHijos)] : []),
        ...hijos.slice(1),
      ]);
    },
  },
};

const tablas = {
  name: 'cursos-tablas',
  element: {
    filter: ['table'],
    visit(node, ctx) {
      ctx.wrapNode(node, { raw: '<div class="envoltura-tabla"></div>' });
    },
  },
};

/** id sin acentos ni signos («Para qué sirven» → para-que-sirven), único en la página, y su enlace «#». */
function slug(texto) {
  return texto
    .replace(/<[^>]*>/g, '') // «`<Configure>` llega…» → llega…: así eran los ids del curso original
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const anclas = () => {
  const usados = new Map();
  return {
    name: 'cursos-anclas',
    element: {
      filter: ['h2', 'h3', 'h4'],
      visit(node, ctx) {
        const base = slug(ctx.textContent(node)) || 'seccion';
        const n = usados.get(base) ?? 0;
        usados.set(base, n + 1);
        const id = n ? `${base}-${n + 1}` : base;
        ctx.setProperty(node, 'id', id);
        ctx.appendChild(node, el('a', { className: ['ancla'], href: `#${id}`, ariaLabel: 'Enlace a esta seccion' }, [txt('#')]));
      },
    },
  };
};

/** En orden: el resaltado de Shiki corre antes (lo pone Astro) y los ids de Astro después. */
export const pluginsCursos = [codigo, avisos, tablas, anclas];
