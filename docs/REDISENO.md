# Rediseño de la arquitectura de ierwinx.com

## Estado

| Fase | Estado |
|---|---|
| 0 · Andamiaje con paso directo | ✅ Astro 7, sitio legado en `public/`, `seo.py` sobre `dist/`; `serve.py` sustituido por `npm run dev` / `npm start` (servidores de Astro), `check_site.py`, deploy. Etiqueta `legacy-v1`. |
| 1 · Fundamentos | ✅ Tokens, base, efectos, layouts, Nav/Footer/Ambient/Toast, Button/DownloadButton/Icon, secciones, `scripts/core`. |
| 2 · Página de referencia (iBridge) | ✅ Migrada; capturas a 1440 y 390 px iguales a `legacy-v1` (solo antialiasing). |
| 3 · Resto de apps Mac | ✅ iXML con el sistema aurora; iJson, iPlist, iCSV, iRar, iGit, iTunes, iSpecter e iConverter conservan su diseño propio (`AppPage` + `styles/pages` + `scripts/pages` en TypeScript estricto). Las demos de iGit e iConverter son componentes compartidos con la home. |
| 4 · Home | ✅ Menú, órbita, dock y pie desde `apps.json`; spotlights desde `home.json` con un componente `Spot`; cada visual es un componente con su `mount(root)`. `assets/app.js` y `assets/styles.css` desaparecieron. |
| 5 · Apps móviles | ✅ Super Pets (`SuperpetsShell`) e iLegato (`IlegatoShell`, legales con encabezado común); enlaces de tienda y banner de App Store desde `apps.json`. |
| 6 · CV | ✅ `cv.json` es la única fuente de `/CV/` y `/CV/pdf/` (las dos hojas del PDF se generan al compilar); EmailJS y reCAPTCHA solo en el build de producción; html2canvas, jsPDF y EmailJS van por npm. `musica/` en Astro. |
| 7 · Curso y limpieza | ✅ `tools/sync_curso.py`; `astro check` en `npm run check`. Pendiente opcional: cargar `indice-busqueda.js` del curso solo al enfocar el buscador (en su repo). |

Descargas: los `.dmg`/`.pkg`/`.zip` salieron del repo y se publican en **GitHub Releases** (ver §4 bis).
La guía de trabajo diaria está en `CLAUDE.md`.

## Contexto

El sitio creció página por página, y cada página nueva se armó copiando la anterior y reescribiéndola. El diseño visual es uno solo y funciona bien: fondo aurora, nav de cristal, botones con gradiente, bento, marquee, FAQ y CTA final. El problema es el código, que está reimplementado en cada página. Objetivos:

1. **Conservar el diseño**: cada página debe verse igual que hoy.
2. **No repetir código**: una sola implementación de cada pieza, y lo bueno de una página disponible para todas.
3. **Probar en local sin tocar producción**: ninguna URL debe apuntar a `https://ierwinx.com` al compilar en local.
4. **Conservar** `tools/seo.py` (y también `indexnow.py` y `og-maker`). `tools/serve.py` se retiró: Astro trae `astro dev` y `astro preview`, que hacen lo mismo.
5. Mantener GitHub Pages, el SEO actual y **todas las URLs exactas**.

Decisiones ya tomadas con el usuario:
- El curso de Python **mantiene su generador** en `~/Desarrollo/curso`. Aquí solo se copia lo que genera.
- **Base común + tema por app**: un solo sistema de componentes y tokens; cada app define su paleta, sus fuentes y sus secciones únicas.

---

## 1. Diagnóstico (lo que hay hoy)

