# Auditoría con *Modern Web Guidance*

Revisión del sitio (noviembre 2026) contra las guías de `modern-web-guidance` (plugin de Google Chrome, v1.0.2).
Las guías indican, para cada patrón, en qué navegadores funciona (Chrome, Edge, Firefox y Safari) y qué *fallback*
pide.

> **Nota sobre la skill `chrome-extensions`:** es solo para extensiones de navegador (`manifest.json`, `chrome.*`,
> Chrome Web Store). Este repo no tiene ninguna extensión, así que **esa skill no aplica**. La que aplica a un sitio
> web es `modern-web-guidance`, la otra del mismo plugin, y es la que se usó aquí.

**Cómo se hizo:** `npx modern-web-guidance legacy-scan src` (24 hallazgos en 170 archivos, que verifiqué uno por uno)
más una revisión a mano de diálogos, imágenes, formularios, transiciones y scroll. El escáner automático solo cubre
~20 % de las guías.

**Criterio de soporte:** el que usan las guías por omisión. Lo que es *Baseline Widely available* se usa sin más; lo
que no, lleva el *fallback* que pide la guía. Si quieres otro criterio (p. ej. «Safari 17+»), conviene escribirlo en
`CLAUDE.md`.

---

## Lo que ya hacemos bien ✅

- **Popover nativo** en el menú «Descargar para Linux» de La Baraja (`popover`, `popovertarget`, `beforetoggle`,
  `:popover-open`).
- **`color-scheme: dark`** en las páginas oscuras: los controles y las barras de scroll del navegador salen oscuros.
- **Máscaras con estándar + prefijo** en `home.css`, `iconverter.css`, `itunes.css` (`.visualizer`) y `ilegato.css`.
- **`scrollbar-width: none`** estándar en la galería de Super Pets.
- **Animación ligada al scroll nativa** (`animation-timeline: view()`) en el reveal de iJson.
- **Listeners de scroll `passive`** y agrupados con `requestAnimationFrame`, y todo respeta `prefers-reduced-motion`.
- **Formulario de contacto (`ContactForm`)**: `<label>` envolviendo cada campo, `autocomplete="name"` y `"email"`,
  `type="email"`, `required`/`minlength`/`maxlength`, `role="alert"` y `role="status"`.
- **CSP** por página con huellas SHA-256, imágenes en WebP y casi todas con `width`/`height`.

---

## Prioridad alta: accesibilidad y fallos reales

### ✅ 1. [HECHO] Modales y lightboxes hechos con `<div>`, en vez de `<dialog>` · guía `dialog`

| Dónde | Hoy |
|---|---|
| `src/pages/CV/index.astro:181` + `scripts/pages/cv.ts:119-125` | `<div class="modal-overlay">` con clase `.active`, clic en el fondo y `Escape` a mano |
| `src/pages/superpets/index.astro:308` + `scripts/pages/superpets.ts:204-216` | `<div class="lightbox" hidden>`, `body.style.overflow = 'hidden'`, `Escape` a mano |
| `src/pages/itunes/index.astro:305` + su script | igual que Super Pets |

**Qué falla hoy:** el foco no queda atrapado dentro, el resto de la página no se vuelve inerte (con Tab llegas a lo
que hay detrás), el foco no regresa al botón que abrió el modal y el lector de pantalla no lo anuncia como diálogo.
Además, el botón de cerrar del CV (`#certModalClose`) **no tiene nombre accesible**: solo lleva un SVG, sin
`aria-label`.

**Qué hacer:** pasarlos a `<dialog>`, abrirlos con `showModal()` (o `command="show-modal"` + `commandfor`) y ponerles
`closedby="any"` para que cierren al tocar fuera.

- La guía dice: *«The browser provides: inert page, focus containment, top layer, `::backdrop`, `Esc` and back-gesture
  dismissal, and focus return to the invoker.»*
