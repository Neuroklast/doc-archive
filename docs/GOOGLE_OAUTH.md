# Google Drive OAuth 2.0

DOC ARCHIVE has **two independent authorizations**:
1. Better Auth session signs the user into DOC ARCHIVE and controls all database/API operations.
2. The connected Google OAuth grant authorizes file operations for that account's selected Drive files.

Linking a Google account is explicit, not an implicit extension of app login.

## Required minimal Drive scope

```text
https://www.googleapis.com/auth/drive.file
```

Google classifies this scope as non-sensitive. It grants per-file access to files created/opened with the app or explicitly shared with it, **not** the user's whole Drive. Optional importing of old files requires an explicit Picker flow. Never request drive, drive.readonly or domain-wide delegation for the MVP.

Enable Google Drive API in a Google Cloud project; configure consent screen, exact HTTPS callback URLs and authorized origins. Publishing/verification requirements depend on the deployed app and audience.

## Authorization Code flow

1. Only a signed-in user may select **Connect Google Drive**.
2. Generate cryptographically random state, bind it to the current server-side session and expire it quickly. Add PKCE verifier/challenge when supported by the selected confidential OAuth library.
3. Redirect to Google with response_type=code, drive.file scope, exact redirect_uri, state and access_type=offline. Don't force prompt=consent on every authorization.
4. On callback check state, server session, one-time use, expiry, exact callback origin and PKCE. Exchange authorization code **on the server**. Reject cross-user account-link substitutions.
5. Bind the connection to a stable Google account identity using an appropriately authorized identity endpoint/flow. Email is presentation data, not proof of account identity. Don't silently add broader scopes.
6. Encrypt refresh token at rest with a **separate server-only encryption key** and key version, and store in the DB or a managed secret vault. Never place tokens in browser JavaScript, URLs, localStorage, public cookies, logs or analytics.
7. Store connection ID, grant scope, stable account subject, root DOC ARCHIVE Drive folder ID, state, token updated timestamp. Create the visible Drive root folder with this grant.
8. Refresh access tokens **server-side**, lock/coalesce refresh attempts and persist rotated refresh tokens safely. On invalid_grant or revoked grant mark needs_reconnect and offer reconnect, not infinite retries.
9. Disconnect means revoke access when possible and securely remove credentials. Keep document index in disconnected/read-only state; **do not automatically delete Drive files**.

## Token handling and recovery

- The client_id is public; client_secret, refresh token and encryption key must be server-side in Vercel environment only.
- Use Secure/HttpOnly session cookies with CSRF/origin checks on linking actions. Never treat OAuth callback alone as an app login.
- Validate the granted scope before operating; fail closed for missing drive.file.
- Isolate OAuth clients, credentials and user data between local, preview and production. Avoid wildcard redirect URIs.
- Refresh tokens may be revoked or expire. In particular, Google's External consent screen in **Testing** status commonly issues seven-day refresh tokens when using scopes beyond basic identity. Verify publishing status before reliable production use.
- Server-side token storage is not end-to-end encryption. Google and app infrastructure can read stored PDF bytes and the Neon index under their respective access policies.

## Drive upload sessions

Server starts Google resumable upload with its own OAuth token; browser receives only the resumable session URI, which is a sensitive write capability that should never be logged/persisted in client storage. Browser performs transfer and the completion endpoint reauthorizes the caller. This is not the same as an R2 presigned URL. Validate cross-origin behavior in browser tests.

## Official documentation

- [Drive API scopes](https://developers.google.com/workspace/drive/api/guides/api-specific-auth)
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2/)
- [Drive uploads](https://developers.google.com/workspace/drive/api/guides/manage-uploads)
- [Storage contract](STORAGE_PROVIDER.md)
