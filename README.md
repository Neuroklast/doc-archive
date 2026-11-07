# DOC ARCHIVE

Private, Vercel-deployable document archive for scanned letters, photographs and PDFs.

> **Status:** Phase 1 implementation on a feature branch: Next.js app shell, private Better Auth login and Google Drive OAuth linkage. PDF scanning, upload and search are not yet implemented. No cloud resources or deployment have been provisioned.

## Product goal

Capture paper mail with a phone or upload existing files, enhance legibility, create compact multipage PDFs, extract searchable text, classify documents into logical folders and securely retrieve or download originals and processed PDFs.

## Proposed stack

- **UI and API:** Next.js App Router, React, TypeScript, Tailwind CSS and shadcn/ui, hosted on Vercel.
- **Database and search:** Neon PostgreSQL with Drizzle ORM; user-scoped PostgreSQL full-text search.
- **Primary storage:** Google Drive via a separate, user-authorized OAuth 2.0 connection. Visible PDFs and real Drive folders under DOC ARCHIVE.
- **Optional later storage:** Cloudflare R2 behind the same provider-independent adapter. No R2 account or costs required for MVP.
- **Authentication:** Better Auth for the app; a separate server-side Google OAuth grant with minimum `drive.file` permissions for storage.
- **On-device processing:** browser workers, OpenCV.js for scan cleanup, Tesseract.js for image OCR, PDF.js for PDF reading and pdf-lib for PDF composition.

These are **proposed** choices, not installed packages or deployed services. Privacy mode remains an explicit decision: conventional private cloud with server-side OCR index is the working assumption, not end-to-end encryption.

## Document workflow

1. Capture image(s), upload a PDF or import a file.
2. Inspect/rotate/crop, correct perspective and contrast with a non-destructive preview.
3. Read text locally when practical; keep the original unchanged as an optional retained artifact.
4. Build an optimized multipage PDF with quality controls, searchable text where feasible.
5. Suggest date, sender, category and folder with confidence and user confirmation.
6. Transfer the PDF directly to Google Drive through an authorized resumable upload; verify provider metadata/content integrity before marking it archived.
7. Search by OCR text, title, sender, dates, tags and folder; preview and download on authorization.

**Never silently discard originals, change document contents or automatically publish personal files.** Google Drive's file access and sharing are governed by the connected user's account; the app never creates public shares. Google files and Neon OCR data are not end-to-end encrypted.

## Documentation

Start with [AGENTS.md](AGENTS.md) for the task-specific reading guide. The [product requirements](docs/PRODUCT_REQUIREMENTS.md), [technical architecture](docs/ARCHITECTURE.md), [storage provider contract](docs/STORAGE_PROVIDER.md), [Google OAuth security](docs/GOOGLE_OAUTH.md), [document pipeline](docs/DOCUMENT_PIPELINE.md), [security model](docs/SECURITY_AND_PRIVACY.md) and [deployment guide](docs/DEPLOYMENT.md) describe the intended implementation.

These project guides were selected and adapted from [Neuroklast/agent-documents](https://github.com/Neuroklast/agent-documents); they are not a bulk copy of that collection.

## Storage contract

The initial, SDK-free server interface is in [src/server/storage/contracts.ts](src/server/storage/contracts.ts). Google Drive is the only required MVP adapter. R2 can be added later without changing the document domain or invoking an automatic backup. The interface is **not an implemented Google Drive connection**.

## Development

The Next.js scaffold now provides `npm run lint`, `npm run typecheck`, `npm test` and `npm run build`. See [local setup](docs/LOCAL_SETUP.md), [implementation status](docs/IMPLEMENTATION_STATUS.md) and [Google OAuth](docs/GOOGLE_OAUTH.md). The app requires a Neon database, the private owner and setup secrets, and Google Cloud OAuth web client credentials. The actual archive features are not yet implemented. Dependency lockfile generation remains a production-readiness task.

Personal scans, generated PDFs, OCR content, backups, environment files and API credentials **must never be committed to Git**.
