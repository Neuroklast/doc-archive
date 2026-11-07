# DOC ARCHIVE — Implementation roadmap

Derived from agent-documents templates/PRD.md, core/workflow.md, core/quality.md and testing/strategy.md.

> **Status:** Live roadmap for an implemented but not yet deployed application. GitHub CI passing is not proof of live Google OAuth/Neon/Drive integration.

## Phase 1 — Scaffold and private foundation
- Initialize Next.js/React/TypeScript, Tailwind and shadcn/ui with pinned lockfile.
- Add lint, typecheck, unit tests, production build and CI workflow.
- Integrate Better Auth on Neon, secure sessions and initial onboarding.
- Create Drizzle tables and repeatable migration plan for users, folders, documents, versions, OCR, uploads and events.
- Design the SDK-free `StorageProviderAdapter` contract and implement Google Drive as the default.
- Implement separate per-user Google OAuth authorization code flow, encrypted refresh-token persistence, state validation and reconnect UI. No secrets committed.
- Create an app-owned visible DOC ARCHIVE Drive root folder; optional R2 is out of MVP.
- Done when authenticated UI loads and synthetic cross-user read/write is blocked.

## Phase 2 — Capture and PDF engine
- Mobile multi-photo capture, reorder, rotate, crop and correction preview.
- Browser processing Worker, bounded memory, user-controlled quality presets.
- German OCR, searchable metadata and PDF generation with validated text layer.
- Preserve original as optional immutable version.
- Done when scanned multipage synthetic letter produces readable, searchable, compressed PDF and handles failure/retry safely.

## Phase 3 — Storage lifecycle and archive
- **Implemented:** Drive API v3 resumable upload, session-specific verification, idempotent completion, and 7-day confirmation recovery for already-transferred files. **Pending:** resume partial transfer across a browser restart, full orphan cleanup.
- **Implemented:** user-created nested Google Drive folders with server-owned ID mappings and idempotent retry after partial folder creation. **Pending:** reconcile external rename/move/trash/delete using Drive `changes.list`.
- **Implemented:** folder tree, folder-filtered search, version metadata and optional local folder suggestions. **Pending:** tags, date extraction and metadata editing.
- Trash/restore and explicit final deletion.
- Done when repeated/failed/aborted upload never yields a fake ready record or an unrecoverable original, and revoked OAuth is visibly recoverable via reconnect.

## Phase 4 — Search and document viewer
- PostgreSQL full-text indexing with German stemming and user scope.
- **Implemented:** search by title, sender, OCR text and exact folder. **Pending:** date/category/tag filters and descendant-folder aggregation.
- Paginated desktop list, preview pane, mobile reader and protected download.
- Done when synthetic documents are found by body text and one user cannot see another user's hits, facets or snippets.

## Phase 5 — Hardening and release
- Security tests for PDF/image ingestion, injection, Better Auth sessions, OAuth callback/refresh, upload-session capabilities and cross-account provider access.
- Accessibility/mobile testing and no-endless-scroll regression checks.
- Backups and full export across Neon metadata and Google Drive files, content-integrity verification and tested restore.
- Privacy decision explicitly recorded, current provider terms checked and preview deployment verified.
- Release only after code tests and manual PDF legibility tests actually pass.

## Non-goals until separately approved
External OCR/AI or vector search, automated email ingestion, public sharing, server-only PDF rendering, data monetization, paid background workers and Cloudflare R2 activation without explicit user approval.

## Source alignment
Selected rules from [Neuroklast/agent-documents](https://github.com/Neuroklast/agent-documents) were rewritten for this plan. See [../AGENTS.md](../AGENTS.md) for task routes.
