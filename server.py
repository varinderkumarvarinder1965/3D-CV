#!/usr/bin/env python3
"""Serve this portfolio site and proxy API calls to a local Ollama server.

Usage:
    python3 server.py
    python3 server.py --port 8080

Then open http://localhost:8080 in the browser. The chatbot calls the
same-origin /api/chat endpoint, which this script forwards to Ollama. This
avoids browser CORS restrictions when using the site locally.
"""

import argparse
import json
import os
import urllib.error
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

BASE_DIR = Path(__file__).resolve().parent

OLLAMA_HOST = os.environ.get("OLLAMA_HOST", "http://127.0.0.1:11434").strip()
if not OLLAMA_HOST.startswith(("http://", "https://")):
    OLLAMA_HOST = "http://" + OLLAMA_HOST
OLLAMA_BASE = OLLAMA_HOST.rstrip("/")


class PortfolioHandler(SimpleHTTPRequestHandler):
    server_version = "PortfolioOllama/1.0"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(BASE_DIR), **kwargs)

    def _is_api_path(self):
        path = urlsplit(self.path).path
        return path == "/api" or path.startswith("/api/")

    def end_headers(self):
        if self._is_api_path():
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
        super().end_headers()

    def do_OPTIONS(self):
        if self._is_api_path():
            self.send_response(204)
            self.send_header("Content-Length", "0")
            self.end_headers()
        else:
            self.send_error(404)

    def do_GET(self):
        if self._is_api_path():
            self._proxy("GET")
        else:
            super().do_GET()

    def do_POST(self):
        if self._is_api_path():
            self._proxy("POST")
        else:
            self.send_error(404, "Only API routes accept POST")

    def _proxy(self, method):
        target = OLLAMA_BASE + self.path
        length = int(self.headers.get("Content-Length") or 0)
        body = self.rfile.read(length) if length else None

        headers = {}
        content_type = self.headers.get("Content-Type")
        if content_type:
            headers["Content-Type"] = content_type

        request = urllib.request.Request(target, data=body, headers=headers, method=method)

        try:
            with urllib.request.urlopen(request, timeout=600) as upstream:
                self.send_response(upstream.status)
                self.send_header(
                    "Content-Type",
                    upstream.headers.get("Content-Type", "application/x-ndjson"),
                )
                self.send_header("Cache-Control", "no-cache, no-store")
                self.send_header("X-Accel-Buffering", "no")
                self.end_headers()

                try:
                    while True:
                        chunk = upstream.read(4096)
                        if not chunk:
                            break
                        self.wfile.write(chunk)
                        self.wfile.flush()
                except (BrokenPipeError, ConnectionResetError):
                    return
        except urllib.error.HTTPError as error:
            data = error.read()
            self.send_response(error.code)
            self.send_header("Content-Type", error.headers.get("Content-Type", "application/json"))
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
        except (urllib.error.URLError, OSError) as error:
            message = f"Cannot reach Ollama at {OLLAMA_BASE}: {error}"
            data = json.dumps({"error": message}).encode("utf-8")
            self.send_response(502)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)


class PortfolioServer(ThreadingHTTPServer):
    daemon_threads = True


def main():
    parser = argparse.ArgumentParser(description="Serve the portfolio and proxy Ollama.")
    parser.add_argument("--host", default="127.0.0.1", help="Bind address (default: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=8080, help="Port to listen on (default: 8080)")
    args = parser.parse_args()

    server = PortfolioServer((args.host, args.port), PortfolioHandler)
    print(f"Portfolio: http://{args.host}:{args.port}")
    print(f"Ollama proxy target: {OLLAMA_BASE}")
    print("Press Ctrl+C to stop.")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