- **No hace falta** `role="dialog"`, `aria-modal`, el *focus trap* ni el `Escape` a mano.
- **No usar** `overflow: hidden` en `body` para que no se mueva el fondo. En su lugar:
  ```css
  dialog:modal { overscroll-behavior: contain; }
  dialog::backdrop { overflow: hidden; overscroll-behavior: contain; }
  ```
- Darles nombre con `aria-labelledby` (al `<h…>` del título) o `aria-label` (el lightbox no tiene título).
- **Fallback obligatorio de `closedby`:** Safari no lo soporta todavía (Chrome 134+, Firefox 141+). La guía
  `light-dismiss-a-dialog` pide dejar, solo para esos navegadores, el script que cierra al hacer clic fuera del
  rectángulo del contenido:
  `if (!('closedBy' in HTMLDialogElement.prototype)) { … }`. `Esc` funciona en todos sin hacer nada.
- Lo ideal es un componente común (`components/ui/Lightbox.astro` + una función en `scripts/core/`), que usen las
  tres páginas, como pide la regla de «no volver a duplicar».

> **Hecho:** los tres son `<dialog closedby="any">` abiertos con `showModal()`. El `<dialog>` es el contenido (la caja
> del certificado, el teléfono o la imagen) y el fondo oscuro con desenfoque pasó a `::backdrop`: si el diálogo ocupara
> toda la pantalla, no habría fondo donde tocar para cerrarlo. Los botones de cerrar usan `<form method="dialog">` y el
> del CV tiene nombre en los dos idiomas (`education.close` en `cv.json`). `scripts/core/dialog.ts` → `lightDismiss()`
> es el respaldo para Safari, que no tiene `closedby`. La regla para que no se mueva la página de atrás está en
> `document.css`. Se quitaron el `Escape` a mano, el `body.style.overflow` y el clic en el fondo hecho a mano. Al cerrar el
> del CV se vacía su contenido (el `<iframe>` del PDF deja de ocupar memoria). No se hizo el componente común: el
> marcado de cada uno es distinto y lo compartido (CSS y script) ya está en `core`.
>
> **También hecho:** lo que abre cada modal ahora es un `<button type="button" aria-haspopup="dialog">`: el título y
> cada certificado del CV (`.degree-open`, `.cert-item`), las capturas de iTunes (`.shot-open` dentro de cada `.shot`)
> y los teléfonos de la galería de Super Pets (`button.phone.shot-open`). Se abren con Tab + Enter y, al cerrar, el
> foco vuelve a la tarjeta. Llevan anillo de foco con `:focus-visible`.

### ✅ 2. [HECHO] Bordes con máscara que solo usan el prefijo `-webkit-` · guía `complex-shapes`

El truco del «borde degradado» (`content-box` + `xor`) declara `-webkit-mask` y `mask-composite`, pero **no** la
propiedad estándar `mask`. `mask-composite: exclude` sin un `mask` estándar no hace nada. La máscara es *Baseline
Widely available* (Chrome 120, Firefox 53, Safari 15.4); la guía dice *«MANDATORY: Use vendor prefix for wider
support»* **junto** a la propiedad estándar.

Archivos (9):
- `components/mockups/window.css:4`
- `styles/pages/icsv.css:142` y `:208`
- `styles/pages/igit.css:149`
- `styles/pages/iplist.css:88`
- `styles/pages/ispecter.css:134` y `:229`
- `styles/pages/itunes.css:256`
- `styles/pages/superpets.css:516`

Hoy todo depende de que el navegador traduzca `-webkit-mask` y `-webkit-mask-composite: xor`. A cada regla le falta
la línea estándar:

```css
-webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
-webkit-mask-composite: xor;
        mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
        mask-composite: exclude;
```

Lo mejor es moverlo a una clase o variable común en `effects.css`, porque hoy está copiado 9 veces.

### ✅ 3. [HECHO] Imágenes sin `width`/`height` (CLS) · guías `performance` y `optimize-image-priority`, y regla de `CLAUDE.md`

