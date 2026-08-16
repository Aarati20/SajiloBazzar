"""Auth decorator used by routes that need a logged-in user."""

from functools import wraps

from flask import jsonify, request

from models import User

AUTH_COOKIE = "sajilo-token"


def _extract_token():
    """Prefer HttpOnly cookie; fall back to Authorization header for legacy callers."""
    cookie = request.cookies.get(AUTH_COOKIE)
    if cookie:
        return cookie
    header = request.headers.get("Authorization", "")
    if header.startswith("Bearer "):
        return header[len("Bearer ") :]
    return None


def login_required(view):
    """Require an auth cookie (or Bearer token). Attaches `request.user`."""

    @wraps(view)
    def wrapper(*args, **kwargs):
        token = _extract_token()
        if not token:
            return jsonify({"error": "Login required"}), 401
        user = User.from_token(token)
        if not user:
            return jsonify({"error": "Invalid or expired token"}), 401
        request.user = user
        return view(*args, **kwargs)

    return wrapper
