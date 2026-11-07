# Authentication and authorization

Adapted from agent-documents/backend/auth.md.

## Approach
Better Auth with a Neon-backed session store is the proposed implementation. Enable secure passkey-based sign-in if the chosen adapter and browser support it. Do not assume the provider is configured until the integration is tested.

## Session requirements
- Session cookies: HttpOnly, Secure, SameSite Lax or stricter; appropriate `__Host-` prefix when supported.
- Rate-limit login, sign-up and recovery. Never reveal account existence in auth errors.
- Explicit logout revokes sessions server-side.
- Authenticated API responses use `Cache-Control: no-store`.
- CSRF/origin validation for cookie-authenticated mutations.
- Never put access tokens in localStorage or log session cookies.

## Ownership model
Every `document`, `folder`, `tag`, `upload_session` and `storage_object` references an owning user. The session determines user identity, not a client-supplied `userId`.

All queries and mutations require ownership checks, including:
- search results and aggregate counts;
- previews and PDF downloads;
- upload completion and cancellation;
- moving documents into folders;
- restoring, exporting, deleting and sharing (sharing not in MVP).

A UUID that is hard to guess does **not** replace access control. Unknown or foreign record identifiers should return an appropriately non-revealing error. Deny by default.

## Tests
Unauthenticated read/write, cross-user ID enumeration, invalid session, revoked session, missing folder ownership, shared signed URL expiration and repeated delete. Use at least two synthetic accounts in integration tests.
