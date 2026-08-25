SAJILOBAZAR: QA PRACTICE SHOP (multi-page version)

Live site: https://sajilo-bazzar.vercel.app/login.html
  Frontend static files:       served by Vercel from repo root
  Backend Flask API:           served by Vercel serverless (api/index.py) at /api/*
  Database:                    Neon Postgres (or Vercel Postgres) via DATABASE_URL env var

How to run:
  1. Start the backend (see BACKEND section below):
       cd backend && flask run --debug --port 5000
  2. In a SECOND terminal, serve the frontend so the browser can talk to the API
     (opening the HTML as a file:// URL will trip CORS):
       cd /path/to/SajiloBazzar
       python3 -m http.server 8000
  3. Open http://localhost:8000/login.html
  4. Log in with the demo account below.

All data now comes from the Flask + SQLite backend. The frontend uses zero
localStorage for app data. Auth lives in an HttpOnly cookie (`sajilo-token`)
set by /login and /register — visible in DevTools → Application → Cookies,
not readable from JavaScript. Every fetch runs with `credentials: 'include'`
so the cookie flows to the API automatically.

Registration flow: register → login (with "Account created — please log in."
banner, driven by ?registered=1 in the URL) → shop → cart → checkout → pay
(for wallet flows, method + address passed as URL params, not localStorage)
→ done?id=<order_id> (which fetches the order from GET /orders/<id>).

Deployment: every push to main is deployed to Vercel automatically by the
GitHub Actions workflow at .github/workflows/deploy.yml. Vercel serves the
static frontend AND runs the Flask API as a Python serverless function
(see api/index.py, vercel.json). See "Deploying to Vercel" below for the
one-time DB setup.

Demo account: aarati@test.com / test1234
Test wallet: 9812345678, MPIN 1234

Files:
  index.html      redirects to the login page
  login.html      + login.js
  register.html   + register.js
  shop.html       + shop.js
  cart.html       + cart.js
  checkout.html   + checkout.js
  pay.html        + pay.js
  done.html       + done.js
  orders.html     + orders.js
  api.js          fetch helper — sends the auth cookie via credentials:'include'
  common.js       header, toast, requirements drawer, login guard
                  (probes /me to decide "am I logged in?" since the cookie
                  is HttpOnly and can't be read from JS)
  styles.css      the only stylesheet

Click the Requirements button in the header to see the 23 rules (FR-1 to FR-22, NFR-1).
Test the app against them. The app contains planted bugs: find them, reproduce them,
and report them with steps, expected result and actual result.

To reset the frontend session: click Log out in the header (calls POST /logout
which clears the auth cookie), or delete the `sajilo-token` cookie via
DevTools → Application → Cookies, then reload. Data lives in the database —
to reset that, see the BACKEND section.


================================================================================
BACKEND (Python Flask + SQLite + Swagger)
================================================================================

A small REST API lives in the backend/ directory. Everything a beginner needs
to read is in one app.py + one file per model. No Docker, no external database
— the DB is a single SQLite file (backend/sajilobazar.db) created on first run.

Stack
-----
  - Flask 3                    web framework
  - Flask-SQLAlchemy           ORM on top of SQLAlchemy 2
  - SQLite                     database — one file, no server, built into Python
  - flasgger                   auto-generated Swagger UI at /docs
  - PyJWT                      JWT auth (24h expiry). Sent as an HttpOnly
                               cookie by default; legacy Authorization:
                               Bearer header is still accepted as a fallback.
  - werkzeug.security          password hashing (pbkdf2)
  - Flask-Cors                 lets the static frontend call the API
                               (supports_credentials=True so the auth cookie
                                flows cross-port during local dev)
  - python-dotenv              loads .env

--------------------------------------------------------------------------------
Quick start — after `git pull`
--------------------------------------------------------------------------------

    cd backend
    python3 -m venv .venv
    source .venv/bin/activate
    pip install -r requirements.txt
    flask run --debug --port 5000

Four commands. That's it. No Docker, no database install, no .env needed.

On the FIRST start `flask run` will automatically:
  * create backend/sajilobazar.db
  * create the 4 tables (users, products, cart_items, orders)
  * insert the 6 sample products
  * create the demo user  (aarati@test.com / test1234)

The auto-init is idempotent — every subsequent start is a no-op if the rows
already exist. See `init_db()` in backend/app.py.

The startup line prints the DB path:
  * Database: sqlite:////.../backend/sajilobazar.db

Demo login (auto-seeded):
  email:    aarati@test.com
  password: test1234

--------------------------------------------------------------------------------
Environment variables (.env)
--------------------------------------------------------------------------------

.env is optional. Defaults work without it.

  SECRET_KEY       Key used to sign JWTs. Change in production.
  DATABASE_URL     Postgres connection string. Required on Vercel; local dev
                   falls back to SQLite when unset.
  ALLOWED_ORIGINS  Comma-separated CORS origins allowed to send the auth
                   cookie. Local dev defaults (127.0.0.1:8000, localhost:8000,
                   :5500) are always included; add your prod URL here.
  FLASK_APP        app.py (set so `flask run` finds it)
  FLASK_DEBUG      1 = auto-reload on file changes

--------------------------------------------------------------------------------
Swagger UI  →  http://localhost:5000/docs
--------------------------------------------------------------------------------

  1. Expand POST /login, click "Try it out", Execute.
  2. Copy the `token` value from the response.
  3. Click the green "Authorize" button at the top of the page.
  4. Paste:  Bearer <paste-the-token-here>
  5. Every secured endpoint (/me, /cart, /orders) is now callable from the UI.

--------------------------------------------------------------------------------
Postman
--------------------------------------------------------------------------------

flasgger publishes the OpenAPI 2.0 spec at:
    http://localhost:5000/apispec_1.json

In Postman:
  1. Import > Link > paste http://localhost:5000/apispec_1.json > Import.
  2. Postman creates a collection with a folder per tag (Auth, Products, Cart,
     Orders).
  3. Add a collection variable  token = <token from /login>
  4. Set the collection Authorization to Bearer Token = {{token}}, so every
     request inherits the JWT automatically.

--------------------------------------------------------------------------------
Endpoints
--------------------------------------------------------------------------------

  POST   /register           (public)  create account. Sets sajilo-token cookie
                                       AND returns { token, user }.
  POST   /login              (public)  exchange credentials. Sets sajilo-token
                                       cookie AND returns { token, user }.
  POST   /logout             (public)  clears the sajilo-token cookie
  GET    /me                 (auth)    current user profile

  GET    /products           (public)  list all products

  GET    /cart               (auth)    { items:[...], total }
  POST   /cart               (auth)    add a product, or several at once via
                                       { items:[...] } or parallel
                                       product_id/quantity lists
                                       (max 10 units each, 20 per request)
  PATCH  /cart/<item_id>     (auth)    set exact quantity (0 removes)
  DELETE /cart/<item_id>     (auth)    remove one item

  POST   /orders             (auth)    place order from cart (min Rs 100)
  GET    /orders             (auth)    list my past orders
  GET    /orders/<id>        (auth)    fetch a single order (used by done.html)

(auth) endpoints accept either the sajilo-token cookie (preferred) or a
legacy Authorization: Bearer <jwt> header.

Business rules enforced by the API (mirrors the frontend FR list):
  - FR-2   registration phone must be exactly 10 digits
  - FR-3   password must be at least 8 characters
  - FR-5   email cannot be registered twice
  - FR-10  maximum 10 units of a single product per order
  - FR-13  minimum order value is Rs 100
  - FR-15  payment method must be esewa | khalti | cod

--------------------------------------------------------------------------------
Sample requests (curl)
--------------------------------------------------------------------------------

  # 1. log in and save the token
  TOKEN=$(curl -s -X POST http://localhost:5000/login \
    -H "Content-Type: application/json" \
    -d '{"email":"aarati@test.com","password":"test1234"}' \
    | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")

  # 2. list products
  curl http://localhost:5000/products

  # 3. add product 1 to the cart
  curl -X POST http://localhost:5000/cart \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"product_id":1,"quantity":2}'

  # 3b. add several products in one request (all-or-nothing, max 20 lines).
  #     Responds with { items:[...] } instead of a single item.
  curl -X POST http://localhost:5000/cart \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"items":[{"product_id":1,"quantity":2},{"product_id":2,"quantity":3}]}'

  # 3c. the same batch written as two parallel lists, paired by position.
  #     quantity may also be a single number for every product, or left out
  #     (defaults to 1); as a list it must match product_id in length.
  curl -X POST http://localhost:5000/cart \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"product_id":[1,2],"quantity":[2,3]}'

  # 4. place a Cash-on-Delivery order
  curl -X POST http://localhost:5000/orders \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"address":"Baneshwor, Kathmandu","payment_method":"cod"}'

--------------------------------------------------------------------------------
Inspecting the database (see the tables + rows)
--------------------------------------------------------------------------------

>>> Easiest — Flask CLI, no external tool needed:

    flask tables

Prints every table with its column list, row count, and 3 sample rows.

>>> Command line (sqlite3 is already on macOS/Linux)

    cd backend
    sqlite3 sajilobazar.db

    sqlite> .tables                     -- list tables
    sqlite> .schema                     -- show all CREATE TABLE statements
    sqlite> .schema users               -- schema for one table
    sqlite> .headers on
    sqlite> .mode column
    sqlite> SELECT * FROM users;
    sqlite> SELECT * FROM products;
    sqlite> SELECT o.id, u.name, o.total FROM orders o JOIN users u ON u.id = o.user_id;
    sqlite> .quit

Run a single query from your shell without entering the sqlite> prompt:

    sqlite3 sajilobazar.db "SELECT * FROM products WHERE price > 1000;"

>>> GUI

Install "DB Browser for SQLite" (free, https://sqlitebrowser.org) and open
backend/sajilobazar.db. Point-and-click browsing plus an "Execute SQL" tab
for typing queries — no CLI needed.

--------------------------------------------------------------------------------
Resetting the database
--------------------------------------------------------------------------------

    # Delete the file. Next `flask run` recreates + reseeds it.
    rm backend/sajilobazar.db

    # Or force a manual re-seed without deleting anything:
    flask seed

--------------------------------------------------------------------------------
Layout
--------------------------------------------------------------------------------

  backend/
    app.py                Flask setup, all routes, init_db(), `flask seed`
    auth.py               @login_required decorator
    database.py           shared SQLAlchemy `db` instance
    models/
      __init__.py         imports every model so SQLAlchemy sees them
      user.py             User      + set/check_password, make_token, from_token
      product.py          Product   + to_dict
      cart_item.py        CartItem  + line_total, add_for_user, add_many_for_user
      order.py            Order     + create_from_cart (empty/min-total check)
    docs/                 one YAML per endpoint, loaded via flasgger @swag_from
      register.yml
      login.yml
      me.yml
      products.yml
      cart_get.yml
      cart_add.yml
      cart_remove.yml
      orders_create.yml
      orders_list.yml
    sajilobazar.db        SQLite database file (auto-created, git-ignored)
    requirements.txt      Flask deps for LOCAL dev only. Vercel uses the
                          copy at the repo root.
    .env.example          SECRET_KEY, FLASK_APP, FLASK_DEBUG
    .venv/                virtualenv (git-ignored)
    .gitignore

  repo root/
    api/index.py          Vercel Python serverless entrypoint (imports the
                          same backend/app.py, strips /api prefix)
    vercel.json           rewrites /api/* to api/index.py
    requirements.txt      Python deps installed by Vercel for the /api function

To edit an endpoint's Swagger UI / Postman contract, open the matching YAML
file under docs/ — you do not have to touch app.py.

Editor tip: a .vscode/settings.json at the repo root points Pylance at
backend/.venv so "Unable to import 'flask'" warnings disappear. In VS Code /
Cursor: Cmd+Shift+P > "Python: Select Interpreter" > pick
./backend/.venv/bin/python.

================================================================================
DEPLOYING TO VERCEL (dev → prod)
================================================================================

Everything runs on Vercel: static frontend + Flask API + Neon Postgres.
Local dev keeps using SQLite so students still need zero setup.

How it fits together
--------------------
  Repo root
   ├── *.html, *.js, *.css     ← Vercel serves these as static files
   ├── api/index.py            ← Vercel Python serverless function; strips
   │                             the /api prefix so Flask routes stay clean
   ├── vercel.json             ← rewrites /api/*   →   api/index.py
   ├── requirements.txt        ← installed by Vercel for the Python function
   └── backend/                ← same Flask app used locally
        └── app.py             ← reads DATABASE_URL (Neon in prod, SQLite locally)

--------------------------------------------------------------------------------
One-time setup: create a free Postgres database
--------------------------------------------------------------------------------

Pick ONE (both are Neon under the hood):

>>> Option A: Vercel Postgres (fastest — one click, auto-links to project)

  1. Vercel dashboard → your `sajilo-bazzar` project → Storage → Create Database
  2. Pick Postgres → Continue → give it a name → Create.
  3. Vercel automatically adds DATABASE_URL (and friends) to the project's
     Environment Variables. You don't need to copy anything.

>>> Option B: Neon.tech direct (also free)

  1. Sign up at https://neon.tech, create a project.
  2. Copy the connection string (looks like: postgres://user:pw@ep-xxx.neon.tech/db)
  3. Vercel dashboard → project → Settings → Environment Variables → add:
       Name:  DATABASE_URL
       Value: <paste the connection string>
       Env:   Production, Preview, Development

Also add a SECRET_KEY (any long random string) in the same env-var section, in
Production + Preview at least.

--------------------------------------------------------------------------------
Deploying
--------------------------------------------------------------------------------

Once the env vars are set:

  git add .
  git commit -m "Deploy backend to Vercel"
  git push origin main

GitHub Actions builds and deploys automatically. First deploy takes ~2 min
(Vercel installs Python deps from requirements.txt).

Verify:
  * https://sajilo-bazzar.vercel.app/                 → login page loads
  * https://sajilo-bazzar.vercel.app/api/products     → JSON list of 6 products
  * https://sajilo-bazzar.vercel.app/api/docs         → Swagger UI (may render
                                                        with broken static assets
                                                        because of prefix — the
                                                        endpoints still work)
  * Log in with aarati@test.com / test1234 → shop, cart, orders all wired up.

The auto-init (init_db) runs on the first request after each cold start and
creates tables + seeds the demo user/products. It's idempotent, so redeploying
never wipes real user data.

--------------------------------------------------------------------------------
The "dev then prod" QA workflow
--------------------------------------------------------------------------------

  1. Student clones the repo, runs the backend + a static server locally.
     Same code, SQLite database, http://127.0.0.1:8000 → tests everything
     in the safe local sandbox.
  2. Student opens a PR. GitHub Actions runs the JS/HTML/CSS validators
     (see .github/workflows/deploy.yml).
  3. PR merged to main → GitHub Actions deploys to Vercel automatically.
  4. Student re-tests the same flows on
     https://sajilo-bazzar.vercel.app — this time against the Neon
     Postgres database, catching any prod-only bugs.

api.js auto-picks the API URL based on the hostname the page was loaded from,
so the same JavaScript works in both places with no code changes.

--------------------------------------------------------------------------------
Troubleshooting
--------------------------------------------------------------------------------

  * "Unable to import 'flask'" (IDE only, code runs fine)
      Editor is not using the venv. Select .venv/bin/python as the interpreter.

  * "Email not found" / "Incorrect password" on demo login
      Tables were dropped without a restart. Just restart `flask run` — the
      auto-init recreates the demo user.

  * Port 5000 in use
      Something else is listening (macOS AirPlay Receiver, etc.). Run with
      `flask run --port 5001` and set a different base URL in the browser:
        localStorage.setItem('sajilo-api-base', 'http://127.0.0.1:5001')

  * Vercel prod: /api/products returns 500
      Almost always a missing/wrong DATABASE_URL. In Vercel → Deployments →
      pick the failing one → Functions → view logs.

  * Vercel prod: users register but log-in fails after redeploy
      DATABASE_URL points at an ephemeral DB or you re-provisioned Postgres.
      Neon / Vercel Postgres persist across deploys by default — check that
      the env var still holds the same connection string.

  * "Import psycopg2" fails locally
      Only Vercel prod needs it. If pip install fails on your Mac, remove
      `psycopg2-binary` from backend/requirements.txt — local dev never
      touches it because it uses SQLite.
