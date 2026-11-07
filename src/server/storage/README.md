# Storage adapters

The SDK-independent TypeScript contract in [contracts.ts](contracts.ts) remains the boundary between application services and storage providers.

- The [GoogleDriveAdapter](../google/drive-adapter.ts) now implements beginUpload, verifyUpload, authorized reading, folder operations, move/rename and delete.
- The MVP's upload routes only use the app-created **root Drive folder**; nested Drive folder mappings and synchronization are not wired into the archive UI yet.
- A Google resumable session URI is a short-lived write capability provided to the browser. OAuth access and refresh tokens stay server-side.
- The completion endpoint verifies an upload's server-generated Drive appProperty and actual PDF header before committing document metadata. Hash integrity is marked `provider_metadata`, not `content_sha256`.
- All provider adapter calls run after Better Auth session/owner checks. Raw Drive IDs must never authorize a request by themselves.
- Cloudflare R2 is not activated and remains an optional future adapter.
- There is no live-provider integration test or production deployment yet.

See [storage design](../../../docs/STORAGE_PROVIDER.md) and [OAuth security](../../../docs/GOOGLE_OAUTH.md).
