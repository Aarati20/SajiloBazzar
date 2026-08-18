"""
SajiloBazar backend — routes only.

Where things live:
  database.py        shared `db = SQLAlchemy()` instance
  auth.py            @login_required decorator
  models/user.py     User + password + token helpers
  models/product.py  Product
  models/cart_item.py CartItem + line_total + add_for_user
  models/order.py    Order + create_from_cart

Swagger docs:  http://localhost:5000/docs
OpenAPI JSON:  http://localhost:5000/apispec_1.json   (import into Postman)
"""

import os

from dotenv import load_dotenv
from flasgger import Swagger, swag_from
from flask import Flask, jsonify, request
from flask_cors import CORS

from auth import AUTH_COOKIE, login_required
from database import db
from models import CartItem, Order, Product, User

load_dotenv()

# ----- Setup ---------------------------------------------------------------

app = Flask(__name__)

# Local dev: SQLite file next to app.py — zero setup.
# Vercel / prod: set DATABASE_URL env var (Neon / Vercel Postgres etc).
# Vercel's filesystem is read-only outside /tmp, so SQLite there is fatal —
# fail fast with a clear message instead of the generic "A server error has occurred".
IS_VERCEL = bool(os.getenv("VERCEL"))
DB_PATH = os.path.join(os.path.dirname(__file__), "sajilobazar.db")
db_url = os.getenv("DATABASE_URL")
if not db_url:
    if IS_VERCEL:
        raise RuntimeError(
            "DATABASE_URL is not set. On Vercel you must configure a Postgres "
            "database (Neon or Vercel Postgres) and expose its connection "
            "string as the DATABASE_URL environment variable."
        )
    db_url = f"sqlite:///{DB_PATH}"

# Neon / Heroku give you postgres:// — SQLAlchemy 2 wants postgresql://
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

app.config["SQLALCHEMY_DATABASE_URI"] = db_url
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "change-me-in-production")

# Serverless-friendly pool settings for Postgres: recycle stale connections and
# check them before use so cold-started functions don't hit dead sockets.
if db_url.startswith("postgresql"):
    app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
        "pool_pre_ping": True,
        "pool_recycle": 300,
    }

print(f" * Database: {app.config['SQLALCHEMY_DATABASE_URI']}")

db.init_app(app)

# Auth is now a cookie, so browsers must send credentials cross-origin.
# supports_credentials=True forbids "*" as Access-Control-Allow-Origin, so we
# whitelist local static-server ports and honour ALLOWED_ORIGINS in prod.
_default_origins = [
    "http://127.0.0.1:8000",
    "http://localhost:8000",
    "http://127.0.0.1:5500",  # VS Code Live Server
    "http://localhost:5500",
]
_extra = os.getenv("ALLOWED_ORIGINS", "")
allowed_origins = _default_origins + [o.strip() for o in _extra.split(",") if o.strip()]
CORS(app, supports_credentials=True, origins=allowed_origins)

Swagger(
    app,
    template={
        "swagger": "2.0",
        "info": {"title": "SajiloBazar API", "version": "1.0"},
        "securityDefinitions": {
            "Bearer": {
                "type": "apiKey",
                "name": "Authorization",
                "in": "header",
                "description": "Type: Bearer <your-token-from-login>",
            }
        },
    },
    config={
        "headers": [],
        "specs": [{"endpoint": "apispec_1", "route": "/apispec_1.json"}],
        "static_url_path": "/flasgger_static",
        "swagger_ui": True,
        "specs_route": "/docs",
    },
)


# ----- Auto-create tables + seed on first startup --------------------------

SAMPLE_PRODUCTS = [
    ("Cotton kurta", 1450, "Clothing"),
    ("Bluetooth earbuds", 2299, "Electronics"),
    ("Steel water bottle", 650, "Home"),
    ("Ilam green tea", 340, "Grocery"),
    ("Canvas backpack", 1899, "Bags"),
    ("Notebook set", 95, "Stationery"),
]


