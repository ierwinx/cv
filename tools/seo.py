#!/usr/bin/env python3
"""SEO de ierwinx.com: metadatos, datos estructurados, sitemap.xml y robots.txt.

Corre solo como último paso de `npm run build`, sobre la salida ya compilada:

    python3 tools/seo.py                 # procesa dist/ con SITE (o http://localhost:4321)
    SITE=https://ierwinx.com python3 tools/seo.py   # lo que hace el deploy

Es idempotente: cada página lleva un único bloque entre <!-- seo:start --> y
<!-- seo:end --> que se reemplaza completo en cada ejecución.

Qué hace:
  * Todas las páginas públicas: canonical, Open Graph (WhatsApp, Facebook,
    LinkedIn), Twitter Card y JSON-LD para Google.
  * /CV/ y todo lo que hay dentro: `noindex, nofollow` y fuera del sitemap,
    para que no aparezcan en buscadores.
  * privacy.html y terms.html de cada app: `noindex, follow` y fuera del sitemap,
    para que no compitan con la página principal de la app (soporte sí se indexa).
  * Genera sitemap.xml y robots.txt en la raíz de dist/.
  * Si SITE no es producción, cambia las URLs de producción que queden en el HTML
    por SITE, para que una compilación local nunca enlace a ierwinx.com.
  * Al final, en todas las páginas: Content-Security-Policy y Referrer-Policy como <meta>
    (GitHub Pages no deja poner cabeceras), entre <!-- csp:start --> y <!-- csp:end -->.

Los datos de las apps y de la marca salen de src/data/apps.json y src/data/site.json; los de los cursos
(/cursos/<curso>/…: Course, LearningResource y migas de pan), del frontmatter de src/content/cursos.
"""

import base64
import datetime
import hashlib
import html
import json
import os
import re
import subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def load(name):
    with open(os.path.join(ROOT, 'src', 'data', name), encoding='utf-8') as f:
        return json.load(f)


SITE_DATA = load('site.json')
PRODUCTION = SITE_DATA['production']
SITE = os.environ.get('SITE', 'http://localhost:4321').rstrip('/')
DIST = os.path.join(ROOT, 'dist')
OG = SITE + '/assets/og/'
LOGO = SITE + '/assets/logo-512.png'

PRIVATE_DIR = 'CV'   # oculto en buscadores (noindex + fuera del sitemap)


# Rutas viejas que solo redirigen a la nueva (GitHub Pages no tiene 301):
# no se tocan ni van al sitemap; llevan su propio canonical y noindex.
REDIRECTS = {'musica/index.html': '/iconverter/'}


def is_private(rel):
    # macOS no distingue mayúsculas; GitHub Pages sí. Comparamos sin importar mayúsculas.
    return rel.lower().startswith(PRIVATE_DIR.lower() + '/')


# Privacidad y términos de cada app: públicos (las tiendas piden su URL), pero `noindex, follow` y fuera del
# sitemap para que no compitan en buscadores con la página de la app. Soporte sí se indexa.
LEGAL_RE = re.compile(r'[^/]+/(?:privacy|terms)\.html')


def is_legal(rel):
    return bool(LEGAL_RE.fullmatch(rel))

BRAND = {
    '@type': 'Organization',
    '@id': SITE + '/#organization',
    'name': SITE_DATA['name'],
    'url': SITE + '/',
    'logo': {'@type': 'ImageObject', 'url': LOGO, 'width': 512, 'height': 512},
    'founder': {'@type': 'Person', 'name': SITE_DATA['founder']},
    'sameAs': SITE_DATA['sameAs'],
}

# Apps, en el orden de la home: `<slug>/index.html` → datos de apps.json.
APPS = {app['slug'] + '/index.html': app for app in load('apps.json')}

HOME_DESCRIPTION = SITE_DATA['description']


def download_url(app):
    release = app.get('release')
    return f"{SITE_DATA['releases']}/{release['tag']}/{release['file']}" if release else None

# Reference used inside other entities: self-contained, so each page stands on its own.
ORG_REF = {'@type': 'Organization', '@id': SITE + '/#organization', 'name': 'ierwinx', 'url': SITE + '/'}


# ── cursos (src/content/cursos) ──────────────────────────────────────────
# Los datos de cada curso salen del frontmatter de sus Markdown, así un curso nuevo tiene su SEO sin tocar esto.

