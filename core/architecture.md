# Architecture rules

Adapted from agent-documents/core/architecture.md to the DOC ARCHIVE domain.

## Layers
- **UI**: scanner, upload queue, archive search/list, document preview, folder management.
- **Application**: capture/process/archive/search/delete use cases and lifecycle transitions.
- **Domain**: document status, confidence, metadata, permissions, file version invariants.
- **Infrastructure**: Neon/Drizzle, R2 client, auth adapter, telemetry and file validation.

Dependencies flow toward domain interfaces, never from domain into React, Next.js or Drizzle.

## Consistency
- Storage bytes and database rows are separate systems. Use an explicit upload state machine and reconciliation.
- No record becomes `ready` before stored objects are validated and OCR/metadata status is recorded.
- Store R2 **object keys**, never public or signed URLs.
- Immutable object versions for originals. Document title/category/tags can change without rewriting bytes.
- Server owns user identity. Never derive ownership from client IDs or folder paths.
- Central schema is the source of truth. Every migration is additive, reversible where practical and verified before promoting.

## Modules
Prefer feature areas such as `capture`, `documents`, `folders`, `search`, `auth`, `storage` and `processing`. Separate pure image/PDF functions from browser and API integration.

## Performance and privacy
- CPU-heavy OCR and image enhancement should run in browser Web Workers when feasible.
- Render existing PDFs without loading arbitrary scripts; parse PDF bytes defensively.
- Keep search paginated, indexed and user-scoped. Never cache authenticated data in shared/public caches.
- Provide progress, cancellation, retry and recovery for long uploads.

See [../docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) and [../docs/DOCUMENT_PIPELINE.md](../docs/DOCUMENT_PIPELINE.md).
