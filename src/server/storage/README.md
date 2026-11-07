# Storage adapters

The SDK-independent TypeScript contract in [contracts.ts](contracts.ts) remains the boundary between application services and storage providers.

- The [GoogleDriveAdapter](../google/drive-adapter.ts) now implements beginUpload, verifyUpload, authorized reading, folder operations, move/rename and delete.
- Upload routes can target the root or a **real nested Drive folder** after checking the authenticated user's database folder mapping. Folder creation uses stable `appProperties.docArchiveFolderId` to find an existing Drive folder during retry. External Drive changes are not yet reconciled.
- A Google resumable session URI is a short-lived write capability provided to the browser. OAuth access and refresh tokens stay server-side.
- The completion endpoint verifies an upload's server-generated Drive appProperty, expected parent folder, MIME/size and actual PDF header before committing document metadata. Hash integrity is marked `provider_metadata`, not `content_sha256`.
- All provider adapter calls run after Better Auth session/owner checks. Raw Drive IDs must never authorize a request by themselves.
- Cloudflare R2 is not activated and remains an optional future adapter.
- Pending upload tickets now retain title, sender, OCR and destination to recover database finalization after the browser closes. This is not a guarantee that an incomplete file transfer can resume after a new browser session.
- No live-provider integration test or production deployment has been performed.

See [storage design](../../../docs/STORAGE_PROVIDER.md) and [OAuth security](../../../docs/GOOGLE_OAUTH.md).
