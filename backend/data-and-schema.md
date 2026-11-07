# Data model and search

Adapted from agent-documents/backend/data-and-schema.md to Neon PostgreSQL + Drizzle.

## Source of truth
- Drizzle schema and one ordered migration chain; no independent handwritten reset schema or parallel manual DDL.
- Never run destructive production migration automatically. Migrations reviewed and tested against realistic non-sensitive fixtures.
- Tables have IDs, user scopes, timestamps and explicit FK delete behavior.

## Proposed entities
- `users`, `sessions`: managed/auth-compatible records.
- `folders`: owner, logical parent and name; prevent cycles and cross-user parents.
- `folder_mappings`: logical folder ID, storage connection and Google Drive folder ID, external sync state.
- `documents`: owner, folder, title, sender, document_date, received_at, status, archival metadata.
- `document_versions`: document, version, original/optimized kind, object ID, checksum, page_count, bytes, MIME and processing metadata.
- `storage_connections`: owner, provider, stable Google account ID, root Drive folder ID, encrypted token reference, encrypted change cursor and reconnect state.
- `storage_objects`: owner, storage connection, provider, opaque Google Drive file ID (or future R2 key), provider parent ID, expected SHA-256, verified checksum level, MIME, size and lifecycle state.
- `document_ocr`: document/version, extracted text, language(s), confidence, indexed tsvector; optional page/bounding-box layout if PDF text layer is required.
- `tags` + `document_tags`: normalized ownership and membership.
- `upload_sessions`: owner, connection, status, expiration, idempotency key, expected size/hash, associated object and encrypted/short-lived provider session reference if persistence is unavoidable.
- `audit_events`: minimal security-relevant actions without OCR text or sensitive content.

Schema names are proposals to validate during implementation, not existing tables.

## Search
- PostgreSQL full-text search with the `german` dictionary by default, other languages added explicitly.
- Parameterized `websearch_to_tsquery` and indexed `tsvector`, plus exact metadata/date filters.
- Consider `pg_trgm` for typo-tolerant sender/title searching if supported by selected Neon plan.
- Include `WHERE owner_id = session.user.id` **in the DB query**, even for counts, suggestions and facets.
- Distinguish scanned document date, upload date and extracted dates, with confidence provenance.
- Search ranking must not allow snippets from records the caller cannot access.

## Integrity
- DB transactions cover metadata only. Google Drive files (and later R2) are outside the DB transaction; reconcile pending sessions, provider-only orphan files, externally trashed files and conflicts.
- Do not cascade Google Drive physical deletion from a logical folder rename/delete. Drive folder moves/renames require provider operation, confirmation and mapping reconciliation.
- Soft delete and restore window first; documented permanent purge separately.
- Dedup only within the same user by trusted byte hash; browser-provided checksum alone is not a trusted content proof. Never expose global cross-user matches.

## Drive sync and credentials

Track account-linked `needs_reconnect`, per-file `missing` and `external_change_pending` conditions without silently altering OCR records. Changes feed cursors are per-connection and may contain sensitive metadata. Token ciphertext is stored outside regular content tables or in tightly restricted columns. A Google account's Drive files and app's OCR index are distinct data sets and must be exported/restored together.

## Index/checklist
Indexes for owner+folder+status+date, owner+storage connection, provider+file ID, foreign keys, sender/title as justified and OCR tsvector. Test duplicate moves, hierarchy loops, timezone boundaries, concurrent finalize and pagination stability.
