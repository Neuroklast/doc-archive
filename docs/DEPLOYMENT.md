# DOC ARCHIVE — Deployment and operations

Primary: **Vercel + Neon + Google Drive OAuth**. Cloudflare R2 is an optional later integration. This is a deployment plan; the app and provider credentials are **not** yet configured.

## Prerequisites
1. Vercel project linked to `Neuroklast/doc-archive` and HTTPS deployment hostname.
2. Neon PostgreSQL with secure Better Auth/Drizzle schema and backups.
3. A Google Cloud project with Google Drive API enabled, OAuth consent screen, OAuth 2.0 **web application** credentials and exact authorized redirect URI(s).
4. A dedicated server-side encryption key for persisted refresh tokens. Separate dev/preview/prod keys and OAuth clients.
5. Package manifest, lockfile, CI/lint/typecheck/test/build scripts and a reviewed deployment (once scaffold exists).

## Intended environment variables

Document in `.env.example` when implementing. No real secrets in Git or browser bundles.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon PostgreSQL connection, server-only |
| `BETTER_AUTH_SECRET` | Application auth secret |
| `BETTER_AUTH_URL` | Canonical HTTPS app origin |
| `GOOGLE_OAUTH_CLIENT_ID` | Google OAuth web client ID |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Confidential Google client secret (server-only) |
| `GOOGLE_OAUTH_REDIRECT_URI` | Exact registered callback URL |
| `STORAGE_TOKEN_ENCRYPTION_KEY` | Server-only key protecting encrypted refresh tokens |
| `STORAGE_DEFAULT_PROVIDER` | Must be `google_drive` for MVP |

Actual env names should be checked against installed libraries. A future optional R2 adapter adds separately scoped `R2_*` variables **only if explicitly enabled**.

## Setup sequence
1. Configure the exact Google Cloud OAuth consent screen and declare only `https://www.googleapis.com/auth/drive.file` for storage. Test with an allowed test account. Review app publishing/verification; External + Testing OAuth grants commonly produce refresh tokens expiring after seven days.
2. Configure Google web application redirect URI for the canonical Vercel HTTPS URL, not a wildcard preview pattern. For previews use a stable separate preview domain/client; localhost uses its own registered redirect.
3. Set Vercel server environment variables and separate preview/production databases and encryption keys. Never embed refresh tokens or client secret into `NEXT_PUBLIC_*`.
4. Implement Better Auth login before Google connection. Complete state-bound OAuth code flow, store encrypted token, create user-owned visible `DOC ARCHIVE` folder in My Drive.
5. Create the Drizzle schema with storage_connections, folder_mappings, provider-specific refs, upload_sessions and OCR data. No automatic destructive migrations.
6. Implement and test Drive resumable upload and browser direct PUT/chunks. Verify CORS/response visibility and Google chunk/resume behavior in a real browser on the actual deployment hostname. Do not assume Vercel can proxy arbitrarily large PDFs.
7. Verify authorized PDF server streaming, download, rename/move, Google-side trash/rename detection, reconnect/invalid_grant, quota errors and cross-user isolation.
8. Before storing real personal records: perform synthetic backup-and-restore across **Neon metadata + user Drive file exports**. Confirm reconciliation and privacy conditions.

## Operational limits
- Google Drive space is part of the user's shared Google account quota; storage depends on available space and account plan.
- Verify current Google API rate/quota limits and project verification status before production.
- R2 is not provisioned or used unless the user explicitly enables a later adapter.
- Use bounded retries/backoff for 429/5xx; mark revoked grants as needs_reconnect.
- Monitor metadata-only upload errors and synchronization lag; never log OCR text, signed/session URIs, access tokens or private filenames.

## Recovery and portability
- A snapshot of Neon alone does not contain PDF bytes.
- A Drive folder alone does not contain the OCR index or logical metadata.
- Export Drive files and a metadata manifest with object/file IDs, checksums and versions. Test restore into an isolated archive while preserving user ownership.
- A user who deletes or shares a file in Drive has affected the underlying provider independently of DOC ARCHIVE; show missing/conflict states and do not imply immutable backup guarantees.
- Disconnecting Google removes/revokes credentials where possible but must not automatically delete archived files.

## References
- [Google OAuth security](GOOGLE_OAUTH.md)
- [Storage provider contract](STORAGE_PROVIDER.md)
- [Google adapter rules](../stack/google-drive.md)
- [Google OAuth](https://developers.google.com/identity/protocols/oauth2/)
- [Drive uploads](https://developers.google.com/workspace/drive/api/guides/manage-uploads)
