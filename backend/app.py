"""
SajiloBazar backend — routes only.

Where things live:
  database.py        shared `db = SQLAlchemy()` instance
  auth.py            @login_required decorator
  models/user.py     User + password + token helpers
  models/product.py  Product
  models/cart_item.py CartItem + line_total + add_for_user
  models/order.py    Order + create_from_cart
  models/order_item.py OrderItem (a product line inside a placed order)

Swagger docs:  http://localhost:5000/docs
OpenAPI JSON:  http://localhost:5000/apispec_1.json   (import into Postman)
"""

import os
import re

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

# (name, price, category, description). The image is derived from the name:
# images/products/<slug>.svg in the frontend root.
SAMPLE_PRODUCTS = [
    ("Cotton kurta", 1450, "Clothing", "Breathable handloom cotton kurta with a mandarin collar. Easy to wash, made for everyday wear."),
    ("Dhaka topi", 650, "Clothing", "Traditional Nepali cap woven from Palpali dhaka fabric in classic red, black and orange."),
    ("Pashmina shawl", 3200, "Clothing", "Soft, warm shawl hand-loomed from Himalayan pashmina with a fringed edge."),
    ("Woolen socks", 299, "Clothing", "Hand-knitted sheep wool socks that keep your feet warm through Kathmandu winters."),
    ("Bluetooth earbuds", 2299, "Electronics", "Wireless earbuds with a pocket charging case and up to 20 hours of total playtime."),
    ("Power bank", 1799, "Electronics", "10,000 mAh power bank with USB-C fast charging, enough for two full phone charges."),
    ("USB-C cable", 349, "Electronics", "1 m braided USB-C to USB-C cable that supports fast charging and data transfer."),
    ("LED desk lamp", 1250, "Electronics", "Adjustable LED desk lamp with three brightness levels, easy on the eyes for late study."),
    ("Steel water bottle", 650, "Home", "Insulated stainless steel bottle, 750 ml. Keeps water cold for 24 hours."),
    ("Copper jug", 1150, "Home", "Hand-hammered pure copper jug, 1.5 L, for storing drinking water the traditional way."),
    ("Ceramic mug set", 899, "Home", "Set of two glazed ceramic mugs, 300 ml each. Microwave and dishwasher safe."),
    ("Cotton bedsheet", 1599, "Home", "Double bedsheet in soft printed cotton with two matching pillow covers."),
    ("Ilam green tea", 340, "Grocery", "Hand-picked green tea leaves from the hills of Ilam, 100 g. Light and fresh."),
    ("Himalayan pink salt", 180, "Grocery", "Natural rock salt from the Himalayas, 500 g jar, coarse ground."),
    ("Basmati rice", 950, "Grocery", "Long-grain aged basmati rice, 5 kg bag. Fluffy and fragrant when cooked."),
    ("Wild honey", 720, "Grocery", "Raw forest honey from Nepal's hills, 500 g. Unfiltered and unprocessed."),
    ("Canvas backpack", 1899, "Bags", "Durable canvas backpack with a padded laptop sleeve and two side pockets."),
    ("Jute tote bag", 450, "Bags", "Reusable jute tote with cotton handles, roomy enough for a full grocery run."),
    ("Leather wallet", 1199, "Bags", "Slim bifold wallet in genuine leather with six card slots and a note pocket."),
    ("Travel duffel", 2499, "Bags", "Water-resistant 40 L duffel with a shoulder strap, sized for a weekend trip."),
    ("Notebook set", 95, "Stationery", "Pack of three ruled A5 notebooks, 80 pages each."),
    ("Gel pen pack", 120, "Stationery", "Pack of five smooth-writing gel pens in assorted colours."),
    ("Lokta paper journal", 380, "Stationery", "Handmade journal of Nepali lokta paper, bound with a cloth tie."),
    ("Sketchbook A4", 290, "Stationery", "A4 spiral sketchbook with 50 sheets of heavy 160 gsm drawing paper."),
]


