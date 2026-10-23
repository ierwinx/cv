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
  * Genera sitemap.xml y robots.txt en la raíz de dist/.
  * Si SITE no es producción, cambia las URLs de producción que queden en el HTML
    por SITE, para que una compilación local nunca enlace a ierwinx.com.

Los datos de las apps y de la marca salen de src/data/apps.json y src/data/site.json.
"""

import datetime
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

PYTHON_MODULES = {
    'primeros-pasos': 'Primeros pasos',
    'fundamentos': 'Fundamentos de Python',
    'terminal': 'Aplicaciones de terminal',
    'tkinter': 'Aplicaciones con Tkinter',
    'django': 'Webs con Django',
    'apis': 'APIs REST',
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
                    for i, (n, u) in enumerate(apps + [('Curso de Python', SITE + '/python/')], 1)
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

    if rel == 'python/index.html':
        course = {
            '@type': 'Course',
            'name': 'Curso de Python',
            'description': description,
            'url': url,
            'image': OG + 'python.jpg',
            'inLanguage': 'es',
            'isAccessibleForFree': True,
            'provider': ORG_REF,
            'offers': {'@type': 'Offer', 'category': 'Free', 'price': '0', 'priceCurrency': 'USD'},
            'hasCourseInstance': {'@type': 'CourseInstance', 'courseMode': 'Online', 'inLanguage': 'es'},
            'teaches': ['Python', 'Aplicaciones de terminal', 'Tkinter', 'Django', 'APIs REST'],
        }
        return title, description, 'python.jpg', 'website', [course, BRAND,
                breadcrumb([('ierwinx', SITE + '/'), ('Curso de Python', url)])], None

    if rel.startswith('python/'):
        parts = rel.split('/')
        crumbs = [('ierwinx', SITE + '/'), ('Curso de Python', SITE + '/python/')]
        module = parts[1] if len(parts) > 2 else None
        if module:
            crumbs.append((PYTHON_MODULES.get(module, module.replace('-', ' ').capitalize()),
                           f'{SITE}/python/{module}/'))
        if not rel.endswith('/index.html'):
            crumbs.append((title.split(' · ')[0], url))
        graph = [breadcrumb(crumbs)]
        og_type = 'website'
        if not rel.endswith('/index.html'):
            og_type = 'article'
            graph.append({
                '@type': 'LearningResource',
                'name': title.split(' · ')[0],
                'description': description,
                'url': url,
                'inLanguage': 'es',
                'isAccessibleForFree': True,
                'learningResourceType': 'Lección',
                'isPartOf': {'@type': 'Course', 'name': 'Curso de Python', 'url': SITE + '/python/'},
                'provider': ORG_REF,
            })
        return title, description, 'python.jpg', og_type, graph, None

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
        '<meta name="robots" content="index, follow, max-image-preview:large">',
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
    """Archivo fuente que genera dist/<rel>: una página de Astro o un archivo de public/."""
    return [f'src/pages/{rel[:-len(".html")]}.astro', f'public/{rel}']


def write_sitemap(pages):
    def priority(rel):
        if rel == 'index.html':
            return '1.0'
        if rel in APPS or rel == 'python/index.html':
            return '0.9'
        if rel.startswith('python/') and rel.endswith('/index.html'):
            return '0.7'
        return '0.5'

    dates = commit_dates()
    today = datetime.date.today().isoformat()
    entries = []
    for rel in pages:
        if is_private(rel):
            continue
        # La fecha del build no sirve (todo saldría modificado hoy): usamos la del commit de su fuente.
        lastmod = next((dates[s] for s in source_of(rel) if s in dates), today)
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


def main():
    if not os.path.isdir(DIST):
        raise SystemExit('No existe dist/: corre primero `npm run build`.')
    all_pages = html_pages()
    pages = [p for p in all_pages if p not in REDIRECTS]
    changed = sum(process(rel) for rel in pages)
    count = write_sitemap(pages)
    write_robots()
    rebased = rebase_to_site(all_pages)
    private = [p for p in pages if is_private(p)]
    print(f'SEO para {SITE}: {len(pages)} páginas revisadas, {changed} actualizadas, {rebased} con URLs locales.')
    print(f'sitemap.xml: {count} URLs públicas.  noindex: {", ".join(private)}')


if __name__ == '__main__':
    main()
