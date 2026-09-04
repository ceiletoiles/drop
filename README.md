# Drop

Drop is a lightweight cross-device transfer and scratchpad app built for fast capture, recent-first retrieval, and private per-user file access.
It now ships as both a web app and an Android app through Capacitor.

## What is in V1

- React + TypeScript + Vite web app
- Capacitor Android app generated from the same codebase
- Native Android Google sign-in using Credential Manager and Supabase ID-token auth
- Native file and image downloads on Android
- Shared Supabase session persistence across web and mobile
- The existing web Google login flow remains unchanged
- The original V0.x features remain available across the product

## What is in V0.1

- Email/password auth with Supabase Auth
- Text items stored in PostgreSQL
- File uploads stored privately in Cloudflare R2
- Recent-items list with search, copy, edit, download, and delete
- Server-side ownership checks for all item operations
- Responsive UI for mobile and desktop

## What is in V0.2

- Drag-and-drop uploads on the main drop zone
- Multi-file uploads from drag/drop and the file picker
- Clipboard support for pasted text, pasted images, and pasted files when the browser exposes them
- Per-file upload progress, success, failure, and cancel states
- Keyboard shortcuts for upload, new text, search focus, and escape/close behavior

## What is in V0.3

- Temporary items with no permanent storage option
- Supported expiration policies: `CONSUME`, `24_HOURS`, `7_DAYS`, `1_MONTH`
- Text items can delete after copy
- File items can delete after download
- Server-side expiration timestamps and access checks

## What is in V0.4

- Temporary share links for existing items
- Secure random share tokens stored alongside hashes in the database
- Public `/s/:token` share pages that do not require login
- Owner-controlled share creation and revocation
- Shared text copy and shared file download flows

## What is in V0.5

- Spaces for shared collaboration across members
- Owner-only space invite controls with separate email invite, create invite link, and revoke invite link actions
- Invite links are stored with the raw token so the same join URL can be reused until the 7-day expiration
- Full absolute join URLs are shown in the app instead of relative `/join/:token` fragments
- Pending email-targeted space invites appear in the recipient's account page

## Architecture

- Frontend: React, TypeScript, Vite, Tailwind CSS
- Mobile wrapper: Capacitor Android
- Backend/API: Cloudflare Workers
- Auth and database: Supabase Auth + Supabase PostgreSQL
- Object storage: Cloudflare R2

The web app talks to the Worker over `/api` endpoints. In local development you can either proxy `/api` through Vite or point the frontend at the Worker with `VITE_API_BASE_URL`.
The Android app loads the same Vite build inside Capacitor and uses a small native bridge only where Android-specific behavior is required.

## Repository structure

- `src/` - React app, UI components, auth, and item features
- `android/` - Capacitor Android project
- `worker/` - Cloudflare Worker API
- `shared/` - shared types, constants, schemas, and utility helpers
- `supabase/migrations/` - SQL migrations for the core schema and V0.3 expiration upgrade

## Prerequisites

- Node.js 22+
- npm 10+
- A Supabase project
- A Cloudflare account with R2 enabled
- Wrangler CLI credentials configured locally
- Android Studio for the Android app

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
6. Set `VITE_APP_ORIGIN` to the public web app URL in your production env if you want native share and invite links to point at the website instead of the Capacitor origin.
7. Set `VITE_GOOGLE_WEB_CLIENT_ID` to your Google OAuth Web client ID for native Android Google sign-in.

8. Run the Worker in one terminal:

```bash
npm run worker:dev
```

9. Run the Vite app in another terminal:

```bash
npm run dev
```

For the Android app:

```bash
npm run build
npx cap sync android
npx cap open android
```

## Environment variables

Frontend:

- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anon/public key
- `VITE_API_BASE_URL` - Worker base URL, for example `http://127.0.0.1:8787`
- `VITE_APP_ORIGIN` - Public web app origin, for example `https://drop.example.com`
- `VITE_GOOGLE_WEB_CLIENT_ID` - Google OAuth Web client ID used by Android native sign-in

Worker:

- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `MAX_UPLOAD_BYTES` - optional upload limit override

Local env files:

- `.env.local` - used by local development
- `.env.production` - used when building for production

## Supabase setup

1. Create a new Supabase project.
2. Run the migrations in order:
   - `supabase/migrations/0001_drop_core.sql`
   - `supabase/migrations/0002_activity_log.sql`
   - `supabase/migrations/0003_activity_log_entity.sql`
   - `supabase/migrations/0004_v03_expiration.sql`
   - `supabase/migrations/0005_v04_sharing.sql`
   - `supabase/migrations/0006_v05_spaces.sql`
   - `supabase/migrations/0007_v06_space_invite_tokens.sql`
   - `supabase/migrations/0008_extend_item_expiration.sql`
3. Ensure email/password auth is enabled.
4. Copy the project URL and anon key into the frontend env file.
5. Copy the service role key into the Worker env or Wrangler secrets.
6. Configure Google sign-in in Supabase with the same Google OAuth Web client ID and secret used by the Google Cloud OAuth setup.

The migration creates:

- `items`
- `text_items`
- `files`
- `storage_deletion_queue`

It also enables row-level security, adds expiration-aware ownership policies, backfills existing records to `24_HOURS`, and creates the trigger that calculates `expires_at` server-side.
The V0.4 migration adds:

- `shares`
- a retrievable share token plus hashed share-token lookup
- one active share per item
- cascade cleanup when an item is deleted

The V0.5 migration adds:

- `spaces`
- `space_members`
- `space_invitations`
- per-space owner/member access checks
- reusable invite links backed by stored raw invite tokens

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
- consume-after-copy / consume-after-download
- share creation, revocation, and public share resolution
- scheduled cleanup of expired records and queued R2 deletions

Cron cleanup is configured in `wrangler.toml` with a daily trigger at 00:00 UTC.

## Browser limitation

For consume-after-download file items, the frontend treats the download as successful once the browser has fully received the response body and triggered the file save. Browsers do not expose a reliable signal for the OS-level save completing, so the app cannot prove the file was written to disk.

The same limitation applies to shared file downloads: the Worker can validate the token, stream the file, and update the share count, but it cannot prove the browser finished writing the file to disk.

On Android, file and image downloads use the native Capacitor bridge instead of the browser save flow.

Shared text `CONSUME` items delete after the recipient successfully copies the text and the backend confirms the consume operation.

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
- Upload size is capped at 50 MB in the shared schema and Worker validation.
- Editing a text item does not reset its expiration in V0.3.
- V1 adds native Android support while keeping the web app as the primary shared codebase.
