# Web, upload and API hardening

Adapted from agent-documents/security/web-api.md.

- Parameterized Drizzle queries, no interpolation of OCR or search terms into SQL.
- Escape document titles, senders, OCR snippets and tags in React. No unsanitized `innerHTML`.
- Never allow arbitrary remote URL fetching by the document importer in MVP; local upload only.
- Cookie-authenticated mutations use CSRF/origin checks and SameSite cookies.
- CORS explicitly lists deployment origins and methods; no wildcard with credentials.
- CSP must consider R2 upload origin, WebAssembly/OpenCV/Tesseract workers and PDF.js without allowing arbitrary scripts or remote embeds.
- File type validation uses signature, content, size, page and pixel limits. Do not trust `accept=` or filename extensions.
- Only render PDFs through a maintained viewer with scripting disabled. Treat embedded files, active content, links and unknown formats as untrusted.
- Never route original large uploads through a serverless function when direct signed upload works.
- Rate-limit issue/complete/download/search endpoints as appropriate. Expire upload sessions and signed links.
- Secure response headers include `no-store`, `nosniff`, restrictive frame policy and safe Content-Disposition.
- Error bodies never include DB errors, storage keys, external provider credentials or private document text.
- Synthetic fixtures in logs and tests. No production data in CI.
- Defense review: 401 unauthenticated, 403/404 foreign ownership, invalid MIME, malicious PDF, too many pages, oversized image, reused signed PUT, invalid or expired upload session and duplicate submission.
