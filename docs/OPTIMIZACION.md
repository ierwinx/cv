# Optimización y reutilización (después del rediseño)

Análisis del código al 18 de noviembre de 2026 (commit `1dde74e`). El rediseño (`docs/REDISENO.md`) dejó bien
las páginas del **sistema aurora** (ibridge, imount, ixml, wolfgit, labaraja, isyntonic): usan `Hero`, `Section`,
`Bento`, `Steps`, `Faq`, `DownloadCta` y `init.ts` sin JS propio. El problema está en las **páginas con diseño
propio** (home, iJson, iPlist, iCSV, iRar, iGit, iTunes, iSpecter, iConverter, Super Pets, iLegato, CV): cada una
volvió a escribir el mismo comportamiento con otros nombres. Son unas 20 000 líneas en `src/`, y en las páginas
propias se repite casi todo lo que ya existe en `scripts/core`.

Regla de siempre: **paridad visual**. Cada paso se compara con capturas a 1440 px y 390 px (con y sin movimiento
reducido) antes y después, y el usuario lo valida. Ningún paso cambia el diseño; solo de dónde sale el código.

---

## 1. Diagnóstico

### 1.1 Scripts que reimplementan `core`

| Qué | Ya existe en `core` | Dónde se reescribe |
|---|---|---|
| Reveal al hacer scroll (`IntersectionObserver` → `.in`) | `initReveal()` en `core/reveal.ts` | `icsv.ts:113`, `iconverter.ts:118`, `ispecter.ts:227`, `igit.ts:19`, `itunes.ts:1261`, `irar.ts:85` (con un `setInterval` de respaldo), `superpets.ts:63`, `cv.ts:178` |
| «Al entrar en pantalla, haz X una vez» | — (falta) | `icsv.ts` (`when()`), `iplist.ts:18`, `ijson.ts:274`, `igit.ts:32`, `superpets.ts:263`, `home.ts:177`, `home/irar.ts:13`, `ilegato.ts:20` |
| Contador al aparecer | `initCounters()` | `ispecter.ts`, `itunes.ts`, `superpets.ts` lo encadenan a mano dentro de su propio reveal |
| Barra de progreso + nav «scrolled» | `core/nav.ts` | `home.ts:39`, `icsv.ts:22`, `igit.ts:47`, `iconverter.ts:30`, `superpets.ts:23`, `irar.ts:56`, `itunes.ts:1257`, `ilegato.ts:84` |
| Luz que sigue al cursor (`.cursor-glow`) | `core/cursor.ts` (**no lo importa nadie**) | `icsv.ts:26`, `irar.ts:57`, `igit.ts:52`, `itunes.ts:1246`, `superpets.ts:133`, iLegato (`.cursor-light`) |
| Brillo/tilt de tarjeta al pasar el cursor | `tilt()` en `core/pointer.ts` | `icsv.ts:204`, `irar.ts:100/106`, `igit.ts:61`, `ispecter.ts:245`, `superpets.ts:103/120` |
| Ventana que se endereza al hacer scroll | `[data-scroll-tilt]` en `init.ts` | `icsv.ts:39`, `ispecter.ts:105` |
| `matchMedia('(pointer: fine)')` | — (falta en `motion.ts`) | `home.ts`, `igit.ts`, `iconverter.ts`, `ilegato.ts`, `superpets.ts`, `irar.ts` |
| `prefers-reduced-motion` | `reduceMotion` | `itunes.ts:30` lo vuelve a calcular |
| Escape de HTML | `esc()` en `core/dom.ts` | `demos/igit.ts:51` |

### 1.2 CSS repetido y con choques

- **Keyframes con el mismo nombre en 15 archivos:** `spin` (11), `float` (10), `blink` (9), `pulse` (7), `grain` (6),
  `drift` (6), `shimmer` (5). Todo el CSS es global; si dos hojas con `@keyframes float` distintos llegan a la misma
  página, gana la última. Hoy la home ya carga `home.css` + 4 CSS de demos.
