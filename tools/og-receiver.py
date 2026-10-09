"""Recibe las imágenes que dibuja tools/og-maker.html y las guarda en tools/og-out/."""
import http.server
import os
import urllib.parse

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'og-out')
os.makedirs(OUT, exist_ok=True)


class Handler(http.server.BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', '*')

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_POST(self):
        query = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        name = os.path.basename(query['name'][0])
        length = int(self.headers['Content-Length'])
        with open(os.path.join(OUT, name), 'wb') as f:
            f.write(self.rfile.read(length))
        print('guardado', name)
        self.send_response(200)
        self._cors()
        self.end_headers()
        self.wfile.write(b'ok')

    def log_message(self, *args):
        pass


print('Esperando imágenes en http://127.0.0.1:8766 …')
http.server.HTTPServer(('127.0.0.1', 8766), Handler).serve_forever()
