# DOC ARCHIVE

Private, Vercel-deployable document archive for scanned letters, photographs and PDFs.

> **Status:** Architecture and development guidance only. No application, database, storage bucket or deployment has been provisioned yet.

## Product goal

Capture paper mail with a phone or upload existing files, enhance legibility, create compact multipage PDFs, extract searchable text, classify documents into logical folders and securely retrieve or download originals and processed PDFs.

## Proposed stack

- **UI and API:** Next.js App Router, React, TypeScript, Tailwind CSS and shadcn/ui, hosted on Vercel.
- **Database and search:** Neon PostgreSQL with Drizzle ORM; user-scoped PostgreSQL full-text search.
- **Private object storage:** Cloudflare R2 with short-lived presigned uploads/downloads.
- **Authentication:** Better Auth, with passkey support evaluated during implementation.
- **On-device processing:** browser workers, OpenCV.js for scan cleanup, Tesseract.js for image OCR, PDF.js for PDF reading and pdf-lib for PDF composition.

These are **proposed** choices, not installed packages or deployed services. Privacy mode remains an explicit decision: conventional private cloud with server-side OCR index is the working assumption, not end-to-end encryption.

## Document workflow

1. Capture image(s), upload a PDF or import a file.
2. Inspect/rotate/crop, correct perspective and contrast with a non-destructive preview.
3. Read text locally when practical; keep the original unchanged as an optional retained artifact.
4. Build an optimized multipage PDF with quality controls, searchable text where feasible.
5. Suggest date, sender, category and folder with confidence and user confirmation.
6. Upload to a private bucket and commit searchable metadata only after verifying successful storage.
7. Search by OCR text, title, sender, dates, tags and folder; preview and download on authorization.

**Never silently discard originals, change document contents or automatically publish personal files.**

## Documentation

Start with [AGENTS.md](AGENTS.md) for the task-specific reading guide. The [product requirements](docs/PRODUCT_REQUIREMENTS.md), [technical architecture](docs/ARCHITECTURE.md), [document pipeline](docs/DOCUMENT_PIPELINE.md), [security model](docs/SECURITY_AND_PRIVACY.md) and [deployment guide](docs/DEPLOYMENT.md) describe the intended implementation.

These project guides were selected and adapted from [Neuroklast/agent-documents](https://github.com/Neuroklast/agent-documents); they are not a bulk copy of that collection.

## Development

No build scripts exist yet. When scaffolding the app, add a lockfile and repeatable lint, typecheck, test and build commands. Don't claim that the app is deployed or that checks have passed before actually running them.

Personal scans, generated PDFs, OCR content, backups, environment files and API credentials **must never be committed to Git**.
