#!/usr/bin/env python3
"""Avisa a Bing (IndexNow) de las URLs públicas de ierwinx.com.

Uso (desde la raíz del proyecto):

    python3 tools/indexnow.py          # solo muestra qué enviaría
    python3 tools/indexnow.py --send   # envía de verdad

Antes de enviar:
  * el archivo <clave>.txt de la raíz ya debe estar publicado en
    https://ierwinx.com/<clave>.txt (haz push primero);
  * las URLs salen de sitemap.xml, así que /CV/ (noindex) nunca se envía.
"""

import glob
import json
import os
import re
import sys
import urllib.error
import urllib.request

SITE = 'https://ierwinx.com'
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENDPOINT = 'https://api.indexnow.org/IndexNow'


def find_key():
    for path in glob.glob(os.path.join(ROOT, '*.txt')):
        name = os.path.basename(path)[:-4]
        if re.fullmatch(r'[0-9a-f]{32}', name):
            return name
    sys.exit('No hay archivo de clave <32 hex>.txt en la raíz.')


def sitemap_urls():
    with open(os.path.join(ROOT, 'sitemap.xml'), encoding='utf-8') as f:
        return re.findall(r'<loc>([^<]+)</loc>', f.read())


def main():
    key = find_key()
    urls = sitemap_urls()
    payload = {
        'host': 'ierwinx.com',
        'key': key,
        'keyLocation': f'{SITE}/{key}.txt',
        'urlList': urls,
    }
    print(f'{len(urls)} URLs, clave {key}')
    for u in urls:
        print('  ', u)
    if '--send' not in sys.argv:
        print('\nSimulación: agrega --send para enviarlas.')
        return
    req = urllib.request.Request(
        ENDPOINT,
        data=json.dumps(payload).encode('utf-8'),
        headers={'Content-Type': 'application/json; charset=utf-8'},
    )
    try:
        with urllib.request.urlopen(req) as res:
            print('Respuesta:', res.status)
    except urllib.error.HTTPError as e:
        print('Error', e.code, e.read().decode('utf-8', 'replace'))


if __name__ == '__main__':
    main()
