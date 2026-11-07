# Testing strategy

Adapted from agent-documents/testing/strategy.md.

## Synthetic fixtures only
Generate nonsensitive mock letters, bills, insurance notices and IDs. Do not use real personal documents in tests or CI. Fixtures cover German umlauts, decimal comma, multi-page order, inverted image, rotated photo, low contrast, handwritten notes, OCR empty result, PDF without extractable text and corrupted input.

## Unit
- OCR normalization and confidence thresholds.
- Document date vs upload timestamp handling.
- Filename sanitization, folder tree cycle detection and ordering.
- State machine transitions, retry/idempotency logic and duplicate detection.
- Metadata classification with confidence/unknown fallbacks.
- Search query normalization and safe filtering.

## Integration
- Authenticated create/complete/move/delete/restore and search endpoints.
- 401 for anonymous, deny foreign user IDs, expired upload session, repeated completion, inconsistent R2 bytes, failed DB transaction and orphan reconciliation.
- PostgreSQL German full-text search, pagination, title/sender matching and cross-user result isolation.
- Presigned R2 upload mocked or tested against an isolated bucket, never production.

## E2E browser
1. Phone camera/file picker → pages reorder → crop/rotate → OCR preview → optimized PDF → save → find → download.
2. Offline/timeout/cancel → restart safely without phantom ready record.
3. Two users: no cross-user documents, folders, counts, snippets or downloads.
4. Large image/many pages: bounded memory, controlled failure and progress.
5. Trash/restore, original retention, corrupt/unreadable PDF fallback.

## PDF fidelity benchmarks
Measure compression ratio, page dimensions/order, OCR character/word error on synthetic fixtures, text layer selectability, visual readability and browser PDF viewing. Never enforce a fixed file size at the expense of document legibility.

## Verification
After scaffolding use the actual package scripts. Suggested pipeline: lint, typecheck, unit, integration, production build and Playwright E2E. Report runs and gaps honestly. Doc-only additions do not count as executable validation.