Estas imágenes no reservan su espacio y el diseño salta al cargarlas:

- `components/home/AppIcon.astro:7` (íconos del menú y del dock de la home: se repite muchas veces)
- `components/home/IbridgeFlow.astro:16`, `components/home/IrarOrbit.astro:6`, `components/home/PhoneShowcase.astro:9`
- `pages/ilegato/index.astro:205`, `:331`, `:354`
- `pages/CV/index.astro:68` (la foto)
- `pages/irar/index.astro:80`, `:83`, `:87`, `:192-212` (íconos de documento; además son **PNG**, y la regla del
  proyecto pide WebP)

> **Hecho:** `src/lib/imgsize.ts` lee al compilar el tamaño real (WebP/PNG/SVG) de las imágenes que salen de datos
> (`AppIcon`, `PhoneShowcase`, `IbridgeFlow`). Las demás llevan `width`/`height` fijos. Los íconos de iRar pasaron a
> WebP (los `doc-*.png` se borraron; `icono-256.png` se queda porque es el favicon de `apps.json`). Los `img {}` de
> `home.css`, `irar.css` e `ilegato.css` ahora llevan `height: auto`, para que el CSS que solo fija el ancho no deforme
> la imagen. Las imágenes de los lightbox (sin `src` al cargar) se resuelven en el punto 1.

---

## Prioridad media

### ✅ 4. [HECHO] Ninguna imagen usa `fetchpriority="high"` · guía `optimize-image-priority`

La guía dice: *«MANDATORY: Always apply `fetchpriority="high"` to the LCP image»* (a lo más 1 o 2 por página, y
nunca junto a `loading="lazy"`). En el repo no aparece `fetchpriority` en ningún lado.

- Hay que medir en cada página cuál es el elemento LCP (Lighthouse o el panel Performance). En muchas páginas el LCP
  será texto o una demo en canvas, y entonces no hace falta nada. Donde sea una imagen (capturas de Super Pets, La
  Baraja e iLegato; la foto del CV), ponerle `fetchpriority="high"` y asegurarse de que **no** tenga
  `loading="lazy"`.
- Lo que se carga oculto arriba del pliegue (slides de carrusel que no son la primera, como
  `PhoneShowcase`/iLegato) va con `fetchpriority="low"`.
- Se puede pasar como prop `priority` a `Hero.astro`.

> **Hecho:** medí el elemento LCP de las 20 páginas a 1440 px y 390 px. Solo es una imagen en tres: la foto del CV,
> el teléfono del frente en el hero de iLegato y el de Super Pets (en escritorio). Esas llevan `fetchpriority="high"`
> (sin `loading="lazy"`; a la de Super Pets se le quitó `decoding="async"`). En las demás el LCP es el texto del hero
> y no hace falta nada. Los carruseles (`PhoneShowcase`, iLegato) ya cargan sus otras imágenes con `loading="lazy"`.
> La foto del CV pasó de JPG (441 KB) a WebP (23 KB): `cv.json → person.photoWebp`. El JPG se queda para el PDF
> (`cv-pdf.ts` la mete como JPEG) y para la imagen de Open Graph.

### ✅ 5. [HECHO] El tema claro/oscuro del CV no avisa al navegador · guía `dark-mode-toggle`

`src/pages/CV/index.astro:34` y `scripts/pages/cv.ts:146-151` cambian `data-theme` y lo guardan en `localStorage`,
pero ni `cv.css` ni el `<head>` declaran `color-scheme`. Por eso, en modo oscuro, los `<input>`, el `<textarea>`, la
barra de scroll y el autocompletado del formulario siguen viéndose claros.

- Añadir `<meta name="color-scheme" content="light dark">` y actualizarlo en `toggleTheme()` (`"dark"` / `"light"`).
- En CSS: `:root { color-scheme: light dark }`, `[data-theme="dark"] { color-scheme: dark }` y, si se quiere
  simplificar, `light-dark()` para los colores.
