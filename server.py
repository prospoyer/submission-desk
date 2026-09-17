#!/usr/bin/env python3
"""Submission Desk demo server. Standard library only.

  python3 server.py          # http://127.0.0.1:8400 locally
  PORT=8080 python3 server.py  # hosting platforms set PORT and it binds 0.0.0.0

Serves the Submission Desk at /desk/ (/ redirects there) with no-cache headers, and a small JSON API:

  GET  /api/health              {"ok": true}
  GET  /api/state/fortis        this visitor's saved demo progress, or {}
  PUT  /api/state/fortis        save this visitor's progress (JSON body, 64 KB max)
  POST /api/reset/fortis        clear this visitor's progress

("fortis" is only the app's internal storage key; nothing a visitor sees uses it.)

Progress is kept per visitor: each browser gets a random session cookie, so two people viewing the
same link never overwrite each other's demo.
"""
import json, os, re, secrets, sys, threading, time
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DATA = ROOT / ".data"
APPS = {"fortis"}
COOKIE = "sd_sid"
MAX_AGE = 60 * 60 * 24 * 30
LOCK = threading.Lock()
ALLOWED = re.compile(r"^/(desk|shared)(/|$)")


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(ROOT), **kw)

    def log_message(self, fmt, *args):
        sys.stderr.write("%s %s\n" % (self.address_string(), fmt % args))

    def end_headers(self):
        if not self.path.startswith("/api/"):
            self.send_header("Cache-Control", "no-cache, must-revalidate")
        if getattr(self, "_new_sid", None):
            self.send_header("Set-Cookie", f"{COOKIE}={self._new_sid}; Path=/; Max-Age={MAX_AGE}; HttpOnly; SameSite=Lax")
        super().end_headers()

    def _sid(self):
        m = re.search(COOKIE + r"=([a-f0-9]{32})", self.headers.get("Cookie") or "")
        if m:
            return m.group(1)
        self._new_sid = secrets.token_hex(16)
        return self._new_sid

    def _json(self, code, obj):
        body = json.dumps(obj).encode()
        self.send_response(code); self.send_header("Content-Type", "application/json"); self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store"); self.end_headers(); self.wfile.write(body)

    def _file(self, prefix):
        m = re.fullmatch(prefix + r"/([a-z-]+)", self.path.split("?")[0])
        if not m or m.group(1) not in APPS:
            return None
        return DATA / f"{m.group(1)}-{self._sid()}.json"

    def do_GET(self):
        path = self.path.split("?")[0]
        if path in ("/", "/index.html"):
            self.send_response(302); self.send_header("Location", "/desk/"); self.end_headers(); return
        if path == "/api/health":
            return self._json(200, {"ok": True, "apps": sorted(APPS)})
        if path.startswith("/api/state/"):
            f = self._file("/api/state")
            if not f: return self._json(404, {"error": "unknown app"})
            with LOCK:
                try: return self._json(200, json.loads(f.read_text()) if f.exists() else {})
                except (OSError, json.JSONDecodeError): return self._json(200, {})
        if not ALLOWED.match(path) or path.endswith(".py"):
            return self._json(404, {"error": "not found"})
        return super().do_GET()

    def do_PUT(self):
        f = self._file("/api/state")
        if not f: return self._json(404, {"error": "unknown app"})
        n = int(self.headers.get("Content-Length") or 0)
        if n > 64_000: return self._json(413, {"error": "state too large"})
        try: state = json.loads(self.rfile.read(n) or b"{}")
        except json.JSONDecodeError: return self._json(400, {"error": "invalid JSON"})
        if not isinstance(state, dict): return self._json(400, {"error": "state must be an object"})
        DATA.mkdir(exist_ok=True)
        with LOCK:
            tmp = f.with_suffix(".tmp"); tmp.write_text(json.dumps(state)); tmp.replace(f)
        return self._json(200, {"ok": True})

    def do_POST(self):
        f = self._file("/api/reset")
        if not f: return self._json(404, {"error": "unknown app"})
        with LOCK:
            f.unlink(missing_ok=True)
        return self._json(200, {"ok": True})


def prune():
    """Drop saved progress nobody has touched in 30 days."""
    while True:
        cutoff = time.time() - MAX_AGE
        for f in DATA.glob("*.json") if DATA.exists() else []:
            try:
                if f.stat().st_mtime < cutoff: f.unlink()
            except OSError:
                pass
        time.sleep(6 * 3600)


if __name__ == "__main__":
    port = int(os.environ.get("PORT") or (sys.argv[1] if len(sys.argv) > 1 else 8400))
    host = "0.0.0.0" if os.environ.get("PORT") else "127.0.0.1"
    threading.Thread(target=prune, daemon=True).start()
    srv = ThreadingHTTPServer((host, port), Handler)
    print(f"Submission Desk on http://{host}:{port}/desk/", flush=True)
    try: srv.serve_forever()
    except KeyboardInterrupt: pass
