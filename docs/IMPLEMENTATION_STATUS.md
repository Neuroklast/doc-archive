# Implementation status

## Phase 1 — first executable scaffold

The following files are now present in the feature branch, not yet deployed:

- Next.js 16 App Router with a responsive German dashboard, sign-in/setup UI and private route guard.
- Better Auth with email/password, one preapproved `ARCHIVE_OWNER_EMAIL` and a separate long `ARCHIVE_SETUP_SECRET` required for initial registration.
- Neon PostgreSQL Drizzle schema for auth, storage connections, OAuth state, logical folders, documents, versions, OCR text and upload sessions.
- Google OAuth authorization-code flow, state bound to the Better Auth session, PKCE, encrypted refresh tokens (AES-256-GCM), account validation and creation of the visible root `DOC ARCHIVE` folder.
- Connection status, retry/reconnect and token revocation without deleting user files.
- Offline-capable in principle TypeScript provider interface retained from planning; the Google adapter is still **not** complete.
- CI workflow and initial security-focused tests.

## Deliberately not implemented yet

- Browser scan/crop/OpenCV processing, OCR, PDF generation and uploads.
- Google resumable upload adapter, completion verification, download streaming, folder synchronization and full-text indexed search API.
- Background reconciliation, recovery/export, provider failover or Cloudflare R2.
- Production Vercel deployment and live provider configuration.

Never treat a functional auth route or a database table as evidence that the complete document archive is usable.

## Setup and verification

1. Provision a Neon database and Vercel/Google OAuth web application credentials.
2. Copy `.env.example` to a private `.env.local` file. Replace every placeholder; generate 32 random bytes for `STORAGE_TOKEN_ENCRYPTION_KEY` and an independent random 32+-character `ARCHIVE_SETUP_SECRET`.
3. Run `npm install`, then `npm run db:generate` and `npm run db:migrate` against a new empty development database. Review generated SQL before applying.
4. `npm run dev` to access `/login` and create the owner account using the setup secret.
5. Register exact OAuth callback `http://localhost:3000/api/google/callback` with Google Cloud, enable Drive API, and test connection with a dedicated Google test account.
6. Before any real documents, verify sign-in protection, signup key denial, OAuth state replay rejection, and callback account binding.

## Safety caveats

- No dependency lockfile has been generated in this execution environment because the npm registry is not reachable locally. All direct dependencies are pinned; GitHub CI uses `npm install` until a committed lockfile is generated and validated. Follow up before production deployment.
- The Next.js build and tests must pass in CI before merging. No live Neon DB, Google OAuth credentials or deployed Vercel project have been configured in this change.
- The initial auth schema is written in Drizzle, but migrations must be generated and reviewed before any DB deployment.
- The current UI intentionally disables upload. Google Drive connection does not imply document-processing capability.
