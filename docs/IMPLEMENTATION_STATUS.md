# Implementation status

## Implemented code paths

- Next.js 16 / Better Auth with a private owner signup gate, per-user Neon/Drizzle models and encrypted Google OAuth refresh tokens.
- Local multi-photo PDF composition, size/quality controls, German OCR text index and hidden PDF text layer (where recognized), plus original-PDF passthrough.
- Authenticated Google Drive upload initiation with short-lived resumable browser session URI; no Google OAuth token sent to browser.
- Server verifies per-ticket Drive appProperty, authenticated storage connection, actual parent folder, PDF header, MIME and file size before idempotent database finalization.
- Real nested Drive folders created through owner-scoped API with a persistent marker for recovery after interrupted creation.
- Mobile-responsive folder navigation, folder selection while scanning, a conservative optional local suggestion and exact-folder-filtered, paginated search.
- Pending upload title, sender, OCR text and destination are stored before transfer. A completed Drive upload may be finalized from the archive dashboard after browser restart for up to seven days.
- Server-authorized PDF preview/download, and token refresh rotation handling.
- A committed `package-lock.json`, baseline and incremental SQL migrations, schema snapshots, and a CI pipeline checking migration drift, lint, types, tests and Next build.

## Not yet completed or verified

- **There is no configured Vercel `doc-archive` project in the connected account and no live Neon or Google Cloud OAuth credentials have been exercised by these changes.** Build checks cannot verify real browser-to-Drive CORS behavior or OAuth consent.
- Pending recovery only **finalizes a file already transferred**. Partially uploaded bytes cannot resume after losing the browser's sensitive session URI. Pending OCR metadata can persist after the seven-day recovery window without automatic cleanup. Provider-side orphan files may remain.
- No Google Drive change-feed reconciliation for external file moves, renames, trash, sharing or deletion.
- No export/backup or restore spanning the Neon index and underlying Drive PDF bytes. Google Drive is not an independent backup.
- No PDF import OCR, perspective crop/deskew, advanced classification, date extraction or automatic nesting. Original image files remain on the user's device.
- PDF header and metadata validation are not full antivirus checks or cryptographic content-integrity proof; integrity is `provider_metadata`, not confirmed SHA-256.
- Initial Tesseract language/runtime assets may be fetched from an external host; self-hosting remains unimplemented.
- No live production launch. Only synthetic docs should be used before the [integration test plan](DRIVE_TEST_PLAN.md) passes.

## Next priorities

1. Provision isolated Vercel preview, Neon DB and Google Cloud OAuth web client, and execute [synthetic E2E checks](DRIVE_TEST_PLAN.md).
2. Reconcile external Drive changes and clean up orphan/pending upload lifecycle securely.
3. Add export/backup/restore with versioned manifest and verified checksums.
4. Implement automatic folder classification with explicit confirmation, PDF import OCR and scanner perspective correction.
