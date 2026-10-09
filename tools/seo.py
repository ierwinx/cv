#!/usr/bin/env python3
"""SEO de ierwinx.com: metadatos, datos estructurados, sitemap.xml y robots.txt.

Uso (desde la raíz del proyecto):

    python3 tools/seo.py

Vuelve a correrlo cada vez que agregues una página o regeneres el curso de Python.
Es idempotente: cada página lleva un único bloque entre <!-- seo:start --> y
<!-- seo:end --> que se reemplaza completo en cada ejecución.

Qué hace:
  * Todas las páginas públicas: canonical, Open Graph (WhatsApp, Facebook,
    LinkedIn), Twitter Card y JSON-LD para Google.
  * /cv/ y todo lo que hay dentro: `noindex, nofollow` y fuera del sitemap,
    para que no aparezcan en buscadores.
  * Genera sitemap.xml y robots.txt en la raíz.
"""

import datetime
import html
import json
import os
import re

SITE = 'https://ierwinx.com'
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OG = SITE + '/assets/og/'
LOGO = SITE + '/assets/logo-512.png'

# Carpetas que no son sitio público o no deben indexarse.
SKIP_DIRS = {'.git', '.github', 'node_modules', 'dist', 'tools', 'memory'}
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
    'name': 'ierwinx',
    'url': SITE + '/',
    'logo': {'@type': 'ImageObject', 'url': LOGO, 'width': 512, 'height': 512},
    'founder': {'@type': 'Person', 'name': 'Erwin'},
    'sameAs': ['https://github.com/ierwinx', 'https://www.linkedin.com/in/ierwinx'],
}

# Apps: datos tomados de la página de cada una. `free` solo donde la página lo dice.
APPS = {
    'iplist/index.html': dict(
        name='iPlist', image='iplist.jpg', category='DeveloperApplication', os='macOS 27',
        version='1.0', size='1.8 MB', download='/iplist/iPlist-1.0.dmg', free=False,
        title='iPlist — Editor de Plist nativo para Mac',
        description='Editor de Plist nativo para macOS. Abre, crea y edita property lists al instante, sin perder orden, tipos ni formato. XML, binario y OpenStep.',
    ),
    'ijson/index.html': dict(
        name='iJson', image='ijson.jpg', category='DeveloperApplication', os='macOS 27',
        version='1.0', size='2.4 MB', download='/ijson/iJson-1.0.dmg', free=False,
        title='iJson — Editor de JSON nativo para Mac',
        description='iJson: editor de JSON nativo para macOS. Árbol y texto, archivos de 100 MB en 0,42 s y tu formato original intacto, byte a byte.',
    ),
    'icsv/index.html': dict(
        name='iCSV', image='icsv.jpg', category='DeveloperApplication', os='macOS 26',
        version='1.0', size='2.5 MB', download='/icsv/iCSV-1.0.dmg', free=True,
    ),
    'superpets/index.html': dict(
        name='Super Pets', image='superpets.jpg', category='LifestyleApplication',
        os='iOS, iPadOS, macOS, watchOS', version='1.3', free=True,
        install='https://apps.apple.com/app/super-pets/id6787278041',
    ),
    'irar/index.html': dict(
        name='iRar', image='irar.jpg', category='UtilitiesApplication', os='macOS 26',
        version='1.0', download='/irar/downloads/iRar-1.0.dmg', free=True,
    ),
    'igit/index.html': dict(
        name='iGit', image='igit.jpg', category='DeveloperApplication', os='macOS 15',
        version='1.0.0', download='/igit/downloads/iGit-1.0.0.pkg', free=True,
    ),
    'ispecter/index.html': dict(
        name='iSpecter', image='ispecter.jpg', category='MultimediaApplication', os='macOS 26',
        version='1.0', size='12 MB', download='/ispecter/downloads/iSpecter.dmg', free=True,
    ),
    'iconverter/index.html': dict(
        name='iConverter', image='iconverter.jpg', category='MultimediaApplication', os='macOS 15',
        download='/iconverter/downloads/iConverter.dmg', free=True,
    ),
}

HOME_DESCRIPTION = ('ierwinx es el estudio de software de Erwin: iPlist, iJson, iCSV, Super Pets, iRar, '
                    'iGit, iSpecter e iConverter. Apps nativas para Mac, iPhone, iPad, Apple Watch, '
                    'CarPlay y la terminal, más un curso de Python gratis.')

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
    if app.get('download'):
        data['downloadUrl'] = SITE + app['download']
    if app.get('install'):
        data['installUrl'] = app['install']
        data['sameAs'] = [app['install']]
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
                'alternateName': 'ierwinx.com', 'url': SITE + '/', 'inLanguage': 'es',
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

    if rel.startswith('superpets/'):
        crumbs = [('ierwinx', SITE + '/'), ('Super Pets', SITE + '/superpets/'), (title.split(' — ')[0], url)]
        return title, description, 'superpets.jpg', 'website', [breadcrumb(crumbs)], None

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
    path = os.path.join(ROOT, rel)
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
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = sorted(d for d in dirnames if d not in SKIP_DIRS and not d.startswith('.'))
        for name in sorted(filenames):
            if name.endswith('.html') and not name.startswith('_'):
                pages.append(os.path.relpath(os.path.join(dirpath, name), ROOT).replace(os.sep, '/'))
    return pages


def write_sitemap(pages):
    def priority(rel):
        if rel == 'index.html':
            return '1.0'
        if rel in APPS or rel == 'python/index.html':
            return '0.9'
        if rel.startswith('python/') and rel.endswith('/index.html'):
            return '0.7'
        return '0.5'

    entries = []
    for rel in pages:
        if is_private(rel):
            continue
        mtime = os.path.getmtime(os.path.join(ROOT, rel))
        lastmod = datetime.date.fromtimestamp(mtime).isoformat()
        entries.append(
            f'  <url>\n    <loc>{url_for(rel)}</loc>\n    <lastmod>{lastmod}</lastmod>\n'
            f'    <priority>{priority(rel)}</priority>\n  </url>')
    xml = ('<?xml version="1.0" encoding="UTF-8"?>\n'
           '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
           + '\n'.join(entries) + '\n</urlset>\n')
    with open(os.path.join(ROOT, 'sitemap.xml'), 'w', encoding='utf-8') as f:
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
    with open(os.path.join(ROOT, 'robots.txt'), 'w', encoding='utf-8') as f:
        f.write(robots)


def main():
    pages = [p for p in html_pages() if p not in REDIRECTS]
    changed = sum(process(rel) for rel in pages)
    count = write_sitemap(pages)
    write_robots()
    private = [p for p in pages if is_private(p)]
    print(f'{len(pages)} páginas revisadas, {changed} actualizadas.')
    print(f'sitemap.xml: {count} URLs públicas.  noindex: {", ".join(private)}')


if __name__ == '__main__':
    main()