def init_db():
    """Create missing tables and seed demo data. Safe to call repeatedly."""
    db.create_all()

    if not User.query.filter_by(email="aarati@test.com").first():
        demo = User(name="Aarati Adhikari", email="aarati@test.com", phone="9812345678")
        demo.set_password("test1234")
        db.session.add(demo)

    for name, price, tag in SAMPLE_PRODUCTS:
        if not Product.query.filter_by(name=name).first():
            db.session.add(Product(name=name, price=price, tag=tag))

    db.session.commit()


with app.app_context():
    init_db()


# ----- Auth routes ---------------------------------------------------------

AUTH_COOKIE_MAX_AGE = 60 * 60 * 24  # 24h, matches User.make_token default


def _attach_auth_cookie(resp, token):
    """Set the auth JWT as an HttpOnly cookie so JS can never read it.
    Secure only in HTTPS (Vercel); SameSite=Lax handles same-site cross-port.
    """
    resp.set_cookie(
        AUTH_COOKIE,
        token,
        max_age=AUTH_COOKIE_MAX_AGE,
        httponly=True,
        secure=IS_VERCEL,
        samesite="Lax",
        path="/",
    )
    return resp


@app.post("/register")
@swag_from("docs/register.yml")
def register():
    """Create a new user account."""
    data = request.get_json() or {}
    for field in ("name", "email", "phone", "password"):
        if not data.get(field):
            return jsonify({"error": f"{field} is required"}), 400
    if len(data["phone"]) != 10 or not data["phone"].isdigit():
        return jsonify({"error": "Phone must be exactly 10 digits"}), 400
    if len(data["password"]) < 8:
        return jsonify({"error": "Password must be at least 8 characters"}), 400

    email = data["email"].lower()
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already registered"}), 400

    user = User(name=data["name"], email=email, phone=data["phone"])
    user.set_password(data["password"])
    db.session.add(user)
    db.session.commit()
    # Intentionally do NOT set the auth cookie here: the intended flow is
    # register → login (with confirmation banner) → shop, not auto-login.
    # The token is still returned in the JSON body for API consumers that
    # want to log in immediately without a second request.
    return jsonify({"token": user.make_token(), "user": user.to_dict()}), 201


@app.post("/login")
@swag_from("docs/login.yml")
def login():
    """Log in and get a JWT."""
    data = request.get_json() or {}
    user = User.query.filter_by(email=(data.get("email") or "").lower()).first()
    if not user:
        return jsonify({"error": "Email not found"}), 401
    if not user.check_password(data.get("password") or ""):
        return jsonify({"error": "Incorrect password"}), 401
    token = user.make_token()
    resp = jsonify({"token": token, "user": user.to_dict()})
    return _attach_auth_cookie(resp, token)


@app.post("/logout")
def logout():
    """Clear the auth cookie."""
    resp = jsonify({"ok": True})
    resp.delete_cookie(AUTH_COOKIE, path="/")
    return resp


@app.get("/me")
@login_required
@swag_from("docs/me.yml")
def me():
    """Return the current logged-in user."""
    return jsonify(request.user.to_dict())


# ----- Product routes ------------------------------------------------------


@app.get("/products")
@swag_from("docs/products.yml")
def list_products():
    """List all products in the shop."""
    return jsonify([p.to_dict() for p in Product.query.order_by(Product.id).all()])


# ----- Cart routes ---------------------------------------------------------


@app.get("/cart")
@login_required
@swag_from("docs/cart_get.yml")
def get_cart():
    """Show my cart with line totals."""
    items = CartItem.query.filter_by(user_id=request.user.id).all()
    return jsonify(
        {
            "items": [i.to_dict() for i in items],
            "total": sum(i.line_total for i in items),
        }
    )


