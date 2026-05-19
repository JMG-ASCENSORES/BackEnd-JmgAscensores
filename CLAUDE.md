# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

Node.js + Express + Sequelize + PostgreSQL. Package manager is **pnpm** (a `package-lock.json` is also present but `pnpm-lock.yaml` is authoritative — `render.yaml` uses `pnpm install --frozen-lockfile`). CommonJS modules (`"type": "commonjs"`). Domain language is Spanish (models, columns, routes).

## Commands

```bash
pnpm dev            # nodemon src/server.js (development)
pnpm start          # node src/server.js (production — used by Render)
pnpm test           # jest --watchAll (note: --watchAll is on by default)
pnpm test -- --watchAll=false tests/app.test.js   # run a single test file once
pnpm db:sync        # run src/scripts/db-sync.js
pnpm backup         # src/scripts/backup-database.js
pnpm restore        # src/scripts/restore-database.js
pnpm verify         # src/scripts/verify-migration.js
pnpm check-tables   # src/scripts/check-tables.js
```

Jest config (`jest.config.js`): testEnvironment=node, picks up `**/tests/**/*.test.js` and `**/__tests__/**/*.test.js`, `forceExit: true`, mocks auto-cleared/reset/restored between tests.

## Server bootstrap and entry points

Two entry points exist and both work:

- **`src/server.js`** (the `start`/`dev` scripts) — calls `connectDB()`, optionally runs `sequelize.sync({ alter: true })` when `DB_SYNC=true`, then `app.listen`.
- **`src/app.js`** has its own `if (require.main === module)` block so Render can run `node src/app.js` directly. If you change startup logic, update both paths.

`process.env.TZ = 'America/Lima'` is set at the very top of `src/app.js` — Lima timezone is load-bearing for date math in scheduling code.

`DB_SYNC=true` triggers `sequelize.sync({ alter: true })` on startup. Off by default. Real schema changes live as raw SQL in `scripts/migrations/` (e.g. `001-detalle-ruta-programacion-id.sql`) — there are no Sequelize migration files. When adding a schema change, write both the migration SQL and update the model.

## Layered architecture (MVC + service)

```
routes/  →  middlewares (authenticate → authorize → validate)  →  controllers/  →  services/  →  models/
```

- **`src/routes/`** — Express routers, one per resource. Most apply `authenticate` and an `authorize('ADMIN')` (or role array) before handlers. Swagger JSDoc lives inline here.
- **`src/controllers/`** — thin: parse req, delegate to a service, format response via `utils/response.util`. Don't put business logic here.
- **`src/services/`** — all business logic and Sequelize queries. Services receive primitives/DTOs, not `req`.
- **`src/models/`** — Sequelize model definitions, one file per table. **Associations are NOT defined in the model files** — they all live in **`src/models/index.js`**. When adding a relation, edit that file. Always import models from `require('../models')`, not from individual files (associations may not be wired otherwise).
- **`src/middlewares/`** — `auth.middleware.js` (JWT), `authorize.middleware.js` (role check), `validate.middleware.js` (Joi), `errorHandler.middleware.js` (global).
- **`src/validators/`** — Joi schemas; `validate(schema)` middleware enforces them on req.body.
- **`src/utils/`** — `jwt.util`, `password.util` (bcrypt), `response.util` (`successResponse`/`errorResponse`), `codeGenerator.util`.

### Adding a new resource

Create files in the standard set: `models/X.js` + associations in `models/index.js`, `validators/X.validator.js`, `services/X.service.js`, `controllers/X.controller.js`, `routes/Xroutes.js`, then register the router in `src/app.js` (the `Import routes` and `Register routes` blocks).

## Auth model

JWT-based. Tokens accepted from **either** an `accessToken` cookie (preferred — `cookieParser` is wired, `credentials: true` in CORS) **or** an `Authorization: Bearer …` header (fallback). The decoded payload is attached as `req.user = { id, dni, correo, rol, tipo }`. Refresh tokens are stored server-side as `Sesion` rows so logout can invalidate them. Roles in the codebase: `ADMIN`, `TECNICO`.

