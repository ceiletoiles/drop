# Drop

Drop is a lightweight cross-device transfer and scratchpad app built for fast capture, recent-first retrieval, and private per-user file access.

## What is in V0.1

- Email/password auth with Supabase Auth
- Protected dashboard with persistent sessions
- Text items stored in PostgreSQL
- File uploads stored privately in Cloudflare R2
- Recent-items list with search, copy, edit, download, and delete
- Server-side ownership checks for all item operations
- Responsive UI for mobile and desktop

## Architecture

- Frontend: React, TypeScript, Vite, Tailwind CSS
- Backend/API: Cloudflare Workers
- Auth and database: Supabase Auth + Supabase PostgreSQL
- Object storage: Cloudflare R2

The frontend talks to the Worker over `/api` endpoints. In local development you can either proxy `/api` through Vite or point the frontend at the Worker with `VITE_API_BASE_URL`.

## Repository structure

- `src/` - React app, UI components, auth, and item features
- `worker/` - Cloudflare Worker API
- `shared/` - shared types, constants, schemas, and utility helpers
- `supabase/migrations/` - SQL migration for the core schema

## Prerequisites

- Node.js 22+
- npm 10+
- A Supabase project
- A Cloudflare account with R2 enabled
- Wrangler CLI credentials configured locally

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
copy .env.example .env.local
copy .env.example .env.production
```

3. Fill in your Supabase values in both files.
4. Keep `VITE_API_BASE_URL` as localhost in `.env.local`.
5. Set `VITE_API_BASE_URL` to the deployed Worker URL in `.env.production`.

6. Run the Worker in one terminal:

```bash
npm run worker:dev
```

7. Run the Vite app in another terminal:

```bash
npm run dev
```

## Environment variables

Frontend:

- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anon/public key
- `VITE_API_BASE_URL` - Worker base URL, for example `http://127.0.0.1:8787`

Worker:

- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `MAX_UPLOAD_BYTES` - optional upload limit override

Local env files:

- `.env.local` - used by local development
- `.env.production` - used when building for production

## Supabase setup

1. Create a new Supabase project.
2. Run the migration in `supabase/migrations/0001_drop_core.sql`.
3. Ensure email/password auth is enabled.
4. Copy the project URL and anon key into the frontend env file.
5. Copy the service role key into the Worker env or Wrangler secrets.

The migration creates:

- `items`
- `text_items`
- `files`

It also enables row-level security and adds ownership policies for all three tables.

## R2 setup

1. Create an R2 bucket named `drop-files`, or update `wrangler.toml` to match your bucket name.
2. Bind the bucket in `wrangler.toml`.
3. Use the service-role-backed Worker to store and retrieve private objects.

Files are never exposed through permanent public URLs. Downloads are proxied through authenticated Worker routes.

## Worker setup

The Worker lives in `worker/src/index.ts` and handles:

- authentication verification
- list/search
- text create/update/delete
- file upload/download/delete

Deploy with:

```bash
npm run worker:deploy
```

Set secrets with Wrangler before deploying:

```bash
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

## Development commands

- `npm run dev` - start the Vite frontend
- `npm run worker:dev` - start the Worker locally
- `npm run typecheck` - run TypeScript checks
- `npm run lint` - run ESLint
- `npm run build` - build the frontend

## Production build

The frontend builds with Vite:

```bash
npm run build
```

The Worker is bundled by Wrangler when you deploy:

```bash
npm run worker:deploy
```

## Deployment overview

1. Deploy the Supabase schema and configure auth.
2. Deploy the Worker and bind the R2 bucket.
3. Deploy the frontend wherever you host Vite output.
4. Point the frontend at the Worker API URL through `VITE_API_BASE_URL` or same-origin routing.

## Notes

- Text items are stored directly in PostgreSQL.
- File contents are stored in R2, not Postgres.
- Ownership is enforced server-side.
- Upload size is capped at 25 MB in the shared schema and Worker validation.
