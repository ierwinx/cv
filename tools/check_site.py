#!/usr/bin/env python3
"""Verifica dist/ antes de publicar: `npm run check` (después de `npm run build`).

  1. Paridad de URLs: todo lo que publicaba el sitio en la etiqueta legacy-v1 sigue
     existiendo en dist/, con las mismas mayúsculas (GitHub Pages las distingue).
  2. Sin producción en local: si se compiló para otro SITE, no queda ninguna
     URL de producción en dist/.
  3. SEO: un solo bloque seo por página pública, con canonical, og:image y JSON-LD
     válido; /CV/ con noindex y fuera del sitemap.
  4. CSP: todas las páginas llevan su Content-Security-Policy antes de cualquier script o
     estilo, y la huella de cada script en línea está en ella (si no, el navegador lo bloquea).

Sale con código 1 si algo falla, así que sirve igual en local y en CI.
"""
import json
import os
import re
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from seo import script_hashes  # noqa: E402  (la misma regla con la que se generan)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(ROOT, 'dist')
LEGACY = 'legacy-v1'
with open(os.path.join(ROOT, 'src', 'data', 'site.json'), encoding='utf-8') as f:
    PRODUCTION = json.load(f)['production']

# Lo que había en el repo de legacy-v1 y no es parte del sitio publicado.
NOT_PUBLISHED = re.compile(
    r'^(\.|build\.js$|package(-lock)?\.json$|tools/|CV/lang/|irar/README\.md$)'
    r'|\.(dmg|pkg|zip)$'          # binarios: ahora viven en GitHub Releases
    r'|(^|/)\.DS_Store$'
    # CSS/JS propios de cada página: Astro los empaqueta en /_astro/. Se conservan los que
    # enlaza algo de fuera del build (el seasonal).
    r'|^(?!assets/seasonal\.).*\.(js|css)$')
TEXT = ('.html', '.js', '.css', '.json', '.xml', '.txt')

errors = []


def dist_files():
    files = set()
    for dirpath, _, names in os.walk(DIST):
        for name in names:
            files.add(os.path.relpath(os.path.join(dirpath, name), DIST).replace(os.sep, '/'))
    return files


def legacy_files():
    try:
        out = subprocess.run(['git', 'ls-tree', '-r', '--name-only', LEGACY], cwd=ROOT,
                             capture_output=True, text=True, check=True).stdout
    except subprocess.CalledProcessError:
        sys.exit(f'No existe la etiqueta {LEGACY} en este repo.')
    return [p for p in out.splitlines() if not NOT_PUBLISHED.search(p)]


def read(rel):
    with open(os.path.join(DIST, rel), encoding='utf-8') as f:
        return f.read()


IMAGES = re.compile(r'\.(png|jpe?g)$', re.I)


def converted(p, files):
    """Imagen pasada a WebP en la misma carpeta (nombre en minúsculas y sin espacios): foto6.PNG → foto6.webp."""
    if not IMAGES.search(p):
        return False
    folder, name = os.path.split(p)
    stem = re.sub(r'\s+', '-', os.path.splitext(name)[0].lower())
    return f'{folder}/{stem}.webp'.lstrip('/') in files


def check_parity(files):
    legacy = legacy_files()
    # Una sección completa (carpeta raíz) que ya no está en dist/ se retiró a propósito, junto con su
    # imagen para redes (assets/og/<sección>.jpg). Un archivo suelto que falte sí es un error.
    tops = {p.split('/')[0] for p in files}
    retired = {p.split('/')[0] for p in legacy if '/' in p} - tops
    for p in legacy:
        if p in files or converted(p, files):
            continue
        if p.split('/')[0] in retired or re.fullmatch(r'assets/og/(.+)\.jpg', p) and p[10:-4] in retired:
            continue
        errors.append(f'Falta en dist/ (existía en {LEGACY}): /{p}')


