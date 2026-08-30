# Postgres Exercise — SajiloBazar

By default this app needs **no database setup at all**: `backend/app.py` falls back to
a SQLite file and creates + seeds it on first start. This exercise deliberately turns
that off. You will run the app on **your own Postgres database**, create your own
tables in it, and explore the data with SQL.

Work through it in order. Everything after Part 1 assumes the app is running on Postgres.

---

## Part 1 — Get a Postgres database

Pick **one** option. Option A is faster and needs no install; Option B keeps everything
on your laptop and works offline.

### Option A — Neon (free cloud Postgres, nothing to install)

1. Sign up at <https://neon.tech> (free tier, no card).
2. Create a project — call it `sajilobazar`.
3. On the dashboard, copy the **connection string**. It looks like:

   ```
   postgresql://neondb_owner:SOMEPASSWORD@ep-cool-name-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

4. Keep that string — you need it in Part 2.

You still want the `psql` command-line client locally to run queries:

```bash
brew install libpq
brew link --force libpq       # puts psql on your PATH
psql --version                # confirm it works
```

### Option B — Local Postgres (macOS, Homebrew)

```bash
brew install postgresql@16
brew services start postgresql@16     # starts the server, and on every reboot
psql --version                        # confirm the client works
```

Create your own database and user:

```bash
createdb sajilobazar
psql -d sajilobazar -c "SELECT version();"
```

Your connection string is then:

```
postgresql://YOUR_MAC_USERNAME@localhost:5432/sajilobazar
```

(`whoami` prints `YOUR_MAC_USERNAME`. A local install usually needs no password.)

> **Windows:** install from <https://www.postgresql.org/download/windows/>, which
> bundles `psql` and pgAdmin. Your string is
> `postgresql://postgres:YOURPASSWORD@localhost:5432/sajilobazar`.

### Check the connection before going further

```bash
psql "YOUR_CONNECTION_STRING" -c "SELECT current_database(), current_user;"
```

If that prints a row, your database is real and reachable. If it hangs or errors,
fix that now — nothing below will work until it does.

---

## Part 2 — Point the app at your database

The app reads `DATABASE_URL` from `backend/.env` (see `backend/app.py` lines 41–48).
When it is unset the app silently falls back to SQLite, so **the whole point of this
step is to set it**.

Create the file `backend/.env` — it is gitignored, so it stays yours:

```bash
cd backend
cat > .env <<'EOF'
DATABASE_URL=postgresql://...paste your connection string here...
SECRET_KEY=any-random-string-for-local-dev
EOF
```

Notes:
- The value must start with `postgresql://`. If your provider gave you `postgres://`,
  the app rewrites it for you, but prefer the correct form.
- Neon strings must keep `?sslmode=require` on the end.
- Never commit this file, and never paste a real password into chat or a PR.

Now install dependencies and start the server:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
flask run --debug --port 5000
```

The first log line tells you which database you got. **Read it.**

```
 * Database: postgresql://neondb_owner:***@ep-cool-name-123456...
```

If it says `sqlite:///...` then `.env` was not picked up — check you created it inside
`backend/`, not at the repo root, and restart.

On first start the app runs `init_db()` (`backend/app.py:118`) against *your* database:
it creates 4 tables, inserts 6 sample products, and creates the demo user
`aarati@test.com` / `test1234`.

---

## Part 3 — Connect and explore

Open a second terminal and connect:

```bash
psql "YOUR_CONNECTION_STRING"
```

Make output readable, then look around:

```sql
\x auto                    -- auto-expand wide rows
\dt                        -- list tables
\d users                   -- describe one table: columns, types, keys, indexes
\d+ orders                 -- same, plus storage and comments
\di                        -- list indexes
\l                         -- list databases
\du                        -- list roles/users
\q                         -- quit
```

The four tables the app created, and what each holds:

| Table        | Columns                                            | Written when                     |
|--------------|----------------------------------------------------|----------------------------------|
| `users`      | id, name, email (unique), phone, password (hash)    | someone registers                |
| `products`   | id, name, price, tag                               | seeded at startup                |
| `cart_items` | id, user_id → users, product_id → products, quantity | add to cart                    |
| `orders`     | id, user_id → users, address, payment_method, total, created_at | checkout       |

**Exercise 3.1** — Run `\d users` and answer in your own words:
- What is the primary key, and what index enforces the unique email?
- What Postgres type did `db.String(120)` become? What did `db.Float` become?
- Why is `password` 255 characters when no one's password is that long?

**Exercise 3.2** — The same information lives in the system catalog. Get it with SQL
instead of a backslash command:

```sql
SELECT column_name, data_type, is_nullable, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'orders'
ORDER BY ordinal_position;
```

**Exercise 3.3** — List every foreign key in your database:

```sql
SELECT tc.table_name, kcu.column_name,
       ccu.table_name AS references_table, ccu.column_name AS references_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
  ON tc.constraint_name = ccu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY';
```

---

## Part 4 — Create your own table

The app owns the 4 tables above. This part is yours: you write the DDL by hand.

You are the QA engineer for this shop. You need somewhere to record the test data you
create and the bugs you find, in the same database as the app so you can join across.

**Exercise 4.1** — Create a table for your test runs. Type it out, do not paste blindly:

```sql
CREATE TABLE test_runs (
    id          SERIAL PRIMARY KEY,
    feature     VARCHAR(50)  NOT NULL,
    test_case   VARCHAR(200) NOT NULL,
    status      VARCHAR(10)  NOT NULL DEFAULT 'pending',
    user_id     INTEGER REFERENCES users(id),
    notes       TEXT,
    run_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT status_is_valid CHECK (status IN ('pass', 'fail', 'blocked', 'pending'))
);
```

Every clause is doing a job — make sure you can explain each one:
- `SERIAL` — auto-incrementing integer, Postgres' version of SQLite's `AUTOINCREMENT`.
- `REFERENCES users(id)` — a foreign key; you cannot record a run for a user who does not exist.
- `CHECK` — a constraint the database enforces, no matter what the application does.
- `DEFAULT now()` — the server fills the timestamp for you.

**Exercise 4.2** — Insert rows and watch the constraints bite:

```sql
INSERT INTO test_runs (feature, test_case, status)
VALUES ('login', 'Valid credentials log the user in', 'pass'),
       ('cart',  'Cannot add more than 10 of one product', 'pass'),
       ('checkout', 'Order under Rs 100 is rejected', 'fail');

-- Now deliberately break it. Each of these SHOULD error. Read the error text.
INSERT INTO test_runs (feature, test_case, status) VALUES ('cart', 'x', 'PASSED');
INSERT INTO test_runs (feature, test_case, user_id) VALUES ('cart', 'x', 9999);
INSERT INTO test_runs (test_case) VALUES ('no feature given');
```

Write down which constraint stopped each one. This is the point of the exercise:
**the database refuses bad data even when the application would have let it through.**

**Exercise 4.3** — Change the table after the fact:

```sql
ALTER TABLE test_runs ADD COLUMN severity VARCHAR(10);
ALTER TABLE test_runs ADD CONSTRAINT severity_is_valid
      CHECK (severity IS NULL OR severity IN ('low', 'medium', 'high'));
CREATE INDEX idx_test_runs_feature ON test_runs (feature);
\d test_runs
```

**Exercise 4.4** — Design one more table yourself, no template given: a `bugs` table
that records a defect you found. It must have a primary key, a NOT NULL title, a
status constrained to a small set of values, a created timestamp defaulting to `now()`,
and a foreign key to `test_runs(id)`. Then insert two rows.

---

## Part 5 — Query the app's data

Use the site at <http://localhost:8000> (serve the frontend with
`python3 -m http.server 8000` from the repo root) and watch what your SQL sees.