- **`.reveal` definido en 12 hojas** (`home`, `icsv`, `iconverter`, `igit`, `ijson`, `ispecter`, `itunes`, `irar`,
  `ixml`, `ilegato`, `superpets`, `legal`) además de `effects.css`.
- **Grano/ruido de fondo (`.grain`) en 8 páginas**, cada uno con su `@keyframes grain`.
- **Hex sueltos en CSS compartido** (va contra la regla de tokens): `demos/ibridge.css` (37), `demos/iconverter.css`
  (18), `demos/igit.css` (14), `demos/ixml.css` (10), `sections/compare.css` (3), `ui/button.css` (3).
- Hojas enormes: `home.css` 1 422 líneas, `superpets.css` 1 345, `cv.css` 1 074.

### 1.3 Marcado repetido

- **Páginas legales:** `[slug]/{privacy,terms,support}.astro` sirve a las apps de Mac, pero iLegato, iSyntonic,
  La Baraja y Super Pets tienen 12 archivos propios (≈ 690 líneas) con la misma estructura (responsable, «lo que el
  desarrollador no recibe», datos en el dispositivo, permisos, Apple, contacto). Solo cambian los datos.
- **Encabezado de sección** (eyebrow + `h2` con acento + lead) escrito a mano en cada página propia: 20 en iLegato,
  13 en iPlist, 12 en iGit, 11 en iRar e iConverter… Nombres distintos (`eyebrow`, `kicker`, `label`, `tag`).
- **FAQ** escrito a mano en iTunes (`<details class="checksum">`) aunque existe `Faq`; iJson, iPlist, iRar, iTunes,
  iXML y Super Pets no tienen FAQ.
- **Super Pets repite sus 12 capturas tres veces** (tour, pasos y galería: `superpets/index.astro:195–285`). Debe ser
  un arreglo y `map`, y el marco de teléfono debería ser el de `styles/devices.css` / `home/PhoneShowcase`.
- **Íconos SVG copiados:** el logo de Apple está en `Icon.astro`, `home/Spot.astro`, `superpets/index.astro` e
  `irar/index.astro` (cuatro trazos distintos). La flecha de descarga aparece con 6 variantes de `d`. Hay 21 `<svg>`
  en iConverter, 19 en iRar, 13 en IbridgeDemo.
- **Tres ventanas de macOS:** `home/Window.astro`, `mockups/AppWindow.astro` y las ventanas a mano de las páginas
  propias (iJson, iPlist, iCSV, iConverter…). Debería ser una sola `Window` con variantes (semáforo, título, tilt).
- **Shells:** `IlegatoShell` y `SuperpetsShell` hacen casi lo mismo que `AppPage` + `Nav` + `Footer` + `GlyphField`.
  La home y el CV traen su propio `<nav>`/`<footer>`.

### 1.4 Datos en el navegador / datos fijos

- `igit.ts:131`: el toast dice «iGit 1.0.0» fijo; la versión debe salir de `apps.json` (atributo `data-*`).
- `home/itunes.ts` copia el tema `T` de `pages/itunes.ts` (mismos colores de `Theme.swift`) y su propio búfer de
  celdas: son dos emuladores de la misma TUI. Va contra «una sola demo» (como ya se hizo con iGit e iConverter).
- `pages/itunes.ts` tiene 1 397 líneas en un archivo (tema, atajos, ecualizador, layout, búfer, entrada, escenas,
  modo captura). Se puede partir en módulos sin cambiar el chunk.

### 1.5 Imágenes y peso

- `public/` pesa 60 MB. Certificados del CV en JPG de 1–3 MB (`html5.jpg` 2,9 MB,
  `Titulo.jpg` 2,8 MB). Íconos PNG de 921 KB (`superpets/img/app-icon.png`) y 583 KB (`ijson/app-icon.png`).
  Capturas de iTunes en PNG de 350–510 KB. Super Pets usa `.PNG` en mayúsculas.
- **Ninguna imagen pasa por `astro:assets`**: no hay `width`/`height` en ~70 `<img>` (salto de diseño, CLS), ni
  `srcset`, ni AVIF/WebP automático.