def check_local_urls(files):
    match = re.search(r'^Sitemap: (.*)/sitemap\.xml$', read('robots.txt'), re.M)
    if not match:
        sys.exit('dist/robots.txt no tiene la línea Sitemap: ¿se corrió tools/seo.py?')
    site = match.group(1)
    if site == PRODUCTION:
        return site
    for rel in sorted(files):
        if rel.endswith(TEXT) and rel != 'CNAME' and PRODUCTION in read(rel):
            errors.append(f'URL de producción en un build para {site}: /{rel}')
    return site


def check_seo(files):
    sitemap = read('sitemap.xml')
    for rel in sorted(f for f in files if f.endswith('.html')):
        text = read(rel)
        if rel.startswith('musica/'):
            continue  # redirección: lleva su propio canonical y noindex
        if rel.startswith('CV/'):
            if 'noindex' not in text:
                errors.append(f'/{rel} debe llevar noindex')
            if f'/{rel}'.replace('index.html', '') in sitemap:
                errors.append(f'/{rel} no debe estar en el sitemap')
            continue
        if re.fullmatch(r'[^/]+/(?:privacy|terms)\.html', rel):
            if 'content="noindex, follow"' not in text:
                errors.append(f'/{rel} debe llevar noindex, follow (privacidad y términos no compiten con la app)')
            if f'/{rel}<' in sitemap:
                errors.append(f'/{rel} no debe estar en el sitemap')
        blocks = text.count('<!-- seo:start')
        if blocks != 1:
            errors.append(f'/{rel}: {blocks} bloques seo (debe haber 1)')
            continue
        for needed in ('rel="canonical"', 'property="og:image"', 'name="twitter:card"'):
            if needed not in text:
                errors.append(f'/{rel}: falta {needed}')
        for payload in re.findall(r'<script type="application/ld\+json">(.*?)</script>', text, re.S):
            try:
                json.loads(payload)
            except ValueError:
                errors.append(f'/{rel}: JSON-LD inválido')


def check_csp(files):
    for rel in sorted(f for f in files if f.endswith('.html')):
        text = read(rel)
        if text.count('<!-- csp:start') != 1:
            errors.append(f'/{rel}: debe haber 1 bloque csp')
            continue
        policy = re.search(r'<meta http-equiv="Content-Security-Policy" content="([^"]*)"', text)
        first = re.search(r'<(script|link|style)\b', text)
        if not policy or (first and first.start() < policy.start()):
            errors.append(f'/{rel}: la CSP debe ir antes de cualquier script o estilo')
            continue
        for h in script_hashes(text):
            if h not in policy.group(1):
                errors.append(f'/{rel}: un script en línea no está en la CSP ({h})')


SRC = os.path.join(ROOT, 'src')
KEYFRAMES = re.compile(r'@keyframes\s+([\w-]+)')
HEX = re.compile(r'#[0-9a-fA-F]{3,8}\b')
# Lo que ya resuelve scripts/core y no debe volver a escribirse en una página (ver CLAUDE.md).
REIMPLEMENTED = [
    (re.compile(r"new IntersectionObserver\([^;]{0,300}?classList\.add\(\s*['\"](in|visible|is-in)['\"]", re.S), 'reveal a mano: usa initReveal / onceVisible (core/reveal)'),
    (re.compile(r'scrollHeight\s*-\s*(innerHeight|\w+\.clientHeight)'), 'progreso de lectura a mano: usa onScrollProgress / initScrollProgress (core/scroll)'),
    (re.compile(r"documentElement\.style\.setProperty\(\s*['\"]--m[xy]|root\.style\.setProperty\(\s*['\"]--m[xy]"), 'foco del cursor a mano: usa initCursorGlow (core/cursor)'),
    (re.compile(r"matchMedia\(\s*['\"]\((pointer|hover|prefers-reduced-motion)"), 'matchMedia de puntero o movimiento: usa finePointer / reduceMotion (core/motion)'),
    (re.compile(r'^\s*const (\$|\$\$|esc|sleep) = ', re.M), 'helper local: impórtalo de core/dom o core/motion'),
]


def src_files(folder, ext):
    for dirpath, _, names in os.walk(os.path.join(SRC, folder)):
        for name in names:
            if name.endswith(ext):
                path = os.path.join(dirpath, name)
                yield os.path.relpath(path, ROOT), open(path, encoding='utf-8').read()