CURSOS_DIR = os.path.join(ROOT, 'src', 'content', 'cursos')


def frontmatter(path):
    """Campos de primer nivel del frontmatter («clave: valor»; los valores entre comillas o listas, en JSON)."""
    datos = {}
    with open(path, encoding='utf-8') as f:
        lineas = f.read().split('\n')
    if not lineas or lineas[0].strip() != '---':
        return datos
    for linea in lineas[1:]:
        if linea.strip() == '---':
            break
        m = re.match(r'^([A-Za-z]\w*):\s*(.*)$', linea)   # sin sangría: los anidados (colores) no hacen falta
        if not m or not m.group(2):
            continue
        valor = m.group(2).strip()
        try:
            datos[m.group(1)] = json.loads(valor)
        except ValueError:
            datos[m.group(1)] = valor
    return datos


def load_cursos():
    """{curso: {'datos': frontmatter de <curso>.md, 'modulos': {modulo: frontmatter}}}, sin los borradores."""
    cursos = {}
    if not os.path.isdir(CURSOS_DIR):
        return cursos
    for nombre in sorted(os.listdir(CURSOS_DIR)):
        if not nombre.endswith('.md'):
            continue
        slug = nombre[:-len('.md')]
        datos = frontmatter(os.path.join(CURSOS_DIR, nombre))
        if datos.get('borrador') is True:
            continue
        carpeta = os.path.join(CURSOS_DIR, slug)
        modulos = {}
        if os.path.isdir(carpeta):
            for m in os.listdir(carpeta):
                if m.endswith('.md'):
                    modulos[m[:-len('.md')]] = frontmatter(os.path.join(carpeta, m))
        modulos = dict(sorted(modulos.items(), key=lambda kv: kv[1].get('orden', 0)))
        cursos[slug] = {'datos': datos, 'modulos': modulos}
    return dict(sorted(cursos.items(), key=lambda kv: kv[1]['datos'].get('orden', 0)))


CURSOS = load_cursos()


def og_image(nombre):
    """Imagen para compartir de assets/og/<nombre>.jpg, o la de la home si todavía no se ha dibujado."""
    return f'{nombre}.jpg' if os.path.exists(os.path.join(ROOT, 'public', 'assets', 'og', f'{nombre}.jpg')) else 'home.jpg'


def curso_de(rel):
    """cursos/<curso>/… → <curso> si es un curso publicado; si no, None."""
    partes = rel.split('/')
    return partes[1] if len(partes) >= 3 and partes[0] == 'cursos' and partes[1] in CURSOS else None


def curso_jsonld(slug, url, description):
    curso = CURSOS[slug]
    datos = curso['datos']
    return {
        '@type': 'Course',
        'name': datos.get('nombre', slug),
        'description': description,
        'url': url,
        'image': OG + og_image(slug),
        'inLanguage': 'es',
        'isAccessibleForFree': True,
        'provider': ORG_REF,
        'offers': {'@type': 'Offer', 'category': 'Free', 'price': '0', 'priceCurrency': 'USD'},
        'hasCourseInstance': {'@type': 'CourseInstance', 'courseMode': 'Online', 'inLanguage': 'es'},
        'teaches': [datos.get('lenguaje', slug)] + [m.get('titulo', s) for s, m in curso['modulos'].items()],
    }


# ── helpers ──────────────────────────────────────────────────────────────

def url_for(rel):
    """Ruta relativa del archivo → URL canónica (index.html se sirve como carpeta/)."""
    if rel == 'index.html':
        return SITE + '/'
    if rel.endswith('/index.html'):
        return f'{SITE}/{rel[:-len("index.html")]}'
    return f'{SITE}/{rel}'


def read_tag(text, pattern):
    m = re.search(pattern, text, re.S | re.I)
    return html.unescape(m.group(1).strip()) if m else ''


def esc(value):
    return html.escape(value, quote=True)


def breadcrumb(items):
    return {
        '@type': 'BreadcrumbList',
        'itemListElement': [
            {'@type': 'ListItem', 'position': i, 'name': name, 'item': url}
            for i, (name, url) in enumerate(items, 1)
        ],
    }


