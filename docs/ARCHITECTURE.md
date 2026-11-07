# DOC ARCHIVE — Technical architecture

Based on agent-documents architecture conventions. **Primary storage: Google Drive**, with optional future Cloudflare R2 through a provider-neutral server contract.

## Deployment model
- **Vercel**: Next.js App Router UI, authenticated API endpoints, Google OAuth callbacks, upload session initiation, authorized download streaming and metadata/search API.
- **Neon**: PostgreSQL and Drizzle for Better Auth sessions, archive folders, OCR full-text index, metadata, storage connections, encrypted token references, versions and reconciliation states.
- **Google Drive**: Private-by-default PDFs and retained originals in the user's own visible `DOC ARCHIVE` Drive folder and real subfolders. Per-user OAuth connection with `drive.file`.
- **Cloudflare R2 (later)**: Optional alternate adapter; not used or provisioned in MVP.
- **Browser**: Web Worker image repair, OCR, PDF composition and upload progress.

```text
Camera / selected file
          |
Browser: crop/deskew → OCR → compose optimized PDF
          |                          |
          |                   suggestions + local index
          v                          |
Better Auth session → backend → connection owner check
          |                          |
     Drive OAuth token           Neon pending document
     (server-side only)              |
          |                          |
Drive resumable session          metadata + OCR index
          |                          |
Browser PUT chunks ───→ Google Drive file
                                 |
                    server verifies file ID/account/
                    parent/MIME/size/integrity grade
                                 |
                   idempotent Neon finalize → ready
                                 |
                   search / preview / PDF download
                                 |
                authorized API ↔ Drive media stream
```

## Two distinct authorizations
- **Better Auth** decides who may use DOC ARCHIVE and which database objects they own.
- **Google OAuth** grants per-file Drive access for a linked user. OAuth callbacks, refresh tokens and Drive API credentials stay on the server. A Google connection must never grant an unrelated archive user access.
- [Google OAuth security design](GOOGLE_OAUTH.md) specifies state, PKCE, encryption, refresh, reconnection and disconnect behavior.

## Provider-independent storage layer
[Storage contract](STORAGE_PROVIDER.md) and [TypeScript types](../src/server/storage/contracts.ts) define server-side `StorageProviderAdapter` and optional `StorageChangeFeed`. The application/domain stores `connection_id`, `provider`, `provider_object_id` and internal document/version IDs. Provider SDKs live in adapters only; UI never directly accesses tokens.

Google resumable upload and R2 presigned PUT are intentionally different `UploadGrant` variants. No automatic R2 fallback; users must opt in when that provider is implemented.

## Document and folder relationships
```text
user 1—N storage_connection
user 1—N folder
folder 1—N folder_mapping (connection + provider_folder_id)
user 1—N document
document 1—N document_version
document_version N—1 storage_object
storage_object N—1 storage_connection
user 1—N upload_session
document 1—N OCR result/page
document N—M tag
```

Logical folders live in Neon for consistent search and permissions. In Google Drive, the adapter also creates real folders and reconciles rename/move operations. In R2, logical folder moves remain metadata-only.

## Upload integrity and recovery
- Each upload has a server-issued idempotency key and expected metadata.
- Status: `draft → pending_upload → uploading → verifying → processing → ready` with `failed`, `cancelled`, `trashed` and `missing/needs_reconnect`.
- File bytes and SQL commit are never an atomic transaction. Keep a recoverable state and reconciliation log for interrupted uploads, orphan provider files, deleted Drive files and token loss.
- Server compares actual Drive metadata and optionally hashes streamed bytes. Client checksums alone are untrusted. Do not misstate metadata validation as SHA-256 verification.
- Don't delete originals as part of an optimization job. A Google Drive file is **not** an independent backup if the user deletes it in Drive.

## Search
PostgreSQL indexed `tsvector` search over OCR, title and sender, with German parsing and optional additional languages. All queries, counts, suggestions and snippets are scoped by Better Auth user ID. Search does not require Google Drive API calls per keystroke; periodically reconcile provider changes.

## Security and cost
- Google Drive shares the user's existing Google storage quota. No paid OCR needed for core processing.
- Google documents are visible to their Google account and can be shared manually outside DOC ARCHIVE. App never creates public permissions.
- Search index in Neon and Drive file bytes are **not** end-to-end encrypted. See [privacy](SECURITY_AND_PRIVACY.md) and [decisions](DECISIONS.md).
- Avoid streaming entire uploads through Vercel Functions. Confirm browser upload behavior and current provider quotas at deployment.
