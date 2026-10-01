# SajiloBazar — QA practice shop

A small online shop for practising software testing. Live at
<https://sajilo-bazzar.vercel.app/login.html> (demo login `aarati@test.com` / `test1234`).

For what to test, the API, the database and deployment, see the [guide](GUIDE.md).

## Tech stack

| Part | Built with |
|---|---|
| Frontend | Plain HTML, CSS and JavaScript (no framework, no build step) |
| Backend | Python 3.10+, Flask 3, Flask-SQLAlchemy, Flask-Cors |
| Auth | JWT (PyJWT) in an HttpOnly cookie; passwords hashed with Werkzeug |
| Database | SQLite locally (created automatically); Postgres on Neon in production |
| API docs | Swagger via flasgger, plus a static Swagger UI page in `api-docs/` |
| Hosting | Vercel (static pages + Flask as a serverless function), deployed by GitHub Actions |

## Setup

You need **Python 3.10 or newer** (`python3 --version`). macOS ships 3.9, which fails
with `module 'hashlib' has no attribute 'scrypt'`; install a newer one with
`brew install python@3.12` or from <https://www.python.org/downloads/>.

No Docker, Node.js or database server is needed.

### 1. Install (once)

```bash
git clone https://github.com/Aarati20/SajiloBazzar.git
cd SajiloBazzar/backend
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 2. Start the backend (Terminal 1)

From `backend/`, with the venv active:

```bash
flask run --debug --port 5000
```

The first line should say `* Database: sqlite:///...`. On first start the backend
creates the database, 24 products and the demo user by itself.

### 3. Start the frontend (Terminal 2)

From the repo root (the folder with `login.html`):

```bash
python3 -m http.server 8000 --bind 127.0.0.1      # Windows: py instead of python3
```

### 4. Open the app

Go to <http://127.0.0.1:8000/login.html> and log in with the demo account.

Use **`127.0.0.1`, not `localhost`**: on `localhost` the login cookie isn't sent and you
land back on the login page.

Next time, only steps 2–4 are needed (activate the venv first). After `git pull`, run
`pip install -r requirements.txt` again. Stop the servers with Ctrl+C.

## Setup problems

| Problem | Fix |
|---|---|
| `module 'hashlib' has no attribute 'scrypt'` | Python is too old. Install 3.10+, delete `backend/.venv`, redo step 1. |
| `flask: command not found` / `No module named flask` | Activate the venv: `source .venv/bin/activate` in `backend/`. |
| Windows: "running scripts is disabled" | Run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once, then activate again. |
| `pip install` fails on `psycopg2-binary` | Only production needs it. Remove that line from `backend/requirements.txt`. |
| Port 5000 already in use | macOS AirPlay Receiver uses it: turn it off in System Settings → General → AirDrop & Handoff. |
| Startup line says `Database: postgresql://...` | `backend/.env` sets `DATABASE_URL`, so data goes to that real database. For local use, remove that line or run `DATABASE_URL= flask run --debug --port 5000`. |
| Login sends me back to the login page | You're on `localhost`. Use `http://127.0.0.1:8000`. |
| "Could not load products" | The backend isn't running; check Terminal 1. |
| Double-clicking `login.html` doesn't work | Open it through `http://127.0.0.1:8000`, not as a file. |