| Área | Hallazgo |
|---|---|
| Tamaño | ~26 700 líneas escritas a mano (sin contar las 220 lecciones generadas). |
| Páginas Mac con todo inline | `ibridge`, `iconverter`, `icsv`, `ijson`, `iplist`, `ispecter`, `ixml` llevan `<style>` y `<script>` inline: **~2 200 líneas de CSS y ~1 700 de JS**, con apenas 2–30 líneas idénticas entre ellas. Es el mismo diseño escrito 7 veces de forma distinta. |
| Otras apps | `igit`, `irar`, `itunes`, `ilegato` y `superpets` tienen su propio `styles.css` y `app.js` (de 250 a 1 760 líneas cada uno). |
| Tokens de diseño | **14 juegos de variables con nombres distintos** para lo mismo: `--fg`/`--text`/`--ink`, `--line`/`--border`, `--glass`/`--surface`/`--panel`, `--grad`/`--brand-grad`/`--grad-fire`… |
| Comportamientos reimplementados | Reveal al hacer scroll (IntersectionObserver): ~15 copias · spotlight del cursor (`--mx/--my`): ~14 · toast: 9 · tilt 3D: 8+ · botones magnéticos: 10+ · marquee: 8 · FAQ: 4 · barra de progreso: 8 · contadores animados: 6 · fondo de estrellas: 3. |
| Home duplica demos | `assets/app.js` (1 254 líneas) **recrea a mano las demos de cada app** («igual que /itunes/», «igual que /iconverter/»): iGit TUI, iTunes TUI, espectrograma de iSpecter, iConverter, iPlist, iJson, iCSV, iXML e iRar. Cada demo existe dos veces y las dos copias ya se están separando. |
| Catálogo de apps | Nombre, versión, descarga, tienda e icono de cada app están repetidos en `tools/seo.py` (dict `APPS`), en el HTML de la home (tarjetas, dropdown, dock) y en cada página. |
| Nav y footer | Cada app tiene los suyos y no son consistentes: unas enlazan a la home y otras no. Las páginas legales de `superpets` copian el mismo nav y footer en 5 archivos, y las de `ilegato` en 4. |
| CV | Los datos del CV están **3 veces**: `CV/js/app.js` (`TRANSLATIONS`), `CV/pdf/index.html` (`DATA`) y `CV/lang/*.json`, que **ningún archivo usa** (código muerto). EmailJS envía correos reales también en local. |
| Curso de Python | Está bien hecho en su propio repo, pero `indice-busqueda.js` (**1,4 MB**) se carga en cada lección. El SEO y el seasonal se le inyectan a mano después de copiarlo. |
| Build | `build.js` copia todo a `dist/` y solo minifica `CV/`. No hay plantillas ni componentes. |
| URLs de producción | Casi todas salen de `seo.py` (canonical, og:*, JSON-LD, sitemap, robots), que tiene `SITE = 'https://ierwinx.com'` fijo. Hay además algunas a mano en `CV/index.html` y `musica/index.html`. |
| Lo que ya está bien | `assets/seasonal.{js,css}` ya es compartido. `seo.py` es idempotente y completo. `serve.py` resuelve el detalle de IPv6 en Safari. `whileVisible()` de la home (las demos solo corren mientras se ven en pantalla). |

---

## 2. ¿React, JavaScript puro o qué?

**Veredicto: React es demasiado para este sitio y no conviene. Pero JavaScript puro sin un paso de build tampoco resuelve el problema.**

- **React (SPA con Vite):** en GitHub Pages el contenido se pintaría con JS, lo que **perjudica el SEO**. Habría que añadir SSG (Next export), y aun así cada página cargaría el runtime de React (~45 KB gz) más la hidratación para mostrar texto de marketing. Las demos son animaciones imperativas (canvas, TUIs, tipeo con `await sleep`), así que el modelo de estado de React no aporta nada y habría que reescribir ~3 000 líneas que ya funcionan.
- **JS puro sin build:** comparte comportamiento (módulos), pero **no comparte HTML**. Head, nav, footer, secciones y SEO seguirían copiados en cada página, o habría que inyectarlos con JS en el cliente, lo que es peor para SEO y provoca saltos de layout. La duplicación de hoy es sobre todo HTML y CSS.
- **Recomendado: Astro con salida 100 % estática y JavaScript puro (TypeScript) en el navegador.**
  - Componentes con sintaxis parecida a JSX (`.astro`) que se resuelven **en build**: el navegador recibe HTML plano, igual que hoy.
  - **0 KB de framework en el cliente.** Los scripts son módulos vanilla que Astro empaqueta, minifica y deduplica entre páginas.
  - CSS con alcance por componente, tokens globales y minificación incluida (sustituye a `build.js`, `esbuild` y `csso`).
  - `build.format: 'preserve'` mantiene **las URLs exactas** (`/ibridge/`, `/superpets/privacy.html`, `/CV/`).
  - `site` sale de una variable de entorno: en local es `http://localhost:4321` y en el deploy `https://ierwinx.com`.
  - Si algún día un componente necesita React, Astro lo permite solo en ese componente («islas»), sin convertir el sitio en SPA.

---

## 3. Arquitectura propuesta

