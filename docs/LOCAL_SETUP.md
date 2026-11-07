# DOC ARCHIVE local development

## Requirements

Node.js 22+, npm, a newly provisioned Neon PostgreSQL database, and a Google Cloud OAuth web application with Drive API enabled.

```sh
npm ci
cp .env.example .env.local
```

Fill `.env.local` with `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `ARCHIVE_OWNER_EMAIL`, `ARCHIVE_SETUP_SECRET`, `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI` and `STORAGE_TOKEN_ENCRYPTION_KEY`.

Generate strong independent secrets locally:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

Google callback for local development: `http://localhost:3000/api/google/callback`. Add that exact redirect to the Google OAuth web client. Request only `drive.file`. Do not paste tokens in GitHub issues or public environment variables.

## Database

```sh
npm run db:generate
# CI rejects schema drift. Inspect the committed drizzle/0000_*.sql before applying.
npm run db:migrate
npm run dev
```

Use the committed ordered Drizzle migration chain. Run it on an empty development database first; never push or reset an existing production schema blindly.

## First run

Open `/login`, create the allowed owner account using the setup key, then connect Google Drive from the dashboard. The connection creates a visible `DOC ARCHIVE` folder in the connected user's Drive.

With a connected account, choose **Dokument hinzufügen**. Select up to 20 images (JPEG, PNG, WebP) or one PDF. Reorder/rotate images, choose quality, prepare, review and explicitly archive the PDF. Image scans use local German OCR. The resulting PDF and metadata become available for protected preview/download and full-text search. Original camera images are **not** backed up.

## Checks

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

A passing build does **not** prove Google Drive CORS, account consent, database migrations or cross-device recovery. Test with non-sensitive synthetic letters and an isolated Google account before adding irreplaceable documents.

## Current gaps

See [implementation status](IMPLEMENTATION_STATUS.md) for known gaps including unimplemented PDF-import OCR, Drive folder mapping, backup/export and production credential setup.
