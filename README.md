# SajiloBazar — QA practice shop

SajiloBazar is a small online shop built for practising software testing. You can
register, log in, search and browse products, fill a cart, check out and pay with a
fake wallet. **The app contains planted bugs. Your job is to find them.**

| | |
|---|---|
| Live site | <https://sajilo-bazzar.vercel.app/login.html> |
| API docs (Swagger) | <https://sajilo-bazzar.vercel.app/api-docs/> |
| Demo login | `aarati@test.com` / `test1234` |
| Test wallet | `9812345678`, MPIN `1234` |

**Contents:** [Run it locally](#run-it-locally) · [Your QA task](#your-qa-task) ·
[Common problems](#common-problems) · [API](#api) · [Database](#database) ·
[Project layout](#project-layout) · [Deploying](#deploying-to-vercel)

---

## Run it locally

The app has two parts, each running in its own terminal:

| Part | Runs on | What it is |
|---|---|---|
| Backend | <http://127.0.0.1:5000> | Python Flask API: data and rules |
| Frontend | <http://127.0.0.1:8000> | HTML/JS pages: what you click |

No Docker, Node.js or database server needed: the data lives in a SQLite file that
is created automatically.

### 1. One-time setup

You need **Python 3.10 or newer** (`python3 --version`). macOS ships 3.9, which
crashes with `module 'hashlib' has no attribute 'scrypt'`; install a newer one with
`brew install python@3.12` or from <https://www.python.org/downloads/>.

```bash
git clone https://github.com/Aarati20/SajiloBazzar.git
cd SajiloBazzar/backend
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 2. Start the backend (Terminal 1, leave it running)

From `backend/`, with the venv active (your prompt starts with `(.venv)`):

```bash
flask run --debug --port 5000
```

The first line must say **sqlite**:

```
 * Database: sqlite:////.../backend/sajilobazar.db
```

If it says `postgresql://`, a `backend/.env` file is pointing at a real online
database — see [Common problems](#common-problems) first. On first start the backend
creates the tables, 24 products in 6 categories and the demo user by itself.

### 3. Start the frontend (Terminal 2, leave it running)

From the **repo root** (the folder with `login.html`):

```bash
python3 -m http.server 8000 --bind 127.0.0.1      # Windows: py instead of python3
```

### 4. Open the app

Open <http://127.0.0.1:8000/login.html> and log in with the demo account.

> **Use `127.0.0.1`, not `localhost`.** The login cookie only works when the page and
> the API use the same host name. On `localhost:8000` login "succeeds" but sends you
> straight back to the login page.

**Next time** you only need steps 2–4 (activate the venv first). After `git pull`, run
`pip install -r requirements.txt` again in case packages changed. Stop with Ctrl+C.

---

## Your QA task

Click **Requirements** in the app's header to see the 36 rules (FR-1 to FR-34, NFR-1
and NFR-2). Test the app against them. For every bug, write down:

| Field | What to write |
|---|---|
| Title | One line describing the problem |
| Steps | Numbered steps that make it happen |
| Expected | What the requirement says should happen |
| Actual | What really happens |
| Evidence | Screenshot, or the API request and response |

The user journey: register → login → shop (search, category, sort, price range,
8 per page, quick view, product pages) → cart → checkout → pay (eSewa/Khalti only)
→ order placed → My orders (view, delete).

Good to know while testing:
- Your login is an HttpOnly cookie, `sajilo-token`. DevTools → Application → Cookies
  shows it, but JavaScript can't read it.
- All data lives in the backend database, so clearing browser storage resets nothing.
  (The header keeps your name and cart count in `sessionStorage` for the current tab,
  only so it draws instantly between pages.)
- To start over with fresh data, see [Resetting the database](#resetting-the-database).
- The API can be tested on its own too: see [API](#api).

---

## Common problems

| Problem | Fix |
|---|---|
| Login works but sends me back to the login page | You opened `localhost:8000`. Use `http://127.0.0.1:8000`. |
| "Could not load products" / "Failed to fetch" | The backend isn't running. Check Terminal 1, and that <http://127.0.0.1:5000/products> opens. |
| Double-clicking `login.html` doesn't work | `file://` pages can't call the API. Use the `127.0.0.1:8000` address. |
| `module 'hashlib' has no attribute 'scrypt'` | Python is too old. Install 3.10+, delete `backend/.venv`, redo setup. |
| `flask: command not found` / `No module named flask` | The venv isn't active: `source .venv/bin/activate` in `backend/`. |
| Windows: "running scripts is disabled" | Run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once, then activate again. |
| Port 5000 already in use | macOS AirPlay Receiver uses it. Turn it off (System Settings → General → AirDrop & Handoff), or run `flask run --debug --port 5001` and in the browser console run `localStorage.setItem('sajilo-api-base', 'http://127.0.0.1:5001')` (undo with `localStorage.removeItem('sajilo-api-base')`). |
| Startup line says `Database: postgresql://...` | `backend/.env` sets `DATABASE_URL`, so test data goes to that real database. For local practice remove that line, or start with `DATABASE_URL= flask run --debug --port 5000`. |
| Demo login says "Email not found" | The database was emptied while running. Restart the backend; it recreates the demo user. |
| `pip install` fails on `psycopg2-binary` | Only Vercel needs it. Remove that line from `backend/requirements.txt` (not the root copy). |
| VS Code: "Unable to import 'flask'" | Cmd/Ctrl+Shift+P → "Python: Select Interpreter" → `./backend/.venv/bin/python`. |

---

## API

Built with Flask 3, Flask-SQLAlchemy, flasgger (Swagger), PyJWT and Flask-Cors.

### Docs you can share

<https://sajilo-bazzar.vercel.app/api-docs/> is a static Swagger page served with the
site: anyone can open it, nothing to install. "Try it out" calls the live API — run
`POST /login` with the demo account first and the rest just work. Locally the same page
is at <http://127.0.0.1:8000/api-docs/>, and the Requirements panel links to it.

The page reads `api-docs/openapi.json`. After editing any YAML file in `backend/docs/`,
refresh it and commit the result:

```bash
cd backend && flask export-docs
```

The backend also serves its own Swagger UI at <http://127.0.0.1:5000/docs>, and the raw
spec at `/apispec_1.json` for **Postman** (Import → Link → paste the URL).

### Endpoints

| Method | Path | Login? | What it does |
|---|---|---|---|
| POST | `/register` | | Create an account; sets the cookie, returns `{ token, user }` |
| POST | `/login` | | Log in; sets the cookie, returns `{ token, user }` |
| POST | `/logout` | | Clear the cookie |
| GET | `/me` | ✓ | Current user |
| GET | `/products` | | List products; optional `?q=` (name or category contains, any case) and `?category=` |
| GET | `/products/<id>` | | One product |
| GET | `/cart` | ✓ | `{ items: [...], total }` |
| POST | `/cart` | ✓ | Add one product or several at once (max 10 units each, 20 lines per request) |
| PATCH | `/cart/<item_id>` | ✓ | Set an exact quantity (0 removes it) |
| DELETE | `/cart/<item_id>` | ✓ | Remove one item |
| POST | `/orders` | ✓ | Place an order from the cart (minimum Rs 100) |
| GET | `/orders` | ✓ | My orders, newest first, each with its `items` |
| GET | `/orders/<id>` | ✓ | One order |
| DELETE | `/orders/<id>` | ✓ | Delete one of my orders and its items |

✓ endpoints accept the `sajilo-token` cookie or an `Authorization: Bearer <token>`
header. The API itself enforces FR-2 (10-digit phone), FR-3 (8+ character password),
FR-5 (unique email), FR-10 (max 10 per product), FR-13 (min Rs 100) and FR-15
(`esewa`, `khalti` or `cod`).

### curl examples

```bash
# Log in and keep the token
TOKEN=$(curl -s -X POST http://127.0.0.1:5000/login \
  -H "Content-Type: application/json" \
  -d '{"email":"aarati@test.com","password":"test1234"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")

# Products: all, searched, filtered
curl http://127.0.0.1:5000/products
curl "http://127.0.0.1:5000/products?category=Bags&q=lea"

# Add to cart: one product, or several in one all-or-nothing request
curl -X POST http://127.0.0.1:5000/cart -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" -d '{"product_id":1,"quantity":2}'
curl -X POST http://127.0.0.1:5000/cart -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"items":[{"product_id":1,"quantity":2},{"product_id":2,"quantity":3}]}'

# Place a cash-on-delivery order
curl -X POST http://127.0.0.1:5000/orders -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"address":"Baneshwor, Kathmandu","payment_method":"cod"}'
```

### Settings (`backend/.env`, optional)

| Variable | Purpose |
|---|---|
| `SECRET_KEY` | Signs login tokens. Use a long random value in production. |
| `DATABASE_URL` | Postgres connection string. Required on Vercel; leave unset locally for SQLite. |
| `ALLOWED_ORIGINS` | Extra comma-separated site addresses allowed to call the API with the cookie (`127.0.0.1:8000`, `localhost:8000` and `:5500` are always allowed). |

---

## Database

Locally the database is `backend/sajilobazar.db` (ignored by git), with 5 tables:
`users`, `products`, `cart_items`, `orders`, `order_items`.

```bash
cd backend
flask tables                                   # every table, row counts, sample rows
sqlite3 sajilobazar.db "SELECT name, price FROM products WHERE price > 1000;"
```

Prefer clicking? Open the file in [DB Browser for SQLite](https://sqlitebrowser.org).

**Learning SQL?** [POSTGRES_EXERCISE.md](POSTGRES_EXERCISE.md) runs the app on Postgres
and walks from first `SELECT` queries to joins, constraints and transactions.

### Resetting the database

```bash
rm backend/sajilobazar.db     # with the backend stopped; next start rebuilds it
flask seed                    # or: just add back any missing demo user/products
```

Startup only ever *adds* missing demo rows; it never deletes users, carts or orders.

---

## Project layout

```
├── *.html + *.js        one pair per page: login, register, shop, product, cart,
│                        checkout, pay, done, orders (index.html redirects to login)
├── api.js               calls the API; picks 127.0.0.1:5000 locally, /api on Vercel
├── common.js            header + phone menu, checkout steps, toasts,
│                        Requirements panel, login check, shared helpers
├── styles.css           the only stylesheet
├── images/products/     product pictures (SVG)
├── api-docs/            shareable Swagger page + exported openapi.json
├── backend/
│   ├── app.py           setup, all routes, init_db(), flask seed / tables / export-docs
│   ├── auth.py          @login_required
│   ├── models/          user, product, cart_item, order, order_item
│   └── docs/            one Swagger YAML per endpoint
├── api/index.py         Vercel entry point (runs backend/app.py under /api)
├── vercel.json          sends /api/* to api/index.py
└── requirements.txt     Python packages Vercel installs
```

---

## Deploying to Vercel

Production runs entirely on Vercel: the static pages, the Flask API as a serverless
function at `/api/*`, and a Neon Postgres database.

**How a change goes live**
1. Open a pull request into `main`. GitHub Actions checks JavaScript syntax and lints
   the HTML and CSS.
2. Merge it. GitHub Actions deploys to Vercel (about 2 minutes).
3. Re-test on the live site — it runs on Postgres, which can reveal production-only bugs.

On the first request after a deploy, the backend adds any missing tables, columns,
demo user and products. It never deletes existing data.

**One-time setup**
- Database: either Vercel → project → Storage → Create Database → Postgres (Vercel
  adds `DATABASE_URL` for you), or create a project on <https://neon.tech> and add its
  connection string as `DATABASE_URL` under Vercel → Settings → Environment Variables.
- Add `SECRET_KEY` (any long random string) in the same place.
- The GitHub repo needs the secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID`.

**Check a deployment:** the [login page](https://sajilo-bazzar.vercel.app/) loads,
[/api/products](https://sajilo-bazzar.vercel.app/api/products) returns 24 products,
and the [API docs](https://sajilo-bazzar.vercel.app/api-docs/) open.

**If something's wrong**

| Symptom | Likely cause |
|---|---|
| `/api/products` returns 500 | `DATABASE_URL` missing or wrong. Vercel → Deployments → the failing one → Functions shows the logs. |
| Users disappear or can't log in after a redeploy | `DATABASE_URL` now points at a different database. |
