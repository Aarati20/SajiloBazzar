# Postgres Exercise — SajiloBazar

By default the app needs **no database setup**: it uses a SQLite file and fills it in
on first start. In this exercise you run it on **your own Postgres database** instead,
then learn SQL on real shop data: first simple queries, then your own tables, joins,
and checking the app's behaviour straight from the database.

Work through the parts in order. Everything after Part 2 assumes the app is running
on Postgres.

| Part | What you do | Level |
|---|---|---|
| 1–2 | Get a Postgres database and point the app at it | Setup |
| 3 | First queries: `SELECT`, `WHERE`, `ORDER BY`, `COUNT` | Beginner |
| 4 | Look at how the tables are built | Beginner |
| 5 | Create your own tables | Intermediate |
| 6 | Group, count and join the app's data | Intermediate |
| 7 | Prove the app works by checking the database | QA |
| 8–9 | Transactions, foreign keys, query plans | Advanced |
| 10 | Clean up | — |

---

## Part 1 — Get a Postgres database

Pick **one** option. A is quickest and needs no install; B runs on your laptop and
works offline.

### Option A — Neon (free cloud Postgres)

1. Sign up at <https://neon.tech> (free tier, no card).
2. Create a project called `sajilobazar`.
3. Copy the **connection string** from the dashboard. It looks like:

   ```
   postgresql://neondb_owner:SOMEPASSWORD@ep-cool-name-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

You still need the `psql` client on your laptop to type queries:

```bash
brew install libpq
brew link --force libpq       # puts psql on your PATH
psql --version
```

### Option B — Postgres on your Mac (Homebrew)

```bash
brew install postgresql@16
brew services start postgresql@16     # starts now and after every reboot
createdb sajilobazar
psql -d sajilobazar -c "SELECT version();"
```

Your connection string is `postgresql://YOUR_MAC_USERNAME@localhost:5432/sajilobazar`
(`whoami` prints your username; a local install usually needs no password).

> **"Library not loaded: libicu…"** when Postgres starts means Homebrew updated a
> library Postgres was built against. Fix it with `brew reinstall postgresql@16`.
>
> **Windows:** install from <https://www.postgresql.org/download/windows/> (includes
> `psql` and pgAdmin). Your string is
> `postgresql://postgres:YOURPASSWORD@localhost:5432/sajilobazar`.

### Check the connection before going further

```bash
psql "YOUR_CONNECTION_STRING" -c "SELECT current_database(), current_user;"
```

If that prints a row, you're connected. If it hangs or errors, fix that first —
nothing below works until it does.

---

## Part 2 — Point the app at your database

The app reads `DATABASE_URL` from `backend/.env`. If it isn't set, the app quietly
uses SQLite, so **setting it is the whole point of this step**.

Create `backend/.env` (it is gitignored, so it stays on your laptop):

```bash
cd backend
cat > .env <<'EOF'
DATABASE_URL=postgresql://...paste your connection string here...
SECRET_KEY=any-random-string-for-local-dev
EOF
```

- The value must start with `postgresql://` (the app also fixes `postgres://` for you).
- Neon strings must keep `?sslmode=require` on the end.
- Never commit this file, and never paste a real password into a chat or a PR.

Install and start the backend (Python 3.10 or newer):

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
flask run --debug --port 5000
```

**Read the first log line.** It says which database you got, with the password hidden:

```
 * Database: postgresql://neondb_owner:***@ep-cool-name-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
```

If it says `sqlite:///...`, the `.env` file wasn't found: check it is inside
`backend/` (not the repo root) and restart.

On first start the app sets up *your* database by itself (`init_db()` in
`backend/app.py`): it creates **5 tables**, adds **24 products** in 6 categories, and
creates the demo user `aarati@test.com` / `test1234`.

Start the website too, in a second terminal from the repo root, and open
<http://127.0.0.1:8000/login.html> (use `127.0.0.1`, not `localhost`, or login won't stick):

```bash
python3 -m http.server 8000 --bind 127.0.0.1
```

