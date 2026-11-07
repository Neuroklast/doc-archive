# Upload and archive UX

Adapted from agent-documents/frontend/ux.md.

## Required states
Every async operation has idle/loading/progress/success/error/cancelled variants. Recoverable partial completion is a first-class state, not a generic error.

## Scanner
- Live preview of each image before destructive-looking enhancements.
- User can reorder/remove/rotate pages and undo crop/contrast changes before commit.
- Original-quality vs optimized PDF size and page count visible before save when feasible.
- Offer quality presets (readable / smaller / archival) but keep text legible by default.
- Upload/processing progress per document and per page. Provide retry on network failure without duplicate documents.
- OCR suggestions never auto-change the source image; suspected sender, date and category are editable.

## Search and management
- Search filters survive reload/back navigation when appropriate, without exposing OCR text in sensitive URLs.
- Long-running preview extraction never blocks folder navigation.
- Errors explain next action, preserve user input, and do not display stack traces.
- Restore/delete dialogs name the affected document and whether the source file will remain.
- Private document previews never appear in public social metadata or search engine previews.

## Motion/accessibility
- Respect reduced motion. No mandatory animations during OCR or saves.
- Keyboard sorting and drag-drop alternatives for arranging pages.
- Screen reader announcements for progress/completion/error without repeating every percent.
