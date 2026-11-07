# Privacy, security and recovery model

Project-specific threat and privacy requirements adapted from agent-documents/security/security.md, security/web-api.md and legal/compliance-de.md.

## Data classification
Private documents may reveal names, addresses, bank information, insurance cases, health data and government identifiers. Treat filenames, tags, thumbnails, OCR snippets and extracted metadata as personal information as well as the PDF bytes.

## Explicit privacy model
- **Working MVP:** private cloud storage, server-indexed OCR text and authenticated API. This is **not** end-to-end encryption.
- TLS and provider-managed encryption at rest do not imply that database/server operators cannot read OCR text.
- Browser OCR does not ensure data remains local after the user chooses to archive; metadata and full text are sent to Neon for search.
- E2EE is a separate architecture requiring encrypted index/search and user-controlled key recovery. Not implemented or promised.

## Minimum safeguards
1. Private R2 bucket, least-privilege key, no public CDN and no shared cache for document responses.
2. Better Auth sessions in secure HttpOnly cookies; CSRF checks and short-lived signed upload/download grants.
3. Session-derived owner scope for every document, version, folder, tag, search and aggregate query.
4. MIME signature and resource-size validation, safe PDF rendering with scripting disabled and bounded page/pixel limits.
5. Signed URL expiry, replay-resistant upload session and idempotent completion.
6. No OCR text, filenames, originals, user identifiers or full signed URLs in logs, analytics, browser exception telemetry or CI artifacts.
7. Strict origin/CORS and content security policy with only documented scanner/worker/R2 exceptions.
8. Dependency review for PDF/OCR/WASM libraries; explicit denial tests for cross-user records.
9. Soft delete, recoverable failure states and controlled permanent purge. Always retain verification and reconciliation trails.
10. Backup/restore spanning database **and** stored objects; test recovery regularly.

## Lifecycle and deletion
- The user controls imported, original and derived copies.
- Deleting an archive entry should move it to a trash state; irreversible removal requires a distinct confirmation.
- Remove linked OCR text and derived metadata on final purge, and queue associated object purges only when no other references exist.
- Incomplete upload tickets expire with a safe cleanup path; never make an unverified object searchable.
- Define explicit retention periods during implementation; no retention policy is implied by these docs.

## Geographic and legal considerations
Neon and Cloudflare region/jurisdiction settings must be verified before storing real personal data. Data location, subprocessors, transfer terms and account/provider agreements must be reviewed for the intended private use. Do not advertise guaranteed EU-only processing without checking the entire path (including logs, telemetry, backups and support access). If the app is later offered publicly, review GDPR, DDG/TDDDG and any applicable accessibility obligations for that use case before launch; no generic legal text is automatically publishable.

## Incident playbook
Contain exposure, revoke affected credentials/sessions/links, assess scope through privacy-preserving audit events, restore verified records where possible and follow applicable notification procedures. Avoid reproducing user document content in public issues.

## Risk register (initial)
| Risk | Mitigation | Revisit when |
| --- | --- | --- |
| Server operators could access OCR index | Restrict access, encrypt at rest, document privacy choice | E2EE requested |
| Leaked signed download link | Expire quickly, avoid logging, authorize issuance | Sharing introduced |
| Orphan objects from failed DB writes | Upload state machine and reconciliation | First upload release |
| Browser memory exhaustion | Page batching, worker cancellation, limits | Real mobile QA |
| OCR changes meaning | Preserve visual original, confidence and editable suggestions | Each OCR change |
| Provider free-tier or region changes | Quota monitoring and export path | Before deploy and quarterly |

Owner: project maintainer. Track unresolved P0 security/data-loss findings as release blockers.