def app_jsonld(rel, app, description, url):
    data = {
        '@type': 'SoftwareApplication',
        'name': app['name'],
        'description': description,
        'url': url,
        'image': OG + app['image'],
        'applicationCategory': app['category'],
        'operatingSystem': app['os'],
        'inLanguage': 'es',
        'author': ORG_REF,
        'publisher': ORG_REF,
    }
    if app.get('version'):
        data['softwareVersion'] = app['version']
    if app.get('size'):
        data['fileSize'] = app['size']
    if download_url(app):
        data['downloadUrl'] = download_url(app)
    if app.get('install'):
        data['installUrl'] = app['install']
        data['sameAs'] = [app['install']] + app.get('also', [])
    if app.get('free'):
        data['offers'] = {'@type': 'Offer', 'price': '0', 'priceCurrency': 'USD'}
    return [data, breadcrumb([('ierwinx', SITE + '/'), (app['name'], url)])]


# ── per-page metadata ────────────────────────────────────────────────────

def page_meta(rel, text):
    """Devuelve (title, description, image, og_type, jsonld | None, title_override)."""
    title = read_tag(text, r'<title>(.*?)</title>')
    description = read_tag(text, r'<meta\s+name="description"\s+content="([^"]*)"')
    url = url_for(rel)

    if rel == 'index.html':
        apps = [(a['name'], url_for(r)) for r, a in APPS.items()]
        graph = [
            {
                '@type': 'WebSite', '@id': SITE + '/#website', 'name': 'ierwinx',
                'alternateName': SITE_DATA['alternateName'], 'url': SITE + '/', 'inLanguage': 'es',
                'publisher': ORG_REF,
            },
            BRAND,
            {
                '@type': 'ItemList', 'name': 'Apps de ierwinx',
                'itemListElement': [
                    {'@type': 'ListItem', 'position': i, 'name': n, 'url': u}
                    for i, (n, u) in enumerate(apps, 1)
                ],
            },
        ]
        return title, HOME_DESCRIPTION, 'home.jpg', 'website', graph, HOME_DESCRIPTION

    if rel in APPS:
        app = APPS[rel]
        title = app.get('title', title)
        description = app.get('description', description)
        return title, description, app['image'], 'website', app_jsonld(rel, app, description, url), app.get('description')

    # Páginas dentro de una app (privacidad, soporte, términos…): miga de pan bajo la app.
    app = APPS.get(rel.split('/')[0] + '/index.html')
    if app and '/' in rel:
        crumbs = [('ierwinx', SITE + '/'), (app['name'], url_for(rel.split('/')[0] + '/index.html')),
                  (title.split(' — ')[0], url)]
        return title, description, app['image'], 'website', [breadcrumb(crumbs)], None

    # /cursos/: la lista de cursos.
    if rel == 'cursos/index.html':
        graph = [
            {
                '@type': 'CollectionPage', 'name': title, 'description': description, 'url': url, 'inLanguage': 'es',
                'publisher': ORG_REF,
                'mainEntity': {
                    '@type': 'ItemList',
                    'itemListElement': [
                        {'@type': 'ListItem', 'position': i, 'url': f'{SITE}/cursos/{s}/',
                         'item': curso_jsonld(s, f'{SITE}/cursos/{s}/', c['datos'].get('descripcion', ''))}
                        for i, (s, c) in enumerate(CURSOS.items(), 1)
                    ],
                },
            },
            breadcrumb([('ierwinx', SITE + '/'), ('Cursos', url)]),
        ]
        return title, description, og_image('cursos'), 'website', graph, None

    # Un curso: portada (Course), módulos y lecciones (LearningResource), con migas de pan.
    slug = curso_de(rel)
    if slug:
        curso = CURSOS[slug]
        nombre = curso['datos'].get('nombre', slug)
        base = f'{SITE}/cursos/{slug}/'
        crumbs = [('ierwinx', SITE + '/'), ('Cursos', SITE + '/cursos/'), (nombre, base)]
        if rel == f'cursos/{slug}/index.html':
            return title, description, og_image(slug), 'website', [curso_jsonld(slug, url, description), BRAND, breadcrumb(crumbs)], None
        partes = rel.split('/')
        modulo = partes[2] if len(partes) > 3 else None
        if modulo:
            crumbs.append((curso['modulos'].get(modulo, {}).get('titulo', modulo), f'{base}{modulo}/'))
        if rel.endswith('/index.html'):
            return title, description, og_image(slug), 'website', [breadcrumb(crumbs)], None
        leccion = title.split(' · ')[0]
        crumbs.append((leccion, url))
        graph = [breadcrumb(crumbs), {
            '@type': 'LearningResource',
            'name': leccion,
            'description': description,
            'url': url,
            'inLanguage': 'es',
            'isAccessibleForFree': True,
            'learningResourceType': 'Lección',
            'isPartOf': {'@type': 'Course', 'name': nombre, 'url': base},
            'provider': ORG_REF,
        }]
        return title, description, og_image(slug), 'article', graph, None

    return title, description, 'home.jpg', 'website', None, None