- La guía advierte: *«DO NOT hardcode `color-scheme: light` or `color-scheme: dark` as the root default»* (aquí sí
  aplica, porque el CV es la única página con dos temas).

### ✅ 6. [HECHO] El formulario del CV · guía `forms`

`src/pages/CV/index.astro:144-151`:
- Sin `autocomplete`: agregar `given-name`, `family-name`, `organization`, `email`.
- Sin `maxlength`/`minlength` (el de las apps sí los tiene).
- El mensaje de error del reCAPTCHA (`#errorRecaptcha`) y `#formStatus` no tienen `role="alert"`/`role="status"`: el
  lector de pantalla no los anuncia.
- En los dos formularios: marcar los campos con error con `aria-invalid="true"` y darles estilo con `:user-invalid`
  (no `:invalid`, que pinta en rojo antes de que la persona escriba). Al fallar el envío, mover el foco al primer
  campo inválido.

> **Hecho:** `autocomplete`, `maxlength` (y `minlength` en el mensaje), `role="alert"`/`role="status"` y borde rojo
> con `:user-invalid` en los dos formularios. La validación es la nativa (sin `novalidate`), así que el navegador ya
> lleva el foco al primer campo inválido, y no hizo falta `aria-invalid`. **Revisa:** el límite de «Empresa» (120) lo
> puse yo; no encontré `~/Desarrollo/Backierwinx` para confirmar los límites del micro (nombre 80, correo 160,
> mensaje 4000 son los que ya usaba `ContactForm`).

### ✅ 7. [HECHO] Barra de scroll del CV solo con `::-webkit-scrollbar` · guía `customize-scrollbar-color-and-thickness`

`styles/pages/cv.css:678-690` (`.certs-grid`). En Firefox no se aplica ese estilo. Hay que añadir el estándar y dejar
el prefijo como *fallback*:

```css
.certs-grid { scrollbar-width: thin; scrollbar-color: var(--thumb) var(--track); }
@supports not (scrollbar-color: auto) {
  .certs-grid::-webkit-scrollbar { … }   /* lo de hoy */
}
```

### ✅ 8. [HECHO] JS menor · guía `js`

- `scripts/pages/icsv.ts:134` (`term.innerHTML = ""`) y `scripts/pages/irar.ts:187` (`rows.innerHTML = ""`) →
  `replaceChildren()`. Evita pasar por el parser HTML y no rompe con Trusted Types si algún día se activa en la CSP.
- `scripts/pages/ijson.ts:196`: `[...n.kids!].reverse().find(…)` → `n.kids!.findLast(…)` (no copia el arreglo).
- `scripts/core/motion.ts:20`: `new Promise((r) => { wake = r; })` → `Promise.withResolvers()`. Solo es estético;
  opcional. **No se cambió a propósito:** `Promise.withResolvers` pide Safari 17.4+ y está en `core`; en un iPhone
  más viejo se romperían todas las demos sin ganar nada visible.

---

## Prioridad baja: oportunidades (mejora progresiva, **sin quitar lo que ya funciona**)

Estas funciones todavía no están en todos los navegadores. Las guías piden mantener el JS actual como *fallback*, así
que solo valen la pena si se quiere menos JS en Chrome y Safari.

