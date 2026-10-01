================================================================================
SAJILOBAZAR: QA PRACTICE SHOP
================================================================================

SajiloBazar is a small online shop built for practising software testing.
You can register, log in, search and browse products, fill a cart, check out
and pay with a fake wallet. The app contains PLANTED BUGS. Your job is to
find them.

  Live site:     https://sajilo-bazzar.vercel.app/login.html
  Demo login:    aarati@test.com / test1234
  Test wallet:   9812345678, MPIN 1234

Contents
  1. Run it on your computer (step by step)
  2. Your QA task
  3. Common problems when running locally
  4. Backend API reference (Swagger, Postman, curl)
  5. Working with the database
  6. Project layout
  7. Deploying to Vercel


================================================================================
1. RUN IT ON YOUR COMPUTER (STEP BY STEP)
================================================================================

The app has two parts. You run each one in its own terminal window:

  Backend   Python Flask API on   http://127.0.0.1:5000   (data + rules)
  Frontend  HTML/JS pages on      http://127.0.0.1:8000   (what you click)

You do NOT need Docker, Node.js or a database server. Locally the data lives
in one SQLite file that is created automatically.

--------------------------------------------------------------------------------
Step 0: Check you have Python 3.10 or newer (one time only)
--------------------------------------------------------------------------------

    python3 --version

If it says 3.9 or lower, install a newer Python first:
  macOS:    brew install python@3.12      (or download from python.org)
  Windows:  download from https://www.python.org/downloads/
            (tick "Add python.exe to PATH" in the installer)

Why: macOS ships Python 3.9, which cannot hash passwords the way this app
does. The backend crashes with "module 'hashlib' has no attribute 'scrypt'".

--------------------------------------------------------------------------------
Step 1: Get the code (one time only)
--------------------------------------------------------------------------------

    git clone https://github.com/Aarati20/SajiloBazzar.git
    cd SajiloBazzar

--------------------------------------------------------------------------------
Step 2: Set up the backend (one time only)
--------------------------------------------------------------------------------

macOS / Linux:

    cd backend
    python3 -m venv .venv
    source .venv/bin/activate
    pip install -r requirements.txt

Windows (PowerShell):

    cd backend
    py -m venv .venv
    .venv\Scripts\Activate.ps1
    pip install -r requirements.txt

Once the venv is active, your prompt starts with "(.venv)".

--------------------------------------------------------------------------------
Step 3: Start the backend (Terminal 1, leave it running)
--------------------------------------------------------------------------------

From the backend folder, with the venv active:

    flask run --debug --port 5000

You should see:

    * Database: sqlite:////.../backend/sajilobazar.db
    * Running on http://127.0.0.1:5000

The "Database:" line MUST say sqlite for local practice. If it says
postgresql, you have a backend/.env file pointing at a real online
database. See "Common problems" below before you continue.

On the first start, the backend creates the database by itself. It adds the
tables, 24 sample products in 6 categories, and the demo user.

Check it works: open http://127.0.0.1:5000/products in your browser. You
should see a JSON list of products.

--------------------------------------------------------------------------------
Step 4: Start the frontend (Terminal 2, leave it running)
--------------------------------------------------------------------------------

Open a SECOND terminal and go to the repo root (the folder that contains
login.html, NOT the backend folder):

    cd SajiloBazzar
    python3 -m http.server 8000 --bind 127.0.0.1

(On Windows use `py` instead of `python3`.)

--------------------------------------------------------------------------------
Step 5: Open the app
--------------------------------------------------------------------------------

    http://127.0.0.1:8000/login.html

Log in with  aarati@test.com / test1234 .

IMPORTANT: use 127.0.0.1, not "localhost". The login cookie only works when
the page and the API are on the same host name. On http://localhost:8000
login "succeeds" but you are sent straight back to the login page.

--------------------------------------------------------------------------------
Stopping and starting again
--------------------------------------------------------------------------------

  Stop:   press Ctrl+C in each terminal.
  Start:  next time you only need steps 3 to 5 (remember to activate the
          venv again in Terminal 1 first: `source .venv/bin/activate`).
  Update: after `git pull`, run `pip install -r requirements.txt` again in
          case new packages were added.


================================================================================
2. YOUR QA TASK
================================================================================

Click "Requirements" in the header of the app to see the 25 rules
(FR-1 to FR-24, NFR-1). Test the app against them.

