# Local development: Phase 1

This is the first app scaffold. No deployment or provider resources are created automatically.

## Requirements
Node.js 22+, npm, a new Neon Postgres database, a Google Cloud project with Google Drive API enabled and an OAuth 2.0 Web Application client.

## Configure

```sh
npm install
cp .env.example .env.local
```

Fill:
- `DATABASE_URL`: secret Neon PostgreSQL URL.
- `BETTER_AUTH_SECRET`: at least 32 random characters.
- `BETTER_AUTH_URL`: exact site origin (local: `http://localhost:3000`).
- `ARCHIVE_OWNER_EMAIL`: email allowed for the single private owner account.
- `ARCHIVE_SETUP_SECRET`: random secret of 32+ characters, needed only at initial account creation. Keep it private.
- `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`: Google web client.
- `GOOGLE_OAUTH_REDIRECT_URI`: exact callback, local: `http://localhost:3000/api/google/callback`.
- `STORAGE_TOKEN_ENCRYPTION_KEY`: 32 random bytes as base64, **not the same** as Better Auth secret.

Example commands to generate secrets locally:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

Do not commit `.env.local` or paste secrets into issues/logs/screenshots.

## Initialize database

```sh
npm run db:generate
# Review generated files under drizzle/ before proceeding.
npm run db:migrate
npm run dev
```

Drizzle schema is canonical. For throwaway local DB experiments only, `npm run db:push` can sync schema without a committed migration. Never run it on production without reviewing changes.

## Register app and connect Drive

Open `/login`. Choose setup, enter approved owner email, a new strong password and the secret setup token. After signing in, use **Google Drive verbinden**. Only Drive `drive.file` is requested. The consent flow creates an ordinary `DOC ARCHIVE` folder in your own Drive. Other Drive files are not scanned automatically.

Disconnecting a Google account revokes the app grant where possible but deliberately leaves files in Drive. Existing indexed metadata is kept for future phases.

## Checks

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

The app routes require DB variables. Build can use a placeholder URL for static compilation; real login and OAuth require working DB/Google credentials. No real document upload exists yet.