def _image_for(name):
    return "images/products/" + re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-") + ".svg"


def _add_missing_product_columns():
    """Add columns introduced after the products table was first created.

    db.create_all() only creates missing tables — it never alters existing
    ones — so an already-deployed database needs these added by hand.
    """
    from sqlalchemy import inspect

    existing = {c["name"] for c in inspect(db.engine).get_columns("products")}
    for column, ddl in (
        ("image_url", "VARCHAR(255)"),
        ("description", "VARCHAR(500)"),
    ):
        if column not in existing:
            db.session.execute(db.text(f"ALTER TABLE products ADD COLUMN {column} {ddl}"))
    db.session.commit()


def init_db():
    """Create missing tables and seed demo data. Safe to call repeatedly."""
    db.create_all()
    _add_missing_product_columns()

    if not User.query.filter_by(email="aarati@test.com").first():
        demo = User(name="Aarati Adhikari", email="aarati@test.com", phone="9812345678")
        demo.set_password("test1234")
        db.session.add(demo)

    for name, price, tag, description in SAMPLE_PRODUCTS:
        product = Product.query.filter_by(name=name).first()
        if not product:
            db.session.add(
                Product(
                    name=name,
                    price=price,
                    tag=tag,
                    image_url=_image_for(name),
                    description=description,
                )
            )
        else:
            # Backfill rows seeded before images/descriptions existed, without
            # touching price or anything else that may have been edited since.
            product.image_url = product.image_url or _image_for(name)
            product.description = product.description or description

    db.session.commit()


with app.app_context():
    init_db()


# ----- Auth routes ---------------------------------------------------------

AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 7  # 7 days, matches User.make_token default

EMAIL_RE = re.compile(
    r"^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+"
    r"@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?"
    r"(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$"
)


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
    if not EMAIL_RE.match(data["email"]):
        return jsonify({"error": "Invalid email format"}), 400
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
    email = (data.get("email") or "").strip()
    if not EMAIL_RE.match(email):
        return jsonify({"error": "Invalid email format"}), 400
    user = User.query.filter_by(email=email.lower()).first()
    if not user:
        return jsonify({"error": "Email not found"}), 401
    if not user.check_password(data.get("password") or ""):
        return jsonify({"error": "Incorrect password"}), 401
    token = user.make_token()
    resp = jsonify({"token": token, "user": user.to_dict()})
    return _attach_auth_cookie(resp, token)


@app.post("/logout")
@swag_from("docs/logout.yml")
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


# Longest ?q= accepted by GET /products — well past any product name.
MAX_SEARCH_LENGTH = 100


@app.get("/products")
@swag_from("docs/products.yml")
def list_products():
    """List products, optionally filtered by ?category= and/or ?q= (name or tag)."""
    query = Product.query
    category = (request.args.get("category") or "").strip()
    if category:
        query = query.filter(db.func.lower(Product.tag) == category.lower())
    term = (request.args.get("q") or "").strip()
    if term:
        if len(term) > MAX_SEARCH_LENGTH:
            return (
                jsonify(
                    {"error": f"Search must be {MAX_SEARCH_LENGTH} characters or fewer"}
                ),
                400,
            )
        # Escape LIKE wildcards so "%" or "_" in the search box match literally
        # instead of matching everything.
        escaped = term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        pattern = f"%{escaped}%"
        query = query.filter(
            db.or_(
                Product.name.ilike(pattern, escape="\\"),
                Product.tag.ilike(pattern, escape="\\"),
            )
        )
    return jsonify([p.to_dict() for p in query.order_by(Product.id).all()])


@app.get("/products/<int:product_id>")
@swag_from("docs/product_get.yml")
def get_product(product_id):
    """Fetch one product (used by the product detail page)."""
    product = db.session.get(Product, product_id)
    if not product:
        return jsonify({"error": "Product not found"}), 404
    return jsonify(product.to_dict())


# ----- Cart routes ---------------------------------------------------------