```
cv/
├─ astro.config.mjs        site = process.env.SITE ?? 'http://localhost:4321'
│                          build.format 'preserve', trailingSlash 'ignore', output 'static'
├─ package.json            dev · build (astro build && seo.py) · check
├─ docs/REDISENO.md        este documento (no se publica)
├─ src/
│  ├─ data/
│  │  ├─ site.json          marca, redes, correo, enlaces globales
│  │  ├─ apps.json          FUENTE ÚNICA del catálogo: slug, nombre, icono, tagline, plataforma,
│  │  │                     os, versión, tamaño, descarga/tienda, free, og image, title/description,
│  │  │                     tema {bg, bg2, a1..a4, grad, fuentes, googleFonts}
│  │  │                     → la leen la home, el nav, el footer, los botones de descarga y seo.py
│  │  └─ cv.json            CV es/en (sustituye las 3 copias)
│  ├─ styles/
│  │  ├─ tokens.css         nombres canónicos: --bg --bg-2 --surface --surface-2 --line --line-2
│  │  │                     --text --muted --dim --a1..--a4 --grad --radius --ease
│  │  │                     --font-sans --font-display --font-mono
│  │  ├─ base.css           reset, tipografía, .wrap, ::selection, prefers-reduced-motion
│  │  └─ effects.css        aurora, grain, spot, progress, reveal, shine; keyframes float/shift/sweep/bob/spin
│  ├─ layouts/
│  │  ├─ BaseLayout.astro   <head> común (meta, favicons, fuentes por prop, theme-color), enlace «saltar al contenido», seasonal
│  │  ├─ AppLayout.astro    Base + tema de la app (vars CSS desde apps.json) + Ambient + Nav + Footer + Toast
│  │  └─ LegalLayout.astro  privacidad / términos / soporte / borrar cuenta (Super Pets, iLegato y futuras apps)
│  ├─ components/
│  │  ├─ layout/   Nav (con dropdown «Apps» generado de apps.json), Footer, Ambient, Toast
│  │  ├─ ui/       Button (primary/ghost/sm, shine, magnetic), Pill, SectionTitle, GradText
│  │  ├─ sections/ Hero, Marquee, Bento + BentoCard, Stats, Steps, Faq, CompareTable,
│  │  │            DownloadCard, FinalCta, Tour (teléfono fijo), Gallery (coverflow)
│  │  ├─ mockups/  MacWindow, Phone, Terminal
│  │  └─ demos/    IrarDemo, IgitDemo, ItunesDemo, IspecterDemo, IconverterDemo, IplistDemo,
│  │               IjsonDemo, IcsvDemo, IxmlDemo, IbridgeDemo  ← una sola demo, usada por su página Y por la home
│  ├─ scripts/   (TypeScript vanilla, ES modules)
│  │  ├─ core/   dom ($/$$), motion (sleep, prefersReducedMotion, whileVisible), reveal, counters,
│  │  │          spotlight, progress, tilt, magnetic, toast, stars, nav
│  │  ├─ demos/  <app>.ts → export function mount(root, { compact })
│  │  └─ init.ts activación por atributos: data-reveal, data-count, data-tilt, data-magnetic, data-toast…
│  └─ pages/
│     ├─ index.astro                         home
│     ├─ <app>/index.astro                   ×12 apps
│     ├─ superpets/{privacy,terms,support,delete-account}.astro
│     ├─ ilegato/{privacy,terms,support}.astro
│     ├─ musica/index.astro                  redirección a /iconverter/ (noindex)
│     └─ CV/index.astro, CV/pdf/index.astro  (mayúsculas: GitHub Pages distingue mayúsculas)
├─ public/   se copia tal cual y con las mismas rutas
│  ├─ CNAME, BingSiteAuth.xml, <clave IndexNow>.txt
│  ├─ assets/ favicons, logo, og/*.jpg, icons/, seasonal.js, seasonal.css (URL estable, la usa también el curso)
│  ├─ <app>/  imágenes de cada app (los instaladores van a GitHub Releases, ver §4 bis)
│  ├─ python/ salida del curso (la escribe tools/sync_curso.py)
│  └─ CV/img/
└─ tools/
   ├─ seo.py          SE CONSERVA (ver §4)
   ├─ sync_curso.py   NUEVO: corre ~/Desarrollo/curso/build.py, copia salida/ → public/python/ e inyecta seasonal
   ├─ check_site.py   NUEVO: verificaciones del build (ver §6)
   ├─ indexnow.py     lee dist/sitemap.xml
   └─ og-maker.html, og-receiver.py   sin cambios
```

### Cómo se reutiliza

