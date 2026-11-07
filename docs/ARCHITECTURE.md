# DOC ARCHIVE — Technical architecture

Derived from agent-documents/core/architecture.md, stack/nextjs.md, backend/data-and-schema.md and stack/cloudflare-r2.md.

## Deployment model
- **Vercel:** Next.js App Router UI, authenticated API routes and signed URL issuance.
- **Neon:** Postgres for accounts/sessions, logical folders, document metadata, OCR text/search and lifecycle events, accessed through Drizzle.
- **R2:** private original and optimized PDF/image objects, no public bucket.
- **Browser:** Web Worker processing (OpenCV.js, Tesseract.js, PDF.js, pdf-lib as implementation permits). OCR data only uploaded after explicit archive action.

```text
Camera / file input
     ↓
Browser preview → crop/perspective → OCR → optimize PDF
     ↓                                  ↓
Authenticated upload ticket       metadata + OCR suggestions
     ↓                                  ↓
Private R2 presigned PUT   +   completion API (auth + verify R2 bytes)
                                        ↓
                                 Neon transaction / status
                                        ↓
                        Folder view + scoped full-text search
                                        ↓
                         Authorized preview / PDF download
```

## Trust boundaries
1. Browser input is untrusted. `accept`, extension, Content-Type, OCR output and date detection are hints, never security proof.
2. R2 presigned links are temporary bearer capabilities. Scope method, key, headers and expiry.
3. API derives owner from session. Check ownership on every lookup before issuing any storage link.
4. Postgres metadata may contain sensitive text. Access is authenticated, user-scoped and never shared-cacheable.
5. Stored bytes and DB transaction cannot be atomic together. Record lifecycle and reconcile incomplete operations.

## State model
`draft → pending_upload → uploading → verifying → processing → ready`; failures represented by `failed` or `cancelled`; `trashed` and `purged` after ready. Transitions must be validated and idempotent. An expired ticket does not produce `ready`.

## Search architecture
Postgres `tsvector` (language-aware, default German), user-constrained query, weighted fields (title/sender/OCR), paginated stable sort and sanitized snippets. Exact sender/date/folder/tag filters. Assess `pg_trgm` for typo tolerance only if available. Query ownership predicate must apply before ranking/snippets and facets.

## Data relationships
```text
user 1—N folder
user 1—N document
folder 1—N document
document 1—N document_version
document_version 1—N storage_object reference (implementation choice)
document 1—N OCR result/page
document N—M tag
user 1—N upload_session
```
Canonical schema is Drizzle (see [../backend/data-and-schema.md](../backend/data-and-schema.md)). Use no physical R2 folder renames for logical archive moves.

## Client-server split
Client: camera UX, page handling, local image processing, per-page OCR, pdf composition, upload progress, manual metadata review.
Server: sessions, permissions, signed upload tickets, storage checks, metadata persistence, indexing, searches, storage reconciliation, authorized downloads.

## Cost boundaries
Avoid always-on servers and external inference. No routine OCR on Vercel Functions. Respect Vercel request/function budgets; use direct R2 uploads. Storage limits and provider tariffs must be rechecked at deployment time, not hardcoded as guarantees.

## Security and resilience
See [SECURITY_AND_PRIVACY.md](SECURITY_AND_PRIVACY.md), [DOCUMENT_PIPELINE.md](DOCUMENT_PIPELINE.md) and [DEPLOYMENT.md](DEPLOYMENT.md).