# One POST /cart may carry this many lines — enough for a whole cart at once
# without letting a single request fan out unbounded database work.
MAX_BATCH_ITEMS = 20


def _valid_quantity(value, minimum):
    """True if `value` is a real int inside [minimum, MAX_QUANTITY].

    `isinstance(True, int)` is True in Python, so bools are excluded explicitly
    — otherwise {"quantity": true} would sneak through as 1.
    """
    return (
        isinstance(value, int)
        and not isinstance(value, bool)
        and minimum <= value <= CartItem.MAX_QUANTITY
    )


@app.get("/cart")
@login_required
@swag_from("docs/cart_get.yml")
def get_cart():
    """Show my cart with line totals."""
    # order_by keeps the rows stable: without it Postgres returns updated rows
    # last, so changing a quantity would reshuffle the cart on the next load.
    items = (
        CartItem.query.filter_by(user_id=request.user.id)
        .order_by(CartItem.id)
        .all()
    )
    return jsonify(
        {
            "items": [i.to_dict() for i in items],
            "total": sum(i.line_total for i in items),
        }
    )


def _parse_cart_line(line, prefix):
    """Validate one add-to-cart line into a (product, quantity) pair.

    Returns (pair, None) or (None, (message, status)). A missing product is a
    404 like the single-item form has always answered; everything else is 400.
    `prefix` labels which batch line failed and is empty for the single form.
    """
    if not isinstance(line, dict):
        return None, (f"{prefix}must be an object", 400)

    product_id = line.get("product_id")
    if not isinstance(product_id, int) or isinstance(product_id, bool):
        return None, (f"{prefix}product_id must be an integer", 400)

    product = Product.query.get(product_id)
    if not product:
        return None, (f"{prefix}Product not found", 404)

    quantity = line.get("quantity", 1)
    if not _valid_quantity(quantity, 1):
        return None, (
            f"{prefix}Quantity must be 1-{CartItem.MAX_QUANTITY}",
            400,
        )

    return (product, quantity), None


def _cart_lines(data):
    """Split an add-to-cart body into one dict per product.

    Three accepted shapes:
      {"product_id": 1, "quantity": 2}                one product
      {"items": [{...}, {...}]}                       a list of lines
      {"product_id": [15, 13], "quantity": [3, 4]}    parallel lists, paired
                                                      up by position

    Returns (lines, label, error). `label` is a format string that prefixes an
    error with the index that failed; it is None for the single form, which
    keeps its historical unprefixed messages, and doubles as the "answer with a
    list" flag. `error` is (message, status) or None.
    """
    if "items" in data:
        lines = data["items"]
        if not isinstance(lines, list) or not lines:
            return None, None, ("items must be a non-empty list", 400)
        return lines, "items[{}]: ", None

    product_ids = data.get("product_id")
    if isinstance(product_ids, list):
        if not product_ids:
            return None, None, ("product_id list must not be empty", 400)

        # quantity may be omitted, given once for every product, or given as a
        # list paired with product_id by position.
        quantities = data.get("quantity", 1)
        if isinstance(quantities, list):
            # Zipping to the shorter list would silently pair quantities with
            # the wrong products, so a mismatch has to be an error.
            if len(quantities) != len(product_ids):
                return (
                    None,
                    None,
                    (
                        "product_id and quantity must be lists of the same "
                        f"length ({len(product_ids)} vs {len(quantities)})",
                        400,
                    ),
                )
        else:
            quantities = [quantities] * len(product_ids)

        lines = [
            {"product_id": product_id, "quantity": quantity}
            for product_id, quantity in zip(product_ids, quantities)
        ]
        # "index N: " rather than "product_id[N]: " — the latter stutters in
        # front of the "product_id must be an integer" message.
        return lines, "index {}: ", None

    return [data], None, None