- **Tema por app**: `AppLayout` recibe el `slug`, lee `apps.json` y emite las variables de su paleta y la etiqueta de Google Fonts con las fuentes de esa app. Todos los componentes usan solo tokens canónicos, así que la misma `Bento` se ve azul y verde en iBridge y cripta-menta en iPlist.
- **Demos únicas**: cada demo es un componente con su script `mount(root, {compact})`. La página de la app la usa completa y la home la usa en su spotlight en modo `compact`. Se acaba la copia doble de `assets/app.js`.
- **Comportamiento por atributos**: `init.ts` se carga una vez. Cualquier página activa el reveal, los contadores, el tilt, etc. con un atributo, sin escribir JS.

### Lo bueno de una página que pasa a todas

| Viene de | Pasa a todas |
|---|---|
| Home: `whileVisible()` | Todas las demos se pausan fuera de pantalla (0 % CPU). |
| Home: dropdown «Apps» | Nav de cada app con navegación cruzada entre apps. |
| Super Pets / iLegato: footer con legales y enlace a la home | Footer único y consistente en todas las apps. |
| Super Pets: `Tour` (teléfono fijo) y `Gallery` (coverflow) | Disponibles para iLegato y futuras apps móviles. |
| iBridge / iCSV / iConverter / iSpecter: FAQ | Componente `Faq` para cualquier app. |
| Curso: «saltar al contenido» | Incluido en `BaseLayout`. |
| La mayoría: `prefers-reduced-motion` | Aplicado de forma central en `motion.ts` y en `effects.css`. |
| `seasonal.js` | Se queda igual (ya era compartido). |

---

## 4. `seo.py` (se conserva) y servidor local

**`tools/seo.py`**: se conserva toda su lógica (canonical, OG, Twitter, JSON-LD, noindex de `/CV/`, sitemap y robots). Cambios mínimos:
- `--root` (por defecto `dist/`): pasa a procesar **la salida del build**, no los archivos fuente.
- `--site` / variable `SITE` (por defecto `http://localhost:4321`): sustituye la constante fija. En el deploy se pasa `https://ierwinx.com`.
- El dict `APPS` y `HOME_DESCRIPTION` se leen de `src/data/apps.json` y `site.json`, para que exista **una sola fuente**.
- `lastmod` del sitemap = fecha del último commit del archivo fuente (`git log -1 --format=%cs`), porque en `dist/` todo tendría la fecha del build.
- `apply_overrides` queda de respaldo, porque el title y la description ya salen de `apps.json`.

**Servidor local** (sustituye a `tools/serve.py`, retirado): `npm run dev` (`astro dev`, recarga en caliente) y `npm start` (build completo con SEO + `astro preview`). El servidor de Vite escucha en IPv4 e IPv6 y abre el navegador; como `SITE` vale `http://localhost:4321` por defecto, el SEO local apunta a ese mismo servidor.

**Nada productivo en local:**
- Todas las URLs absolutas salen de `SITE`, incluidas las de `CV/index.astro` y la redirección de `musica`.
- EmailJS del CV solo envía si `import.meta.env.PROD && SITE === 'https://ierwinx.com'`. En local simula el envío con un toast.
- `indexnow.py` sigue siendo manual y lee `dist/sitemap.xml`.
- Los enlaces externos legítimos (App Store, Play Store, GitHub, LinkedIn) se mantienen.

**Deploy** (`.github/workflows/deploy.yml`): `actions/checkout` con `fetch-depth: 0` (necesario para `lastmod`), luego `npm ci` y `SITE=https://ierwinx.com npm run build`. Python ya viene en `ubuntu-latest`. Se sube `dist/` como hoy. Se eliminan `build.js`, `esbuild` y `csso-cli`.

---

## 4 bis. Descargas en GitHub Releases

Tener `.dmg`/`.pkg` en git es mala práctica: cada versión nueva se queda para siempre en el historial (el `.git`
ya pesa ~283 MB) y GitHub Pages no está pensado para servir binarios. **GitHub Releases** es gratis, admite
archivos de hasta 2 GB, no cuenta para el tamaño del repo y da URLs estables:

    https://github.com/ierwinx/cv/releases/download/<tag>/<archivo>

- Un tag por app y versión: `ibridge-v1.0`, `igit-v1.0.0`, `itunes-v1.0.0`…
- `src/data/apps.json → release {tag, file}` es la única fuente del enlace; la usan los botones (`DownloadButton`)
  y el `downloadUrl` del JSON-LD.
