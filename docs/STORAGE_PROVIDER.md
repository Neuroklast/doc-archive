# Provider-independent storage contract

**Google Drive is the primary MVP storage.** Cloudflare R2 remains an optional later adapter, not a hidden fallback, backup, or mandatory dependency.

## Boundaries

- [TypeScript contract](../src/server/storage/contracts.ts) defines the server-side adapter interface without provider-specific SDK imports.
- The document domain uses internal document/folder IDs. A server-side storage connection identifies the provider and account; never accept a client-supplied Google account as authority.
- GoogleDriveAdapter uses Drive API v3 and the user's server-side OAuth connection.
- CloudflareR2Adapter is a later, opt-in implementation with private S3-compatible storage.
- Upload transport differs deliberately: Drive resumable session URL vs R2 scoped presigned PUT.
- Authorized downloads stream through the server by default. A Drive webViewLink is not a private download capability and OAuth tokens must never reach the client.
- Provider-specific synchronization, quotas, file sharing and change notifications are optional capabilities, not fake common operations.

## Data model proposals

```text
storage_connections:
  id, owner_user_id, provider, google_account_subject, state,
  root_folder_id, encrypted_token_reference, encrypted_change_cursor,
  connected_at, refreshed_at, disconnected_at

storage_objects:
  id, owner_user_id, connection_id, provider, provider_object_id,
  provider_parent_id, mime, bytes, expected_sha256,
  provider_checksum, integrity_level, status, verified_at

upload_sessions:
  id, owner_user_id, connection_id, object_id, state,
  expected_bytes, expected_sha256, expires_at,
  encrypted_provider_session_reference

folders:
  id, owner_user_id, parent_id, display_name
folder_mappings:
  folder_id, connection_id, provider_folder_id, sync_state
```

Encrypted provider secrets and upload session URIs must not appear in logs, public client state, analytics or ordinary database exports. A Drizzle schema and migrations will be created during implementation.

## Operations

| Operation | Contract | Google Drive | R2 later |
| --- | --- | --- | --- |
| Create folder | createFolder | Real Drive folder under app root | Logical DB-only folder |
| Begin upload | beginUpload | Server creates Drive resumable session | Server signs PUT |
| Transfer | UploadGrant | Browser PUT/chunks to scoped session | Browser PUT to signed URL |
| Verify | verifyUpload | Drive metadata, optionally streamed content hash | HEAD + appropriate hash check |
| Read | openReadStream | Server-authorized Drive media stream | Server-authorized R2 stream |
| Move/rename | move / rename | Drive API then DB reconcile | DB metadata only |
| Permanently delete | delete | Drive API after explicit confirmation | R2 delete after explicit confirmation |
| Observe changes | StorageChangeFeed (optional) | Drive changes feed | Reconciliation job |

## Upload and integrity

1. Browser prepares PDF, metadata, local SHA-256 and expected byte count. Client claims are untrusted.
2. Server verifies Better Auth session and ownership of the selected storage connection/folder and creates idempotent upload session.
3. Server calls Drive files.create(uploadType=resumable), with server-only OAuth credential and an app-created folder parent.
4. Browser receives **only** the resumable upload session URI and sends file bytes directly to Google. The URI is a sensitive temporary write capability. Never log/cache it or expose access/refresh tokens.
5. Follow Google chunk rules (multiples of 256 KiB except the final chunk) and resume by querying actual received byte range. Browser/CORS feasibility must be verified in an end-to-end test.
6. Completion endpoint rechecks owner and Drive account, then fetches actual Google file metadata (file ID, parent, mimeType, size, trashed). A client-supplied file ID is never proof.
7. Mark integrity as provider_metadata if only metadata was verified. Claim content_sha256 only if trusted bytes were actually hashed and compared. Never equate user-provided SHA-256 with verification.
8. Commit metadata, OCR/search records, versions and ready status idempotently. Orphan/retry reconciliation is mandatory. Failure must not silently delete a previous version.

Google's resumable session URI may remain usable for up to one week. Application cancellation/expiry does not automatically revoke it. Keep it transient and reconcile uploaded leftovers.

## Folder semantics

- Neon holds logical folders for fast navigation and search. Google Drive mirrors these as **actual visible subfolders** under a user-owned DOC ARCHIVE root folder. Map DB folder IDs to Drive folder IDs.
- Moves/renames initiated in the app update Drive first and then commit/reconcile DB state. Don't imply renaming a folder changes file bytes.
- Drive files are visible to the user's Google account. The app never creates public sharing permissions automatically, but cannot override files the user shares manually in Drive.
- The app does not require scanning the whole Drive. With drive.file it only manages app-created files and explicitly Picker-authorized existing files.

## External changes and synchronization

Use per-connection changes.getStartPageToken and changes.list with bounded pagination/cursor storage, at least after reconnection or on explicit refresh. Only changes visible under granted scope are observable, not whole-Drive events.

External rename, move, trash or deletion must set sync state or missing flag and trigger reconciliation. Show conflicts rather than silently overwriting changed Drive state. Drive alone is not a separate disaster-recovery backup.

## Future R2 expansion

Add a CloudflareR2Adapter behind the same interface after contract/security/recovery tests. No automatic provider migration, multi-provider copies or credential provisioning without explicit user approval.

## References

- [OAuth design](GOOGLE_OAUTH.md)
- [Google Drive adapter rules](../stack/google-drive.md)
- [Official upload guide](https://developers.google.com/workspace/drive/api/guides/manage-uploads)
- [Official change feed](https://developers.google.com/workspace/drive/api/guides/manage-changes)
