# Optional future Cloudflare R2 storage

> **Not part of the Google Drive-first MVP.** Enable only as a separately configured provider through [the shared contract](../docs/STORAGE_PROVIDER.md). No automatic backup, replication or migration to R2.

Adapted from agent-documents/stack/cloudflare-r2.md. These rules apply only **if** a future R2 adapter is implemented and explicitly enabled. DOC ARCHIVE stores private files only.

## Object keys
Generate opaque server-controlled keys such as `users/{user_uuid}/objects/{random_uuid}.pdf`. Keep folders as PostgreSQL metadata, not path segments. Never use original filenames, addresses or document titles in object keys. Database stores keys, checksum, MIME, verified size and ownership. Never store permanent public URLs.

## Upload
1. Authenticated user requests scoped upload session with allowed MIME, max size, expected count and TTL.
2. Server issues short-lived presigned PUT for **one opaque object** with restricted method/header.
3. Browser uploads directly to private R2 with explicit progress/retry behavior.
4. Server validates object existence/size/content, checks magic bytes or securely scans bytes and verifies hash where appropriate.
5. Only then can the application finalize the document record. A successful PUT alone is **not** proof of a valid or authorized PDF.

Browser-declared MIME and filename are never trusted. Block HTML/SVG/executable types in MVP. Protect against decompression bombs, hostile PDFs, oversized images and PDF exploits. Validate limits before parsing and avoid executing embedded scripts.

## Download
Authorize session+owner at request time. Return a short-lived signed GET or controlled streaming endpoint with sanitized download filename and content disposition. No caching of sensitive files in public edge caches. Do not log presigned URLs.

## Storage lifecycle
Originals are immutable if retained. Upload a new version before replacing pointers. Use explicit `pending/verified/active/deleted` transitions, periodic reconciliation and expiry for incomplete sessions. Soft-delete DB first, permanently purge only after retention and backup policy permits. Never claim recoverability without tested backups.

## Operations
Private bucket; least-privilege keys in server env. CORS allow only actual app origins and necessary PUT headers/GET behavior. Document environment settings in [../docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md). Check current R2 SDK checksum and endpoint/jurisdiction requirements when implementing, not from a copied historical config.
