"""
Greens ACC development server.
- Serves dist/ static files
- Proxies POST /supabase/functions/{name} → SUPABASE_URL/functions/v1/{name}
- GET  /api/supabase-config   → {"url": ..., "anonKey": ...}
- GET  /api/system-status     → {"status": "ok", "supabase_configured": bool}
- GET  /api/pin/status        → {"pin_required": bool}
- POST /api/pin/validate      → {"valid": bool}  (body: {"pin": "123456"})

Environment variables:
  SUPABASE_URL              e.g. https://xxxxxxxxxxxx.supabase.co
  SUPABASE_ANON_KEY         public anon key (safe to expose to browser)
  SUPABASE_SERVICE_ROLE_KEY service-role key (used only server-side for function proxying)
  ACCESS_PIN                6-digit numeric PIN to gate the dashboard (optional; if unset a PIN
                            is auto-generated and printed to stdout on startup)
  PORT                      (optional, default 5000)
"""
import hmac
import json
import os
import pathlib
import secrets
import urllib.error
import urllib.request
from http.server import HTTPServer, SimpleHTTPRequestHandler

SUPABASE_URL      = os.environ.get('SUPABASE_URL', '').rstrip('/')
SUPABASE_ANON_KEY = os.environ.get('SUPABASE_ANON_KEY', '')
SERVICE_ROLE_KEY  = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')
DIST_DIR          = str(pathlib.Path(__file__).parent.parent / 'dist')
PORT              = int(os.environ.get('PORT', 5000))

# ── PIN access gate ───────────────────────────────────────────────────────────
_env_pin = os.environ.get('ACCESS_PIN', '').strip()
if _env_pin:
    ACCESS_PIN: str = _env_pin
else:
    ACCESS_PIN = ''.join([str(secrets.randbelow(10)) for _ in range(6)])
    print(f'[Greens ACC] No ACCESS_PIN set — generated PIN: {ACCESS_PIN}')
PIN_REQUIRED: bool = True  # always enforce the gate; set ACCESS_PIN env to fix the PIN


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIST_DIR, **kwargs)

    def log_message(self, fmt, *args):
        pass  # suppress default access-log noise; errors still reach stderr

    # ── CORS pre-flight ──────────────────────────────────────────────────────
    def do_OPTIONS(self):
        self.send_response(204)
        self._add_cors()
        self.end_headers()

    # ── GET routes ───────────────────────────────────────────────────────────
    def do_GET(self):
        if self.path == '/api/supabase-config':
            self._json(200, {'url': SUPABASE_URL, 'anonKey': SUPABASE_ANON_KEY})
        elif self.path == '/api/system-status':
            self._json(200, {
                'status': 'ok',
                'supabase_configured': bool(SUPABASE_URL and SERVICE_ROLE_KEY),
            })
        elif self.path == '/api/pin/status':
            self._json(200, {'pin_required': PIN_REQUIRED})
        else:
            super().do_GET()

    # ── POST routes ──────────────────────────────────────────────────────────
    def do_POST(self):
        if self.path == '/api/pin/validate':
            self._validate_pin()
        elif self.path.startswith('/supabase/functions/'):
            func_name = self.path[len('/supabase/functions/'):].split('?')[0].rstrip('/')
            self._proxy(func_name)
        else:
            self.send_error(404, 'Not Found')

    # ── PIN validation ───────────────────────────────────────────────────────
    def _validate_pin(self):
        length = int(self.headers.get('Content-Length', 0))
        body   = self.rfile.read(length) if length > 0 else b'{}'
        try:
            payload = json.loads(body)
        except (ValueError, KeyError):
            self._json(400, {'error': 'Invalid JSON'})
            return
        entered = str(payload.get('pin', '')).strip()
        # constant-time comparison to prevent timing attacks
        valid = hmac.compare_digest(entered, ACCESS_PIN)
        self._json(200, {'valid': valid})

    # ── Proxy to Supabase Edge Functions ─────────────────────────────────────
    def _proxy(self, name):
        if not SUPABASE_URL or not SERVICE_ROLE_KEY:
            self._json(503, {
                'error': (
                    'Supabase is not configured. '
                    'Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.'
                )
            })
            return

        length = int(self.headers.get('Content-Length', 0))
        body   = self.rfile.read(length) if length > 0 else b''
        target = f'{SUPABASE_URL}/functions/v1/{name}'

        req = urllib.request.Request(
            target,
            data=body,
            method='POST',
            headers={
                'Content-Type':  'application/json',
                'Authorization': f'Bearer {SERVICE_ROLE_KEY}',
                'apikey':        SERVICE_ROLE_KEY,
            },
        )
        try:
            with urllib.request.urlopen(req) as resp:
                self._raw(resp.status, resp.read())
        except urllib.error.HTTPError as exc:
            self._raw(exc.code, exc.read())

    # ── Response helpers ─────────────────────────────────────────────────────
    def _json(self, code, data):
        body = json.dumps(data).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self._add_cors()
        self.end_headers()
        self.wfile.write(body)

    def _raw(self, code, body):
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self._add_cors()
        self.end_headers()
        self.wfile.write(body)

    def _add_cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey')


if __name__ == '__main__':
    print(f'Greens ACC dev server → http://localhost:{PORT}  (dist: {DIST_DIR})')
    print(f'Supabase: {"configured ✓" if SUPABASE_URL else "NOT configured — set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY"}')
    print(f'PIN gate: {"active — ACCESS_PIN env is set" if _env_pin else f"active — auto-generated PIN is {ACCESS_PIN}"}')
    HTTPServer(('', PORT), Handler).serve_forever()
