#!/usr/bin/env python3
"""CV en PDF vectorial (texto real, seleccionable y con enlaces) con WeasyPrint.

Corre en `npm run build`, entre `astro build` y `tools/seo.py`, sobre la salida ya compilada. Toma las hojas de
/CV/pdf/ (src/components/cv/Resume.astro + src/styles/pages/cv-pdf.css), así el diseño tiene una sola fuente:

    python3 tools/cv_pdf.py                    # dist/CV/Erwin-cv-EN.pdf y Erwin-cv-ES.pdf, una sola hoja larga
    python3 tools/cv_pdf.py --a4               # en hojas A4 (para imprimir)
    python3 tools/cv_pdf.py --out ~/Desktop    # en otra carpeta (no toca dist/)

Después cambia dist/CV/pdf/index.html por una redirección al PDF: la página solo existe para el script, y así
los enlaces viejos a /CV/pdf/ siguen funcionando. Los PDF nunca van a git: se generan en cada build.

Requiere WeasyPrint (tools/requirements.txt) y pango (`brew install pango`). En local va en un entorno propio,
ignorado por git:

    python3 -m venv .venv && .venv/bin/pip install -r tools/requirements.txt

Si existe .venv y el python con el que se llamó no tiene WeasyPrint, el script se vuelve a lanzar con el de .venv.
Sin WeasyPrint, en local avisa y sigue (el build no falla); en CI (variable CI) falla.
Sintaxis compatible con Python 3.9.
"""

import argparse
import base64
import html
import io
import json
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / 'dist'
PAGE = DIST / 'CV' / 'pdf' / 'index.html'
CSS = ROOT / 'src' / 'styles' / 'pages' / 'cv-pdf.css'
CV_JSON = ROOT / 'src' / 'data' / 'cv.json'
SITE_JSON = ROOT / 'src' / 'data' / 'site.json'
VENV_PYTHON = ROOT / '.venv' / 'bin' / 'python'
FONTS = 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700'
PHOTO_PX = 600          # la foto mide 110 px en la hoja: 600 px dan ~350 ppp impresa
MARGIN_BOTTOM_MM = 16   # el margen de abajo de @page en cv-pdf.css
TALL_MM = 5000          # alto provisional de la hoja larga: se mide el contenido y se recorta a su altura


def load_weasyprint() -> bool:
    try:
        import weasyprint  # noqa: F401
        return True
    except ImportError:
        pass
    # sys.prefix y no sys.executable: el python del venv es un enlace al del sistema
    if VENV_PYTHON.exists() and Path(sys.prefix).resolve() != VENV_PYTHON.parent.parent.resolve():
        os.execv(str(VENV_PYTHON), [str(VENV_PYTHON), __file__] + sys.argv[1:])
    return False


def file_name(lang: str) -> str:
    return f'Erwin-cv-{lang.upper()}.pdf'


def page_css(height_mm=None) -> str:
    """A4 si no hay alto; si lo hay, una sola hoja de 210 mm de ancho y ese alto."""
    return '@page { size: A4; }' if height_mm is None else f'@page {{ size: 210mm {height_mm:.2f}mm; }}'


def content_height_mm(document) -> float:
    """Alto que ocupa el CV en la primera hoja (margen de arriba incluido) más el margen de abajo."""
    def boxes(box):
        yield box
        for child in getattr(box, 'children', []):
            yield from boxes(child)
    sheet = next(b for b in boxes(document.pages[0]._page_box)
                 if getattr(b, 'element', None) is not None and b.element.get('class') == 'cv-sheet')
    bottom_px = sheet.position_y + sheet.margin_height()
    # +0.5 mm: con el alto exacto, el redondeo a veces manda el último renglón a una segunda hoja
    return bottom_px * 25.4 / 96 + MARGIN_BOTTOM_MM + 0.5


def extract(page: str):
    """La hoja ya compilada de cada idioma (<article class="cv-sheet" id="cv-en|es"> de /CV/pdf/)."""
    sheets = dict(re.findall(r'<article[^>]*\bid="cv-(en|es)"[^>]*>(.*?)</article>', page, re.S))
    if set(sheets) != {'en', 'es'}:
        sys.exit(f'No encontré las hojas en {PAGE.relative_to(ROOT)}: ¿ya se procesó o cambió la página?')
    return sheets


def photo_uri(path: Path) -> str:
    """Foto cuadrada reducida a PHOTO_PX (la original pesa ~440 KB) como data: URI."""
    from PIL import Image

    img = Image.open(path).convert('RGB')
    side = min(img.size)
    left, top = (img.width - side) // 2, (img.height - side) // 2
    img = img.crop((left, top, left + side, top + side)).resize((PHOTO_PX, PHOTO_PX), Image.Resampling.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, 'JPEG', quality=88, optimize=True)
    return 'data:image/jpeg;base64,' + base64.b64encode(buf.getvalue()).decode()


