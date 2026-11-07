# DOC ARCHIVE

Private, Vercel-deployable document archive for scanned letters, photographs and PDFs.

> **Status:** Phase 2 code is present: photo-to-PDF conversion, German OCR, guarded Google Drive transfer, private download and paginated search. Deployment and real-provider end-to-end testing are still outstanding.

## Product goal

Capture paper mail with a phone or upload existing files, enhance legibility, create compact multipage PDFs, extract searchable text, classify documents into logical folders and securely retrieve or download originals and processed PDFs.

## Proposed stack

- **UI and API:** Next.js App Router, React, TypeScript and custom responsive CSS, designed for Vercel. Tailwind/shadcn are not installed.
- **Database and search:** Neon PostgreSQL with Drizzle ORM; user-scoped PostgreSQL full-text search.
- **Primary storage:** Google Drive via a separate, user-authorized OAuth 2.0 connection. Visible PDFs and real Drive folders under DOC ARCHIVE.
- **Optional later storage:** Cloudflare R2 behind the same provider-independent adapter. No R2 account or costs required for MVP.
- **Authentication:** Better Auth for the app; a separate server-side Google OAuth grant with minimum `drive.file` permissions for storage.
- **On-device processing:** Canvas/createImageBitmap to downsample/rotate; Tesseract.js for German OCR and hOCR coordinates; pdf-lib for PDF composition. OpenCV.js/perspective correction and PDF.js extraction are future enhancements.

The app code uses these installed dependency declarations, but provider services have **not** been provisioned or tested live. Privacy mode remains an explicit decision: conventional private cloud with server-side OCR index is the working assumption, not end-to-end encryption.

## Document workflow

1. Capture image(s), upload a PDF or import a file.
2. Review page order and rotate images. Manual crop/perspective/contrast correction is planned but not implemented.
3. Recognize German text locally for image scans. Original images remain on the device and are not automatically backed up.
4. Build an optimized multipage PDF with quality controls, searchable text where feasible.
5. Enter a document title and optional sender. Automated date/category/folder suggestions are planned.
6. Transfer the PDF directly to Google Drive through an authorized resumable upload; verify provider metadata/content integrity before marking it archived.
7. Search by OCR text, title and sender with pagination; protected PDF preview and download. Date, tag and folder filters are planned.

**Never silently discard originals, change document contents or automatically publish personal files.** Google Drive's file access and sharing are governed by the connected user's account; the app never creates public shares. Google files and Neon OCR data are not end-to-end encrypted.

## Documentation

Start with [AGENTS.md](AGENTS.md) for the task-specific reading guide. The [product requirements](docs/PRODUCT_REQUIREMENTS.md), [technical architecture](docs/ARCHITECTURE.md), [storage provider contract](docs/STORAGE_PROVIDER.md), [Google OAuth security](docs/GOOGLE_OAUTH.md), [document pipeline](docs/DOCUMENT_PIPELINE.md), [security model](docs/SECURITY_AND_PRIVACY.md) and [deployment guide](docs/DEPLOYMENT.md) describe the intended implementation.

These project guides were selected and adapted from [Neuroklast/agent-documents](https://github.com/Neuroklast/agent-documents); they are not a bulk copy of that collection.

## Storage contract

The server interface lives in [src/server/storage/contracts.ts](src/server/storage/contracts.ts), with a [Google Drive adapter](src/server/google/drive-adapter.ts) and guarded upload/download routes. The upload currently targets the app's root Drive folder; nested folder synchronization and recoverable background jobs are planned. R2 remains optional.

## Development

The Next.js scaffold now provides `npm run lint`, `npm run typecheck`, `npm test` and `npm run build`. See [local setup](docs/LOCAL_SETUP.md), [implementation status](docs/IMPLEMENTATION_STATUS.md) and [Google OAuth](docs/GOOGLE_OAUTH.md). The app requires a Neon database, the private owner and setup secrets, and Google Cloud OAuth web client credentials. The scan/upload/search paths are now implemented, but they still require actual database migrations, live Google Drive OAuth/CORS tests and production review. Dependency lockfile generation remains a production-readiness task.

Personal scans, generated PDFs, OCR content, backups, environment files and API credentials **must never be committed to Git**.
