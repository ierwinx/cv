#!/usr/bin/env python3
"""Verifica dist/ antes de publicar: `npm run check` (después de `npm run build`).

  1. Paridad de URLs: todo lo que publicaba el sitio en la etiqueta legacy-v1 sigue
     existiendo en dist/, con las mismas mayúsculas (GitHub Pages las distingue).
  2. Sin producción en local: si se compiló para otro SITE, no queda ninguna
     URL de producción en dist/.
  3. SEO: un solo bloque seo por página pública, con canonical, og:image y JSON-LD
     válido; /CV/ con noindex y fuera del sitemap.

Sale con código 1 si algo falla, así que sirve igual en local y en CI.
"""
import json
import os
import re
import subprocess
import sys

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
    # enlaza algo de fuera del build (el seasonal y el curso de Python).
    r'|^(?!assets/seasonal\.|python/).*\.(js|css)$')
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


def check_parity(files):
    missing = [p for p in legacy_files() if p not in files]
    for p in missing:
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


def main():
    if not os.path.isdir(DIST):
        sys.exit('No existe dist/: corre primero `npm run build`.')
    files = dist_files()
    check_parity(files)
    site = check_local_urls(files)
    check_seo(files)
    if errors:
        print('\n'.join(errors))
        sys.exit(f'\n✗ {len(errors)} problema(s) en dist/ (SITE={site}).')
    print(f'✓ dist/ correcto para {site}: {len(files)} archivos, URLs de {LEGACY} intactas, SEO completo.')


if __name__ == '__main__':
    main()
