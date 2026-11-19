# Government / State Scheme Eligibility Finder

A DBMS mini-project (PES University, Level 3) that helps students discover
national and Karnataka government schemes, check whether they qualify, and
apply — with the eligibility logic, security and history tracking enforced
**inside the database**.

**Stack:** PostgreSQL 18 · pgvector · Next.js 16 (React 19) · Python
(sentence-transformers) · Docker

---

## Contents

1. [Features](#features)
2. [Architecture](#architecture)
3. [Database design](#database-design)
4. [DBMS concepts covered](#dbms-concepts-covered)
5. [Security model](#security-model)
6. [Project structure](#project-structure)
7. [Setup and running](#setup-and-running)
8. [Demo accounts](#demo-accounts)
9. [Viva / demo guide](#viva--demo-guide)
10. [Technology choices](#technology-choices)
11. [Team](#team)

---

## Features

| Role | What they can do |
|---|---|
| **Public** | Browse the scheme catalogue, view scheme details, required documents and eligibility rules, and use **Smart Search** (semantic search) |
| **Student** | Maintain a detailed profile (40+ eligibility attributes), check eligibility for any scheme with a reason, see eligibility beside every search result, create and submit applications, track status history |
| **Officer** | Review submitted applications and move them `submitted → under_review → approved / rejected` |
| **Admin** | View users; create, edit, deactivate and delete schemes; add and delete eligibility rule groups and rules; view all applications with full status history |

### How eligibility works

Each scheme has one or more **rule groups**. Rules inside a group are
combined with **AND**; different groups are alternative paths combined with
**OR** (for example *First year* OR *Lateral entry*).

The PL/pgSQL function `evaluate_eligibility(user_id, scheme_id)` reads the
student's profile, evaluates every rule, and returns one of:

| Result | Meaning |
|---|---|
| `eligible` | A complete rule group passed and the scheme's rules are verified |
| `ineligible` | Every rule group failed — the first failure message is returned as the reason |
| `needs_review` | Information is missing, or the scheme's official rules are not fully verified yet |

### Smart Search

A student describes what they need in plain words (*"scholarship for girls
studying engineering"*). The text is turned into a 384-dimensional vector,
pgvector finds the most similar schemes by cosine distance, and — for a
signed-in student — `evaluate_eligibility()` is run on each match.
**Similarity finds relevant schemes; the SQL function decides whether the
student qualifies.**

---

## Architecture

```
 Browser
   │
   ▼
 Next.js (web/)  ── pages + API routes, session cookie (signed JWT)
   │      │
   │      └──► Python embedding service (database/vector/embedding_service.py)
   │            127.0.0.1:8001 — text → 384-d vector (all-MiniLM-L6-v2)
   │
   ▼  one connection pool per least-privilege DB role
 PostgreSQL 18 + pgvector (Docker, 127.0.0.1:5432)
   ├─ 13 tables, constraints, indexes
   ├─ evaluate_eligibility()        function
   ├─ submit_scheme_application()   procedure
   ├─ trg_application_status_change trigger
   ├─ Row-Level Security policies
   └─ scheme_embeddings (vector(384))
```

| Web connection | Database role | Used for |
|---|---|---|
| `db.js` | `scheme_catalogue_reader` | Public catalogue and vector search (read-only) |
| `auth-db.js` | `scheme_auth_reader` | Login only (reads user id, email, hash, role) |
| `student-db.js` | `scheme_student_app` | Student profile, eligibility, applications — restricted by RLS |
| `officer-db.js` | `scheme_officer_app` | Application review; may update only status columns |
| `admin-db.js` | `scheme_admin_app` | Scheme and rule management; read-only on users and applications |

---

## Database design

- **ER diagram (Chen notation):** [`eligibility_finder_chen_er_corrected.svg`](eligibility_finder_chen_er_corrected.svg)
- **Relational schema:** [`relational_schema.svg`](relational_schema.svg)

### Tables

| Table | Purpose | Key relationships |
|---|---|---|
| `roles` | admin / student / officer | — |
| `users` | Accounts with bcrypt password hashes | `role_id → roles` |
| `user_profiles` | One profile per user (1:1, `UNIQUE user_id`) | `user_id → users` (CASCADE) |
| `schemes` | National and state schemes | — |
| `eligibility_rule_groups` | Alternative (OR) rule groups per scheme | `scheme_id → schemes` (CASCADE) |
| `eligibility_rules` | AND-combined conditions | `group_id → rule_groups` (CASCADE), `(attribute_name, value_type) → eligibility_attributes` |
| `eligibility_attributes` | Catalogue of attributes rules may use, with their type | — |
| `categories` | Self-referencing category hierarchy | `parent_category_id → categories` |
| `scheme_categories` | M:N schemes ↔ categories (composite PK) | both FKs CASCADE |
| `scheme_documents` | Documents required by a scheme | `scheme_id → schemes` (CASCADE) |
| `applications` | One application per user per scheme | `user_id → users`, `scheme_id → schemes` (RESTRICT) |
| `application_status_log` | Automatic status history, records who changed it | `application_id → applications`, `changed_by → users` |
| `scheme_embeddings` | One 384-d vector per scheme | `scheme_id → schemes` (CASCADE) |

### Constraints used

`PRIMARY KEY`, composite primary key, `FOREIGN KEY` (with `CASCADE`,
`RESTRICT` and `SET NULL`), composite foreign key, `UNIQUE`, composite
`UNIQUE`, `NOT NULL`, `DEFAULT`, identity columns, and many `CHECK`
constraints — including multi-column checks such as *a state scheme must
have a state name* and *a rule must store exactly one value matching its
type*.

---

## DBMS concepts covered

| Rubric area | Where |
|---|---|
| Database design (ER, relational schema) | `*.svg` diagrams, [Database design](#database-design) |
| Database creation, constraints, sample data | `02_tables_constraints.sql`, `03_seed_data.sql`, `05_patch_rule_corrections.sql` |
| CRUD | `06_crud_operations.sql`; admin pages in the web app |
| JOIN, nested, correlated, recursive queries | `07_required_queries.sql` |
| CTE, function, procedure, trigger | `08_advanced_sql.sql` |
| Vector database (create + read/update/delete) | `scheme_embeddings`, `database/vector/*.py`, Smart Search |
| Authentication | bcrypt hashes, signed `httpOnly` session cookie |
| Authorization | 5 database roles with table and column grants (`09`–`17`), Row-Level Security (`19`), role checks on every API route |
| Transactions and locking | `FOR UPDATE` in submit and status-change routes |
| Web application + DB integration | `web/` |

---

## Security model

- **SQL injection:** every query is parameterised (`$1, $2 …`).
- **Identity:** the user id always comes from the signed session cookie,
  never from the request body or URL.
- **Least privilege:** each part of the app connects with its own database
  role, granted only what it needs. Only the login role can read
  `password_hash`.
- **Row-Level Security:** the student role can only see and change rows
  where `user_id = app.current_user_id`. The value is set per transaction
  (`set_config(..., true)`), and with no value the student sees nothing.
- **Defence in depth:** web pages check the role (redirect), API routes
  check the role (`401` / `403`), and the database enforces grants, RLS and
  constraints even if the web layer were bypassed.
- **Status workflow in the database:** the trigger in `08_advanced_sql.sql` enforces the allowed transitions (draft → submitted → under_review →
  approved / rejected, plus withdrawn). Students may only submit or withdraw,
  officers may only review / approve / reject, and a student submission is
  re-checked by `evaluate_eligibility()` inside the trigger. Students also
  have column-level `UPDATE` rights only, so they cannot edit their own
  status or the officer-verified renewal evidence. A student may delete only their own **draft**
  applications ("Delete Draft" button): `GRANT DELETE` plus a RESTRICTIVE
  Row-Level Security policy `USING (current_status = 'draft')`.
- **Audit trail:** the same trigger records every application status change
  and the user who made it.
- **Web hardening:** `src/proxy.js` rejects cross-site state-changing
  requests (Origin check); login and search are rate limited; every request's
  session is re-checked against the database, so a deactivated user or changed
  role takes effect immediately; login takes the same time for unknown
  emails.
- **Rule integrity:** a composite foreign key and a CHECK constraint stop
  admins from saving rules the eligibility function cannot evaluate.
- **Safe links:** scheme links are shown only for approved government
  domains.
- **Secrets:** `.env` files are git-ignored; see the `.env.example` files.

---

## Project structure

```
.
├── README.md
├── docker-compose.yml                  PostgreSQL 18 + pgvector container
├── .env.example                        POSTGRES_PASSWORD for Docker
├── eligibility_finder_chen_er_corrected.svg
├── relational_schema.svg
├── database/
│   ├── sql/                            run in numeric order (see below)
│   │   ├── 02_tables_constraints.sql   original schema
│   │   ├── 03_seed_data.sql            25 schemes, demo users and profiles
│   │   ├── 04_patch_scheme_source_urls.sql
│   │   ├── 05_patch_rule_corrections.sql   (+ 05_verify_…)
│   │   ├── 06_crud_operations.sql      CRUD demo (self-cleaning)
│   │   ├── 07_required_queries.sql     JOIN / nested / correlated / recursive
│   │   ├── 08_advanced_sql.sql         CTE, function, procedure, trigger
│   │   ├── 09 … 16                     database roles and grants
│   │   ├── 17_search_permissions.sql   read-only vector access
│   │   ├── 18_rule_attribute_catalog.sql
│   │   ├── 19_row_level_security.sql
│   │   ├── 20_demo_passwords.sql
│   │   └── 21_viva_demo_commands.sql   one ordered script for the viva
│   └── vector/
│       ├── requirements.txt
│       ├── generate_embeddings.py      create / refresh scheme vectors
│       ├── semantic_search.py          command-line semantic search
│       ├── vector_rud_demo.py          read / update / delete demo (rolled back)
│       └── embedding_service.py        local service used by the website
└── web/                                Next.js application
    ├── .env.example
    └── src/
        ├── app/                        pages and API routes (api/*)
        ├── components/                 shared UI (SemanticSearch, buttons)
        └── lib/                        DB pools, session, rule validation
```

---

## Setup and running

### Prerequisites

- Docker Desktop
- Node.js 20 or newer
- Python 3.12
- pgAdmin 4 (or `psql`)

### 1. Start PostgreSQL

```bash
cp .env.example .env          # then set a strong POSTGRES_PASSWORD
docker compose up -d
```

This creates the database `scheme_finder` and the owner `scheme_user`,
listening only on `127.0.0.1:5432`.

### 2. Create the schema and data

Connect as `scheme_user` to `scheme_finder` and run, **in this order**:

| Order | Script | Notes |
|---|---|---|
| 1 | `02_tables_constraints.sql` | Tables and constraints |
| 2 | `03_seed_data.sql` | Run once only |
| 3 | `04_patch_scheme_source_urls.sql` | |
| 4 | `05_patch_rule_corrections.sql` | Optional check: `05_verify_rule_corrections.sql` |
| 5 | `08_advanced_sql.sql` | Creates the function, procedure and trigger |
| 6 | `09` → `14`, `16` | Database roles and grants |
| 7 | Generate embeddings (step 3 below) | |
| 8 | `17_search_permissions.sql` | |
| 9 | `18_rule_attribute_catalog.sql` | |
| 10 | `19_row_level_security.sql` | |
| 11 | `20_demo_passwords.sql` | Sets the demo password |

`06` and `07` are demonstration scripts and can be run at any time.

**Updating a database created from an older version of these scripts:** pull the
latest files, then re-run `08_advanced_sql.sql`, `13_student_application_permissions.sql`,
`16_admin_permissions.sql` and `19_row_level_security.sql` (in that order). All four
are safe to re-run, and afterwards the database is identical to a fresh build.

**Give each login role a password** (use your own values, and put the same
values in `web/.env.local`):

```sql
ALTER ROLE scheme_catalogue_reader LOGIN PASSWORD 'change_me_1';
ALTER ROLE scheme_auth_reader      PASSWORD 'change_me_2';
ALTER ROLE scheme_student_app      PASSWORD 'change_me_3';
ALTER ROLE scheme_officer_app      PASSWORD 'change_me_4';
ALTER ROLE scheme_admin_app        PASSWORD 'change_me_5';
```

### 3. Vector embeddings (Python)

```bash
cd database/vector
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt   # Windows
.venv\Scripts\python.exe generate_embeddings.py
```

The first run downloads the `all-MiniLM-L6-v2` model (~90 MB).

### 4. Start the embedding service (needed for Smart Search)

In a separate terminal, leave it running:

```bash
cd database/vector
.venv\Scripts\python.exe embedding_service.py
```

### 5. Run the web application

```bash
cd web
cp .env.example .env.local    # fill in the role passwords and SESSION_SECRET
npm install
npm run dev
```

Open <http://localhost:3000>.

Generate a session secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Demo accounts

After `20_demo_passwords.sql`, every seeded account uses the password
**`Demo@1234`** (local demo data only), unless you changed that account's
password afterwards.

| Role | Email |
|---|---|
| Admin | `admin@schemefinder.example` |
| Officer | `officer@schemefinder.example` |
| Student | `ananya.rao@example.com` |
| Student | `rahul.kumar@example.com` |
| Student | `aisha.khan@example.com` |
| Student | `kavya.hegde@example.com` |
| Student | `manjunath.gowda@example.com` |
| Student | `arjun.patil@example.com` |
| Student | `lakshmi.nayak@example.com` |

---

## Viva / demo guide

`database/sql/21_viva_demo_commands.sql` contains every demonstration in
order. Each block can be run on its own and all changes are rolled back.

1. **Overview** — tables and users with roles
2. **Constraints** — invalid inserts rejected by the database
3. **CRUD** — insert, read, update, delete a scheme
4. **Queries** — JOIN, nested, correlated, recursive
5. **Advanced SQL** — CTE, eligibility function, procedure, trigger
6. **Authorization** — roles, grants, RLS policies, RLS in action
7. **Vector database** — stored embeddings and similarity search

Suggested web demo flow:

1. Browse `/schemes` and run a Smart Search while signed out.
2. Sign in as a student → update the profile → check eligibility → search
   again (eligibility badges appear) → apply → submit.
3. Try `/admin` as the student → redirected; `/api/admin/applications` → `403`.
4. Sign in as the officer → move the application to *under review* → *approved*.
5. Sign in as the admin → add a scheme, a rule group and a rule → view the
   application history showing who changed each status.

---

## Technology choices

| Technology | Why |
|---|---|
| **PostgreSQL** | Strong relational integrity (PK/FK/CHECK), PL/pgSQL functions, procedures and triggers, CTEs, transactions, roles with column-level grants, and Row-Level Security |
| **pgvector** | Stores embeddings next to the relational data, so similarity search and eligibility rules run in the same database and can be joined |
| **Next.js** | One project for the user interface and the server API routes; the database is only ever reached from the server |
| **sentence-transformers** | Small, free embedding model (384 dimensions) that runs locally — no paid API or internet needed after the first download |
| **Docker** | Same PostgreSQL + pgvector version on every team member's machine |

---

## Team

| Name | SRN | Contribution |
|---|---|---|
|  |  |  |
|  |  |  |

---

*Scheme data is for academic demonstration only. Always confirm
eligibility, benefits and deadlines on the official scheme website.*

---

## Known limitations

- **Renewal evidence:** rules on `previous_award_verified` and
  `attendance_percentage` are officer-verified evidence. The database and the
  rule engine support them, but the web UI has no screen for officers to
  record them yet, so renewal-only rules show "needs review". Fresh
  applications are unaffected.
- **Rate limiting** is in memory (single server). Use a shared store such as
  Redis if the app is ever scaled out.
- **Embeddings** are refreshed automatically when an admin creates or edits a
  scheme, but only if the embedding service is running; otherwise run
  `generate_embeddings.py`.
