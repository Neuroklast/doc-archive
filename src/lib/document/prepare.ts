import { PDFDocument, StandardFonts } from "pdf-lib";
import { createWorker } from "tesseract.js";
import { MAX_IMAGE_BYTES, MAX_PDF_BYTES, MAX_SOURCE_PAGES } from "@/server/storage/limits";

export type ScanInput = {
  file: File;
  rotation: 0 | 90 | 180 | 270;
};

export type PreparedPdf = {
  blob: Blob;
  text: string;
  pages: number;
  hasTextLayer: boolean;
};

function imageAllowed(file: File): boolean {
  return ["image/jpeg", "image/png", "image/webp"].includes(file.type) &&
    file.size > 0 && file.size <= MAX_IMAGE_BYTES;
}

async function renderImage(file: File, rotation: number, quality: number) {
  if (!imageAllowed(file)) throw new Error("Bildformat oder Dateigröße nicht unterstützt");
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    if (!bitmap.width || !bitmap.height || bitmap.width * bitmap.height > 45_000_000) {
      throw new Error("Bildauflösung zu groß");
    }
    const scale = Math.min(1, 2200 / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const turn = rotation === 90 || rotation === 270;
    const canvas = document.createElement("canvas");
    canvas.width = turn ? height : width;
    canvas.height = turn ? width : height;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Bildverarbeitung nicht verfügbar");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.translate(canvas.width / 2, canvas.height / 2);
    context.rotate(rotation * Math.PI / 180);
    context.drawImage(bitmap, -width / 2, -height / 2, width, height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(value => value ? resolve(value) : reject(new Error("JPEG-Konvertierung fehlgeschlagen")),
        "image/jpeg", quality));
    return { blob, width: canvas.width, height: canvas.height };
  } finally {
    bitmap.close();
  }
}

function addTransparentOcrLayer(
  page: ReturnType<PDFDocument["addPage"]>,
  hocr: string,
  imageWidth: number,
  imageHeight: number,
  imageX: number,
  imageY: number,
  drawnWidth: number,
  drawnHeight: number,
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
) {
  if (!hocr) return 0;
  const html = new DOMParser().parseFromString(hocr, "text/html");
  const words = html.querySelectorAll(".ocrx_word");
  let written = 0;
  for (const word of Array.from(words).slice(0, 3500)) {
    const text = word.textContent?.trim();
    if (!text || text.length > 100) continue;
    const bbox = /\bbbox\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)/.exec(word.getAttribute("title") ?? "");
    if (!bbox) continue;
    const [, x0, y0, x1, y1] = bbox.map(Number);
    if (x1 <= x0 || y1 <= y0 || x1 > imageWidth || y1 > imageHeight) continue;
    const x = imageX + x0 / imageWidth * drawnWidth;
    const y = imageY + (1 - y1 / imageHeight) * drawnHeight;
    const size = Math.max(3, Math.min(22, (y1 - y0) / imageHeight * drawnHeight * 0.85));
    try {
      // PDF text layer is invisible but selectable and searchable in standard PDF viewers.
      font.encodeText(text);
      page.drawText(text, { x, y, size, font, opacity: 0 });
      written++;
    } catch {
      // Unsupported glyphs never invalidate the visible scan or the archive OCR index.
    }
  }
  return written;
}

export async function prepareDocument(
  scans: readonly ScanInput[],
  options: { skipOcr: boolean; quality: "readable" | "compact" },
  onProgress: (message: string) => void,
): Promise<PreparedPdf> {
  if (scans.length < 1 || scans.length > MAX_SOURCE_PAGES) throw new Error("Ungültige Seitenanzahl");
  if (scans.length === 1 && scans[0].file.type === "application/pdf") {
    const file = scans[0].file;
    if (file.size < 50 || file.size > MAX_PDF_BYTES) throw new Error("PDF-Datei ist zu groß");
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (new TextDecoder().decode(bytes.subarray(0, 5)) !== "%PDF-") {
      throw new Error("Keine gültige PDF-Datei");
    }
    onProgress("Vorhandenes PDF wird unverändert übernommen");
    return { blob: new Blob([bytes], { type: "application/pdf" }), text: "", pages: 0, hasTextLayer: false };
  }
  if (scans.some(scan => !imageAllowed(scan.file))) {
    throw new Error("Bitte nur JPEG, PNG oder WebP-Bilder auswählen");
  }
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const texts: string[] = [];
  let wordCount = 0;
  const worker = options.skipOcr ? null : await createWorker("deu");
  try {
    for (let i = 0; i < scans.length; i++) {
      onProgress(`Seite ${i + 1} von ${scans.length}: Bild optimieren`);
      const processed = await renderImage(
        scans[i].file, scans[i].rotation, options.quality === "compact" ? 0.70 : 0.86,
      );
      const image = await pdf.embedJpg(await processed.blob.arrayBuffer());
      const landscape = processed.width > processed.height;
      const pageWidth = landscape ? 842 : 595;
      const pageHeight = landscape ? 595 : 842;
      const page = pdf.addPage([pageWidth, pageHeight]);
      const scale = Math.min((pageWidth - 36) / image.width, (pageHeight - 36) / image.height);
      const drawnWidth = image.width * scale;
      const drawnHeight = image.height * scale;
      const x = (pageWidth - drawnWidth) / 2;
      const y = (pageHeight - drawnHeight) / 2;
      page.drawImage(image, { x, y, width: drawnWidth, height: drawnHeight });
      if (worker) {
        onProgress(`Seite ${i + 1} von ${scans.length}: Texterkennung`);
        const result = await worker.recognize(processed.blob, {}, { hocr: true });
        texts.push(result.data.text.trim());
        wordCount += addTransparentOcrLayer(
          page, result.data.hocr ?? "",
          processed.width, processed.height,
          x, y, drawnWidth, drawnHeight, font,
        );
      }
    }
  } finally {
    if (worker) await worker.terminate();
  }
  onProgress("PDF erstellen");
  pdf.setCreator("DOC ARCHIVE");
  const output = await pdf.save({ useObjectStreams: true });
  if (output.byteLength > MAX_PDF_BYTES) {
    throw new Error("Das PDF überschreitet 25 MB. Kompakte Qualität verwenden.");
  }
  return {
    blob: new Blob([new Uint8Array(output)], { type: "application/pdf" }),
    text: texts.filter(Boolean).join("\n\n").slice(0, 200_000),
    pages: scans.length,
    hasTextLayer: wordCount > 0,
  };
}

export async function sha256(blob: Blob): Promise<string> {
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", await blob.arrayBuffer()));
  return Array.from(hash, item => item.toString(16).padStart(2, "0")).join("");
}
