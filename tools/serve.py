#!/usr/bin/env python3
"""Mini servidor local para ver el sitio como en producción.

Uso:
    python3 tools/serve.py           # http://localhost:8000
    python3 tools/serve.py 8080      # otro puerto

Sirve la raíz del repo (así funcionan las rutas absolutas como /itunes/ o /CV/),
desactiva la caché para ver los cambios al recargar y abre el navegador.
"""
import functools
import http.server
import socketserver
import sys
import threading
import webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        super().end_headers()


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


def main():
    handler = functools.partial(Handler, directory=str(ROOT))
    with Server(("127.0.0.1", PORT), handler) as httpd:
        url = f"http://localhost:{PORT}/"
        print(f"Sirviendo {ROOT} en {url}  (Ctrl+C para detener)")
        threading.Timer(0.5, webbrowser.open, args=(url,)).start()
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServidor detenido.")


if __name__ == "__main__":
    main()
