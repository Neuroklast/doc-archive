# Architecture decisions

Living ADRs adapted from agent-documents/templates/ADR.md. Supersede decisions explicitly; do not rewrite history.

## ADR-001 — Vercel-compatible archive base
- **Status:** amended by ADR-006 (storage choice); application not implemented
- **Date:** 2026-11-07
- **Original direction:** Next.js/Vercel, Neon/Drizzle, Cloudflare R2, Better Auth, browser PDF/OCR.
- **Current base:** Next.js/Vercel, Neon/Drizzle, Better Auth, browser-side OCR/PDF processing remain. Provider changes per ADR-006.
- **Constraints:** Low recurring cost, private documents, smartphone capture, full-text search, data portability.

## ADR-002 — Server-indexed OCR vs end-to-end encryption
- **Status:** decision required before any E2EE claim
- **Date:** 2026-11-07
- **Option A (working MVP):** OCR/text and metadata in Neon, bytes in user-owned Google Drive. Both providers and server-side app integrations may technically access the relevant data.
- **Option B:** Encrypted files *and index*, client-only search/key recovery design, substantially different architecture.
- **Decision:** No E2EE promise. Option A remains an explicit working assumption.

## ADR-003 — Originals vs processed PDFs
- **Status:** proposed
- **Date:** 2026-11-07
- **Decision:** Keep originals as optional separately retained immutable versions; derived PDFs are new objects. Never silently replace the only copy.
- **Consequence:** More storage consumed but reprocessing and recovery remain possible.

## ADR-004 — Logical archive metadata
- **Status:** amended by ADR-006
- **Date:** 2026-11-07
- **Decision:** User-scoped logical folder tree and OCR index in Neon. Drive storage maps those folders to real Drive subfolders; R2, if added later, may use DB-only virtual folders.
- **Consequence:** A Drive folder's name/parent can change externally; reconciliation is mandatory.

## ADR-005 — Privacy-aware classification
- **Status:** proposed
- **Date:** 2026-11-07
- **Decision:** Deterministic browser classification with confidence and user confirmation. No third-party AI API by default.

## ADR-006 — Google Drive primary, R2 optional
- **Status:** accepted for project architecture, implementation pending
- **Date:** 2026-11-07
- **Decision:** Google Drive is the default file backend, using an explicitly connected user account and `drive.file`. R2 remains optional future adapter behind `StorageProviderAdapter`, not automatically active or a hidden replica.
- **Alternatives:** R2 only, both required, Google Drive plus automatic R2 backup.
- **Why:** Files remain directly accessible within the user's own Drive, with existing storage quota, while the archive provides its own search and PDF processing.
- **Consequences:** OAuth token lifecycle, Drive API quotas and manual file changes are new concerns. Drive storage can be shared outside the app by its owner. Database + Drive need coordinated backup/recovery.
- **References:** [Storage contract](STORAGE_PROVIDER.md), [Google OAuth](GOOGLE_OAUTH.md).

## ADR-007 — Scoped user OAuth distinct from app login
- **Status:** accepted for design, implementation pending
- **Date:** 2026-11-07
- **Decision:** Better Auth authenticates archive users; separate server-side authorization-code OAuth grants Drive access. Restrict to `drive.file`; encrypt refresh token and bind connection to the archive account.
- **Consequences:** Reconnect flows and a verified consent screen required. External Testing status may give seven-day refresh tokens, not suitable for indefinite unattended use.
- **References:** [Google OAuth](GOOGLE_OAUTH.md), [Google scope guidance](https://developers.google.com/workspace/drive/api/guides/api-specific-auth).

## ADR-008 — Provider-neutral contract with explicit capabilities
- **Status:** accepted for design, implementation pending
- **Date:** 2026-11-07
- **Decision:** Stable server adapter for folder, upload, verification, read, move, rename and deletion. Discriminated upload grant models provider differences. Optional change feed for Drive.
- **Consequences:** Storage metadata references include provider, connection and object ID. Provider-specific APIs cannot leak into domain logic.
- **References:** [Storage contract](STORAGE_PROVIDER.md), [TypeScript contract](../src/server/storage/contracts.ts).