def check_source():
    """Reglas para no volver a duplicar (CLAUDE.md): keyframes con prefijo, colores de componentes con tokens,
    nada de reimplementar lo que ya está en scripts/core y ningún <Bento> con filas incompletas."""
    for rel, css in src_files('', '.css'):
        for name in KEYFRAMES.findall(css):
            if '-' not in name:
                errors.append(f'{rel}: @keyframes {name} sin prefijo (fx- en effects.css, <página>- o <demo>- en las demás)')
    for rel, css in src_files('components', '.css'):
        for n, line in enumerate(css.splitlines(), 1):
            # Se permiten en declaraciones de variables (--ib-…: #…): es la paleta propia de la demo, declarada a la vista.
            code = re.sub(r'--[\w-]+\s*:\s*#[0-9a-fA-F]{3,8}', '', line)
            if HEX.search(code):
                errors.append(f'{rel}:{n}: color hex suelto en un componente compartido (usa tokens, color-mix o una variable)')
    for rel, ts in src_files('scripts', '.ts'):
        if rel.startswith(os.path.join('src', 'scripts', 'core')):
            continue
        for rx, msg in REIMPLEMENTED:
            m = rx.search(ts)
            if m:
                errors.append(f'{rel}:{ts.count(chr(10), 0, m.start()) + 1}: {msg}')
    for rel, astro in src_files('', '.astro'):
        errors.extend(bento_gaps(rel, astro))


BENTO = re.compile(r'<Bento\b[^>]*>(.*?)</Bento>', re.S)
BENTO_CARD = re.compile(r'<BentoCard\b')
ATTR = re.compile(r'\s+([\w-]+)=("[^"]*"|\'[^\']*\'|\{[^}]*\})')
BENTO_COLUMNS = 6   # components/sections/bento.css: repeat(6, 1fr); la tarjeta mide 2 si no lleva span


def bento_gaps(rel, astro):
    """Huecos en un <Bento>: las tarjetas se acomodan en filas de 6 columnas y la que no cabe baja a la siguiente.
    Si una fila no suma 6, queda un espacio vacío a la derecha (en escritorio; en móvil van una por fila)."""
    found = []
    for bento in BENTO.finditer(astro):
        spans = []
        for card in BENTO_CARD.finditer(bento.group(1)):
            pos, span = card.end(), '2'
            while True:   # atributos uno por uno: el SVG del ícono trae «>» dentro de sus comillas
                attr = ATTR.match(bento.group(1), pos)
                if not attr:
                    break
                if attr.group(1) == 'span':
                    span = attr.group(2).strip('{}"\'')
                pos = attr.end()
            if not span.isdigit():
                spans = None   # span calculado: no se puede saber al leer el archivo
                break
            spans.append(int(span))
        if not spans:
            continue
        rows, row = [], []
        for span in spans:
            if sum(row) + span > BENTO_COLUMNS:
                rows.append(row)
                row = []
            row.append(span)
        rows.append(row)
        line = astro.count('\n', 0, bento.start()) + 1
        for n, row in enumerate(rows, 1):
            if sum(row) != BENTO_COLUMNS:
                found.append(f'{rel}:{line}: <Bento> con hueco en la fila {n}: sus tarjetas suman {sum(row)} de '
                             f'{BENTO_COLUMNS} columnas (spans {"+".join(map(str, row))}); cambia el orden o el span')
    return found


def main():
    if not os.path.isdir(DIST):
        sys.exit('No existe dist/: corre primero `npm run build`.')
    files = dist_files()
    check_source()
    check_parity(files)
    site = check_local_urls(files)
    check_seo(files)
    check_csp(files)
    if errors:
        print('\n'.join(errors))
        sys.exit(f'\n✗ {len(errors)} problema(s) en dist/ (SITE={site}).')
    print(f'✓ dist/ correcto para {site}: {len(files)} archivos, URLs de {LEGACY} intactas, SEO y CSP completos.')


if __name__ == '__main__':
    main()