For every bug you find, write down:
  - Title         one line that describes the problem
  - Steps         numbered steps that make the bug happen
  - Expected      what the requirement says should happen
  - Actual        what really happens
  - Evidence      screenshot, or the API request and response

The user journey goes like this:

  register → login → shop (search, category, sort, price range, 8 products
  per page, quick view, product pages) → cart → checkout → pay (eSewa /
  Khalti only) → order done → My orders

Useful things to know while testing:
  - Your login is an HttpOnly cookie called "sajilo-token". You can see it in
    DevTools → Application → Cookies, but JavaScript cannot read it.
  - All data (users, cart, orders) is stored in the backend database, not in
    the browser. Clearing localStorage does not reset anything.
  - To log out, click "Log out", or delete the sajilo-token cookie and reload.
  - To start over with fresh data, see "Resetting the database" in section 5.
  - The API can be tested on its own too. See section 4.


================================================================================
3. COMMON PROBLEMS WHEN RUNNING LOCALLY
================================================================================

  * Login works but I'm sent back to the login page
      You opened http://localhost:8000. Use http://127.0.0.1:8000 instead.

  * "Could not load products" / "Failed to fetch" in the shop
      The backend is not running. Check Terminal 1 for errors and that
      http://127.0.0.1:5000/products opens.

  * Opening login.html by double-clicking the file does not work
      Pages opened as file:// cannot call the API (CORS). Always use the
      http://127.0.0.1:8000 address from step 5.

  * "module 'hashlib' has no attribute 'scrypt'"
      Your Python is too old. Install Python 3.10+ (step 0), delete the
      backend/.venv folder, and redo step 2.

  * "flask: command not found" or "No module named flask"
      The venv is not active. Run `source .venv/bin/activate` in the backend
      folder (Windows: `.venv\Scripts\Activate.ps1`).

  * Windows: "running scripts is disabled on this system"
      Run this once in PowerShell, then activate again:
        Set-ExecutionPolicy -Scope CurrentUser RemoteSigned

  * "Address already in use" / port 5000 is busy
      On macOS, AirPlay Receiver uses port 5000. Either turn it off
      (System Settings → General → AirDrop & Handoff → AirPlay Receiver) or
      use another port:
        flask run --debug --port 5001
      Then, in the browser console on the app page, run:
        localStorage.setItem('sajilo-api-base', 'http://127.0.0.1:5001')
      and reload. Run localStorage.removeItem('sajilo-api-base') to undo this.

  * The startup line says "Database: postgresql://..."
      backend/.env contains a DATABASE_URL, so you are using a real online
      database and your test data will go there. For local practice, either
      remove that line from backend/.env, or start the backend with it blanked:
        DATABASE_URL= flask run --debug --port 5000

  * Demo login says "Email not found"
      The database was emptied while the backend was running. Stop it with
      Ctrl+C and start it again. The demo user is recreated on startup.

  * "pip install" fails on psycopg2-binary
      That package is only needed on Vercel. Remove the psycopg2-binary line
      from backend/requirements.txt (not the root copy) and run pip again.

  * VS Code shows "Unable to import 'flask'" but the app runs fine
      Cmd/Ctrl+Shift+P → "Python: Select Interpreter" → pick
      ./backend/.venv/bin/python.


================================================================================
4. BACKEND API REFERENCE
================================================================================

Built with Flask 3, Flask-SQLAlchemy, flasgger (Swagger), PyJWT and
Flask-Cors. Everything is in backend/app.py plus one file per model.

