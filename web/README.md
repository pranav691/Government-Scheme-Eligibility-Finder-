# Web application (Next.js)

The user interface and server API for the **Government / State Scheme
Eligibility Finder**. Full project documentation, database setup and the
demo guide are in the [root README](../README.md).

## Run locally

```bash
cp .env.example .env.local   # fill in database role passwords and SESSION_SECRET
npm install
npm run dev                  # http://localhost:3000
```

PostgreSQL must be running and the SQL scripts applied first. Smart Search
also needs `database/vector/embedding_service.py` running.

## Layout

| Path | Contents |
|---|---|
| `src/app/` | Pages: `/`, `/schemes`, `/login`, `/student`, `/officer`, `/admin` |
| `src/app/api/` | API routes: `auth`, `schemes`, `search`, `student`, `officer`, `admin` |
| `src/components/` | Shared components (Smart Search, eligibility check, buttons) |
| `src/lib/` | One PostgreSQL pool per database role, session handling, rule validation |

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm start` | Run the production build |
| `npm run lint` | ESLint |
