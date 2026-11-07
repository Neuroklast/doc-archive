# Implementation status

## Delivered in the codebase

### Foundation
- Next.js 16 App Router, responsive German login/dashboard, Better Auth and private one-owner registration gate.
- Neon PostgreSQL/Drizzle schema for identity, OAuth state, connections, uploads, documents, versions, folders and OCR.
- Google OAuth code flow with PKCE, one-time state, server-side token refresh, encrypted refresh tokens and connection/reconnection screen.

### Photo/PDF capture and Drive archive
- Select JPEG/PNG/WebP images, reorder or rotate them, choose quality and prepare a multipage PDF on-device.
- German OCR via Tesseract.js in the browser and hOCR word coordinates for a transparent, selectable PDF text layer when recognized.
- Existing PDFs can be uploaded unchanged. OCR extraction from existing PDFs is **not** yet implemented.
- Review/download the generated PDF before choosing to upload.
- Start a Google Drive resumable upload using the connected account. Transfer file bytes directly from the browser using the scoped session URI, never the Google access token.
- After upload, the server searches for the opaque per-ticket Drive appProperty, checks the authorized connection, parent folder, type, size and actual PDF header before a database transaction marks the document ready.
- A repeated completion request is idempotent; failed transfers can retry in the same browser session.
- Protected PDF preview/download through the server and paginated search over title, sender and German OCR text.

## Important limitations

- **No live end-to-end verification with a real Google Drive account or Neon DB** has been performed. GitHub CI exercises lint, types, unit tests and Next build, not provider network flows.
- Browser direct uploads to Google Drive require deployed-origin CORS testing. Some failed uploads may leave orphan Drive files; background reconciliation and multi-day recovery are still missing.
- Original photos remain on the user's device; the app currently saves the derived PDF only. There is no independent original image backup.
- Crop, perspective correction, deskew, classification, date extraction, real Drive subfolder mapping, imports of pre-existing Drive files, Drive change-feed sync, trash/restore and export/backup are not yet implemented.
- OCR may download language/runtime assets from third-party hosts on first use. Image bytes are processed in-browser and are only transferred on deliberate archive action. Self-hosting those assets is still outstanding for a fully first-party network path.
- Metadata-only integrity plus actual PDF signature is **not** cryptographic equality to the client SHA-256; the expected hash is a client claim.
- Imported PDFs do not receive an extra text layer or OCR-indexed body. Scanned image PDFs have a text layer only for recognized words supported by the embedded PDF font.
- No Vercel production deployment or Google/Neon credentials have been configured.

## Next work
1. Commit reviewed Drizzle migrations and dependency lockfile; run a live DB migration in an isolated environment.
2. Test Google OAuth, CORS, transfer, download and search using synthetic documents on a real preview deployment.
3. Persist recovery of interrupted sessions, reconcile orphan files and drive-side changes.
4. Implement folder synchronization, categorization, PDF text extraction, advanced scanning/cropping and secure backup/export.
5. Extend security and accessibility testing before archiving irreplaceable correspondence.

## Verification
Run `npm install`, `npm run db:generate`, `npm run lint`, `npm run typecheck`, `npm test` and `npm run build`. GitHub workflow performs these on PRs and main. An actual connected-provider and DB test is separate and mandatory before production usage.
