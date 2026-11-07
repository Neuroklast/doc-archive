# Google Drive primary storage

Google Drive is the **default** storage backend for DOC ARCHIVE. Cloudflare R2 is a future optional provider, not a fallback.

## Identity and scope
- First sign in with Better Auth; then explicitly connect a Google account via a separate OAuth authorization-code grant.
- Request minimum scope `https://www.googleapis.com/auth/drive.file`. Do not request blanket Drive access, a service account or domain-wide delegation.
- A storage connection is bound to the internal archive user's ID and verified Google account. Neither email nor Drive file ID is authorization by itself.
- Create a visible `DOC ARCHIVE` folder in the user's My Drive, not hidden appDataFolder. Files created by the app are accessible under this per-file scope.
- Optional access to existing Drive documents must use explicit user selection via Google Picker and per-file authorization.

## File and folder model
- Keep logical folder tree and searchable metadata in Neon.
- Mirror user folders into **real Google Drive subfolders** under the app's root folder. Store the mapping from internal ID to Drive folder ID.
- Store each PDF as binary `application/pdf`, not an automatically converted Google Docs file.
- Provider object references: `connection_id` + opaque Drive `file_id` + current parent ID, MIME, size, verification state and checksums.
- Drive filenames may be descriptive. Preview before creating sensitive names; app never creates public sharing permissions automatically.

## Transfer
- Start Drive API v3 `files.create` with `uploadType=resumable` **on the server** and authenticated user's OAuth grant.
- Return the resumable **session URI only**, never the access/refresh token. Treat session URI as a bearer-like write capability.
- Browser streams or chunks PDF directly to Drive; respect Google chunk increment of 256 KiB except final chunk, range-resumption semantics and bounded retries.
- The URI may remain valid for up to a week, regardless of shorter app session expiration. Never log/persist it in browser storage.
- Validate browser CORS in deployed E2E tests. If unsuitable, redesign the upload transport deliberately rather than proxying large file bodies through limited Vercel Functions without review.
- After upload, verify the stored Drive file and parent/account against the server-side upload session before marking `ready`.
- Provider metadata verification does **not** prove exact content hash; report integrity grade separately.

## Read and lifecycle
- Authenticated server streams Google `files.get?alt=media` to viewer/download with no-store, content-disposition and bounded error handling.
- Move/rename via Drive API, then reconcile Neon mapping. No optimistic DB-only success on Drive failure.
- App trash state need not immediately delete or trash the Google file. Permanent deletion must be separately confirmed and can be unrecoverable.
- User may rename/share/move/trash/delete files directly in Drive. Sync periodically with `changes.getStartPageToken` / `changes.list` for items visible under `drive.file`, including reconnection and explicit refresh.
- Mark missing/disconnected/conflicted states. Never silently recreate deleted files or misrepresent complete whole-Drive synchronization.

## Limits and errors
Handle quota exhaustion (Drive storage shared with other Google services), 401/403 insufficient grants, 404 missing files, 429 and transient 5xx with backoff, invalid_grant requiring reconnect, resumable 308/404, and disconnected accounts.

## References
- [OAuth design](../docs/GOOGLE_OAUTH.md)
- [Storage interface](../docs/STORAGE_PROVIDER.md)
- [Deployment](../docs/DEPLOYMENT.md)
- [Google scopes](https://developers.google.com/workspace/drive/api/guides/api-specific-auth)
- [Google uploads](https://developers.google.com/workspace/drive/api/guides/manage-uploads)
