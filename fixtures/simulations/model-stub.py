import json
import os
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer


QUALIFICATION = "HERMES_STREAM_QUALIFICATION_V1"
DELAY_SECONDS = max(0.0, min(float(os.environ.get("MODEL_STUB_DELAY_MS", "250")) / 1000.0, 30.0))


def is_qualification(payload):
    if payload.get("model") != "hermes-agent" or payload.get("stream") is not True:
        return False
    for message in payload.get("messages", []):
        if message.get("role") != "user":
            continue
        content = message.get("content")
        if content == QUALIFICATION:
            return True
        if isinstance(content, list) and any(part.get("type") == "text" and part.get("text") == QUALIFICATION for part in content if isinstance(part, dict)):
            return True
    return False


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, _format, *_args):
        return

    def send_body(self, status, body, content_type="application/json"):
        encoded = body.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(encoded)))
        self.send_header("Connection", "close")
        self.end_headers()
        self.wfile.write(encoded)

    def do_GET(self):
        if self.path == "/health":
            self.send_body(200, '{"status":"ok"}')
        elif self.path == "/v1/models":
            self.send_body(200, '{"object":"list","data":[{"id":"hermes-agent","object":"model"}]}')
        else:
            self.send_body(404, "{}")

    def do_POST(self):
        if self.path != "/v1/chat/completions":
            self.send_body(404, "{}")
            return
        try:
            length = min(int(self.headers.get("Content-Length", "0")), 1024 * 1024)
            payload = json.loads(self.rfile.read(length))
        except (ValueError, json.JSONDecodeError):
            self.send_body(400, "{}")
            return
        if not is_qualification(payload):
            self.send_body(400, "{}")
            return
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Connection", "close")
        self.end_headers()
        first = {"id": "chatcmpl-fixture", "object": "chat.completion.chunk", "created": 0, "model": "hermes-agent", "choices": [{"index": 0, "delta": {"role": "assistant", "content": "alpha"}, "finish_reason": None}]}
        second = {"id": "chatcmpl-fixture", "object": "chat.completion.chunk", "created": 0, "model": "hermes-agent", "choices": [{"index": 0, "delta": {"content": "beta"}, "finish_reason": "stop"}]}
        self.wfile.write(f"data: {json.dumps(first, separators=(',', ':'))}\n\n".encode())
        self.wfile.flush()
        time.sleep(DELAY_SECONDS)
        self.wfile.write(f"data: {json.dumps(second, separators=(',', ':'))}\n\ndata: [DONE]\n\n".encode())
        self.wfile.flush()


ThreadingHTTPServer(("0.0.0.0", 8000), Handler).serve_forever()