--------------------------------------------------------------------------------
Endpoints
--------------------------------------------------------------------------------

  POST   /register           (public)  create account. Sets the sajilo-token
                                       cookie and returns { token, user }.
  POST   /login              (public)  log in. Sets the sajilo-token cookie and
                                       returns { token, user }.
  POST   /logout             (public)  clears the sajilo-token cookie
  GET    /me                 (auth)    current user profile

  GET    /products           (public)  list products. Optional filters:
                                         ?q=tea           name or category
                                                          contains "tea"
                                                          (any case, max 100
                                                          characters)
                                         ?category=Home   one category
                                       Both can be combined.
  GET    /products/<id>      (public)  one product (404 if it doesn't exist)

  GET    /cart               (auth)    { items:[...], total }
  POST   /cart               (auth)    add one product, or several at once
                                       (max 10 units each, 20 lines per request)
  PATCH  /cart/<item_id>     (auth)    set an exact quantity (0 removes it)
  DELETE /cart/<item_id>     (auth)    remove one item

  POST   /orders             (auth)    place an order from the cart
  GET    /orders             (auth)    list my orders, newest first
  GET    /orders/<id>        (auth)    one order (used by done.html)

Every order includes its items (name, price, quantity, line_total,
image_url). Orders placed before items were recorded have an empty list.

(auth) endpoints accept the sajilo-token cookie, or an
"Authorization: Bearer <token>" header (handy for Postman and curl).

Each product looks like this:
  { "id": 1, "name": "Cotton kurta", "price": 1450, "tag": "Clothing",
    "image_url": "images/products/cotton-kurta.svg",
    "description": "Breathable handloom cotton kurta ..." }

Business rules the API enforces:
  - FR-2   phone number must be exactly 10 digits
  - FR-3   password must be at least 8 characters
  - FR-5   an email can only be registered once
  - FR-10  maximum 10 units of a single product per order
  - FR-13  minimum order value is Rs 100
  - FR-15  payment method must be esewa, khalti or cod

--------------------------------------------------------------------------------
Swagger UI: http://127.0.0.1:5000/docs
--------------------------------------------------------------------------------

  1. Open POST /login → "Try it out" → Execute.
  2. Copy the "token" value from the response.
  3. Click "Authorize" at the top and paste:  Bearer <token>
  4. You can now call /me, /cart and /orders from the page.

To change what Swagger shows for an endpoint, edit its YAML file in
backend/docs/. You don't need to change app.py.

--------------------------------------------------------------------------------
Postman
--------------------------------------------------------------------------------

  1. Import → Link → http://127.0.0.1:5000/apispec_1.json → Import.
  2. Add a collection variable  token = <token from POST /login>.
  3. Set the collection's Authorization to Bearer Token = {{token}}.

--------------------------------------------------------------------------------
curl examples
--------------------------------------------------------------------------------

  # Log in and keep the token
  TOKEN=$(curl -s -X POST http://127.0.0.1:5000/login \
    -H "Content-Type: application/json" \
    -d '{"email":"aarati@test.com","password":"test1234"}' \
    | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")

  # Products: all, by search, by category
  curl http://127.0.0.1:5000/products
  curl "http://127.0.0.1:5000/products?q=tea"
  curl "http://127.0.0.1:5000/products?category=Bags&q=lea"

  # Add 2 of product 1 to the cart
  curl -X POST http://127.0.0.1:5000/cart \
    -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
    -d '{"product_id":1,"quantity":2}'

  # Add several products in one request (all-or-nothing)
  curl -X POST http://127.0.0.1:5000/cart \
    -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
    -d '{"items":[{"product_id":1,"quantity":2},{"product_id":2,"quantity":3}]}'

  # The same batch as two lists matched by position. quantity may also be
  # one number for every product, or left out (defaults to 1).
  curl -X POST http://127.0.0.1:5000/cart \
    -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
    -d '{"product_id":[1,2],"quantity":[2,3]}'

  # Place a cash-on-delivery order
  curl -X POST http://127.0.0.1:5000/orders \
    -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
    -d '{"address":"Baneshwor, Kathmandu","payment_method":"cod"}'

--------------------------------------------------------------------------------
Environment variables (backend/.env, optional)
--------------------------------------------------------------------------------

You don't need a .env file for local practice. The defaults just work.

  SECRET_KEY       signs login tokens. Set a long random value in production.
  DATABASE_URL     Postgres connection string. Required on Vercel. Leave it
                   unset locally to use SQLite.
  ALLOWED_ORIGINS  extra comma-separated website addresses allowed to call
                   the API with the login cookie. 127.0.0.1:8000,
                   localhost:8000 and :5500 are always allowed.


================================================================================
5. WORKING WITH THE DATABASE
================================================================================

Locally the database is the file backend/sajilobazar.db (ignored by git).
It has 5 tables: users, products, cart_items, orders, order_items.

Quick look at every table (from the backend folder, venv active):

    flask tables

With the sqlite3 command-line tool (built into macOS and Linux):

    cd backend
    sqlite3 sajilobazar.db
    sqlite> .headers on
    sqlite> .mode column
    sqlite> .tables
    sqlite> SELECT * FROM products;
    sqlite> SELECT o.id, u.name, o.total FROM orders o JOIN users u ON u.id = o.user_id;
    sqlite> .quit

    # or one query straight from the shell
    sqlite3 sajilobazar.db "SELECT name, price FROM products WHERE price > 1000;"

With a GUI: install DB Browser for SQLite (https://sqlitebrowser.org) and
open backend/sajilobazar.db.

For Postgres practice, see POSTGRES_EXERCISE.md.

--------------------------------------------------------------------------------
Resetting the database
--------------------------------------------------------------------------------

    # Stop the backend (Ctrl+C), delete the file, start the backend again.
    # This gives you a fresh database with the demo user and 24 products.
    rm backend/sajilobazar.db

    # Or add any missing demo user/products without deleting anything:
    flask seed

Startup only ever ADDS missing demo rows. It never deletes your users,
carts or orders.


================================================================================
6. PROJECT LAYOUT
================================================================================

  Frontend (repo root, plain HTML + JavaScript, no build step)
    index.html             redirects to the login page
    login.html    + .js    log in
    register.html + .js    create an account
    shop.html     + .js    search, category, sort, price range, 8 per page,
                           quick view
    product.html  + .js    one product's page (product.html?id=3)
    cart.html     + .js
    checkout.html + .js
    pay.html      + .js    eSewa / Khalti wallet screen
    done.html     + .js    order confirmation
    orders.html   + .js    My orders
    api.js                 calls the API and picks its address automatically
                           (127.0.0.1:5000 locally, /api on Vercel)
    common.js              header (with phone menu), footer, checkout steps,
                           toasts, Requirements drawer, login check, and
                           helpers such as formatRs() and submitOnEnter()
    styles.css             the only stylesheet
    images/products/       product pictures (SVG). Each product's image_url
                           points here.
    favicon.svg            browser-tab icon

  Backend (backend/)
    app.py                 setup, all routes, init_db() auto-setup,
                           `flask seed` and `flask tables`
    auth.py                @login_required
    database.py            shared SQLAlchemy `db`
    models/                user.py, product.py, cart_item.py, order.py,
                           order_item.py (the products inside an order)
    docs/                  one Swagger YAML file per endpoint
    requirements.txt       Python packages for local development

  Deployment
    api/index.py           Vercel entry point (runs backend/app.py under /api)
    vercel.json            sends /api/* to api/index.py
    requirements.txt       Python packages Vercel installs
    .github/workflows/deploy.yml   checks and deploys (see below)


================================================================================
7. DEPLOYING TO VERCEL
================================================================================

In production, Vercel runs everything: the static pages, the Flask API as a
serverless function at /api/*, and a Neon Postgres database.

--------------------------------------------------------------------------------
How a change reaches the live site
--------------------------------------------------------------------------------

  1. Open a pull request into main. GitHub Actions checks JavaScript syntax
     and lints the HTML and CSS.
  2. Merge it. GitHub Actions deploys to Vercel automatically (about 2 min).
  3. Re-test on https://sajilo-bazzar.vercel.app. This time the app runs on
     Postgres, which can reveal production-only bugs.

On the first request after a deploy, the backend adds any missing tables,
columns, demo user and products. It never deletes existing data.

--------------------------------------------------------------------------------
One-time setup: the production database
--------------------------------------------------------------------------------

Pick ONE option:

  A) Vercel Postgres: Vercel dashboard → project → Storage → Create Database
     → Postgres. Vercel adds DATABASE_URL to the project by itself.

  B) Neon (https://neon.tech): create a project and copy its connection
     string. Then go to Vercel → project → Settings → Environment Variables
     and add DATABASE_URL = <connection string> for Production, Preview and
     Development.

In the same place, also add SECRET_KEY (any long random string).

The GitHub repo also needs these secrets for the deploy step:
VERCEL_TOKEN, VERCEL_ORG_ID and VERCEL_PROJECT_ID.

--------------------------------------------------------------------------------
Check a deployment
--------------------------------------------------------------------------------

  https://sajilo-bazzar.vercel.app/                → login page
  https://sajilo-bazzar.vercel.app/api/products    → JSON list of 24 products
  https://sajilo-bazzar.vercel.app/api/docs        → Swagger (styling may look
                                                     broken, endpoints work)

--------------------------------------------------------------------------------
Production troubleshooting
--------------------------------------------------------------------------------

  * /api/products returns 500
      DATABASE_URL is usually missing or wrong. In Vercel, open
      Deployments → the failing one → Functions to see the logs.

  * Users disappear or can't log in after a redeploy
      DATABASE_URL now points at a different or new database. Check that it
      still holds the same connection string.
