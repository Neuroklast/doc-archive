# Architecture decisions

Adapted from agent-documents/templates/ADR.md. Decisions are append-only; supersede rather than erase previous context.

## ADR-001 — Vercel-compatible private document archive
- **Status:** working proposal; not yet implemented
- **Date:** 2026-11-07
- **Context:** Low/no recurring cost, mobile upload, PDF conversion, private storage, full-text search.
- **Selected direction:** Next.js App Router / Vercel + Neon PostgreSQL / Drizzle + private Cloudflare R2 + Better Auth + browser-side OCR/image/PDF processing.
- **Alternatives:** Supabase all-in-one; Neon object storage; paid OCR services; self-hosted Paperless-ngx.
- **Consequences:** Reduced inference cost and separate storage/metadata concerns, at the price of browser performance variability and non-atomic DB/object operations.
- **Revisit trigger:** Free-tier constraints, OCR quality limits, browser memory failures, a need for enterprise compliance or offline-first operation.

## ADR-002 — Server-indexed OCR vs end-to-end encryption
- **Status:** decision required before claiming a privacy mode
- **Date:** 2026-11-07
- **Option A:** Server-side OCR search index in Neon. Efficient full-text search across devices; service infrastructure can read OCR text.
- **Option B:** Client-side encryption of files *and* index. Stronger confidentiality, but key recovery, cross-device search and browser performance require a different design.
- **Working assumption:** Option A for an MVP, explicitly **not** end-to-end encrypted, unless user selects B.
- **Gate:** Do not write E2EE marketing copy or irreversible encryption code until choice and recovery model are documented.

## ADR-003 — Originals vs processed PDFs
- **Status:** proposed
- **Date:** 2026-11-07
- **Decision:** Treat originals as immutable optional retained versions and PDFs as derived artifacts; never silently overwrite source bytes.
- **Consequence:** Additional storage use, but reduced data-loss risk and easier reprocessing.

## ADR-004 — Metadata and folder storage
- **Status:** proposed
- **Date:** 2026-11-07
- **Decision:** User-scoped logical folders and OCR text in PostgreSQL; private R2 objects use opaque keys, not named physical folders.
- **Consequence:** Moves/renames are metadata-only; lifecycle reconciliation is mandatory.

## ADR-005 — Privacy-safe classification
- **Status:** proposed
- **Date:** 2026-11-07
- **Decision:** Local deterministic rules, confidence and user correction by default; third-party LLM inference requires separate opt-in/cost/privacy review.
- **Consequence:** Some hard-to-classify mail remains manual, but no automatic external disclosure.