| # | Oportunidad | Guía | Soporte (según la guía) | Dónde |
|---|---|---|---|---|
| ✅ 9 | **Transiciones entre páginas** (`@view-transition { navigation: auto }` dentro de `prefers-reduced-motion: no-preference`). Sin JS: un fundido al pasar de la home a una app | `cross-document-transitions` | Chrome 126, Safari 18.2. Firefox no (navega normal) | `styles/base.css` |
| ✅ 10 | **Barra de progreso de lectura con CSS** (`animation-timeline: scroll()` dentro de `@supports`) | `scroll-progress-indicator` | Baseline nuevo (oct 2026: Chrome 115, Safari 26, Firefox 159) | `#progress` de `core/scroll.ts`. Dejar el JS como fallback |
| 11 | **Reveal con CSS** (`animation-timeline: view()`, como ya hace iJson) en el `.reveal` común | `scroll-entry-exit-effects` | Igual que el 10 | `document.css` + `core/reveal.ts`. Si el efecto es decorativo, la guía permite no dar fallback |
| 12 | **Scrollspy con CSS** (`scroll-target-group: auto` + `:target-current`) | `scrollspy` | Solo Chrome. Es obligatorio mantener el `IntersectionObserver` y `aria-current` | `core/nav.ts:28` |
| 13 | **Botón «volver arriba» sin scroll listener** (`container-type: scroll-state`) | `scroll-position-aware-elements` | Solo Chrome 144 | `cv.ts:185` |
| 14 | **Menú de Linux anclado al botón con CSS** (anchor positioning + `position-try-fallbacks`) | `viewport-aware-dropdowns` | Chrome 157, Safari 27. Firefox no | `scripts/pages/labaraja.ts` (`place()`). Mantener el script en `@supports not` |
| 15 | **Escalonado con `sibling-index()`** en lugar de varias reglas `:nth-child(N)` | `dynamic-sibling-animations` | Baseline nuevo (ago 2026) | `home.css:1000`, `iplist.css:172`, `irar.css:256`, `superpets.css:564`. Con pocos elementos fijos la guía acepta dejar `:nth-child` |

> **Hecho el 9:** `@view-transition { navigation: auto }` en `document.css` (todas las páginas), dentro de
> `prefers-reduced-motion: no-preference`, con un fundido de 0.25 s. Firefox navega como siempre.
>
> **Hecho el 10:** `initScrollProgress()` (core) ya no escucha el scroll donde hay `animation-timeline: scroll()`: le
> pone `.doc-scroll-progress` y `data-progress="scaleX|width"`, y la mueve el CSS de `document.css`. Sin soporte, o
> con movimiento reducido (varias páginas apagan todas las animaciones con `!important`), sigue el JS de antes. Lo
> usan todas las páginas con barra menos iRar, que pasa el avance a una variable. Ojo: `animation-timeline` va en una
> regla aparte porque el minificador la metía dentro del atajo `animation` y Chrome la descartaba.
>
> **No se hicieron, a propósito:**
> - **11 (reveal con `view()`):** cambia el efecto (se «arrastra» con el scroll en vez de aparecer una vez) y
>   `initReveal` además dispara `onEnter` para arrancar demos; necesitaría que lo valides visualmente página por página.
> - **12, 13 y 14:** solo Chrome (o Chrome + Safari 27) y la guía obliga a conservar el JS; sería código duplicado sin
>   ganar nada visible.
> - **15:** con 4–6 elementos fijos la guía acepta `:nth-child`; `sibling-index()` aún es Baseline muy reciente.

---

## Resumen para decidir

| Prioridad | Qué | Esfuerzo |
|---|---|---|
| ✅ Alta | 1. `<dialog>` en CV, Super Pets e iTunes (+ nombre al botón de cerrar) | Medio: componente común |
| ✅ Alta | 2. `mask` estándar en 9 bordes degradados | Bajo: una línea por regla |
| ✅ Alta | 3. `width`/`height` en ~20 imágenes (+ PNG → WebP en iRar) | Bajo |
| ✅ Media | 4. `fetchpriority="high"` en el LCP de cada página | Bajo, tras medir |
| ✅ Media | 5. `color-scheme` en el tema del CV | Bajo |
| ✅ Media | 6. Formulario del CV: `autocomplete`, `role`, `:user-invalid` | Bajo |
| ✅ Media | 7. `scrollbar-color`/`scrollbar-width` en el CV | Bajo |
| ✅ Media | 8. `replaceChildren`, `findLast`, `withResolvers` | Muy bajo |
| ✅ Baja | 9–10. Transiciones entre páginas y barra de progreso con CSS | Bajo |
| Baja (descartado) | 11–15. Más funciones nuevas con JS de respaldo obligatorio | Variable |

