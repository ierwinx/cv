# ierwinx.com

Portafolio y landings de las apps de Erwin (iBridge, iPlist, iJson, iCSV, iXML, Super Pets, iLegato, iMount, iRar, iGit,
iTunes, iSpecter, iConverter), su CV privado y un curso de Python. Sitio **estático** en GitHub Pages
(dominio `ierwinx.com`, repo público `ierwinx/cv`).

El plan completo y su porqué están en `docs/REDISENO.md`. Este archivo es la guía de trabajo.

## Comandos

```sh
npm run dev                       # diseñar: recarga en caliente en http://localhost:4321 (sin bloque SEO)
npm start                         # ver como producción: build completo + astro preview en http://localhost:4321
npm run build                     # astro build + tools/seo.py sobre dist/
npm run check                     # astro check (tipos, TS estricto) + tools/check_site.py (URLs, local, SEO)
SITE=https://ierwinx.com npm run build   # lo que hace el deploy
```

El deploy (`.github/workflows/deploy.yml`) corre en cada push a `master`: `npm ci`, el build con
`SITE=https://ierwinx.com`, `npm run check` y publica `dist/`. Python 3.9 en local: `tools/*.py` sin sintaxis
posterior a 3.9.

## Arquitectura

Astro 7 con salida estática y **cero framework en el navegador**. Los componentes `.astro` se resuelven al
compilar; en el navegador solo corre TypeScript vanilla. `build.format: 'preserve'` mantiene las URLs exactas:
`src/pages/ibridge/index.astro` → `/ibridge/index.html` y `src/pages/superpets/privacy.astro` →
`/superpets/privacy.html`.

```
src/data/apps.json     FUENTE ÚNICA de cada app: nombre, versión, tamaño, release/App Store, título/descripción SEO,
                       ícono, tema y `home` (subtítulo del menú, ícono de la home, «Nuevo»). Su orden es el de la home
                       También `glyphs` (símbolos/emojis que flotan en el fondo) y `theme.vars` (tokens de color)
src/data/legal.json    datos REALES de cada app de Mac para /<slug>/privacy, terms y support (sacados de su repo:
                       Info.plist, entitlements, red, dónde guarda datos, licencia, FAQ). Super Pets e iLegato tienen
                       sus propias páginas
src/data/home.json     textos de los spotlights de la home (lema, funciones, cifras, botones, colores)
src/data/cv.json       CV en es/en: la página /CV/ (`web`) y la hoja PDF (`pdf`); los años se calculan al cargar
src/data/site.json     marca, URL de producción, base de GitHub Releases, descripción de la home
src/lib/apps.ts        getApp(slug), downloadUrl(app)
src/lib/contact.ts     contactAttrs(): a dónde envía el formulario de contacto y si pide reCAPTCHA (al compilar)
src/styles/            tokens.css (nombres canónicos) · base.css · effects.css (aurora, reveal, toast, keyframes)
src/styles/pages/      lo que es exclusivo de una página (home.css, ilegato.css, cv.css…)
src/layouts/           BaseLayout (head, favicon, fuentes, seasonal, «saltar al contenido») · AppPage (head de una
                       app desde apps.json, banner de App Store) · AppLayout (AppPage + tema, ambiente, nav y toast)
src/components/layout  Ambient, Nav (la de Super Pets), Footer (columnas App/Legal y nombre gigante), Toast
src/components/ui      Button (el de iLegato), DownloadButton, GlyphField (símbolos flotantes de iJson), Icon,
                       ContactForm (formulario de contacto → micro Backierwinx)
src/components/legal   LegalShell: documento de privacidad/términos/soporte de src/pages/[slug]/*.astro
src/components/sections Hero, Marquee, Section, Bento/BentoCard, Steps, Stats, CompareTable, Principles, Faq, DownloadCta
src/components/mockups AppWindow (ventana 3D del hero)
src/components/demos   <App>Demo.astro + <app>.css: demos que comparten la página de la app y la home
                       (IbridgeDemo también es la de iMount con variant="imount": las dos apps comparten interfaz)
src/components/home    Spot (spotlight genérico), menú/órbita/dock (AppIcon, BrandMark) y los visuales propios de la home
src/components/<app>   piezas de una sola app: SuperpetsShell, IlegatoShell + StoreButtons, cv/Resume
src/scripts/init.ts    comportamiento común, activado por clases/atributos (ver abajo)
src/scripts/core/      dom ($, $$, esc), motion (sleep, reduceMotion, whileVisible), loop (frameLoop), ambient,
                       reveal, counters (countUp, initCounters), pointer (tilt, magnetic), celebrate (confetti, toast),
                       contact (initContactForm, initContactForms)
src/scripts/demos/     <app>.ts → export function mount(root)  (ibridge, ixml, igit, iconverter)
src/scripts/home/      visuales de la home → mount(root) (editores, iTunes, espectrograma, iRar, Academia)
src/scripts/pages/     el script de cada página con diseño propio (home.ts, itunes.ts, cv.ts…)
public/                se copia tal cual a dist/: imágenes, CNAME, verificaciones, assets/seasonal.* y el curso
tools/                 seo.py, check_site.py, sync_curso.py, release.sh, indexnow.py, og-maker.html, og-receiver.py
```

