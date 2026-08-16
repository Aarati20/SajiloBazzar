"""
Vercel serverless entrypoint.

Vercel routes any request that hits `/api/...` here (see vercel.json).
This file:
  1. Makes backend/ importable
  2. Imports the Flask app
  3. Strips the /api prefix at the WSGI layer so Flask's routes stay clean
     (/login, /products, ...) — same code works locally at http://127.0.0.1:5000
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app import app  # noqa: E402  (import after sys.path tweak)

_flask_wsgi = app.wsgi_app


def _strip_api_prefix(environ, start_response):
    path = environ.get("PATH_INFO", "")
    if path == "/api" or path.startswith("/api/"):
        environ["SCRIPT_NAME"] = environ.get("SCRIPT_NAME", "") + "/api"
        environ["PATH_INFO"] = path[4:] or "/"
    return _flask_wsgi(environ, start_response)


app.wsgi_app = _strip_api_prefix