- Archivos con espacios en el nombre (`Oracle 1.jpg`, `Redhat admin 1.jpg`).

---

## 2. Plan por fases

Cada fase es un commit (o varios) que deja el sitio funcionando, con `npm run check` en verde y paridad visual.

### Fase A · Utilidades que faltan en `core` (base para todo lo demás)

1. `core/motion.ts`: exportar `finePointer` (y `coarsePointer`) junto a `reduceMotion`.
2. `core/reveal.ts`: ampliar `initReveal` con `className` (`'in'` | `'visible'` | `'is-in'`), `once` y un callback
   `onEnter(el)`; y añadir `onceVisible(el, fn, {threshold, rootMargin})` para los «haz X al verse una vez».
   Incluir el respaldo de iRar (lo que ya está en pantalla se revela) dentro de `initReveal`, no en un `setInterval`.
3. `core/nav.ts`: `initScrollProgress(bar)` y `initNavScrolled(nav, umbral)` separados para que las páginas propias
   los usen con su marcado.
4. `core/cursor.ts`: confirmar su API (`initCursorGlow(el)` con `--mx/--my` o `left/top`) y que respete
   `finePointer` y `reduceMotion`.

### Fase B · Las páginas propias usan `core`

Una página por commit, de menor a mayor riesgo: iConverter → iGit → iCSV → iSpecter → iRar → iPlist → iJson →
iTunes → Super Pets → iLegato → home → CV.

- Sustituir su reveal, contadores, progreso, glow y tilt por `initReveal`/`onceVisible`/`initCounters`/
  `initScrollProgress`/`initCursorGlow`/`tilt`.
- Borrar las copias de `matchMedia`, `esc` y similares.
- Meta: cada `scripts/pages/*.ts` queda solo con lo que es único de esa app (sus demos y escenas).

### Fase C · CSS: un solo lugar para efectos comunes

1. Mover a `effects.css` con nombres con prefijo los keyframes genéricos: `fx-spin`, `fx-float`, `fx-blink`,
   `fx-pulse`, `fx-grain`, `fx-drift`, `fx-shimmer`. Las páginas que necesiten una curva distinta la parametrizan
   con variables (`--fx-float-y`, `--fx-dur`) o, si de verdad es otra animación, la renombran con su prefijo
   (`ic-float`). Ningún `@keyframes` sin prefijo fuera de `effects.css`.
2. Un solo `.reveal` en `effects.css` con variables (`--reveal-y`, `--reveal-dur`, `--reveal-blur`) que cada hoja
   ajusta en lugar de redefinir la regla.
3. Componente `ui/Grain.astro` (o clase `.fx-grain`) para el ruido de fondo de las 8 páginas.
4. Cambiar los hex de `components/demos/*.css`, `compare.css` y `button.css` por tokens o `color-mix`. Si una
   demo necesita los colores reales de la app (p. ej. la ventana de iBridge), declararlos como variables propias
   al principio de su hoja (`--ib-…`) para que se vea qué es tema y qué es la app.
5. Añadir a `tools/check_site.py` (o un script de lint) dos comprobaciones: `@keyframes` sin prefijo fuera de
   `effects.css`, y hex en `src/components/**/*.css`.

### Fase D · Componentes de marcado

1. **`sections/SectionHead.astro`** (`eyebrow`, `title`, `accent`, `lead`, `align`) con clases `ui-` y tokens; las
   páginas propias lo usan y mantienen su aspecto vía variables.
2. **Una sola `Window`** (`mockups/Window.astro`): props `title`, `variant` (`code` | `term` | `app`), `tilt`,
   `label`. `home/Window.astro` y `AppWindow.astro` pasan a envolverla; luego las ventanas a mano de iJson, iPlist,
   iCSV e iConverter.
3. **`Icon.astro` como única fuente de SVG:** añadir `github`, `arrow-down` (una sola versión), `check`, `folder`,
   `eye`, `chevron`, etc. Quitar el logo de Apple de `Spot.astro`, Super Pets e iRar.