@app.post("/cart")
@login_required
@swag_from("docs/cart_add.yml")
def add_to_cart():
    """Add a product to my cart (max 10 units per product)."""
    data = request.get_json() or {}
    product = Product.query.get(data.get("product_id"))
    if not product:
        return jsonify({"error": "Product not found"}), 404

    item, err = CartItem.add_for_user(
        request.user.id, product, int(data.get("quantity", 1))
    )
    if err:
        return jsonify({"error": err}), 400
    return jsonify(item.to_dict()), 201


@app.patch("/cart/<int:item_id>")
@login_required
@swag_from("docs/cart_update.yml")
def update_cart_item(item_id):
    """Set the exact quantity for one cart item (0 removes it)."""
    data = request.get_json() or {}
    qty = data.get("quantity")
    if not isinstance(qty, int) or qty < 0 or qty > CartItem.MAX_QUANTITY:
        return jsonify({"error": f"Quantity must be 0-{CartItem.MAX_QUANTITY}"}), 400

    item = CartItem.query.filter_by(id=item_id, user_id=request.user.id).first()
    if not item:
        return jsonify({"error": "Item not found"}), 404

    if qty == 0:
        db.session.delete(item)
        db.session.commit()
        return "", 204

    item.quantity = qty
    db.session.commit()
    return jsonify(item.to_dict())


@app.delete("/cart/<int:item_id>")
@login_required
@swag_from("docs/cart_remove.yml")
def remove_cart_item(item_id):
    """Remove one item from my cart."""
    item = CartItem.query.filter_by(id=item_id, user_id=request.user.id).first()
    if not item:
        return jsonify({"error": "Item not found"}), 404
    db.session.delete(item)
    db.session.commit()
    return "", 204


# ----- Order routes --------------------------------------------------------


@app.post("/orders")
@login_required
@swag_from("docs/orders_create.yml")
def place_order():
    """Place an order from the cart (min Rs 100)."""
    data = request.get_json() or {}
    order, err = Order.create_from_cart(
        user_id=request.user.id,
        address=data.get("address"),
        payment_method=data.get("payment_method"),
    )
    if err:
        return jsonify({"error": err}), 400
    return jsonify(order.to_dict()), 201


@app.get("/orders")
@login_required
@swag_from("docs/orders_list.yml")
def my_orders():
    """List my past orders (newest first)."""
    rows = (
        Order.query.filter_by(user_id=request.user.id)
        .order_by(Order.created_at.desc())
        .all()
    )
    return jsonify([o.to_dict() for o in rows])


@app.get("/orders/<int:order_id>")
@login_required
def get_order(order_id):
    """Fetch a single order (must belong to the current user)."""
    order = Order.query.filter_by(id=order_id, user_id=request.user.id).first()
    if not order:
        return jsonify({"error": "Order not found"}), 404
    return jsonify(order.to_dict())


# ----- `flask seed` --------------------------------------------------------


@app.cli.command("seed")
def seed():
    """Manually re-run the auto-seed (usually not needed — startup does it)."""
    init_db()
    print("Seed complete. Demo login: aarati@test.com / test1234")


@app.cli.command("tables")
def tables():
    """List every table with its row count and a few sample rows."""
    from sqlalchemy import inspect

    print(f"DB: {app.config['SQLALCHEMY_DATABASE_URI']}\n")
    inspector = inspect(db.engine)
    for name in inspector.get_table_names():
        cols = [c["name"] for c in inspector.get_columns(name)]
        rows = db.session.execute(
            db.text(f"SELECT * FROM {name} LIMIT 3")
        ).fetchall()
        count = db.session.execute(
            db.text(f"SELECT COUNT(*) FROM {name}")
        ).scalar()
        print(f"[{name}]  rows={count}  columns={cols}")
        for r in rows:
            print(f"  {dict(r._mapping)}")
        print()


if __name__ == "__main__":
    app.run(debug=True, port=5000)
