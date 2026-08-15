"""Auth decorator used by routes that need a logged-in user."""

from functools import wraps

from flask import jsonify, request

from models import User


def login_required(view):
    """Require `Authorization: Bearer <token>`. Attaches `request.user`."""

    @wraps(view)
    def wrapper(*args, **kwargs):
        header = request.headers.get("Authorization", "")
        if not header.startswith("Bearer "):
            return jsonify({"error": "Login required"}), 401
        user = User.from_token(header[len("Bearer ") :])
        if not user:
            return jsonify({"error": "Invalid or expired token"}), 401
        request.user = user
        return view(*args, **kwargs)

    return wrapper