### Reglas para no volver a duplicar

- **Antes de escribir algo, busca si ya existe** en `components/` o `scripts/core/`. Si una página tiene algo bueno
  que otra querría (FAQ, tour, galería, comparativa…), conviértelo en componente y úsalo en las dos.
- **Colores, fuentes y radios solo con tokens** (`--bg --bg-2 --text --muted --line --surface --a1..--a4 --grad
  --panel-rgb --toast-bg --icon-stroke --confetti --font-sans --mono`). Cada app los define en
  `apps.json → theme.vars`; `AppLayout` los pone en `<html style>`. Nada de hex sueltos en componentes
  compartidos: si hace falta un tono derivado, usa `color-mix(in srgb, var(--a1) 45%, transparent)`.
- **CSS en archivos `.css` importados** desde el componente o la página, nunca en `<style>` con alcance de Astro:
  las demos generan HTML con `innerHTML`, que no lleva el atributo de alcance. Prefija las clases de cada demo
  (`.ib-demo …`) para que convivan en la home.
- **Comportamiento por atributos** en las páginas del sistema aurora (`AppLayout`), sin JS propio: `.reveal` (aparece al hacer scroll, escalonado), `.tilt`
  (inclinación 3D y brillo), `.magnetic` (botón que sigue al cursor), `[data-download]` (confeti + `#toast`),
  `[data-scroll-tilt]` (ventana del hero que se endereza), `#progress` y `#stars`. Todo respeta
  `prefers-reduced-motion`.
- **Demos:** `mount(root)` busca todo dentro de `root` (nunca en `document`) y en cada vuelta hace
  `await visible()` (`whileVisible`), así no gastan CPU fuera de pantalla; con movimiento reducido pintan un cuadro
  fijo. Si la página de la app y la home muestran lo mismo, es **una sola demo** en `components/demos` +
  `scripts/demos` (iGit, iConverter); lo que solo existe en la home va en `components/home` + `scripts/home`.
- **Un script de entrada por página:** los componentes de demo de la home y los compartidos (IgitDemo,
  IconverterDemo) solo traen marcado y CSS; los monta el script de la página (`home.ts` tiene la lista `DEMOS`).
  Así una página carga 2–4 archivos JS. `scripts/core` va junto en un solo chunk `core` (`astro.config.mjs`).
- **Efectos comunes con opciones, nunca reimplementados:** `confetti(canvas, x, y, {colores, física…})`,
  `toast(mensaje, {className, ms})` y `countUp(el, {duration, power, format})` / `initCounters()` de `core`. Cada
  página pasa sus parámetros para conservar su estilo (ver iGit, iCSV, Super Pets).
- **Canvas animados con `frameLoop(draw, {fps, visible})`** (`core/loop`): se pausa con la pestaña oculta o el canvas
  fuera de pantalla. Los fondos que se mueven despacio van a `fps: 30`; lo que avanzaba «por fotograma» se multiplica
  por `k` para mantener la velocidad. Los degradados difusos se pintan a baja resolución (¼ o menos).
- Las animaciones CSS de los bloques fuera de pantalla se pausan solas (script inline de `BaseLayout` +
  `[data-offscreen]` en `document.css`).
- **Ganchos de las demos con prefijo** (`data-ic-*`, `data-tui`…): nunca `data-count` u otros nombres que usen
  `core` o las páginas, o los dos scripts pelean por el mismo elemento.
- **Los scripts del navegador no importan `cv.json` ni `site.json`:** el primero pesa 11 KB y el segundo trae la
  URL de producción. Si un script necesita un dato, la página lo pone en un atributo `data-*` al compilar.
