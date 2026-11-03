#!/usr/bin/env python3
"""Agrega una versión de WolfGit a su aviso de actualizaciones de Sparkle (public/wolfgit/appcast.xml).

    python3 tools/appcast.py 1.0.1 ~/Desarrollo/Git/WolfGit/dist/WolfGit-1.0.1.dmg \\
        --firma 'sparkle:edSignature="…" length="…"' --notas "Diff de imágenes" "Flechas en las listas"

--firma es la línea «Para el appcast» que imprime ./build.sh de WolfGit (firma EdDSA del DMG ya grapado).
El DMG se publica antes con tools/release.sh wolfgit-v<versión> <dmg>; la versión siempre es X.Y.Z.
Una versión que ya estaba se reemplaza; la más nueva queda primero.
"""
import argparse
import email.utils
import html
import json
import os
import re
import sys
import xml.etree.ElementTree as ET

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FEED = os.path.join(ROOT, 'public', 'wolfgit', 'appcast.xml')
SPARKLE = 'http://www.andymatuschak.org/xml-namespaces/sparkle'
VERSION = re.compile(r'^\d+\.\d+\.\d+$')


def releases_base():
    with open(os.path.join(ROOT, 'src', 'data', 'site.json'), encoding='utf-8') as f:
        return json.load(f)['releases']


def read_items():
    """Las entradas que ya tiene el aviso, tal cual están escritas, por versión."""
    if not os.path.exists(FEED):
        return {}
    with open(FEED, encoding='utf-8') as f:
        text = f.read()
    ET.fromstring(text)  # falla aquí si alguien dejó el archivo mal formado
    items = {}
    for block in re.findall(r'<item>.*?</item>', text, re.S):
        items[re.search(r'<sparkle:version>(.*?)</sparkle:version>', block).group(1)] = block
    return items


def new_item(version, dmg, signature, notes, minimum):
    url = '%s/wolfgit-v%s/%s' % (releases_base(), version, os.path.basename(dmg))
    notes_html = ''.join('<li>%s</li>' % html.escape(n) for n in notes) or '<li>Mejoras y correcciones.</li>'
    return (
        '<item>\n'
        '      <title>WolfGit %(v)s</title>\n'
        '      <pubDate>%(date)s</pubDate>\n'
        '      <sparkle:version>%(v)s</sparkle:version>\n'
        '      <sparkle:shortVersionString>%(v)s</sparkle:shortVersionString>\n'
        '      <sparkle:minimumSystemVersion>%(min)s</sparkle:minimumSystemVersion>\n'
        '      <description><![CDATA[<ul>%(notes)s</ul>]]></description>\n'
        '      <enclosure url="%(url)s" %(sig)s type="application/octet-stream"/>\n'
        '    </item>'
    ) % {'v': version, 'date': email.utils.formatdate(usegmt=True), 'min': minimum, 'notes': notes_html,
         'url': url, 'sig': signature}


def key(version):
    return tuple(int(p) for p in version.split('.'))


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('version')
    parser.add_argument('dmg')
    parser.add_argument('--firma', required=True, help='sparkle:edSignature="…" length="…"')
    parser.add_argument('--notas', nargs='*', default=[])
    parser.add_argument('--minimo', default='27.0', help='macOS mínimo')
    args = parser.parse_args()

    if not VERSION.match(args.version):
        sys.exit('La versión debe tener la forma X.Y.Z')
    if not os.path.isfile(args.dmg):
        sys.exit('No existe %s' % args.dmg)
    sig = re.fullmatch(r'sparkle:edSignature="[A-Za-z0-9+/=]+" length="(\d+)"', args.firma.strip())
    if not sig:
        sys.exit('--firma debe ser la línea que imprime build.sh: sparkle:edSignature="…" length="…"')
    if int(sig.group(1)) != os.path.getsize(args.dmg):
        sys.exit('La firma es de otro archivo: length no coincide con el tamaño del DMG')

    items = read_items()
    items[args.version] = new_item(args.version, args.dmg, args.firma.strip(), args.notas, args.minimo)
    body = '\n    '.join(items[v] for v in sorted(items, key=key, reverse=True))
    os.makedirs(os.path.dirname(FEED), exist_ok=True)
    with open(FEED, 'w', encoding='utf-8') as f:
        f.write('<?xml version="1.0" encoding="utf-8"?>\n'
                '<rss version="2.0" xmlns:sparkle="%s">\n'
                '  <channel>\n'
                '    <title>WolfGit</title>\n'
                '    <description>Versiones de WolfGit para Sparkle (ADR-0036 del repo de WolfGit).</description>\n'
                '    <language>es</language>\n'
                '    %s\n'
                '  </channel>\n'
                '</rss>\n' % (SPARKLE, body))
    print('%s: WolfGit %s (%d versiones)' % (os.path.relpath(FEED, ROOT), args.version, len(items)))


if __name__ == '__main__':
    main()
