# Quality and Definition of Done

Adapted from agent-documents/core/quality.md.

## Requirements to call a feature complete
- Behavior is implemented and evidenced, not merely designed.
- Manifest checks pass: lint, typecheck, tests, build. If unavailable, report the gap explicitly.
- Access control denies unauthenticated and cross-account access.
- Upload and delete operations are retry-safe; no silent data loss or orphan storage under normal failures.
- OCR results identify confidence and allow user correction. Incorrect OCR must not replace scan pixels.
- PDFs open in mainstream viewers, render pages in the intended order, remain legible and download with correct MIME/disposition.
- Search is accurate and scoped to the current user; no OCR snippets leak between accounts.
- Keyboard/mobile navigation, focus, loading/empty/error states and reduced-motion support checked.
- New env vars, schema changes, storage changes and privacy implications are documented.
- Tests never include personal production documents, real addresses or confidential letters.

## Priority
P0: exposure of private files, authentication bypass, irreversible loss/corruption, broken restore.
P1: incorrect search results, stuck upload, unreadable PDFs, widespread UX regression.
P2: cosmetic faults, optional metadata or quality refinements.

Every deferred risk has an owner, mitigation and revisit condition in [../docs/SECURITY_AND_PRIVACY.md](../docs/SECURITY_AND_PRIVACY.md).