**Exercise 5.1 — filtering and sorting**

```sql
SELECT * FROM products ORDER BY price DESC;
SELECT name, price FROM products WHERE price > 1000;
SELECT name, price FROM products WHERE tag = 'Electronics' OR tag = 'Home';
SELECT name FROM products WHERE name ILIKE '%bottle%';   -- ILIKE = case-insensitive
SELECT * FROM products ORDER BY price ASC LIMIT 3;
```

**Exercise 5.2 — aggregates**

```sql
SELECT COUNT(*) FROM products;
SELECT tag, COUNT(*) AS how_many, AVG(price)::numeric(10,2) AS avg_price
FROM products
GROUP BY tag
ORDER BY how_many DESC;

SELECT MIN(price), MAX(price), SUM(price) FROM products;
```

**Exercise 5.3 — joins.** Register a user on the site, add a few things to the cart,
then run:

```sql
-- Whose cart holds what, and what is each line worth?
SELECT u.name, p.name AS product, c.quantity, p.price,
       (p.price * c.quantity) AS line_total
FROM cart_items c
JOIN users u    ON u.id = c.user_id
JOIN products p ON p.id = c.product_id
ORDER BY u.name;

-- Cart total per user
SELECT u.email, SUM(p.price * c.quantity) AS cart_total
FROM cart_items c
JOIN users u    ON u.id = c.user_id
JOIN products p ON p.id = c.product_id
GROUP BY u.email;
```

**Exercise 5.4 — LEFT JOIN.** The difference matters:

```sql
-- Only users who have ordered
SELECT u.name, COUNT(o.id) AS orders
FROM users u JOIN orders o ON o.user_id = u.id
GROUP BY u.name;

-- EVERY user, including those with zero orders
SELECT u.name, COUNT(o.id) AS orders
FROM users u LEFT JOIN orders o ON o.user_id = u.id
GROUP BY u.name
ORDER BY orders DESC;
```

Explain in one sentence why the two results differ.

**Exercise 5.5 — your table joined to the app's.** Link your test runs to real users:

```sql
UPDATE test_runs SET user_id = (SELECT id FROM users WHERE email = 'aarati@test.com')
WHERE feature = 'login';

SELECT t.feature, t.test_case, t.status, u.email AS tested_as
FROM test_runs t
LEFT JOIN users u ON u.id = t.user_id
ORDER BY t.run_at DESC;
```

**Exercise 5.6 — pass rate per feature**, using your own data:

```sql
SELECT feature,
       COUNT(*) AS total,
       COUNT(*) FILTER (WHERE status = 'pass') AS passed,
       ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'pass') / COUNT(*), 1) AS pass_pct
FROM test_runs
GROUP BY feature;
```

---

## Part 6 — Verify the app against the database

This is what the database is really for in QA: the UI can lie, the API response can
lie, the row cannot. For each scenario, do the action in the browser and then prove
the outcome in SQL.

| # | Do this in the app | Prove it in SQL |
|---|--------------------|-----------------|
| 1 | Register a new user | `SELECT id, name, email, phone FROM users ORDER BY id DESC LIMIT 1;` |
| 2 | Look at that row's `password` | `SELECT email, password FROM users ORDER BY id DESC LIMIT 1;` — it must be a hash, never the plain text you typed |
| 3 | Try registering the same email twice | `SELECT email, COUNT(*) FROM users GROUP BY email HAVING COUNT(*) > 1;` — must return **zero rows** |
| 4 | Add 3 of one product to the cart | `SELECT * FROM cart_items WHERE user_id = <you>;` — one row with `quantity = 3`, not three rows |
| 5 | Add 3 more of the same product | still one row, `quantity = 6` |
| 6 | Try to push that product past 10 | quantity must stay at its last good value — the rejected batch writes nothing |
| 7 | Check out | `SELECT * FROM orders ORDER BY id DESC LIMIT 1;` **and** `SELECT COUNT(*) FROM cart_items WHERE user_id = <you>;` — the order exists **and** the cart is now empty |
| 8 | Compare the order total | it must equal the cart total you computed in Exercise 5.3 before checkout |
| 9 | Try to check out with a total under Rs 100 | no new row in `orders` |

