# DOC ARCHIVE — Implementation roadmap

Derived from agent-documents templates/PRD.md, core/workflow.md, core/quality.md and testing/strategy.md.

> **Status:** Plan only. Documentation commits do not constitute an application implementation or production deployment.

## Phase 1 — Scaffold and private foundation
- Initialize Next.js/React/TypeScript, Tailwind and shadcn/ui with pinned lockfile.
- Add lint, typecheck, unit tests, production build and CI workflow.
- Integrate Better Auth on Neon, secure sessions and initial onboarding.
- Create Drizzle tables and repeatable migration plan for users, folders, documents, versions, OCR, uploads and events.
- Configure private R2 integration and local dev mocks. No secrets committed.
- Done when authenticated UI loads and synthetic cross-user read/write is blocked.

## Phase 2 — Capture and PDF engine
- Mobile multi-photo capture, reorder, rotate, crop and correction preview.
- Browser processing Worker, bounded memory, user-controlled quality presets.
- German OCR, searchable metadata and PDF generation with validated text layer.
- Preserve original as optional immutable version.
- Done when scanned multipage synthetic letter produces readable, searchable, compressed PDF and handles failure/retry safely.

## Phase 3 — Storage lifecycle and archive
- Signed direct R2 upload, verify/complete, retries and orphan reconciliation.
- Folder tree, version metadata, tags, date/sender suggestions and user corrections.
- Trash/restore and explicit final deletion.
- Done when repeated/failed/aborted upload never yields a fake ready record or an unrecoverable original.

## Phase 4 — Search and document viewer
- PostgreSQL full-text indexing with German stemming and user scope.
- Filter by sender, title, text, dates, category, tags and folder.
- Paginated desktop list, preview pane, mobile reader and protected download.
- Done when synthetic documents are found by body text and one user cannot see another user's hits, facets or snippets.

## Phase 5 — Hardening and release
- Security tests for PDF/image ingestion, injection, auth, signed links and session handling.
- Accessibility/mobile testing and no-endless-scroll regression checks.
- Backups, checksum validation, full archive export and tested restore.
- Privacy decision explicitly recorded, current provider terms checked and preview deployment verified.
- Release only after code tests and manual PDF legibility tests actually pass.

## Non-goals until separately approved
External OCR/AI or vector search, automated email ingestion, shared folders, public downloads, server-only PDF rendering, data monetization and paid background workers.

## Source alignment
Selected rules from [Neuroklast/agent-documents](https://github.com/Neuroklast/agent-documents) were rewritten for this plan. See [../AGENTS.md](../AGENTS.md) for task routes.
