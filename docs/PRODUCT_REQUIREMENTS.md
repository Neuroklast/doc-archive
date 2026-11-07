# DOC ARCHIVE — Product requirements (PRD)

Adapted from agent-documents/templates/PRD.md.

## Purpose
A private, mobile-friendly personal archive: take photos of letters, upload scanned/received PDFs, convert images to compact, legible documents, recognize text, classify into logical folders, search instantly and download on demand.

## Audience and access
- Primary: one private individual using phone and desktop.
- Product design: per-user ownership from day one, even if the initial installation has a single account.
- No public archive browsing, public collaboration, marketplace, paid plans or advertising in MVP.

## MVP requirements
| ID | Requirement | Acceptance |
| --- | --- | --- |
| F01 | Secure sign-in | Anonymous and foreign-user document access denied, including via direct link |
| F02 | Capture | Multi-image upload and device camera/file picker with page reordering and rotation |
| F03 | Image repair | Non-destructive crop/perspective/contrast preview, manual fallback and undo |
| F04 | Compact PDF | Correct page order, readable pages and selectable OCR text where feasible |
| F05 | Text recognition | German OCR with English fallback, progress, confidence and correction |
| F06 | Classification | Sender, date, title, tags and folder suggestions with user confirmation |
| F07 | Folder archive | Hierarchical logical folders in Neon, mirrored as real Google Drive subfolders; sync renames/moves |
| F08 | Full-text search | Search OCR/text/title/sender/tags with date/folder filters and pagination |
| F09 | Preview/download | PDF preview and protected download, on phone and desktop |
| F10 | File integrity | Upload verification, retry, duplicate handling, recoverable failure |
| F11 | Trash & recovery | Soft-delete and restore; permanent deletion explicit |
| F12 | Data portability | Export document files plus structured metadata, import path documented |
| F13 | Responsive UX | Desktop three-pane when space allows, mobile-first capture, no endless global scroll |
| F14 | Connect Google Drive | Separate OAuth consent with `drive.file`, encrypted refresh token, reconnect/disconnect status |
| F15 | Sync provider changes | Detect accessible external rename, move, trash and missing Drive documents; show conflicts |
| F16 | Storage abstraction | Google Drive default through typed interface, R2 optional later and never automatic |

## Quality constraints
- Default processing should keep letters legally/readably useful without inventing content. Original retention is offered and never silently discarded.
- No recurring external paid OCR/AI dependency for core use.
- Files saved under a user-owned Google Drive DOC ARCHIVE folder with no auto-sharing; user-scoped Neon search, secure cookies, restricted OAuth grants and verifiable authorization.
- Reasonable performance on mainstream mobile browsers, with memory-aware batching.
- Accessible keyboard navigation and clear status/retry actions.
- Default interface German; architecture leaves room for localization.

## Key metadata
Document title, sender, document date, received/upload dates, folder, tags, page count, original/processed versions, OCR text and confidence, checksums, lifecycle status.

## Deferred / not MVP
Server-managed heavy OCR, public sharing, semantic vector search, automatic email ingestion, advanced extraction via external LLMs, automatic financial advice, electronic signatures, legal authenticity certification.

## Open decisions
1. Standard private cloud with server-indexed OCR vs genuine end-to-end encryption (see DECISIONS). Google Drive as the primary backend is selected.
2. Retention default for original scans and deleted documents.
3. Single-user onboarding vs registration invitation policy.
4. Whether client-side processing needs a supported local-only fallback for very large files.
5. Drive folder synchronization/conflict policy and the precise original/trash retention period.

## Storage

A user explicitly connects Google Drive. App-created PDFs are stored in visible Drive folders, not R2. Pre-existing Drive files are imported only through explicit selection and limited scopes. The separate Better Auth app login remains available even when Google authorization expires; archive records then show needs_reconnect or missing states.

## Release gate
Private records only; every sensitive access path denied without authorization; PDF output visually checked; backup and restore procedure proven; no customer data in CI or public GitHub.