# ── HTML rewriting ───────────────────────────────────────────────────────

BLOCK_RE = re.compile(r'\n?[ \t]*<!-- seo:start.*?<!-- seo:end -->[ \t]*', re.S)
OLD_TAGS_RE = re.compile(
    r'\n?[ \t]*(?:<meta\s+(?:property="og:[^"]*"|name="twitter:[^"]*"|name="robots")[^>]*>'
    r'|<link\s+rel="canonical"[^>]*>'
    r'|<!-- (?:Open Graph|Twitter Card) -->)',
    re.I)


def build_block(rel, text):
    if is_private(rel):
        return ('<!-- seo:start · generado por tools/seo.py -->\n'
                '<meta name="robots" content="noindex, nofollow, noarchive, noimageindex">\n'
                '<!-- seo:end -->')

    title, description, image, og_type, graph, _ = page_meta(rel, text)
    url = url_for(rel)
    img = OG + image
    alt = f'{title.split(" — ")[0].split(" · ")[0]} · ierwinx'
    lines = [
        '<!-- seo:start · generado por tools/seo.py -->',
        f'<link rel="canonical" href="{url}">',
        '<meta name="robots" content="noindex, follow">' if is_legal(rel)
        else '<meta name="robots" content="index, follow, max-image-preview:large">',
        f'<meta property="og:type" content="{og_type}">',
        '<meta property="og:site_name" content="ierwinx">',
        '<meta property="og:locale" content="es_MX">',
        f'<meta property="og:url" content="{url}">',
        f'<meta property="og:title" content="{esc(title)}">',
        f'<meta property="og:description" content="{esc(description)}">',
        f'<meta property="og:image" content="{img}">',
        f'<meta property="og:image:secure_url" content="{img}">',
        '<meta property="og:image:type" content="image/jpeg">',
        '<meta property="og:image:width" content="1200">',
        '<meta property="og:image:height" content="630">',
        f'<meta property="og:image:alt" content="{esc(alt)}">',
        '<meta name="twitter:card" content="summary_large_image">',
        f'<meta name="twitter:title" content="{esc(title)}">',
        f'<meta name="twitter:description" content="{esc(description)}">',
        f'<meta name="twitter:image" content="{img}">',
        f'<meta name="twitter:image:alt" content="{esc(alt)}">',
    ]
    if graph:
        data = {'@context': 'https://schema.org', '@graph': graph}
        payload = json.dumps(data, ensure_ascii=False, indent=2).replace('</', '<\\/')
        lines.append(f'<script type="application/ld+json">\n{payload}\n</script>')
    lines.append('<!-- seo:end -->')
    return '\n'.join(lines)


def apply_overrides(rel, text):
    """Título y descripción mejorados donde los definimos en APPS / HOME."""
    title, description, *_rest, desc_override = page_meta(rel, text)
    if rel in APPS and APPS[rel].get('title'):
        text = re.sub(r'<title>.*?</title>', f'<title>{esc(title)}</title>', text, count=1, flags=re.S)
    if desc_override:
        text = re.sub(r'(<meta\s+name="description"\s+content=")[^"]*(")',
                      lambda m: m.group(1) + esc(desc_override) + m.group(2), text, count=1)
    return text


def process(rel):
    path = os.path.join(DIST, rel)
    with open(path, encoding='utf-8') as f:
        text = f.read()
    original = text
    text = BLOCK_RE.sub('', text)
    if is_private(rel):
        # Keep the CV's own Open Graph tags (sharing a direct link still looks good);
        # only drop a stale robots tag so ours is the single source of truth.
        text = re.sub(r'\n?[ \t]*<meta\s+name="robots"[^>]*>', '', text, flags=re.I)
    else:
        text = OLD_TAGS_RE.sub('', text)
        text = apply_overrides(rel, text)
    block = build_block(rel, text)
    text = re.sub(r'(\s*)</head>', lambda m: '\n' + block + m.group(1) + '</head>', text, count=1)
    if text != original:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(text)
    return text != original


