# Capture, OCR, PDF and classification pipeline

Project-specific design based on agent-documents architecture, UX, security and testing guidance.

## 1. Intake
Accept locally selected JPEG, PNG, WebP and supported PDF only after format checking. A file chooser's MIME is advisory. Handle multiple photos and existing multipage PDF documents. Provide page ordering, rotation, cancel and recovery.

## 2. Scan improvement
- Render a page-sized preview with crop handles and document-boundary suggestion.
- Offer perspective correction, deskew, mild denoise, white balance, glare/contrast enhancement and orientation detection as individually reversible steps.
- Avoid clipping faint handwriting, stamps, signatures, colored marks and marginal notes; preserve color by default when it matters.
- Lazy-load OpenCV.js and execute heavy processing off the main thread where supported. Provide manual fallback if auto-edge detection fails.

## 3. OCR
- Tesseract.js for raster pages, default `deu` and optional `eng` language packs.
- If an imported PDF already has extractable text, use PDF.js to extract it rather than re-OCRing every page.
- For image-only PDFs, render individual pages at a bounded resolution with PDF.js, then OCR the rasterized pages. Tesseract.js does **not** inherently ingest arbitrary PDF bytes.
- Store provenance, per-page confidence and text where available; mark uncertain fields for user confirmation.
- Never silently substitute recognized text for the original visual page.

## 4. PDF output
- Compose pages in correct order with pdf-lib or equivalent.
- Preserve aspect ratio, sensible margins, rotation and orientation. JPEG compression for photos; lossless or appropriate alternatives for line art.
- Use controllable image downsampling, *not* a fixed target file size. Quality presets should prefer readability.
- PDF searchability requires a genuine text layer with correct positional coordinates or a validated equivalent, not merely storing OCR text in PostgreSQL.
- Test selectable text, page geometry, fonts/umlauts, multiple pages and compatibility with common viewers.
- Keep source image/PDF as a separate retained version when selected; never overwrite an original in place.

## 5. Metadata suggestions
Extract potential sender, subject/title, document date, classification, references and keywords using deterministic rules first. Rule suggestions include confidence and source text span. `unknown` is valid. A document date must not be replaced with upload date without being labeled as fallback.

Initial folder examples: `Behörden`, `Versicherungen`, `Finanzen`, `Verträge`, `Gesundheit`, `Arbeit`, `Sonstiges`. Folders are user-editable, never dictated by a hardcoded rigid taxonomy. Do not infer sensitive diagnoses or make decisions based on medical letter content.

## 6. Upload/finalization
- Compute a local checksum for prepared bytes, request an authenticated Google Drive upload session via the server, then transfer the PDF from browser directly to Google Drive with its resumable session URI. No OAuth token is sent to the browser.
- Complete only after the server verifies Drive file ID, owning Google connection, parent folder, MIME and size, with actual-content hash verification when required. A browser checksum alone is not sufficient; reconcile Drive/Neon failures.
- Show distinct states for `uploaded`, `processing`, `needs_reconnect`, `missing` and `archived`. A local PDF being generated, or a Drive upload pending database commit, is not yet durably indexed.
- Deleting a page during local editing must not mutate a previously archived document.

## Drive sync and visible folders

Mirror logical archive folders into real subfolders of the user's Google Drive DOC ARCHIVE folder. New PDFs stay accessible via Drive, but external rename/move/trash actions require reconciliation and must never silently delete local metadata. Drive account disconnection must preserve the archive index and offer reconnect.

## 7. QA
Use synthetic sample documents: blurred/rotated/creased scans, faint print, black-and-white, colored seal, handwritten annotation, two-sided/multipage, PDF with text, PDF with images, bad file, large photo.
Measure readability, file size, OCR error, time and memory. Fail safely with explicit retry/cancel.