def build_html(lang: str, styles: str, sheet: str, cv: dict, photo: str, production: str) -> str:
    # Si se corre después de seo.py en un build local, los enlaces dirían localhost: el PDF siempre va a producción
    sheet = re.sub(r'href="https?://(localhost|127\.0\.0\.1)(:\d+)?/?"', f'href="{production}"', sheet)
    sheet = re.sub(r'(<div class="cv-photo"><img[^>]*?\bsrc=")[^"]*', lambda m: m.group(1) + photo, sheet)
    data = cv['pdf'][lang]
    return f"""<!DOCTYPE html>
<html lang="{lang}">
<head>
<meta charset="utf-8">
<title>{html.escape(data['name'])} · CV</title>
<meta name="author" content="{html.escape(data['name'])}">
<meta name="description" content="{html.escape(data['title'])}">
<link rel="stylesheet" href="{FONTS}">
<style>{styles}</style>
</head>
<body><article class="cv-sheet">{sheet}</article></body>
</html>"""


def redirect_page(name: str) -> str:
    """Lo que queda en /CV/pdf/: lleva al PDF en inglés y enlaza a los dos. seo.py le pone noindex y CSP."""
    en, es = file_name('en'), file_name('es')
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>{html.escape(name)} · CV</title>
<meta http-equiv="refresh" content="0; url=../{en}">
</head>
<body>
<p><a href="../{en}">CV (PDF, English)</a> · <a href="../{es}">CV (PDF, español)</a></p>
</body>
</html>
"""


def main() -> None:
    parser = argparse.ArgumentParser(description='CV en PDF vectorial con WeasyPrint')
    parser.add_argument('--out', type=Path, default=None, help='carpeta de salida (por defecto dist/CV)')
    parser.add_argument('--a4', action='store_true', help='hojas A4 en vez de una sola hoja larga')
    parser.add_argument('--html', action='store_true', help='guarda también el HTML intermedio (para depurar)')
    args = parser.parse_args()

    if not load_weasyprint():
        message = ('cv_pdf: falta WeasyPrint, no se generó el CV en PDF. Instálalo con:\n'
                   '  python3 -m venv .venv && .venv/bin/pip install -r tools/requirements.txt')
        if os.environ.get('CI'):
            sys.exit(message)
        print(f'⚠ {message}', file=sys.stderr)
        return
    from weasyprint import CSS as Stylesheet, HTML

    if not PAGE.exists():
        sys.exit(f'No existe {PAGE.relative_to(ROOT)}: corre antes `astro build`.')

    cv = json.loads(CV_JSON.read_text(encoding='utf-8'))
    styles = CSS.read_text(encoding='utf-8')
    sheets = extract(PAGE.read_text(encoding='utf-8'))
    production = json.loads(SITE_JSON.read_text(encoding='utf-8'))['production']
    photo = photo_uri(ROOT / 'public' / 'CV' / cv['person']['photo'])
    out = args.out or DIST / 'CV'
    out.mkdir(parents=True, exist_ok=True)

    for lang in ('en', 'es'):
        doc = build_html(lang, styles, sheets[lang], cv, photo, production)
        target = out / file_name(lang)
        if args.html:
            target.with_suffix('.html').write_text(doc, encoding='utf-8')
        page = HTML(string=doc, base_url=str(PAGE))
        if args.a4:
            size = page_css()
        else:
            # Dos pasadas: se maqueta en una hoja altísima, se mide dónde acaba el CV y se maqueta otra vez
            # con ese alto exacto. Así queda una sola hoja larga, sin cortes ni espacio en blanco al final.
            tall = page.render(stylesheets=[Stylesheet(string=page_css(TALL_MM))])
            if len(tall.pages) > 1:
                sys.exit(f'El CV mide más de {TALL_MM} mm: sube TALL_MM.')
            size = page_css(content_height_mm(tall))
        result = page.render(stylesheets=[Stylesheet(string=size)])
        result.write_pdf(target, pdf_variant='pdf/ua-1')
        w, h = (round(v * 25.4 / 96) for v in (result.pages[0].width, result.pages[0].height))
        print(f'✓ {target}  ({len(result.pages)} hoja(s) de {w}×{h} mm, {target.stat().st_size // 1024} KB)')

    if args.out is None:
        PAGE.write_text(redirect_page(cv['pdf']['en']['name']), encoding='utf-8')


if __name__ == '__main__':
    main()
