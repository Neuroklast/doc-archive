# API contract

Adapted from agent-documents/backend/api.md for private document operations.

## Rules
- Private endpoints only: authenticate → validate input → authorize owner → execute.
- Use route handlers under `app/api/**/route.ts`; keep the eventual paths in an OpenAPI file when implemented.
- Consistent problem+json errors; no stack traces, OCR text, signed URLs or storage keys in user-facing errors.
- Clamp pagination limit and validate sort/filter fields against an allowlist.
- Use cursor or page-number pagination with stable sort. Search and folder filters must not expose other users' metadata.
- All write requests are rate-limited and, for retriable creates, idempotent.
- Do not accept arbitrary object keys or bucket names from clients.

## Intended endpoint groups (design, not implemented)
- `/api/documents`: list/create metadata, detail and update.
- `/api/documents/:id/download`: authorized short-lived download.
- `/api/documents/:id/versions`: list versions, if versioning is implemented.
- `/api/folders`: tree, rename, move and delete.
- `/api/uploads`: initiate a bounded upload, receive scoped signed PUT instructions.
- `/api/uploads/:id/complete`: verify stored bytes, finalize state, idempotent.
- `/api/search`: paginated text and metadata search, user-scoped.
- `/api/export`: authorized user export, likely streaming or queued for large archives.

Actual names and request/response schemas must be finalized alongside implementation; no route exists yet.

## Upload state contract
`pending → uploading → verifying → processing → ready`, with explicit `failed` and `cancelled` paths. Safe retries cannot skip verification. A processing failure leaves a recoverable state and does not fabricate a ready document.

## Tests
Success + 401 + foreign user + invalid input + rate limit + timeout + retry for each sensitive route. No public unauthenticated document discovery.
