# Developer Assessment Platform

A full-stack platform for practicing and assessing programming knowledge through
MCQs, theory questions, code-output questions, and debugging questions — with a
candidate-facing app, a separate admin app, and a single backend API backed by
PostgreSQL.

Design: strict black & white UI across both frontends — no color anywhere, just
type, hairline borders, and a code-editor-inspired accent language (monospace
tags, line-numbered code blocks). Dark mode is the default; light mode is one
click away.

---

## 1. Architecture

```text
developer-assessment-platform/
├── apps/
│   ├── user-web/     Next.js 14 (App Router) — candidate-facing app, port 3000
│   ├── admin-web/     Next.js 14 (App Router) — admin console, port 3001
│   └── api/            Fastify + TypeScript — REST API, port 4000
│
├── packages/
│   ├── database/      Drizzle ORM schema, migrations, DB client
│   ├── shared/         Zod validation schemas + cross-cutting constants
│   └── types/           Shared TypeScript domain types (used by API + both frontends)
│
├── docker-compose.yml  PostgreSQL for local development
└── package.json          npm workspaces root
```

**Why this shape:** Postgres exists purely as a **content store** for
subjects, topics, questions, and their options, plus admin accounts and a
couple of global settings. The API's public surface is read-only content
(`GET /subjects`, `GET /questions`, ...) — there is no candidate account, no
server-side session, and no per-visitor identity of any kind. Everything a
candidate *does* — generating a quiz, grading it, tracking progress over
time, bookmarking a question — happens entirely in the browser and is
stored in that browser's `localStorage`. See [Section 7](#7-what-lives-where)
for the full breakdown.

The admin app manages content only. There is nothing to browse under
"assessments" or "attempts" in the admin console, because none of that data
ever reaches the server.

### Technology choices

| Concern | Choice | Why |
|---|---|---|
| User & Admin frontends | Next.js 14 (App Router) + TypeScript | Server components for fast first paint on content pages, client components for the quiz engine (which needs `localStorage`) |
| Backend | Fastify + TypeScript | Low overhead, first-class TypeScript, plugin model that maps cleanly onto "public content API" vs "admin API" |
| Database | PostgreSQL | Relational integrity for content (questions → topics → subjects) |
| ORM | Drizzle ORM | Typed schema-as-code, SQL-shaped query builder, lightweight migrations |
| Validation | Zod | Shared between route handlers; the same schemas describe the wire contract |
| Styling | Tailwind CSS | Utility-first, easy to keep the black & white system consistent across two apps |
| Auth | `@fastify/jwt` + Argon2, HttpOnly cookies | Admin sessions carried in an HttpOnly/Secure cookie (not localStorage); passwords hashed with Argon2id |

---

## 2. Database schema

```text
subjects              — id, name, slug, description, icon, isPublished, timestamps
topics                — id, subjectId → subjects, name, slug, sortOrder, timestamps
questions              — id, subjectId → subjects, topicId → topics, type, difficulty,
                          questionText, codeSnippet, codeLanguage, explanation,
                          isPublished, timestamps
question_options       — id, questionId → questions, optionText, isCorrect,
                          explanation, sortOrder
admin_users            — id, email, passwordHash (argon2), name, role, createdAt
settings               — key/value store; currently holds the weak-area
                          accuracy threshold and minimum-attempts rule
                          (global app config, tunable from /admin/settings —
                          not per-user data)
```

