# Data model and search

Adapted from agent-documents/backend/data-and-schema.md to Neon PostgreSQL + Drizzle.

## Source of truth
- Drizzle schema and one ordered migration chain; no independent handwritten reset schema or parallel manual DDL.
- Never run destructive production migration automatically. Migrations reviewed and tested against realistic non-sensitive fixtures.
- Tables have IDs, user scopes, timestamps and explicit FK delete behavior.

## Proposed entities
- `users`, `sessions`: managed/auth-compatible records.
- `folders`: owner, parent reference, name, normalized path for UI only; prevent cycles and cross-user parents.
- `documents`: owner, folder, title, sender, document_date, received_at, status, archival metadata.
- `document_versions`: document, version, original/optimized kind, object ID, checksum, page_count, bytes, MIME and processing metadata.
- `storage_objects`: owner, private R2 object key, sha256, media type, validated bytes, lifecycle state.
- `document_ocr`: document/version, extracted text, language(s), confidence, indexed tsvector; optional page/bounding-box layout if PDF text layer is required.
- `tags` + `document_tags`: normalized ownership and membership.
- `upload_sessions`: owner, status, expiration, idempotency key, expected bytes/checksum, associated object.
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
- DB transaction for related metadata changes. Object storage is not part of the transaction: reconcile pending uploads and orphan objects explicitly.
- Do not cascade physical R2 deletion blindly from a folder rename/delete.
- Soft delete and restore window first; documented permanent purge separately.
- Dedup only within the same user by trusted byte hash; never expose global cross-user matches.

## Index/checklist
Indexes for user+folder+status+date, foreign keys, normalized sender/title as justified, OCR tsvector. Test duplicate moves, hierarchy loops, timezone boundaries, concurrent finalize and pagination stability.
