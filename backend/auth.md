# Authentication and authorization

Adapted from agent-documents/backend/auth.md.

## Approach
Better Auth with Neon-backed app sessions remains proposed. Separately, a user explicitly links a Google Drive account using the OAuth 2.0 authorization-code flow. These are different identities/permissions, even if the same Google account is used for both. Enable passkeys for app sign-in if supported.

## Session requirements
- Session cookies: HttpOnly, Secure, SameSite Lax or stricter; appropriate `__Host-` prefix when supported.
- Rate-limit login, sign-up and recovery. Never reveal account existence in auth errors.
- Explicit logout revokes sessions server-side.
- Authenticated API responses use `Cache-Control: no-store`.
- CSRF/origin validation for cookie-authenticated mutations.
- Never put access tokens in localStorage or log session cookies.
- Google OAuth uses `drive.file` only, state bound to the current app session, PKCE when supported, exact redirect URI and server-side code exchange.
- Encrypt refresh tokens at rest using a separate, server-only, versioned encryption key. Implement safe token refresh, revocation, reconnect and account disconnect without deleting user's files.
- Do not conflate a Google account's email with a proven account subject; bind stable identity to the application's user and storage connection.

## Ownership model
Every `document`, `folder`, `tag`, `upload_session`, `storage_connection` and `storage_object` references an owning user. The session determines user identity, not a client-supplied `userId`.

All queries and mutations require ownership checks, including:
- search results and aggregate counts;
- previews and PDF downloads;
- upload completion and cancellation, including ownership of the connected Google account and file parent;
- moving documents into folders;
- restoring, exporting, deleting and sharing (sharing not in MVP).
- Google connect/callback/disconnect, sync cursor and token refresh (never permit cross-user connection substitution).

A UUID that is hard to guess does **not** replace access control. Unknown or foreign record identifiers should return an appropriately non-revealing error. Deny by default.

## Tests
Unauthenticated read/write, cross-user ID enumeration, invalid app session, Google OAuth state/PKCE mismatch, expired Testing grant, revoked/rotated refresh token, wrong connected account, incomplete upload grant and repeated delete. Use at least two synthetic accounts in integration tests.
