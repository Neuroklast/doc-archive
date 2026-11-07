# DOC ARCHIVE — Synthetic Google Drive integration test plan

**Status:** Checklist prepared, not executed against Google or Neon. It must pass before personal/irreplaceable document use.

## Isolated environment

- New **nonproduction** Neon database, separate secrets and Google Cloud OAuth web client (or verified stable preview hostname).
- A dedicated test Google account with non-sensitive synthetic PDF/images.
- A Vercel Preview environment with exact authorized OAuth callback, or local HTTPS-equivalent OAuth configuration.
- Set `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `ARCHIVE_OWNER_EMAIL`, `ARCHIVE_SETUP_SECRET`, `STORAGE_TOKEN_ENCRYPTION_KEY` and Google OAuth variables **server-side**.
- Apply the committed migrations, confirm DB backup/restore access and inspect resulting schema. Never use a real account's private documents as initial test data.

## Checks

1. **Login and authorization:** Unauthenticated archive/Drive routes return 401 or redirect. A different user cannot fetch folder, document, upload or token data. First signup rejects a missing/wrong setup key.
2. **OAuth:** Connect with `drive.file`, verify one visible `DOC ARCHIVE` folder is created, check that refresh token is encrypted at rest. Reject reused state, changed account and expired/revoked grant. Disconnect must preserve the Drive folder/files.
3. **Folders:** Create root folders `Behörden` and `Versicherungen`, then a nested folder. Confirm real Drive hierarchy and DB mapping. An invalid/foreign parent is refused. If database update is interrupted after Drive creation, retry must find the existing folder marker rather than duplicate it.
4. **Local PDF:** Use synthetic German letter scans, sort and rotate pages, preview the PDF, inspect legibility and search/select its OCR text. For an imported PDF, confirm that OCR isn't falsely advertised.
5. **Direct upload:** Initiate a Drive resumable session and confirm its location is usable from the deployed browser origin (CORS/preflight). The browser must **never** receive the Google access/refresh token.
6. **Folder-bound verification:** Upload to a selected nested folder and verify the server refuses a wrong Drive parent, wrong upload marker, MIME, size or non-PDF header. No item becomes ready until verification and DB commit.
7. **Recovery:** Interrupt after the Drive PUT completes but before finalize; reload and click `Abschluss prüfen`. Verify exactly one archive document/version is created with the selected folder and OCR text. Duplicate clicks must not duplicate documents. Check incomplete uploads are not falsely marked ready.
8. **Search and download:** Search German OCR terms, title, sender and exact folder, test pagination, protected previews and 401/404 for foreign document IDs.
9. **Failure cases:** Drive quota exhaustion, 429/503, expired Google session, missing file, token revocation, loss of browser upload URI, temporary Neon outage and duplicate folder creation in two tabs. Preserve originals and report recoverable states honestly.
10. **Security/privacy:** Verify no public Drive permission is created, no tokens/session URIs/OCR content appear in logs or analytics, no personal files are stored in Git and no OAuth secrets are placed in `NEXT_PUBLIC_*`.

## Expected open gaps

- Partial upload resumption after browser restart currently requires selecting a file again.
- No automatic cleanup for abandoned Drive uploads or pending OCR metadata.
- Changes made directly in Drive are not yet synchronized into the DB.
- Backup/export and original camera image retention remain unimplemented.
- Browser/upload CORS behavior and performance require actual live test evidence.

## Links

- [Implementation status](IMPLEMENTATION_STATUS.md)
- [Local setup](LOCAL_SETUP.md)
- [Google OAuth](GOOGLE_OAUTH.md)
- [Storage provider design](STORAGE_PROVIDER.md)
