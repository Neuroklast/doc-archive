# Security baseline

Adapted from agent-documents/security/security.md. This app handles personal letters, government/insurance records and potentially special-category personal data.

## Never
- Commit real scans, generated PDFs, OCR text dumps, backups, .env files, keys or signed URLs.
- Log filenames or OCR text indiscriminately, store documents in a public bucket, or share them via static asset paths.
- Claim end-to-end encryption when OCR content is searchable on the server.
- Use external OCR/AI APIs, analytics/tracking or hidden telemetry without explicit, documented decision.

## Controls
- HTTPS + secure session cookies; short sessions and server-side revocation.
- Authorize every document/folder/version object before read, search, upload completion or download.
- Separate R2 access keys and database credentials; least privilege, rotation procedure, startup env validation.
- Strict content types, sniffed magic bytes, size/page/pixel limits and PDF parsing sandbox policy.
- CSRF/origin defenses, scoped signed URLs, per-user rate limits, restrictive CORS and CSP.
- No personal content in error telemetry; documented retention and opt-in diagnostics only if ever introduced.
- Sensitive private data excluded from shared caches and SEO indexing.
- Backups are encrypted/access-restricted with tested restore, including *both* DB and R2 objects.
- Dependency vulnerability scans and PR review for PDF/OCR/WASM libraries.

## Threats to test
Cross-user ID enumeration; leaked signed URLs; replayed upload completion; malicious PDFs; raster decompression bombs; OCR prompt-like content manipulating classification; XSS in filename/metadata; forged folder owner; cache leakage; race conditions during delete/restore; orphan R2 objects.

## Incident response
Disable compromised credentials, revoke sessions/links, inspect metadata-only logs, contain exposure and document findings. Follow applicable breach-notification obligations with appropriate advice; do not automatically promise that no personal data can leave the EU.

## Known unresolved privacy decision
Server-indexed OCR is a convenience/security tradeoff. E2EE requires encrypted client-side indexing or client-only search and key backup/recovery; see [../docs/DECISIONS.md](../docs/DECISIONS.md). Do not market either mode before implementation and verification.