- `tools/release.sh <tag> <archivo>` crea el release y sube el archivo (requiere `gh`).
- `musicdemo.zip` (música de prueba para los revisores de Apple de iLegato) va en el release `ilegato-musicdemo`; hay que poner la URL nueva en las notas de revisión de App Store Connect.
- Se comprobó que ninguna app instalada descarga de `ierwinx.com`: `latest.json` de iSpecter solo lo lee su página.
- Pendiente opcional: limpiar el historial de git de los binarios viejos (`git filter-repo` + push forzado). Es
  irreversible y reescribe todos los commits, así que se decide aparte.

---

## 5. Migración por fases (el sitio nunca se rompe)

0. **Andamiaje con paso directo.** Instalar Astro, mover todo el sitio actual tal cual a `public/` con `git mv` y adaptar `seo.py` y `deploy.yml`. El resultado (`dist/`) debe ser idéntico al sitio actual. Etiquetar el commit previo como `legacy-v1`. Guardar este documento en `docs/REDISENO.md`.
1. **Fundamentos.** `tokens.css`, `base.css`, `effects.css`, `scripts/core/*`, `init.ts`, `BaseLayout`, `AppLayout`, `Nav`, `Footer`, `Ambient`, `Toast`, `Button`, `SectionTitle`, `apps.json` y `seo.py` leyendo `apps.json`.
2. **Página de referencia: iBridge** (la más reciente; además comparte ~100 líneas de CSS con iXML). Se migra, se compara con capturas y se ajustan los componentes.
3. **Resto de apps Mac:** iXML → iJson → iPlist → iCSV → iSpecter → iConverter → iRar → iGit → iTunes. Cada demo se extrae a `components/demos` y `scripts/demos`. Al migrar una página se borra su copia de `public/`.
4. **Home.** Tarjetas, dropdown y dock generados desde `apps.json`. Las demos se reutilizan en modo `compact` y `assets/app.js` y `assets/styles.css` desaparecen.
5. **Apps móviles:** Super Pets e iLegato, con `LegalLayout`, `Tour` y `Gallery`.
6. **CV:** `cv.json` como única fuente para `/CV/` y `/CV/pdf/`, EmailJS protegido y borrado de `CV/lang/*.json`. Redirección de `musica`.
7. **Curso y limpieza:** `tools/sync_curso.py`, borrar lo que quede del legado y actualizar el `README`. Opcional, en el repo del curso: cargar `indice-busqueda.js` solo al enfocar el buscador.

Cada fase termina en un commit desplegable.

---

## 6. Verificación

- **`tools/check_site.py`**, que corre dentro de `npm run check` y también en CI:
  1. **Paridad de URLs:** toda ruta del sitio en `legacy-v1` (HTML, imágenes, `.dmg`/`.pkg`, `latest.json`, `CNAME`, verificaciones de Bing e IndexNow) existe en `dist/`, respetando mayúsculas (`/CV/`).
  2. **Sin producción en local:** al compilar con el `SITE` local, `dist/` no contiene `https://ierwinx.com` (salvo `CNAME`).
  3. **SEO:** cada página pública tiene un único bloque `seo:start…seo:end`, canonical, og:image y JSON-LD válido; `/CV/*` tiene `noindex` y está fuera del sitemap; el sitemap tiene el mismo número de URLs que hoy.
- **Paridad visual:** servir `legacy-v1` (worktree) con `python3 -m http.server 8101` y el sitio nuevo con `npm start`, y comparar capturas de cada página a 390 px y 1440 px (Playwright como dependencia de desarrollo, en `npm run shots`). Toda página migrada debe verse igual antes de borrar su versión legada.
- **Manual:** `npm start` → recorrer la home y cada app. Revisar que las demos se pausen fuera de pantalla, el modo de movimiento reducido, el seasonal (`testEffect("navidad")` en consola) y el formulario del CV, que no debe enviar nada en local.
- **Producción:** tras el primer deploy, revisar el sitemap y una página con el Rich Results Test de Google y con la vista previa de enlaces de WhatsApp o LinkedIn.

## Riesgos

- **Regresiones visuales**: se mitigan con la comparación de capturas por página.
- **URLs que cambian**: se mitigan con la paridad de URLs, `format: 'preserve'` y el cuidado con las mayúsculas de `/CV/`.
- **Descargas**: los enlaces viejos (`/ibridge/iBridge-1.0.dmg`…) dejan de existir al publicar; hay que subir los releases **antes** del primer deploy (ver §4 bis).
- **`lastmod` en CI**: requiere `fetch-depth: 0`.
