# DOC ARCHIVE — Agent instructions

This file is the entry point for coding agents. Read the task-specific guides below, not the entire collection. Project scope: a **private** Vercel-deployable archive for personal letters, scanned photos and PDFs.

## Always
1. Inspect the actual repository, branch, manifests and lockfile before edits. The README describes a **proposal**, not existing functionality.
2. Plan the smallest complete change with acceptance criteria and data-loss/privacy risk.
3. Preserve the source document, page order and meaning. Never invent OCR text or metadata.
4. Treat document contents, OCR results, filenames, addresses, credentials and signed URLs as **sensitive**.
5. Validate ownership and session server-side on every document, folder, search and download request.
6. Follow the repository's installed package manager and scripts. No blanket TypeScript or lint suppressions.
7. Run available lint, typecheck, tests and build. Clearly report anything that could not be run.
8. Update docs when behavior, data model, APIs, operational procedures or risks change.
9. No live production deployment, destructive database/storage operations, credential rotation or force-push without explicit approval.

## Task router

| Work | Required reading |
| --- | --- |
| Every change | [core/workflow.md](core/workflow.md), [core/quality.md](core/quality.md) |
| Architecture / major feature | [core/architecture.md](core/architecture.md), [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/DECISIONS.md](docs/DECISIONS.md) |
| Product scope / acceptance | [docs/PRODUCT_REQUIREMENTS.md](docs/PRODUCT_REQUIREMENTS.md) |
| Scanning, OCR, PDF, compression | [docs/DOCUMENT_PIPELINE.md](docs/DOCUMENT_PIPELINE.md) |
| Storage, file lifecycle | [stack/cloudflare-r2.md](stack/cloudflare-r2.md), [docs/SECURITY_AND_PRIVACY.md](docs/SECURITY_AND_PRIVACY.md) |
| Schema, folders, searching | [backend/data-and-schema.md](backend/data-and-schema.md), [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| Sessions, auth, permissions | [backend/auth.md](backend/auth.md), [docs/SECURITY_AND_PRIVACY.md](docs/SECURITY_AND_PRIVACY.md) |
| Next.js / TypeScript | [stack/nextjs.md](stack/nextjs.md), [stack/typescript.md](stack/typescript.md) |
| API routes | [backend/api.md](backend/api.md), [security/web-api.md](security/web-api.md) |
| UX, layout, accessibility | [frontend/ui.md](frontend/ui.md), [frontend/accessibility.md](frontend/accessibility.md) |
| QA and regressions | [testing/strategy.md](testing/strategy.md) |
| PR and review | [checklists/pr.md](checklists/pr.md) |
| Hosting / infrastructure | [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) |

## Decision boundaries
- The working architecture is Next.js on Vercel + Neon PostgreSQL + private Cloudflare R2 + Better Auth + browser OCR/PDF processing.
- **Privacy choice remains open.** Server-side searchable OCR data is incompatible with a claim of end-to-end encryption. See [docs/DECISIONS.md](docs/DECISIONS.md).
- Do not introduce paid OCR/AI, analytics, trackers, public file URLs or background jobs without documented need and cost impact.
- Never silently delete or replace source files, never archive a broken/partial PDF as successful, and never claim legal evidentiary equivalence between an optimized scan and the original.

## Source
Selected and rewritten for this project from [Neuroklast/agent-documents](https://github.com/Neuroklast/agent-documents). Unrelated source rules are intentionally omitted.