CORS allow-list is hard-coded inside `src/app.js` (not driven solely by `CORS_ORIGIN`) — add new frontend origins there.

## IA-Scheduler module (the most complex subsystem)

Lives under `src/services/ia-scheduler/` and `src/controllers/ia-scheduler.controller.js`, route prefix `/api/ia-scheduler` (ADMIN-only). It assigns technicians to maintenance jobs using a **2-layer architecture**:

1. **Deterministic motor** (`motor.service.js`, `worker.service.js`, `demand.service.js`, `district-times.service.js`) — pure logic, no network. Filters eligible technicians by specialty (`ELEGIBILIDAD` map in `motor.service.js`), computes free slots inside the 08:30–18:30 window, accounts for inter-district travel time via a precomputed Lima district matrix (`TablaDistritoLima` model), ranks candidates.
2. **LLM adjuster** (`llm.service.js`) — Anthropic Claude (default `claude-haiku-4-5`). Receives the motor's evaluation, validates hard constraints, adds justifications, may reorder alternatives. **Hard rules live in code, not in the prompt.** The LLM is allowed to reorder/exclude but never to invent slots or violate the eligibility matrix. Strip markdown fences before JSON.parse — Claude sometimes wraps responses in ```json … ```.

If the LLM call fails, fall back to the raw motor evaluation — never block the admin. Services are loaded lazily on first request (module-level `_motorService`, etc.) so importing the controller doesn't hit the DB or read the district matrix.

Authoritative spec for this module: **`docs/programador-ia/`** (overview, business rules, data model, deterministic engine, LLM integration, district matrix, API contracts, migrations, implementation phases). Read these before changing scheduler behavior.

Two configuration tables back this module: `ConfiguracionIA` (admin-tunable knobs like `hora_inicio_default`, `hora_fin_limite`) and `TablaDistritoLima` (travel-time matrix).

## Programacion: 4 technicians per job

A `Programacion` references up to four technicians via separate columns: `trabajador_id` (primary), `tecnico2_id`, `tecnico3_id`, `tecnico4_id`. Aliases in `models/index.js`: `Tecnico1`/`Tecnico2`/`Tecnico3`/`Tecnico4`. Queries that need "all jobs for technician X today" must OR across all four columns (see `WorkerService._obtenerDatosDelDia`). This is unusual; don't refactor to a join table without coordinating.

## Response shape convention

Use the helpers in `src/utils/response.util.js` (`successResponse`, `errorResponse`). The standard error shape includes `success: false`, `message`, `error` (machine code like `API_NOT_FOUND`, `TOKEN_EXPIRED`, `NO_TOKEN`), and a timestamp. The API-only 404 handler in `src/app.js` already follows this — match it for new error paths.

## Environment variables

Required: `DB_NAME`, `DB_USER`, `DB_PASS`, `DB_HOST`, `DB_PORT`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`. Optional: `DB_DIALECT` (default `postgres`), `DB_SSL` (set `true` for Render; SSL is auto-disabled when `DB_HOST=localhost`), `DB_SYNC` (`true` to auto-`sync({alter:true})` on boot), `CORS_ORIGIN`, `UPLOAD_DIR` (default `uploads`), `MAX_FILE_SIZE`, `CLAUDE_API_KEY` (required for the LLM layer of ia-scheduler), `TWILIO_*`, `FRONTEND_URL`, `PORT` (default 3000), `TZ` (forced to `America/Lima` in code).

## Deployment

Render, configured by `render.yaml` (oregon region, free plan). Build = `npm install -g pnpm && pnpm install --frozen-lockfile`, start = `pnpm start`. DB credentials are injected from the Render-managed Postgres instance. `healthCheckPath: /`. Render may invoke `node src/app.js` directly — that's why `app.js` has its own listen block.

## Docs in repo worth reading

- `docs/programador-ia/` — full design of the IA-Scheduler (mandatory before touching that module).
- `DATABASE_SETUP.md`, `MIGRATION_GUIDE.md` — Render Postgres migration notes (the DB has a hard expiration date the project has been working around).
- `README.md` — auth/usuarios API reference and project structure overview.