- **TypeScript estricto** en todo `src/scripts` (`astro check` lo valida en `npm run check` y en el deploy). Nada
  de `$`/`$$`/`sleep` locales: impórtalos de `scripts/core`.
- **Datos al compilar, no en el navegador:** versiones, tamaños, enlaces de tienda, años y textos repetidos salen de
  `src/data/*.json` en el `.astro`. El JS solo anima.
- Comentarios y textos en español, como el resto del proyecto.

### Página de una app

```astro
<AppLayout slug="ibridge" stars nav={[['#funciones', 'Funciones']]} toast="🎉 ¡Gracias por descargar…!">
  <Hero …><IbridgeDemo /></Hero>
  <main id="contenido"> <Section …><Bento>…</Bento></Section> … <DownloadCta …/> </main>
  <Footer slot="footer" app={app} note="…" tagline="…" />
</AppLayout>
```

`AppLayout` toma de `apps.json` el título, la descripción, el ícono, el `theme-color`, las fuentes de Google y los
tokens. Para una app nueva: añade su entrada en `apps.json` (con `theme`, `icon`, `title`, `description` y `home`),
crea `src/pages/<slug>/index.astro`, sus imágenes en `public/<slug>/` y su spotlight en `home.json`.

**Páginas con diseño propio** (iJson, iPlist, iCSV, iRar, iGit, iTunes, iSpecter, iConverter, Super Pets, iLegato,
home y CV) no usan el sistema aurora: `AppPage` (o `BaseLayout`) + `styles/pages/<slug>.css` +
`scripts/pages/<slug>.ts`. Si varias páginas de la misma app comparten estructura, va en un *shell*
(`SuperpetsShell`, `IlegatoShell`).

**Piezas comunes en TODAS las páginas de app** (aurora y propias): `Nav`, `Button`/`DownloadButton`, `Faq`,
`DownloadCta` (slots `art`, `bg`, `extra` para lo propio de cada app) y `Footer`, más `GlyphField`. El script de la
página llama a `initNav()` y `initGlyphs()` (`init.ts` ya lo hace en las aurora). Sus clases llevan prefijo `ui-` para
no chocar con el CSS propio; solo usan tokens (`apps.json → theme.vars`; `--ui-grad` si el `--grad` de la página no
sirve para texto). Todas las páginas son oscuras (sin tema claro) y todas las apps son gratis.

**Privacidad, términos y soporte** de cada app de Mac: `src/pages/[slug]/{privacy,terms,support}.astro` con
`LegalShell` y `data/legal.json`. Al añadir una app, agrega su entrada en `legal.json` con datos verificados en su
repo (no inventes permisos ni funciones).

## Estado

Todo el sitio sale de Astro (`docs/REDISENO.md` §5, fases 0–7 hechas): ya no queda HTML legado en `public/`.

**Paridad visual** al rediseñar una página: compara con la etiqueta `legacy-v1` (el sitio antes del rediseño):
`git worktree add <tmp> legacy-v1`, sírvelo con `python3 -m http.server 8101 --directory <tmp>` y compara capturas a
1440 px y 390 px con movimiento reducido. El usuario valida visualmente antes de dar algo por bueno. Al terminar,
`git worktree remove <tmp>`.

## Formulario de contacto

**El sitio no publica ningún correo**: el contacto es un formulario que envía al microservicio
`~/Desarrollo/Backierwinx` (FastAPI + Firestore en Render, URL en `site.json → contactApi`). Lo usan el CV (con su
propio marcado bilingüe) y, con `<ContactForm origen="…">`, el soporte de cada app (`origen` = slug), la página de
eliminar cuenta de Super Pets, iConverter y `/contacto/`. El pie de cada app y sus páginas legales enlazan a
`support.html#contacto`; la home y lo que no es de una app usan `/contacto/?app=<slug>` (muestra la app y la manda como
`origen`).

- Solo el build de producción envía y pide reCAPTCHA v2; en local el envío se simula (`console.info`).
- Probar contra el micro local: `PUBLIC_CONTACT_API=http://localhost:8000 npm run dev` (sin reCAPTCHA).
- El script de la página llama a `initContactForms()` (o `initContactForm(form, opciones)` en el CV). Al acercarse
  el formulario a la pantalla carga reCAPTCHA y llama a `GET /salud` para despertar el micro (Render gratis duerme).
