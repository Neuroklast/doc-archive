/** Conservative first-release limits; enforced at both API and browser. */
export const MAX_PDF_BYTES = 25 * 1024 * 1024;
export const MAX_SOURCE_PAGES = 20;
export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
export const MAX_OCR_CHARS = 200_000;
export const MAX_DOCUMENT_TITLE = 180;
export const UPLOAD_SESSION_MINUTES = 60;

export function isExpectedHash(input: unknown): input is string {
  return typeof input === "string" && /^[a-f0-9]{64}$/i.test(input);
}

export function isUploadSize(input: unknown): input is number {
  return typeof input === "number" && Number.isSafeInteger(input) &&
    input >= 50 && input <= MAX_PDF_BYTES;
}

export function archiveTitle(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const value = input.trim().replace(/[\x00-\x1F\x7F]/g, "").slice(0, MAX_DOCUMENT_TITLE);
  return value.length > 0 ? value : null;
}

export function pdfName(title: string): string {
  const safe = title.normalize("NFC")
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\.+$/g, "").trim().slice(0, 120);
  return (safe || "Dokument") + ".pdf";
}