Al aplicar cualquiera: `npm run check` (lint propio: keyframes con prefijo, hex solo en variables, reveal único) y
comparar capturas a 1440 px y 390 px antes de darlo por bueno.

---

## Pendiente para revisar (anotado el 24 nov 2026)

### A. Cerrar la modernización

1. **Que no vuelva a pasar:** agregar a `tools/check_site.py` reglas para:
   - `<img>` sin `width`/`height` (salvo las de lightbox, que no traen `src` al cargar);
   - `-webkit-mask` sin `mask` estándar;
   - `fetchpriority="high"` junto a `loading="lazy"`;
   - modales hechos con `<div>` (clases `modal`/`lightbox`/`overlay` que no sean `<dialog>`).

   Sin eso, la próxima página nueva puede repetir los mismos errores.
2. **Medir con datos reales:** Lighthouse o PageSpeed Insights sobre `ierwinx.com` (lo medido fue en local), y ver
   si queda algo pesado, por ejemplo los canvas animados de la home en móvil.
3. **Probar en Safari y Firefox de verdad:** solo se probó en Chromium. Safari es el que usa el respaldo de
   `closedby` (`core/dialog.ts → lightDismiss`): revisar los tres modales (CV, Super Pets, iTunes) en un iPhone.
4. **Escribir el criterio de soporte en `CLAUDE.md`** (p. ej. «Baseline Widely available + respaldo»), para que las
   decisiones futuras sean coherentes.
5. **Commit:** todo sigue sin guardar en git. Ojo con los archivos nuevos, que `git commit -a` deja fuera y que en
   producción darían 404: `public/CV/img/inge.webp`, `public/irar/assets/*.webp`, `src/lib/imgsize.ts`,
   `src/lib/node-shim.d.ts`, `src/scripts/core/dialog.ts` (y los `doc-*.png` borrados de iRar).

Extra visto al arreglar la foto: las imágenes y PDF de los certificados del CV usan rutas relativas
(`img/certificados/…`). En producción no fallan (GitHub Pages manda `/CV` a `/CV/`), pero en `astro preview` sí, si
se entra por `/CV` sin la barra final.

### B. Revisión de `/wolfgit/` contra el estándar del sitio

**Cumple ✅**

- Sistema aurora completo: `AppLayout` + `Hero`, `Section`, `Bento`, `Steps`, `Principles`, `CompareTable`, `Faq`,
  `DownloadCta`, `Footer` (`giant` + `tagline`, como las demás), `Nav` con sus anclas y `GlyphField` (desde
  `apps.json → glyphs`). Sin JS propio: los selectores de vistas y de temas funcionan con radios y `:checked`.
- Datos al compilar: versión, tamaño, release con SHA-256, título, descripción, tema y tokens salen de `apps.json`;
  tiene entrada en `legal.json` (privacidad, términos y soporte se generan), spotlight en la home (`WolfgitShots`)
  y su imagen de Open Graph.
- Todas las imágenes son WebP, con `width`/`height` y `alt` (los íconos decorativos con `alt=""`); las que están
  debajo del pliegue llevan `loading="lazy"`. La del hero no, y está bien: el LCP de esta página es el texto, así que
  no necesita `fetchpriority`.
- CSS en `styles/pages/wolfgit.css` (no `<style>` con alcance), colores con tokens y `color-mix`, nada de
  `-webkit-mask` ni hex sueltos. Respeta `prefers-reduced-motion` (hero, fundido de capturas).
- Accesibilidad: `lang="es"`, «Saltar al contenido», un solo `h1` y encabezados en orden, sin `id` repetidos, los
  radios se alcanzan con teclado y tienen anillo `:focus-visible`.
