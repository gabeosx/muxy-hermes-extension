"""Disposable, fixed-route TLS proxy for the Phase 3 simulation harness.

It is intentionally a test fixture: it accepts no dynamic upstream, origin, or buffering
controls from requests and writes no request or response contents to disk or stdout.
"""

import http.client
import os
import ssl
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse


MODE = os.environ.get("TLS_PROXY_MODE", "unbuffered")
ORIGIN = os.environ.get("TLS_PROXY_ORIGIN", "https://muxy.fixture.invalid")
UPSTREAM = urlparse(os.environ.get("TLS_PROXY_UPSTREAM", ""))
CERT = os.environ.get("TLS_PROXY_CERT", "")
KEY = os.environ.get("TLS_PROXY_KEY", "")

if MODE not in ("unbuffered", "buffered") or UPSTREAM.scheme != "http" or not UPSTREAM.hostname or not CERT or not KEY:
    raise SystemExit(2)


def allowed_route(method, path):
    if path == "/v1/capabilities":
        return method in ("GET", "OPTIONS")
    if path == "/v1/runs":
        return method in ("POST", "OPTIONS")
    parts = path.split("/")
    if len(parts) == 4 and parts[:3] == ["", "v1", "runs"] and parts[3].replace("_", "").replace("-", "").isalnum():
        return method in ("GET", "OPTIONS")
    if len(parts) == 5 and parts[:3] == ["", "v1", "runs"] and parts[3].replace("_", "").replace("-", "").isalnum() and parts[4] == "events":
        return method in ("GET", "OPTIONS")
    return False


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, _format, *_args):
        return

    def cors(self):
        if self.headers.get("Origin") == ORIGIN:
            self.send_header("Access-Control-Allow-Origin", ORIGIN)
            self.send_header("Access-Control-Allow-Headers", "Authorization, Content-Type")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Vary", "Origin")

    def do_OPTIONS(self):
        if not allowed_route("OPTIONS", self.path) or "?" in self.path or ".." in self.path or "%" in self.path:
            self.send_response(404)
            self.end_headers()
            return
        self.send_response(204)
        self.cors()
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self):
        self.forward()

    def do_POST(self):
        self.forward()

    def forward(self):
        if not allowed_route(self.command, self.path) or "?" in self.path or ".." in self.path or "%" in self.path:
            self.send_response(404)
            self.end_headers()
            return
        length = min(int(self.headers.get("Content-Length", "0")), 65536)
        body = self.rfile.read(length) if length else None
        headers = {}
        for name in ("Authorization", "Content-Type", "Accept"):
            value = self.headers.get(name)
            if value:
                headers[name] = value
        if body is not None:
            headers["Content-Length"] = str(len(body))
        connection = http.client.HTTPConnection(UPSTREAM.hostname, UPSTREAM.port or 80, timeout=15)
        try:
            connection.request(self.command, self.path, body=body, headers=headers)
            response = connection.getresponse()
            self.send_response(response.status)
            for name, value in response.getheaders():
                if name.lower() not in ("connection", "transfer-encoding", "keep-alive"):
                    self.send_header(name, value)
            self.cors()
            self.end_headers()
            first = True
            while True:
                chunk = response.read(4096)
                if not chunk:
                    break
                if first and MODE == "buffered":
                    time.sleep(0.30)
                first = False
                self.wfile.write(chunk)
                self.wfile.flush()
        finally:
            connection.close()


server = ThreadingHTTPServer(("0.0.0.0", 9443), Handler)
context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
context.load_cert_chain(certfile=CERT, keyfile=KEY)
server.socket = context.wrap_socket(server.socket, server_side=True)
server.serve_forever()