4. **Galería de capturas:** `ui/PhoneGallery.astro` (o ampliar `home/PhoneShowcase`) que recibe
   `[src, alt][]`. Super Pets declara sus capturas una vez y alimenta tour, pasos y galería.
5. **FAQ en todas las apps** con `Faq` (iJson, iPlist, iRar, iTunes, iXML, Super Pets), con preguntas sacadas de
   cada repo. El `<details>` de iTunes (SHA-256 y compilar) puede quedarse como bloque propio o pasar a `Faq`.
6. **Shells:** revisar si `IlegatoShell` y `SuperpetsShell` pueden ser `AppPage` + slots; si solo cambian clases, un
   `AppShell` genérico con `theme` sustituye a los dos.

### Fase E · Páginas legales de una sola plantilla

1. Ampliar `data/legal.json` con un campo `platform` (`mac` | `ios` | `android` | `multi`) y los bloques opcionales
   que hoy solo tienen las apps móviles: cuentas, servicios de terceros (Firebase en Super Pets), red local,
   Actividades en vivo, Siri, eliminación de cuenta.
2. Que `[slug]/{privacy,terms,support}.astro` pinte esos bloques si existen y borrar las 12 páginas propias.
   `superpets/delete-account.astro` se queda (es otra página).
3. Copiar los textos **tal cual** a `legal.json` (son textos legales: nada de reescribirlos) y comparar el HTML
   generado antes y después con `diff` sobre `dist/`.

### Fase F · Demos y datos

1. **iTunes: una sola TUI.** Sacar de `pages/itunes.ts` los módulos `tui/theme.ts`, `tui/buffer.ts`,
   `tui/layout.ts`, `tui/library.ts` en `scripts/demos/itunes/`; la página y la home (`home/itunes.ts`) los
   importan. La home monta una escena reducida del mismo motor.
2. Partir el resto de `pages/itunes.ts` (entrada, escenas, modo captura) en archivos bajo `scripts/pages/itunes/`.
3. Versión del toast de iGit (y cualquier texto con versión/tamaño) desde `apps.json` vía `data-*`.

### Fase G · Imágenes y rendimiento

1. Pasar las imágenes de `public/<app>/` usadas en `.astro` a `src/assets/<app>/` y usar `<Image>`/`<Picture>` de
   `astro:assets` (WebP/AVIF, `width`/`height`, `srcset`). Las que lee JS o el SEO (`og`, íconos de `apps.json`,
   `latest.json`) se quedan en `public/`.
2. Certificados del CV: convertir a WebP a ~1600 px de ancho (de 2,9 MB a ~200 KB) y renombrar sin espacios
   (actualizar `cv.json`).
3. Íconos de app: un PNG de 1024 → WebP 512 para la página y PNG 180 para `apple-touch-icon`.
4. Super Pets: normalizar `.PNG` → `.webp` en minúsculas.
5. Medir antes/después con Lighthouse (móvil) en home, iLegato, Super Pets y CV; anotar aquí LCP, CLS y peso.

### Fase H · Guardas para que no vuelva a pasar

- `check_site.py`: además de lo de la fase C, avisar si un `scripts/pages/*.ts` crea `new IntersectionObserver` o
  escucha `scroll`/`pointermove` directamente (lista de excepciones justificadas en el propio script).
- Actualizar `CLAUDE.md` con los componentes nuevos (`SectionHead`, `Window`, `PhoneGallery`, `Grain`,
  `onceVisible`, `finePointer`) y la regla de prefijo para keyframes.

---

## 3. Orden sugerido y tamaño

| Fase | Riesgo visual | Esfuerzo | Ganancia |
|---|---|---|---|
| A · utilidades `core` | nulo | bajo | habilita B |
| C.1–C.2 · keyframes y `.reveal` | medio (choques actuales) | medio | elimina conflictos ocultos |
| B · páginas usan `core` | bajo–medio | alto (12 páginas) | −1 000 a −1 500 líneas de TS estimadas |
| E · legales en plantilla | bajo (diff de HTML) | medio | −12 archivos |
| D · componentes de marcado | medio | alto | consistencia entre apps |
| G · imágenes | bajo | medio | el mayor impacto en velocidad (CV, Super Pets) |
| F · TUI de iTunes | bajo | medio | una demo en vez de dos |
| H · guardas | nulo | bajo | evita regresiones |