# ── discovery, sitemap, robots ───────────────────────────────────────────

def html_pages():
    pages = []
    for dirpath, dirnames, filenames in os.walk(DIST):
        dirnames[:] = sorted(d for d in dirnames if not d.startswith(('.', '_')))
        for name in sorted(filenames):
            if name.endswith('.html') and not name.startswith('_'):
                pages.append(os.path.relpath(os.path.join(dirpath, name), DIST).replace(os.sep, '/'))
    return pages


def commit_dates():
    """Ruta en el repo → fecha de su último commit (una sola llamada a git)."""
    try:
        log = subprocess.run(['git', 'log', '--format=%x00%cs', '--name-only'], cwd=ROOT,
                             capture_output=True, text=True, check=True).stdout
    except (OSError, subprocess.CalledProcessError):
        return {}
    dates = {}
    for chunk in log.split('\0')[1:]:
        date, *files = chunk.strip().split('\n')
        for name in files:
            dates.setdefault(name, date)
    return dates


def source_of(rel):
    """Archivos fuente que generan dist/<rel>: su página de Astro o su archivo de public/. Si la página sale de
    la plantilla src/pages/[slug]/ (privacidad, términos y soporte de las apps de Mac), la plantilla y legal.json."""
    slug = curso_de(rel)
    if slug:   # páginas de un curso: su Markdown y la plantilla que lo pinta
        partes = rel[:-len('.html')].split('/')[1:]          # [curso, (modulo,) (leccion|index)]
        if partes[-1] == 'index':
            partes = partes[:-1]
        plantilla = ['index', '[modulo]/index', '[modulo]/[leccion]'][len(partes) - 1]
        return [f'src/content/cursos/{"/".join(partes)}.md', f'src/pages/cursos/[curso]/{plantilla}.astro']
    own = [f'src/pages/{rel[:-len(".html")]}.astro', f'public/{rel}']
    if any(os.path.exists(os.path.join(ROOT, s)) for s in own):
        return own
    name = os.path.basename(rel)[:-len('.html')]
    return [f'src/pages/[slug]/{name}.astro', 'src/data/legal.json']


def write_sitemap(pages):
    def priority(rel):
        if rel == 'index.html':
            return '1.0'
        if rel in APPS or rel == 'cursos/index.html':
            return '0.9'
        if curso_de(rel) and rel.count('/') == 2:    # portada de un curso
            return '0.9'
        if curso_de(rel) and rel.endswith('/index.html'):   # módulo
            return '0.7'
        return '0.5'

    dates = commit_dates()
    today = datetime.date.today().isoformat()
    entries = []
    for rel in pages:
        if is_private(rel) or is_legal(rel):
            continue
        # La fecha del build no sirve (todo saldría modificado hoy): usamos la del último commit de sus fuentes.
        lastmod = max((dates[s] for s in source_of(rel) if s in dates), default=today)
        entries.append(
            f'  <url>\n    <loc>{url_for(rel)}</loc>\n    <lastmod>{lastmod}</lastmod>\n'
            f'    <priority>{priority(rel)}</priority>\n  </url>')
    xml = ('<?xml version="1.0" encoding="UTF-8"?>\n'
           '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
           + '\n'.join(entries) + '\n</urlset>\n')
    with open(os.path.join(DIST, 'sitemap.xml'), 'w', encoding='utf-8') as f:
        f.write(xml)
    return len(entries)


def write_robots():
    robots = (
        '# ierwinx.com\n'
        f'# /{PRIVATE_DIR}/ NO se bloquea aquí a propósito: sus páginas llevan <meta name="robots" content="noindex">\n'
        '# y Google necesita poder leerlas para ver esa instrucción y no mostrarlas.\n'
        'User-agent: *\n'
        'Allow: /\n'
        '# Imágenes privadas del CV (certificados, foto): que no salgan en Google Imágenes.\n'
        f'Disallow: /{PRIVATE_DIR}/img/\n'
        '\n'
        f'Sitemap: {SITE}/sitemap.xml\n'
    )
    with open(os.path.join(DIST, 'robots.txt'), 'w', encoding='utf-8') as f:
        f.write(robots)