That's the entire schema. There is no `assessments`, `attempts`,
`attempt_answers`, or `bookmarks` table, and no `anonymousUserId` anywhere in
the database — see [Section 7](#7-what-lives-where) for where that data
lives instead.

---

## 3. Local setup

### Prerequisites
- Node.js 18.18+
- Docker (for PostgreSQL) — or a local Postgres instance

### 1. Install dependencies

```bash
npm install
```

This is an npm workspaces monorepo — one install at the root wires up all five
packages (`apps/*`, `packages/*`).

### 2. Start PostgreSQL

```bash
docker compose up -d
```

This starts Postgres 16 on `localhost:5432` with database `dev_assessment`,
user `postgres`, password `postgres` (see `docker-compose.yml`). If you'd
rather use an existing Postgres instance, just point `DATABASE_URL` at it.

### 3. Configure environment variables

```bash
cp .env.example .env
cp .env.example apps/api/.env
```

Edit as needed — see [Environment variables](#4-environment-variables) below.
In particular, set `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` before seeding
(step 5) — the seed script requires both and will not create an admin user
with a hardcoded password.

### 4. Run migrations

```bash
npm run db:migrate
```

### 5. Seed sample data

```bash
npm run db:seed
```

This creates:
- An admin user using the `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` you set
  in `.env` (never hardcoded — the seed script fails fast if either is
  missing)
- 4 subjects (JavaScript, React, TypeScript, SQL) with realistic topics
- ~13 sample questions spanning theory, code-output, debugging, and
  multiple-correct question types

### 6. Run the apps

```bash
npm run dev
```

This runs all three apps concurrently:
- API → http://localhost:4000
- Candidate app → http://localhost:3000
- Admin app → http://localhost:3001/admin/login

Or run them individually: `npm run dev:api`, `npm run dev:user`, `npm run dev:admin`.

---

## 4. Environment variables

| Variable | Used by | Description |
|---|---|---|
| `DATABASE_URL` | api, database package | Postgres connection string |
| `PORT` | api | API port (default 4000) |
| `ADMIN_SECRET` | api | JWT signing secret for admin sessions — set a long random value in production; required (no fallback) when `NODE_ENV=production` |
| `JWT_EXPIRES_IN` | api | Admin session lifetime (default `12h`) |
| `CORS_ORIGINS` | api | Comma-separated list of allowed frontend origins |
| `SEED_ADMIN_EMAIL` | api (seed script only) | Email for the admin user created by `npm run db:seed` |
| `SEED_ADMIN_PASSWORD` | api (seed script only) | Password for that admin user — the seed script refuses to run without this set |
| `NEXT_PUBLIC_API_URL` | user-web | Base URL of the API's public routes (`/api/v1`) |
| `NEXT_PUBLIC_ADMIN_API_URL` | admin-web | Base URL of the API's public+admin routes (`/api/v1`) |

There's no `COOKIE_SECRET` — the old anonymous-session cookie is gone; the
public API is fully unauthenticated, read-only content.

Never commit a real `.env` file — `.gitignore` already excludes it.

---

## 5. Scripts

| Command | Effect |
|---|---|
| `npm install` | Install all workspace dependencies |
| `npm run dev` | Run API + both frontends concurrently |
| `npm run build` | Build database/shared packages, then api, then both frontends |
| `npm run test` | Run the API's test suite (Vitest) |
| `npm run db:generate` | Generate a new SQL migration from the Drizzle schema |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:seed` | Seed subjects, topics, questions, and an admin user |
| `npm run db:studio` | Open Drizzle Studio against your database |

---

## 6. API overview

All public routes are prefixed `/api/v1`. All admin routes are prefixed
`/api/v1/admin` and require a valid admin session — carried in an HttpOnly,
Secure cookie set by `POST /admin/auth/login`, never in localStorage or a
client-managed header — enforced server-side via a `requireAdmin` preHandler
on every admin route file, never by hiding a page in the frontend.

The public API is entirely unauthenticated and read-only. There's no
concept of "the calling visitor" anywhere in it — no session, no cookie, no
id of any kind is issued or expected.

### Public (candidate-facing, read-only content)

```text
GET    /api/v1/subjects                       Published subjects + stats
GET    /api/v1/subjects/:slug                  One published subject
GET    /api/v1/subjects/:id/topics             Topics + question counts for a subject

GET    /api/v1/questions?subjectId=&topicId=&topicIds=&difficulty=
                                                Pool of published questions the
                                                client builds a quiz from.
                                                Includes each option's
                                                isCorrect + explanation, since
                                                grading happens client-side.
GET    /api/v1/questions/:id                   Single published question

GET    /api/v1/settings/weak-area              Global weak-area thresholds
                                                (accuracyThreshold, minAttempts)
                                                so the client can classify its
                                                own local history without
                                                hardcoding the admin's config
```

That's the whole public surface. There is no `/assessments`, `/attempts`,
`/progress`, or `/bookmarks` route — see [Section 7](#7-what-lives-where).

### Admin

```text
POST   /api/v1/admin/auth/login
GET    /api/v1/admin/auth/me

GET    /api/v1/admin/dashboard                 Content counts, published/draft
                                                 split, by-difficulty, by-subject

GET    /api/v1/admin/subjects
POST   /api/v1/admin/subjects
PUT    /api/v1/admin/subjects/:id
DELETE /api/v1/admin/subjects/:id
POST   /api/v1/admin/subjects/:id/publish
POST   /api/v1/admin/subjects/:id/unpublish

GET    /api/v1/admin/topics?subjectId=
POST   /api/v1/admin/topics
PUT    /api/v1/admin/topics/:id
DELETE /api/v1/admin/topics/:id

GET    /api/v1/admin/questions?subjectId=&topicId=&difficulty=&type=&isPublished=
GET    /api/v1/admin/questions/:id
POST   /api/v1/admin/questions                 Options replace-on-write
PUT    /api/v1/admin/questions/:id
DELETE /api/v1/admin/questions/:id
POST   /api/v1/admin/questions/:id/publish
POST   /api/v1/admin/questions/:id/unpublish

GET    /api/v1/admin/settings                  Weak-area threshold config
PUT    /api/v1/admin/settings
```

There is no `/api/v1/admin/assessments` route and no admin page for it —
the admin console has nothing to show there, because no candidate activity
ever reaches the server.

---

## 7. What lives where

No account or session is required to use the candidate app, and the server
never learns "who" a visitor is. Everything about a candidate's activity is
generated, graded, and stored entirely in their own browser:

| Data | Lives in | Notes |
|---|---|---|
| Subjects / topics / questions / options | Postgres | The only thing the server persists |
| Admin accounts, global settings | Postgres | Content-management concerns, not candidate data |
| Generated assessments (the question set for one quiz run) | `localStorage` (`dap:currentAssessment`) | Built client-side in `apps/user-web/src/lib/quizEngine.ts`; a client-generated id, not a database row |
| Grading, scoring, attempt history | `localStorage` (`dap:attempts`) | Computed client-side (`quizEngine.gradeAssessment`) from the question pool's embedded `isCorrect`/`explanation` fields; capped at the 50 most recent attempts per browser |
| Progress / weak-area breakdown | Computed on read from `dap:attempts` | `quizEngine.computeProgress()`; nothing pre-aggregated is stored anywhere |
| Bookmarks | `localStorage` (`dap:bookmarks`) | Denormalized at bookmark-time (question text, topic, subject, etc.) since there's no server join to fetch it from later |
| Theme preference | `localStorage` (`dap:theme`) | Unchanged from before |

Practical implications worth knowing:
- **Nothing syncs across devices or browsers.** Progress, history, and
  bookmarks are tied to one browser's storage.
- **Clearing site data resets everything** — history, bookmarks, and
  in-progress quizzes are gone, with no server-side backup.
- **The admin console has no visibility into candidate activity** — no
  attempt counts, no completion rates, no weak-area trends across
  candidates. It only manages the question bank and global settings.
- **The public API is stateless.** Two requests from the same browser, or
  from two different browsers, are indistinguishable to the server —
  there's no cookie, header, or id tying them together.

---

## 8. Security notes

- Admin routes are protected by a `requireAdmin` Fastify preHandler that
  verifies a JWT carried in the HttpOnly/Secure session cookie set by
  `POST /admin/auth/login` (never in localStorage) on every request — this is
  enforced independently of whatever the admin frontend does or doesn't
  render.
- Admin passwords are hashed with Argon2id (`argon2` package), never stored in
  plaintext.
- The public question API includes `isCorrect` and `explanation` in every
  response, by design — grading happens client-side and there's no
  server-held attempt left to protect by hiding them. This is a deliberate
  trade-off of the localStorage-only architecture, not an oversight: this
  app has no proctoring/integrity requirement, so there's nothing lost by a
  candidate being able to inspect answers in the network tab if they choose
  to.
- CORS is restricted to the origins listed in `CORS_ORIGINS`.
- Secrets (`DATABASE_URL`, `ADMIN_SECRET`) are read from environment
  variables only; `.env` is gitignored.

---

## 9. Engineering rules this project follows

- No question *content* lives in either frontend; both fetch it from the API.
- Postgres is a content store only — subjects, topics, questions, options,
  admin accounts, and global settings. No candidate activity is ever written
  to it.
- The admin frontend has zero direct database access; it only calls
  `/api/v1/admin/*`, and every one of those routes independently checks the
  JWT server-side.
- Assessment generation, grading, scoring, and weak-area calculation all live
  in `apps/user-web/src/lib/quizEngine.ts` — a single client-side module,
  mirroring how the old server-side services were centralized.
- "Weak" is not a column, tag, or admin-editable field anywhere — it's always
  computed from local attempt history at read time, against the
  admin-configured threshold fetched from `/api/v1/settings/weak-area`.