**Exercise 6.1** — Scenario 7 is two changes that must both happen or neither: the
order is inserted *and* the cart rows are deleted. Find where that is done in
`backend/models/order.py` and name the line that makes it one transaction.

**Exercise 6.2** — Find an orphan check. Should this ever return rows? Run it and say why:

```sql
SELECT c.* FROM cart_items c
LEFT JOIN users u ON u.id = c.user_id
WHERE u.id IS NULL;
```

---

## Part 7 — Transactions and rollback

Postgres lets you undo. Try it:

```sql
BEGIN;
DELETE FROM products;
SELECT COUNT(*) FROM products;    -- 0, inside your transaction
ROLLBACK;
SELECT COUNT(*) FROM products;    -- 6 again — nothing was really deleted
```

Now the same shape with `COMMIT` instead of `ROLLBACK` — on a copy, not on `products`:

```sql
BEGIN;
UPDATE test_runs SET status = 'blocked' WHERE feature = 'cart';
COMMIT;
```

**Exercise 7.1** — In your own words: what does the app's `db.session.commit()` in
`backend/models/cart_item.py` correspond to here, and what does `db.session.rollback()`
on the over-limit path correspond to?

---

## Part 8 — Reading a query plan

```sql
EXPLAIN ANALYZE SELECT * FROM test_runs WHERE feature = 'cart';
DROP INDEX idx_test_runs_feature;
EXPLAIN ANALYZE SELECT * FROM test_runs WHERE feature = 'cart';
```

**Exercise 8.1** — Which plan says `Seq Scan` and which says `Index Scan`? With only a
handful of rows Postgres may pick `Seq Scan` either way — explain why that is the
*correct* choice on a tiny table. Then recreate the index.

---

## Part 9 — Clean up / reset

Your tables are yours to drop:

```sql
DROP TABLE IF EXISTS bugs;
DROP TABLE IF EXISTS test_runs;
```

To reset the app's data and let it re-seed on next start:

```sql
TRUNCATE cart_items, orders, users RESTART IDENTITY CASCADE;
DELETE FROM products;
```

Then restart `flask run` — `init_db()` re-creates and re-seeds. Or from the backend
folder, with the venv active: `flask seed`.

To go back to SQLite, delete or comment out `DATABASE_URL` in `backend/.env` and
restart. The startup log line tells you which one you are on.

---

## Postgres vs SQLite — differences that will trip you up

| | SQLite | Postgres |
|---|---|---|
| Auto-increment PK | `INTEGER PRIMARY KEY` | `SERIAL` / `GENERATED ... AS IDENTITY` |
| Case-insensitive match | `LIKE` is case-insensitive for ASCII | `LIKE` is case-**sensitive**; use `ILIKE` |
| String quotes | `"` and `'` both often work | `'` is a string, `"` is an identifier — not interchangeable |
| Types | flexible, mostly advisory | strict; `'abc'` into an `INTEGER` column is an error |
| Booleans | 0 / 1 | real `TRUE` / `FALSE` |
| Concurrency | one writer, whole-file lock | many concurrent writers |
| Describe a table | `.schema users` | `\d users` |
| List tables | `.tables` | `\dt` |

---

## What to hand in

1. Your `\d test_runs` output and the `bugs` table you designed in 4.4.
2. The error message from each of the three deliberate failures in 4.2, and the name
   of the constraint that produced it.
3. Results for Exercises 5.3, 5.4, and 5.6.
4. The Part 6 table, filled in with the SQL result for each row and pass/fail.
5. Your written answers to 3.1, 5.4, 6.1, 6.2, 7.1, and 8.1.

Do **not** hand in your `.env` or your connection string.
