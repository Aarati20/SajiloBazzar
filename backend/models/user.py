"""User model — one row per registered shopper.

Password hashing and JWT helpers live here so `app.py` can just call
`user.check_password(...)` and `user.make_token()`.
"""

from datetime import datetime, timedelta, timezone

import jwt
from flask import current_app
from werkzeug.security import check_password_hash, generate_password_hash

from database import db


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    phone = db.Column(db.String(10), nullable=False)
    password = db.Column(db.String(255), nullable=False)  # stored hash

    # ---- password helpers ----

    def set_password(self, raw_password):
        """Hash and store a plain-text password."""
        self.password = generate_password_hash(raw_password)

    def check_password(self, raw_password):
        """Return True if the given plain-text password matches the stored hash."""
        return check_password_hash(self.password, raw_password)

    # ---- token helpers ----

    def make_token(self, hours=24):
        """Sign and return a JWT for this user (default expiry: 24 hours)."""
        payload = {
            "user_id": self.id,
            "exp": datetime.now(timezone.utc) + timedelta(hours=hours),
        }
        return jwt.encode(payload, current_app.config["SECRET_KEY"], algorithm="HS256")

    @staticmethod
    def from_token(token):
        """Look up the user for a JWT. Returns None if the token is bad/expired."""
        try:
            data = jwt.decode(
                token, current_app.config["SECRET_KEY"], algorithms=["HS256"]
            )
        except jwt.PyJWTError:
            return None
        return User.query.get(data.get("user_id"))

    # ---- serialisation ----

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "phone": self.phone,
        }
