# Architecture rules

Adapted from agent-documents/core/architecture.md to the DOC ARCHIVE domain.

## Layers
- **UI**: scanner, upload queue, archive search/list, document preview, folder management.
- **Application**: capture/process/archive/search/delete use cases and lifecycle transitions.
- **Domain**: document status, confidence, metadata, permissions, file version invariants.
- **Infrastructure**: Neon/Drizzle, Google Drive storage adapter and OAuth client, Better Auth, document validation and optional future R2 adapter.

Dependencies flow toward domain interfaces, never from domain into React, Next.js or Drizzle.

## Consistency
- Storage bytes and database rows are separate systems. Use an explicit upload state machine and reconciliation.
- No record becomes `ready` before stored objects are validated and OCR/metadata status is recorded.
- Store provider-neutral references (`connection_id`, `provider`, `provider_object_id`), never OAuth tokens, permanent public URLs or temporary upload session URIs as file references.
- Immutable object versions for originals. Document title/category/tags can change without rewriting bytes.
- Server owns user identity. Never derive ownership from client IDs, Google account email, file IDs or folder paths.
- Central schema is the source of truth. Every migration is additive, reversible where practical and verified before promoting.

## Provider boundary

Use the shared `StorageProviderAdapter` contract in [../src/server/storage/contracts.ts](../src/server/storage/contracts.ts). Google Drive is the only required MVP adapter, with actual Drive folders and a separate account grant. R2 is an optional future provider. An optional `StorageChangeFeed` handles external Drive changes, not a fake provider-agnostic polling promise.

## Modules
Prefer feature areas such as `capture`, `documents`, `folders`, `search`, `auth`, `storage` and `processing`. Separate pure image/PDF functions from browser and API integration.

## Performance and privacy
- CPU-heavy OCR and image enhancement should run in browser Web Workers when feasible.
- Render existing PDFs without loading arbitrary scripts; parse PDF bytes defensively.
- Keep search paginated, indexed and user-scoped. Never cache authenticated data in shared/public caches.
- Provide progress, cancellation, retry and recovery for long uploads.

See [../docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) and [../docs/DOCUMENT_PIPELINE.md](../docs/DOCUMENT_PIPELINE.md).
