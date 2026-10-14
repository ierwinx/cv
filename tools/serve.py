#!/usr/bin/env python3
"""Mini servidor local para ver el sitio como en producción.

Uso:
    python3 tools/serve.py           # http://localhost:8000
    python3 tools/serve.py 8080      # otro puerto

Sirve la raíz del repo (así funcionan las rutas absolutas como /itunes/ o /CV/),
desactiva la caché para ver los cambios al recargar y abre el navegador.

Escucha solo en este equipo, en IPv4 (127.0.0.1) y en IPv6 (::1): en macOS "localhost"
también resuelve a ::1 y Safari no reintenta por IPv4 si esa dirección no responde.
"""
import functools
import http.server
import socket
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


class Server6(Server):
    address_family = socket.AF_INET6


def main():
    handler = functools.partial(Handler, directory=str(ROOT))
    with Server(("127.0.0.1", PORT), handler) as httpd:
        try:
            ipv6 = Server6(("::1", PORT), handler)
            threading.Thread(target=ipv6.serve_forever, daemon=True).start()
        except OSError:
            ipv6 = None  # sin IPv6 en este equipo: basta con 127.0.0.1
        url = f"http://127.0.0.1:{PORT}/"
        print(f"Sirviendo {ROOT} en {url} (también http://localhost:{PORT}/)  (Ctrl+C para detener)")
        threading.Timer(0.5, webbrowser.open, args=(url,)).start()
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServidor detenido.")
        finally:
            if ipv6:
                ipv6.shutdown()
                ipv6.server_close()


if __name__ == "__main__":
    main()
