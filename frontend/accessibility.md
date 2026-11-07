# Accessibility

Adapted from agent-documents/frontend/accessibility.md for a document-scanning PWA.

- Target WCAG 2.2 AA where achievable. Semantic nav, main, header, form, table and dialog elements.
- Accessible labels for search, folder tree, upload inputs, page actions and icon buttons.
- All actions keyboard-operable, including document selection, reordering scanned pages, PDF page navigation and folder changes.
- Visible focus states and correct focus return after modals; Escape dismissal where safe, never silently discarding work.
- Respect `prefers-reduced-motion`, screen reader status announcements and high-contrast mode.
- No color-only status (e.g. OCR failed vs pending); use labels/icons as well.
- 44×44 px mobile touch targets, usable at 320 px viewport and 200% zoom.
- Render OCR content with readable text alternatives; offer selectable text separately if PDF text-layer quality is low.
- Test both dark/light appearance if both implemented; maintain 4.5:1 body-text and 3:1 graphical UI contrast.
- Check with keyboard-only navigation and axe, plus manual screen reader spot checks before release.