def rebase_to_site(pages):
    """Fuera de producción, las URLs absolutas de producción pasan a apuntar a SITE."""
    if SITE == PRODUCTION:
        return 0
    changed = 0
    for rel in pages:
        path = os.path.join(DIST, rel)
        with open(path, encoding='utf-8') as f:
            text = f.read()
        rebased = text.replace(f'"{PRODUCTION}', f'"{SITE}')
        if rebased != text:
            with open(path, 'w', encoding='utf-8') as f:
                f.write(rebased)
            changed += 1
    return changed


# ── Content-Security-Policy ─────────────────────────────────────────────
# El navegador solo carga y ejecuta lo que esta lista permite. Los scripts en línea de cada página
# entran por su huella SHA-256, calculada aquí sobre el HTML final (por eso corre al último).

CSP_RE = re.compile(r'\n?[ \t]*<!-- csp:start.*?<!-- csp:end -->', re.S)
INLINE_SCRIPT_RE = re.compile(r'<script(?![^>]*\bsrc=)([^>]*)>(.*?)</script>', re.S | re.I)
RECAPTCHA = 'https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/'


def origin(url):
    m = re.match(r'https?://[^/]+', url or '')
    return m.group(0) if m else ''


def script_hashes(text):
    """Huellas de los scripts en línea que el navegador ejecuta (JSON-LD y otros datos no)."""
    hashes = []
    for attrs, body in INLINE_SCRIPT_RE.findall(text):
        kind = re.search(r'\btype="([^"]*)"', attrs)
        if kind and kind.group(1).lower() not in ('module', 'text/javascript', 'application/javascript'):
            continue
        digest = base64.b64encode(hashlib.sha256(body.encode('utf-8')).digest()).decode()
        if f"'sha256-{digest}'" not in hashes:
            hashes.append(f"'sha256-{digest}'")
    return hashes


def csp_policy(text):
    connect = ' '.join(filter(None, ["'self'", origin(SITE_DATA.get('contactApi'))]))
    return '; '.join([
        "default-src 'self'",
        ' '.join(["script-src 'self'", *script_hashes(text), RECAPTCHA]),
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",   # los atributos style="" de las páginas
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: blob:",
        f'connect-src {connect}',
        f"frame-src 'self' blob: {RECAPTCHA} https://recaptcha.google.com/recaptcha/",   # blob: el PDF del CV
        "worker-src 'self' blob:",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        *(['upgrade-insecure-requests'] if SITE.startswith('https://') else []),   # en http://localhost rompería la vista local
    ])


def add_csp(rel):
    path = os.path.join(DIST, rel)
    with open(path, encoding='utf-8') as f:
        original = f.read()
    text = CSP_RE.sub('', original)
    block = ('\n<!-- csp:start · generado por tools/seo.py -->\n'
             f'<meta http-equiv="Content-Security-Policy" content="{csp_policy(text).replace(chr(34), "&quot;")}">\n'
             '<meta name="referrer" content="strict-origin-when-cross-origin">\n'
             '<!-- csp:end -->')
    # Justo después de <meta charset>: antes de cualquier script, estilo o fuente.
    text, n = re.subn(r'(<meta\s+charset=[^>]*>)', lambda m: m.group(1) + block, text, count=1, flags=re.I)
    if not n:
        text = re.sub(r'(<head[^>]*>)', lambda m: m.group(1) + block, text, count=1, flags=re.I)
    if text != original:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(text)
    return text != original


def main():
    if not os.path.isdir(DIST):
        raise SystemExit('No existe dist/: corre primero `npm run build`.')
    all_pages = html_pages()
    pages = [p for p in all_pages if p not in REDIRECTS]
    changed = sum(process(rel) for rel in pages)
    count = write_sitemap(pages)
    write_robots()
    rebased = rebase_to_site(all_pages)
    csp = sum(add_csp(rel) for rel in all_pages)   # al último: las huellas son del HTML final
    private = [p for p in pages if is_private(p)]
    print(f'SEO para {SITE}: {len(pages)} páginas revisadas, {changed} actualizadas, {rebased} con URLs locales.')
    print(f'sitemap.xml: {count} URLs públicas.  noindex: {", ".join(private)}')
    print(f'CSP: {len(all_pages)} páginas, {csp} actualizadas.')


if __name__ == '__main__':
    main()
