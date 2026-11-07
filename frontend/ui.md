# UI rules for DOC ARCHIVE

Adapted from agent-documents/frontend/ui.md.

## Desktop layout
- One application shell: compact left folder tree, center paginated document list, right document preview/details where space allows.
- No nested page scrollbars and no endless list scrolling by default. Header and controls remain visible while *only* the appropriate content panel scrolls.
- Side panel sizes are responsive and adjustable on sufficiently wide desktops. Fold to route/drawer layouts on smaller viewports.
- Keep the list column and preview readable; use consistent widths and avoid jumping layout on loading and filtering.
- List rows: title, sender, date, category, page count/status and accessible actions. No raw object keys, IDs or internal error codes.

## Mobile / PWA
- Mobile-first capture flow uses camera/file picker and multiple page ordering.
- One primary operation at a time with clear step progress, touch controls ≥44 px, safe-area handling.
- Do not force a desktop sidebar onto mobile. Use compact navigation and dedicated viewer.
- State precisely what has been uploaded, what remains local and what failed.

## Document list and search
- Pagination, sortable columns and URL-backed filters. Search across OCR, sender, filename/title, tags, folders and dates.
- Distinguish `document date` from `uploaded date` in UI. Show OCR confidence/unreviewed fields and allow correction.
- Empty states distinguish `nothing uploaded`, `no results` and `processing in progress`.
- Download actions require server authorization and never expose Google OAuth tokens or public provider URLs.

## Storage connection

Settings show Google Drive as the connected default provider, linked account identifier, storage availability, connection status, reconnect/disconnect controls and last sync. Show missing and conflicting Drive files explicitly. Do not silently enable R2 or create public sharing links.

## Viewer and edit
- PDF.js with page navigation/zoom and explicit download. Show a clear fallback if PDF is unreadable.
- Document actions: rename, move, tag, restore and delete with undo/confirmation as appropriate.
- Batch changes must show selection count, preview and impact; no silent bulk delete.
- Support German UI first; design strings to be extracted for additional locales rather than hardcoded across components.
