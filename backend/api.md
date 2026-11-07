# API contract

Adapted from agent-documents/backend/api.md for private document operations.

## Rules
- Private endpoints only: authenticate → validate input → authorize owner → execute.
- Use route handlers under `app/api/**/route.ts`; keep the eventual paths in an OpenAPI file when implemented.
- Consistent problem+json errors; no stack traces, OCR text, signed URLs or storage keys in user-facing errors.
- Clamp pagination limit and validate sort/filter fields against an allowlist.
- Use cursor or page-number pagination with stable sort. Search and folder filters must not expose other users' metadata.
- All write requests are rate-limited and, for retriable creates, idempotent.
- Do not accept arbitrary Google file IDs, storage connection IDs, R2 keys or bucket names from clients without server-owned mapping and ownership validation.
- Google Drive OAuth and account linking routes require the active Better Auth session, CSRF defense, state validation and connection ownership.

## Intended endpoint groups (design, not implemented)
- `/api/documents`: list/create metadata, detail and update.
- `/api/documents/:id/download`: authenticated server-streamed PDF from Drive with no OAuth token sent to client.
- `/api/documents/:id/versions`: list versions, if versioning is implemented.
- `/api/folders`: tree, rename, move and delete.
- `/api/uploads`: initiate a bounded, owner-scoped upload and get a Google Drive resumable session URI (R2 signed PUT is optional later).
- `/api/uploads/:id/complete`: verify stored provider object, connection, parent, MIME, byte count and integrity level, then finalize idempotently.
- `/api/search`: paginated text and metadata search, user-scoped.
- `/api/export`: authorized user export of Drive files and Neon metadata, potentially streamed/queued for larger archives.
- `/api/storage/google/connect`: start user-bound Drive authorization-code OAuth flow.
- `/api/storage/google/callback`: validate state/session/PKCE and store encrypted token.
- `/api/storage/google/disconnect`: revoke credentials without deleting user Drive files.
- `/api/storage/sync`: reconcile accessible Drive changes for authenticated connection.

Actual names and request/response schemas must be finalized alongside implementation; no route exists yet.

## Upload state contract
`pending → uploading → verifying → processing → ready`, with explicit `failed`, `cancelled`, `missing` and `needs_reconnect` paths. Safe retries cannot skip verification. A processing failure leaves a recoverable state and does not fabricate a ready document.

## Tests
Success + 401 + foreign user + invalid input + OAuth CSRF/state mismatch + revoked grant + rate limit + upload timeout/retry for each sensitive route. No public unauthenticated document discovery.