- Sin errores en consola, sin scroll horizontal a 390 px, CSP completa y la barra de progreso ya usa la versión CSS.
  `npm run check` pasa.

**Para revisar (nada está roto; son mejoras o detalles de consistencia)**

> **Hecho (24 nov):** 1, 2, 3 y 4 en WolfGit. Las 16 capturas de 2080 px tienen una versión `-1200.webp` (≈30 KB,
> la mitad) y van con `srcset` + `sizes` (`ROW` para las filas, `WIDE` para hero, historial y temas): el móvil baja la
> de 1200 y el escritorio retina la de 2080. Los fondos del Bento usan `color-mix` con `--a2`/`--a3`/`--a4` (los
> `stroke` siguen en hex: no hay token para esos tonos). El keyframe se llama `wolfgit-fade`. Los tres selectores son
> `<fieldset>` con `<legend class="sr-only">`. Quedan sin tocar: los íconos de tema (256 px para 48 px, 8 KB cada
> uno), el punto 5 (es lo esperado), los colores del Bento de iBridge, iMount, iXML y LiveWallpapers, y
> `WolfgitShots` de la home, que sigue usando las capturas de 2080 px.

1. **Capturas más grandes de lo que pide la regla.** `CLAUDE.md` dice «capturas a lo más al doble de su tamaño en
   pantalla». Las de las filas (`audio`, `blame`, `buscar`, `conflictos`, `imagenes-*`, `markdown`, `diagramas`,
   `pdf`, `secretos`, `sin-cambios`) se ven a **708 px** en escritorio (el doble serían 1416) y a **354 px** en
   móvil, pero pesan 2080 px (52–100 KB cada una, ~1.4 MB en total). Opciones: bajarlas a ~1416 px o, mejor, dar
   `srcset` con 1040 y 2080 px + `sizes`, para que el móvil baje la chica. El hero (1048 px) e historial (1040 px) sí
   cumplen. Los íconos de tema son de 256 px y se ven a 48 px (8 KB cada uno: casi no importa).
2. **Colores del `BentoCard` repetidos a mano.** `bg="rgba(79,209,160,.14)"` es `--a2`, `rgba(255,127,166,.14)` es
   `--a4` y `rgba(169,214,255,.14)` es `--a3`: se podrían escribir como
   `color-mix(in srgb, var(--a2) 14%, transparent)`. Los `stroke` (`#9fe8c9`, `#ffc2d4`, `#d3eaff`) son tonos más
   claros que no existen como token. Lo mismo pasa en iBridge, iMount, iXML y LiveWallpapers, así que si se cambia,
   conviene hacerlo en todas (o que `BentoCard` acepte un nombre de acento: `accent="a2"`).
3. **Prefijo del `@keyframes`.** Se llama `wg-fade`; la regla dice `<página>-` en `styles/pages/` (`wolfgit-fade`).
   `npm run check` lo deja pasar porque tiene guion. Super Pets tiene el mismo caso (`paw-fade`).
4. **Semántica de los selectores.** El `role="group"` con `aria-label` envuelve a los `<label>`, no a los radios:
   el lector de pantalla anuncia «botón de opción, Deslizador, 1 de 2», pero sin el nombre del grupo («Formas de
   comparar imágenes»). Se arregla envolviendo radios y etiquetas en un `<fieldset>` con `<legend class="sr-only">`,
   o con `role="radiogroup"` en el contenedor común. Aplica a los tres selectores (imágenes, Markdown y temas).
5. **Capturas ocultas con `loading="lazy"`.** Las vistas que no están elegidas (papel cebolla, diagramas, los tres
   temas) tienen `display: none`, así que el navegador no las baja hasta que se eligen y la primera vez aparecen un
   instante después. Es lo correcto para el peso; solo hay que saberlo si se nota el parpadeo.