---

## Part 3 — Your first queries (beginner)

Open a **third** terminal and connect:

```bash
psql "YOUR_CONNECTION_STRING"
```

You now have a prompt like `sajilobazar=>`. Type a query, end it with `;`, press Enter.
Two tips: type `\x auto` to make wide rows readable, and `\q` to quit. (Commands that
start with `\` don't need a `;`.)

### 3a. See everything in a table

```sql
SELECT * FROM products;
```

`SELECT` means "show me", `*` means "every column", `FROM products` says which table.
You should see 24 rows.

### 3b. Pick only some columns

```sql
SELECT name, price FROM products;
```

### 3c. Filter rows with `WHERE`

```sql
SELECT name, price FROM products WHERE price < 300;          -- cheap things
SELECT name, price FROM products WHERE tag = 'Grocery';      -- one category
SELECT name FROM products WHERE name = 'Wild honey';         -- one exact product
```

Text goes in **single quotes**, and `=` is case-sensitive: `'grocery'` finds nothing.

### 3d. Combine conditions with `AND` / `OR`

```sql
SELECT name, price FROM products WHERE tag = 'Bags' AND price < 1500;
SELECT name, tag   FROM products WHERE tag = 'Home' OR tag = 'Grocery';
SELECT name, tag   FROM products WHERE tag IN ('Home', 'Grocery');   -- same as the OR
SELECT name, price FROM products WHERE price BETWEEN 500 AND 1000;  -- includes both ends
```

### 3e. Sort with `ORDER BY`, keep the top few with `LIMIT`

```sql
SELECT name, price FROM products ORDER BY price;             -- cheapest first
SELECT name, price FROM products ORDER BY price DESC;        -- most expensive first
SELECT name, price FROM products ORDER BY price DESC LIMIT 3;
SELECT name FROM products ORDER BY name;                     -- A to Z
```

### 3f. Search inside text

```sql
SELECT name FROM products WHERE name LIKE '%tea%';    -- contains "tea" (case matters)
SELECT name FROM products WHERE name ILIKE '%TEA%';   -- ILIKE ignores case
SELECT name FROM products WHERE name ILIKE 's%';      -- starts with s
```

`%` means "any text here". The shop's search box does the same thing as `ILIKE`.

### 3g. Count, and list unique values

```sql
SELECT COUNT(*) FROM products;                          -- how many rows
SELECT COUNT(*) FROM products WHERE price > 1000;
SELECT DISTINCT tag FROM products ORDER BY tag;         -- each category once
SELECT name, price, price * 2 AS price_for_two FROM products;   -- maths + a column name
```

### Try it yourself

Write a query for each, then check your answer.

1. The names of all Stationery products.
2. Products that cost more than Rs 2,000, most expensive first.
3. The single cheapest product.
4. How many products cost under Rs 500?
5. Every product whose name contains "bag" in any case.

<details>
<summary>Answers</summary>

```sql
SELECT name FROM products WHERE tag = 'Stationery';
SELECT name, price FROM products WHERE price > 2000 ORDER BY price DESC;
SELECT name, price FROM products ORDER BY price LIMIT 1;
SELECT COUNT(*) FROM products WHERE price < 500;
SELECT name FROM products WHERE name ILIKE '%bag%';
```

You should get 4 names, 3 products, the Notebook set (Rs 95), 9, and the Jute tote bag.
</details>

---

## Part 4 — How the tables are built

Backslash commands describe the database rather than query it. Type them on their
own line, with no `;` and no comment after them:

| Command | Shows |
|---|---|
| `\dt` | every table |
| `\d products` | one table: columns, types, keys, indexes |
| `\d+ orders` | the same, with extra detail |
| `\di` | every index |
| `\du` | users/roles |

```sql
\dt
\d products
```

The five tables the app created:

| Table         | Columns                                                              | Written when        |
|---------------|----------------------------------------------------------------------|---------------------|
| `users`       | id, name, email (unique), phone, password (a hash)                   | someone registers   |
| `products`    | id, name, price, tag (the category), image_url, description          | seeded at startup   |
| `cart_items`  | id, user_id → users, product_id → products, quantity                 | add to cart         |
| `orders`      | id, user_id → users, address, payment_method, total, created_at      | checkout            |
| `order_items` | id, order_id → orders, product_id → products, name, price, quantity  | checkout            |

**Exercise 4.1** — Run `\d users` and answer in your own words:
- What is the primary key, and what makes `email` unique?
- What Postgres type did `db.String(120)` become? What did `db.Float` become?
- Why is `password` 255 characters long when nobody's password is?

**Exercise 4.2** — The same information is in the system catalog. Get it with SQL:

```sql
SELECT column_name, data_type, is_nullable, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'orders'
ORDER BY ordinal_position;
```

**Exercise 4.3** — List every foreign key (every "→" in the table above):

```sql
SELECT tc.table_name, kcu.column_name,
       ccu.table_name AS references_table, ccu.column_name AS references_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
  ON tc.constraint_name = ccu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name;
```

---

## Part 5 — Create your own tables

The app owns the five tables above. These are yours: you write the SQL by hand.

You are the QA engineer for this shop and need somewhere to record test runs and bugs,
in the same database as the app so you can join them to its data.

**Exercise 5.1** — Create a table for test runs. Type it out rather than pasting:

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

Each clause does a job:
- `SERIAL PRIMARY KEY` — a number that counts up by itself and identifies each row.
- `NOT NULL` — this column must always have a value.
- `REFERENCES users(id)` — a foreign key: you can't point at a user who doesn't exist.
- `CHECK (...)` — a rule the database enforces, whatever the application does.
- `DEFAULT now()` — the database fills in the time for you.

**Exercise 5.2** — Insert rows, then watch the rules stop bad data:

```sql
INSERT INTO test_runs (feature, test_case, status)
VALUES ('login',    'Valid credentials log the user in',      'pass'),
       ('cart',     'Cannot add more than 10 of one product', 'pass'),
       ('checkout', 'Order under Rs 100 is rejected',          'fail');

SELECT * FROM test_runs;

-- Each of these SHOULD fail. Read each error message.
INSERT INTO test_runs (feature, test_case, status) VALUES ('cart', 'x', 'PASSED');
INSERT INTO test_runs (feature, test_case, user_id) VALUES ('cart', 'x', 9999);
INSERT INTO test_runs (test_case) VALUES ('no feature given');
```

Write down which rule stopped each one. That is the lesson: **the database refuses bad
data even when the application would have let it through.**

**Exercise 5.3** — Change a table after creating it, and change rows:

```sql
ALTER TABLE test_runs ADD COLUMN severity VARCHAR(10);
ALTER TABLE test_runs ADD CONSTRAINT severity_is_valid
      CHECK (severity IS NULL OR severity IN ('low', 'medium', 'high'));
CREATE INDEX idx_test_runs_feature ON test_runs (feature);

UPDATE test_runs SET severity = 'high' WHERE status = 'fail';
DELETE FROM test_runs WHERE feature = 'nothing-like-this';   -- deletes 0 rows
\d test_runs
```

Always write the `WHERE` on an `UPDATE` or `DELETE` first: without it, *every* row changes.

**Exercise 5.4** — Design a table yourself, no template: `bugs`, for a defect you found.
It needs a primary key, a NOT NULL title, a status limited to a few values, a created
time defaulting to `now()`, and a foreign key to `test_runs(id)`. Insert two rows.

---

## Part 6 — Group, count and join the app's data

**Exercise 6.1 — grouping**

```sql
SELECT tag, COUNT(*) AS how_many, ROUND(AVG(price)::numeric, 2) AS avg_price
FROM products
GROUP BY tag
ORDER BY avg_price DESC;

SELECT MIN(price), MAX(price), SUM(price) FROM products;

-- HAVING filters groups, the way WHERE filters rows
SELECT tag, AVG(price) FROM products GROUP BY tag HAVING AVG(price) > 1000;
```

**Exercise 6.2 — joins.** Log in on the site, add a few products to the cart, then:

```sql
-- Whose cart holds what, and what is each line worth?
SELECT u.name, p.name AS product, c.quantity, p.price,
       p.price * c.quantity AS line_total
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

**Exercise 6.3 — what was in each order.** Place an order on the site, then:

```sql
SELECT o.id AS order_id, o.created_at::date AS day, o.payment_method,
       oi.name, oi.quantity, oi.price * oi.quantity AS line_total, o.total
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
ORDER BY o.id, oi.id;
```

Check that each order's line totals add up to its `total`.

**Exercise 6.4 — `LEFT JOIN`.** The difference matters:

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

-- Products nobody has ever ordered
SELECT p.name
FROM products p LEFT JOIN order_items oi ON oi.product_id = p.id
WHERE oi.id IS NULL
ORDER BY p.name;
```

Explain in one sentence why the first two results differ.

**Exercise 6.5 — your table joined to the app's**

```sql
UPDATE test_runs SET user_id = (SELECT id FROM users WHERE email = 'aarati@test.com')
WHERE feature = 'login';

SELECT t.feature, t.test_case, t.status, u.email AS tested_as
FROM test_runs t
LEFT JOIN users u ON u.id = t.user_id
ORDER BY t.run_at DESC;
```

**Exercise 6.6 — pass rate per feature**

```sql
SELECT feature,
       COUNT(*) AS total,
       COUNT(*) FILTER (WHERE status = 'pass') AS passed,
       ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'pass') / COUNT(*), 1) AS pass_pct
