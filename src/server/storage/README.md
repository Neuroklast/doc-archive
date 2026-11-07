# Storage interface

[contracts.ts](contracts.ts) is the dependency-free TypeScript interface, **not** a working implementation.

- MVP: Google Drive adapter with per-user OAuth grant, drive.file scope and real Drive folders.
- Future optional adapter: Cloudflare R2; never store files there without user approval.
- Google resumable transfer and R2 signed PUT have different upload grants by design.
- Only server services call adapters after Better Auth session, user ownership and connection checks.
- OAuth access/refresh tokens never appear in client data. Drive downloads are streamed by the backend.
- Provider metadata and content hash are separate verification levels. A hash received from a browser is untrusted.
- StorageChangeFeed is an optional provider capability, not a promise of complete Google Drive account sync.
- No providers, migrations, package scripts or deployment are implemented yet.

See [storage architecture](../../../docs/STORAGE_PROVIDER.md) and [Google OAuth](../../../docs/GOOGLE_OAUTH.md).