- `origen` identifica la página en Firestore (`cv`, `ilegato`, `superpets`, `superpets-eliminar-cuenta`, `iconverter`).

## SEO (`tools/seo.py`)

- Corre **después** de `astro build` sobre `dist/`. Inserta el bloque `<!-- seo:start … seo:end -->` (canonical,
  Open Graph, Twitter, JSON-LD), genera `sitemap.xml` y `robots.txt`. **No escribas metadatos SEO a mano** en las
  páginas: solo `<title>` y `<meta name="description">` (que en las apps salen de `apps.json`).
- Todas las URLs absolutas salen de `SITE` (por defecto `http://localhost:4321`, el puerto de `astro dev`/`preview`). Si el build no es de producción,
  reescribe a `SITE` cualquier `"https://ierwinx.com…` que quede. Un build local nunca debe enlazar a producción;
  `npm run check` lo comprueba.
- `lastmod` = fecha del último commit del archivo fuente (`src/pages/…astro` o `public/…`). Por eso el workflow
  usa `fetch-depth: 0`.
- **`/CV/` va en mayúsculas** (GitHub Pages distingue mayúsculas): siempre `noindex`, fuera del sitemap, y
  `robots.txt` bloquea `/CV/img/`.
- `musica/` es una redirección a `/iconverter/` (está en `REDIRECTS` de `seo.py`).
- `tools/indexnow.py --send` avisa a Bing; exige un `dist/` compilado con `SITE=https://ierwinx.com`.
- **CSP:** al final, `seo.py` pone en cada página un `<meta http-equiv="Content-Security-Policy">` (GitHub Pages no
  deja cabeceras) con la huella SHA-256 de sus scripts en línea, calculada sola. Si agregas algo de **otro dominio**
  (script, fuente, API, iframe), súmalo en `csp_policy()` o el navegador lo bloquea. `npm run check` verifica que cada
  página tenga su CSP y que ningún script en línea quede fuera.

## Descargas (.dmg / .pkg / .zip)

**Nunca van en git.** Viven en **GitHub Releases** de `ierwinx/cv`, con un tag por app y versión (`ibridge-v1.0`,
`igit-v1.0.0`…). El enlace sale de `apps.json → release {tag, file}`.

```sh
tools/release.sh ibridge-v1.1 ~/Desarrollo/iBridge/build/iBridge-1.1.dmg   # requiere gh (brew install gh)
```

Después actualiza `release`, `version` y `size` en `apps.json`.

**Música de prueba de iLegato** (`musicdemo.zip`, ~79 MB): la usan los revisores de Apple para probar iLegato.
Vive en el release `ilegato-musicdemo` →
`https://github.com/ierwinx/cv/releases/download/ilegato-musicdemo/musicdemo.zip`. Esa es la URL que va en las
notas de revisión de App Store Connect (antes era `https://ierwinx.com/ilegato/musicdemo.zip`, que ya no existe).
Para cambiar el contenido: `tools/release.sh ilegato-musicdemo musicdemo.zip` (reemplaza el archivo, misma URL).

`releases/` (ignorada por git) es solo una carpeta
local de paso. `public/ispecter/downloads/latest.json` sí está en el repo: la página de iSpecter lo lee para
mostrar versión, tamaño y SHA-256.

## Curso de Python

Se escribe y se genera en **otro repo**: `~/Desarrollo/curso` (Markdown → `build.py` → `salida/`, con
`verificar.py` y `comprobar.py`). Aquí solo vive su salida en `public/python/`, con el `<link>` y el `<script>` de
`/assets/seasonal.*` añadidos. **No edites a mano `public/python/`**: cambia el curso allá y copia con
`python3 tools/sync_curso.py` (corre su `build.py`, reemplaza `public/python/` e inyecta el seasonal;
`--sin-build` usa `salida/` tal cual).

## Otros repos que apuntan aquí

`~/Desarrollo/iGit/CLAUDE.md` y `docs/RELEASING.md`, `~/Desarrollo/iRar/.claude/launch.json` e
`~/Desarrollo/iLegato/iLegato-iOS/docs/REUSE.md` mencionan rutas viejas como `~/Desarrollo/cv/igit`. Ahora esas
páginas están en `src/pages/<app>/` (imágenes en `public/<app>/`) y sus instaladores van a GitHub Releases con
`tools/release.sh`.