FROM test_runs
GROUP BY feature;
```

---

## Part 7 — Prove the app works by checking the database

This is what the database is for in QA: the screen can be wrong and the API response
can be wrong, but the row is what was really saved. Do each action in the browser, then
prove the result in SQL. (Find your user id with
`SELECT id, email FROM users ORDER BY id;`.)

| # | Do this in the app | Prove it in SQL |
|---|--------------------|-----------------|
| 1 | Register a new user | `SELECT id, name, email, phone FROM users ORDER BY id DESC LIMIT 1;` |
| 2 | Look at that row's password | `SELECT email, password FROM users ORDER BY id DESC LIMIT 1;` — must be a hash, never what you typed |
| 3 | Register the same email twice | `SELECT email, COUNT(*) FROM users GROUP BY email HAVING COUNT(*) > 1;` — **zero rows** |
| 4 | Add 3 of one product to the cart | `SELECT * FROM cart_items WHERE user_id = <you>;` — one row, `quantity = 3`, not three rows |
| 5 | Add 3 more of the same product | still one row, `quantity = 6` |
| 6 | Try to push that product past 10 | quantity stays at its last good value — the rejected add writes nothing |
| 7 | Check out | `SELECT * FROM orders ORDER BY id DESC LIMIT 1;` **and** `SELECT COUNT(*) FROM cart_items WHERE user_id = <you>;` — the order exists **and** the cart is empty |
| 8 | Look at the order's lines | `SELECT * FROM order_items WHERE order_id = <new order>;` — one row per product, quantities match the cart |
| 9 | Check out with only a Notebook set (Rs 95) | no new row in `orders` — the minimum is Rs 100 |
| 10 | Delete an order on My orders | the order **and** its `order_items` rows are gone |

**Exercise 7.1** — Scenario 7 is two changes that must both happen or neither: insert
the order *and* delete the cart rows. Find where that happens in
`backend/models/order.py` and name the line that saves them together.

**Exercise 7.2** — `order_items` copies the product's name and price instead of just
pointing at the product. Prove why with a rollback-safe experiment:

```sql
BEGIN;
UPDATE products SET price = price + 500 WHERE name = 'Ilam green tea';
SELECT oi.name, oi.price AS price_paid, p.price AS price_now
FROM order_items oi JOIN products p ON p.id = oi.product_id;
ROLLBACK;
```

**Exercise 7.3** — Orphan check. Should this ever return rows? Run it and say why:

```sql
SELECT c.* FROM cart_items c
LEFT JOIN users u ON u.id = c.user_id
WHERE u.id IS NULL;
```

---

## Part 8 — Transactions and foreign keys

A transaction lets you try changes and undo them:

```sql
BEGIN;
UPDATE products SET price = 0;
SELECT name, price FROM products LIMIT 3;   -- all 0, but only inside your transaction
ROLLBACK;
SELECT name, price FROM products LIMIT 3;   -- real prices again: nothing was saved
```

The same shape with `COMMIT` keeps the change — try it on your own table:

```sql
BEGIN;
UPDATE test_runs SET status = 'blocked' WHERE feature = 'cart';
COMMIT;
```

Now see a foreign key protect the data. Try to delete an order directly:

```sql
BEGIN;
DELETE FROM orders WHERE id = (SELECT MIN(order_id) FROM order_items);
ROLLBACK;
```

It fails: `order_items` rows still point at that order. When you delete an order on
My orders, the app deletes its `order_items` first, in the same transaction.

**Exercise 8.1** — What does the app's `db.session.commit()` in
`backend/models/cart_item.py` correspond to here, and what does
`db.session.rollback()` on the over-limit path correspond to?

**Exercise 8.2** — Why is it the app, not Postgres, that removes `order_items` when an
order is deleted? (Hint: run `\d order_items` and read the foreign key line.)

---

## Part 9 — Reading a query plan

```sql
EXPLAIN ANALYZE SELECT * FROM test_runs WHERE feature = 'cart';
DROP INDEX idx_test_runs_feature;
EXPLAIN ANALYZE SELECT * FROM test_runs WHERE feature = 'cart';
CREATE INDEX idx_test_runs_feature ON test_runs (feature);
```

**Exercise 9.1** — Which plan says `Seq Scan` and which `Index Scan`? On a table this
small Postgres may choose `Seq Scan` both times. Explain why that is the *right* choice
for a handful of rows.

---

## Part 10 — Clean up

Drop your own tables:

```sql
DROP TABLE IF EXISTS bugs;
DROP TABLE IF EXISTS test_runs;
```

To wipe the app's data and let it set itself up again:

```sql
TRUNCATE order_items, cart_items, orders, users, products RESTART IDENTITY CASCADE;
```

Then restart `flask run` (or run `flask seed` from `backend/` with the venv active):
the tables refill with the demo user and 24 products.

To go back to SQLite, delete or comment out `DATABASE_URL` in `backend/.env` and restart.
The startup log line tells you which database you're on.

---

## Postgres vs SQLite — differences that trip people up

| | SQLite | Postgres |
|---|---|---|
| Auto-increment id | `INTEGER PRIMARY KEY` | `SERIAL` or `GENERATED ... AS IDENTITY` |
| Case-insensitive search | `LIKE` ignores case (for English letters) | `LIKE` is case-**sensitive**; use `ILIKE` |
| Quotes | `"` and `'` often both work | `'text'` is a string, `"name"` is a column/table name |
| Types | flexible | strict: `'abc'` into an `INTEGER` column is an error |
| Booleans | 0 / 1 | real `TRUE` / `FALSE` |
| Many users writing at once | one writer at a time | many at once |
| Describe a table | `.schema users` | `\d users` |
| List tables | `.tables` | `\dt` |

---

## What to hand in

1. Your answers to the five "Try it yourself" queries in Part 3.
2. Your `\d test_runs` output and the `bugs` table you designed in 5.4.
3. The error from each of the three deliberate failures in 5.2, and the rule that caused it.
4. Your results for 6.2, 6.3, 6.4 and 6.6.
5. The Part 7 table filled in with the SQL result and pass/fail for each row.
6. Written answers to 4.1, 6.4, 7.1, 7.2, 7.3, 8.1, 8.2 and 9.1.

Do **not** hand in your `.env` file or your connection string.
