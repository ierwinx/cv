#!/usr/bin/env python3
"""Copia el curso de Python (otro repo) a public/python/.

El curso se escribe y se genera en ~/Desarrollo/curso (Markdown → build.py → salida/). Este script:
  1. corre su build.py (sáltalo con --sin-build si ya generaste salida/),
  2. reemplaza public/python/ por salida/ (así desaparecen las lecciones borradas),
  3. añade a cada página el CSS y el JS de /assets/seasonal.* (efectos de temporada del sitio).

El SEO (canonical, Open Graph, JSON-LD, sitemap) lo pone tools/seo.py al compilar, como al resto.

Uso:
    python3 tools/sync_curso.py                    # curso en ~/Desarrollo/curso
    python3 tools/sync_curso.py --curso <ruta> --sin-build
"""
import argparse
import os
import shutil
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DESTINO = os.path.join(ROOT, 'public', 'python')
CSS = '  <link rel="stylesheet" href="/assets/seasonal.css">\n'
JS = '  <script src="/assets/seasonal.js" defer></script>\n'


def inyectar(ruta):
    with open(ruta, encoding='utf-8') as f:
        texto = f.read()
    if '/assets/seasonal.' in texto:
        return False
    if '</head>' not in texto or '</body>' not in texto:
        sys.exit(f'{ruta}: no tiene </head> o </body>; ¿cambió la plantilla del curso?')
    texto = texto.replace('</head>', CSS + '</head>', 1)
    i = texto.rindex('</body>')
    texto = texto[:i] + JS + texto[i:]
    with open(ruta, 'w', encoding='utf-8') as f:
        f.write(texto)
    return True


def main():
    parser = argparse.ArgumentParser(description='Copia el curso de Python a public/python/.')
    parser.add_argument('--curso', default=os.path.expanduser('~/Desarrollo/curso'), help='carpeta del repo del curso')
    parser.add_argument('--sin-build', action='store_true', help='usar salida/ tal como está')
    args = parser.parse_args()

    salida = os.path.join(args.curso, 'salida')
    if not args.sin_build:
        subprocess.run([sys.executable, 'build.py'], cwd=args.curso, check=True)
    if not os.path.isfile(os.path.join(salida, 'index.html')):
        sys.exit(f'No existe {salida}/index.html: genera el curso primero.')

    shutil.rmtree(DESTINO, ignore_errors=True)
    shutil.copytree(salida, DESTINO, ignore=shutil.ignore_patterns('.DS_Store', '__pycache__'))

    paginas = 0
    for carpeta, _, nombres in os.walk(DESTINO):
        for nombre in nombres:
            if nombre.endswith('.html') and inyectar(os.path.join(carpeta, nombre)):
                paginas += 1
    print(f'Curso copiado a public/python/: {paginas} páginas con seasonal. Revisa `git status` y compila.')


if __name__ == '__main__':
    main()