@app.post("/cart")
@login_required
@swag_from("docs/cart_add.yml")
def add_to_cart():
    """Add one product — or a batch of them — to my cart (max 10 units each)."""
    data = request.get_json() or {}

    lines, label, err = _cart_lines(data)
    if err:
        message, status = err
        return jsonify({"error": message}), status

    batch = label is not None
    if batch and len(lines) > MAX_BATCH_ITEMS:
        return (
            jsonify({"error": f"At most {MAX_BATCH_ITEMS} items per request"}),
            400,
        )

    # Validate every line before touching the cart: a batch that fails halfway
    # through would leave the user with a partly-applied order.
    pairs = []
    for index, line in enumerate(lines):
        pair, err = _parse_cart_line(line, label.format(index) if batch else "")
        if err:
            message, status = err
            return jsonify({"error": message}), status
        pairs.append(pair)

    items, err = CartItem.add_many_for_user(request.user.id, pairs)
    if err:
        return jsonify({"error": err}), 400

    if batch:
        # Repeated products are merged, so this list can be shorter than the
        # request — one row per distinct product.
        return jsonify({"items": [i.to_dict() for i in items]}), 201
    return jsonify(items[0].to_dict()), 201


@app.patch("/cart/<int:item_id>")
@login_required
@swag_from("docs/cart_update.yml")
def update_cart_item(item_id):
    """Set the exact quantity for one cart item (0 removes it)."""
    data = request.get_json() or {}
    # Ownership first: a bad quantity on someone else's item_id must still
    # read as 404, not 400 — a 400 would confirm that the row exists.
    item = CartItem.query.filter_by(id=item_id, user_id=request.user.id).first()
    if not item:
        return jsonify({"error": "Item not found"}), 404

    qty = data.get("quantity")
    if not _valid_quantity(qty, 0):
        return jsonify({"error": f"Quantity must be 0-{CartItem.MAX_QUANTITY}"}), 400

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
@swag_from("docs/orders_get.yml")
def get_order(order_id):
    """Fetch a single order (must belong to the current user)."""
    order = Order.query.filter_by(id=order_id, user_id=request.user.id).first()
    if not order:
        return jsonify({"error": "Order not found"}), 404
    return jsonify(order.to_dict())


@app.delete("/orders/<int:order_id>")
@login_required
@swag_from("docs/orders_delete.yml")
def delete_order(order_id):
    """Delete one of my orders, with its items."""
    order = Order.query.filter_by(id=order_id, user_id=request.user.id).first()
    if not order:
        return jsonify({"error": "Order not found"}), 404
    db.session.delete(order)
    db.session.commit()
    return "", 204


# ----- `flask seed` --------------------------------------------------------


@app.cli.command("seed")
def seed():
    """Manually re-run the auto-seed (usually not needed — startup does it)."""
    init_db()
    print("Seed complete. Demo login: aarati@test.com / test1234")


@app.cli.command("export-docs")
def export_docs():
    """Write the OpenAPI spec to api-docs/openapi.json for the static docs page.

    Run this after editing any file in docs/, then commit the result. The page
    at api-docs/index.html reads it, so the docs can be shared from the live
    site without anyone running the backend.
    """
    import json

    spec = app.test_client().get("/apispec_1.json").get_json()
    spec["info"]["description"] = (
        "REST API for SajiloBazar, a practice shop for QA testing. "
        "Log in with POST /login (demo: aarati@test.com / test1234); the "
        "browser then sends the auth cookie automatically, or click "
        "Authorize and paste: Bearer YOUR_TOKEN."
    )
    # Show sections in the order a shopper uses them.
    spec["tags"] = [
        {"name": "Auth", "description": "Register, log in and out, who am I"},
        {"name": "Products", "description": "Browse, search and filter the catalogue"},
        {"name": "Cart", "description": "Add, change and remove cart items"},
        {"name": "Orders", "description": "Place, list, view and delete orders"},
    ]
    out = os.path.join(os.path.dirname(__file__), "..", "api-docs", "openapi.json")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w") as f:
        json.dump(spec, f, indent=2, sort_keys=True)
        f.write("\n")
    print(f"Wrote {os.path.normpath(out)} ({len(spec.get('paths', {}))} paths)")


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
