# DOC ARCHIVE pull request checklist

Adapted from agent-documents/checklists/pr.md.

- [ ] Clear scope and acceptance criteria.
- [ ] Base branch current; diff checked for unrelated changes.
- [ ] Actual lint/typecheck/test/build scripts passed, or gaps explicitly reported.
- [ ] No production documents, OCR excerpts, secrets, buckets, connection strings or signed URLs in commits/tests/logs.
- [ ] Document ownership enforced on reads, list counts, search, downloads and all mutations.
- [ ] Input/magic byte/size/page validation for added file paths.
- [ ] Failure/retry paths avoid orphan objects, duplicate records and deleting the only good copy.
- [ ] Original and optimized versions remain distinguishable.
- [ ] Compression/OCR changes measured against representative synthetic fixtures.
- [ ] Keyboard/mobile/zoom and pagination/scroll regressions checked for UI changes.
- [ ] Schema and R2 lifecycle changes include migration and rollback/reconciliation notes.
- [ ] Docs, env templates and ADRs updated where relevant.
- [ ] PR description includes what changed, how verified, impact, risks, and any unrun checks.
- [ ] No production deployment or destructive data action without explicit authorization.

See [../core/quality.md](../core/quality.md) and [../docs/SECURITY_AND_PRIVACY.md](../docs/SECURITY_AND_PRIVACY.md).