Recomendado: **A → C.1/C.2 → B (una página por commit) → G → E → D → F → H.**

## 4. Seguimiento

Hecho el 21 de noviembre de 2026. Cada fase se comparó con capturas del sitio anterior (1440 y 390 px, movimiento
reducido) y con una prueba de comportamiento sin movimiento reducido (reveals, contadores, foco, errores de consola).

- [x] A · `core/motion` (`finePointer`, `coarsePointer`, `hoverPointer`), `core/reveal` (`initReveal` con
  `className`/`group`/`delayVar`/`batchDelay`/`onEnter` y respaldo al volver a la pestaña; `onceVisible`),
  `core/scroll` (`onScrollProgress`, `initScrollProgress`, `initScrollVar`, `initNavScrolled`), `core/cursor`
  (`initCursorGlow`, con suavizado independiente de los fps), `core/pointer` (`tilt` con opciones), `initSectionSpy`.
- [x] B · las 12 páginas propias usan `core`. iGit e iCSV toman la versión del aviso de descarga de `apps.json`
  (`data-app-version`).
- [x] C · keyframes con prefijo (no había choques reales en ninguna página, ahora no puede haberlos); `.reveal` único en
  `document.css` con variables; `ui/Grain.astro` en las 8 páginas; paletas de las demos en variables `--ib-…`,
  `--ic-…`, `--tui-…`, `--ix-…`. Se quitó una animación `dash` de iSpecter que no existía en su CSS.
- [x] G · certificados del CV en WebP sin espacios (17 MB → 3,7 MB), capturas de Super Pets (9,6 → 1,5 MB) e iTunes
  (miniatura de 1 400 px + original), íconos de página en WebP, favicon de 64 px y `apple-touch-icon` de 180 px para
  las apps que usaban un PNG de 512, `width`/`height` en 59 `<img>`. No se usó `astro:assets`: muchas rutas las
  leen el SEO, `apps.json`, scripts y `og-maker`; se convirtieron los archivos y se mantuvieron las URLs públicas
  (`check_site.py` acepta `foto6.PNG` → `foto6.webp`). Falta: medir con Lighthouse.
- [~] E · iLegato y Super Pets tienen diseño propio de páginas legales: unirlas a `[slug]` cambiaría su aspecto. Se
  sacaron a componentes los bloques que se repiten en todas (`PrivacyOwner`, `PrivacyClosing`, `SupportContact`); el
  HTML generado es idéntico.
- [~] D · `Window` única (`mockups/Window.astro`, la de la home y la del hero); `Icon` como fuente del logo de Apple,
  Google Play y la flecha de descarga (15 copias quitadas; StoreButtons e iSyntonic incluidos); capturas de Super
  Pets declaradas una vez; FAQ en iJson, iPlist, iRar, iTunes, iXML (de `legal.json`) y Super Pets.
  No se hizo `SectionHead`: cada página escribe sus encabezados con etiquetas y clases distintas y unificarlos
  obliga a reescribir su CSS (cambia el diseño). Las ventanas hechas a mano de iJson, iPlist, iCSV e iConverter
  siguen siendo propias por lo mismo. Los *shells* ya solo combinan `AppPage`, `Nav`, `Footer`, `GlyphField` y
  `Grain`; un `AppShell` genérico no puede importar el script de cada página.
- [x] F · TUI de iTunes en `scripts/demos/itunes/` (tema, búfer, biblioteca, atajos): la página y la home usan el
  mismo código; `pages/itunes.ts` bajó de 1 397 a ~1 140 líneas.
- [x] H · `check_site.py` revisa `src/`: keyframes sin prefijo, hex sueltos en componentes y reimplementaciones de
  `core`. `CLAUDE.md` actualizado.
