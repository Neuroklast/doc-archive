"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import {
  MAX_IMAGE_BYTES, MAX_PDF_BYTES, MAX_SOURCE_PAGES,
} from "@/server/storage/limits";
import type { PreparedPdf, ScanInput } from "@/lib/document/prepare";

type LocalPage = ScanInput & { id: string; preview: string };
type PendingUpload = { uploadSessionId: string; sessionUri: string };

function friendlySize(bytes: number) {
  return `${(bytes / 1024 / 1024).toLocaleString("de-DE", { maximumFractionDigits: 2 })} MB`;
}

export default function ScanDialog({ onClose, onSaved }: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [pages, setPages] = useState<LocalPage[]>([]);
  const [title, setTitle] = useState("");
  const [sender, setSender] = useState("");
  const [quality, setQuality] = useState<"readable" | "compact">("readable");
  const [skipOcr, setSkipOcr] = useState(false);
  const [prepared, setPrepared] = useState<PreparedPdf | null>(null);
  const [ticket, setTicket] = useState<PendingUpload | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const previews = useRef<Set<string>>(new Set());
  const initialFocus = useRef<HTMLInputElement>(null);

  useEffect(() => {
    initialFocus.current?.focus();
    const urls = previews.current;
    return () => { for (const url of urls) URL.revokeObjectURL(url); };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy && !ticket) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, ticket, onClose]);

  function updatePages(change: (current: LocalPage[]) => LocalPage[]) {
    if (busy || ticket) return;
    setPages(change);
    setPrepared(null);
    setError(null);
  }

  function onFiles(event: ChangeEvent<HTMLInputElement>) {
    if (busy || ticket) return;
    const selection = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!selection.length) return;
    const pdf = selection.some(file => file.type === "application/pdf");
    const mixed = pdf && (selection.length !== 1 || pages.length !== 0);
    if (mixed || pages.length + selection.length > MAX_SOURCE_PAGES) {
      setError("Ein PDF einzeln oder maximal 20 Bilder auswählen");
      return;
    }
    if (pages.length && pages[0].file.type === "application/pdf") {
      setError("Ein PDF kann nicht mit weiteren Bildern kombiniert werden");
      return;
    }
    const valid = selection.every(file =>
      file.type === "application/pdf"
        ? file.size >= 50 && file.size <= MAX_PDF_BYTES
        : ["image/jpeg", "image/png", "image/webp"].includes(file.type) &&
          file.size > 0 && file.size <= MAX_IMAGE_BYTES);
    if (!valid) {
      setError("Nur PDF, JPEG, PNG und WebP mit höchstens 20 MB pro Bild bzw. 25 MB pro PDF");
      return;
    }
    const selected = selection.map(file => {
      const url = URL.createObjectURL(file);
      previews.current.add(url);
      return { id: crypto.randomUUID(), file, preview: url, rotation: 0 as const };
    });
    updatePages(current => [...current, ...selected]);
    if (!title.trim() && selection[0]) {
      setTitle(selection[0].name.replace(/\.[^.]+$/, "").slice(0, 180));
    }
  }

  function move(index: number, delta: number) {
    updatePages(current => {
      const result = [...current];
      const other = index + delta;
      if (other < 0 || other >= result.length) return current;
      [result[index], result[other]] = [result[other], result[index]];
      return result;
    });
  }

  async function prepare() {
    if (!pages.length || !title.trim() || busy || ticket) return;
    setBusy(true);
    setError(null);
    setProgress("Dokument wird vorbereitet");
    try {
      const { prepareDocument } = await import("@/lib/document/prepare");
      const result = await prepareDocument(pages, { skipOcr, quality }, setProgress);
      setPrepared(result);
      setProgress("PDF bereit zur Prüfung und Archivierung");
    } catch (err) {
      setError(err instanceof Error ? err.message : "PDF-Verarbeitung fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  async function archive() {
    if (!prepared || !title.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      let active = ticket;
      if (!active) {
        setProgress("Dateiprüfsumme berechnen");
        const { sha256 } = await import("@/lib/document/prepare");
        const checksum = await sha256(prepared.blob);
        const res = await fetch("/api/uploads", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: title.trim(), byteLength: prepared.blob.size, sha256: checksum }),
        });
        const response: unknown = await res.json();
        const data = response && typeof response === "object" ? response as Record<string, unknown> : {};
        if (!res.ok || data.kind !== "google_drive_resumable" ||
            typeof data.sessionUri !== "string" || typeof data.uploadSessionId !== "string") {
          throw new Error(typeof data.error === "string" ? data.error : "Upload konnte nicht gestartet werden");
        }
        active = { sessionUri: data.sessionUri, uploadSessionId: data.uploadSessionId };
        setTicket(active);
      }
      setProgress("PDF wird direkt in Google Drive übertragen");
      const { transferToDrive } = await import("@/lib/document/google-upload");
      await transferToDrive(active.sessionUri, prepared.blob);

      setProgress("Datei in Drive bestätigen und archivieren");
      const finish = await fetch(`/api/uploads/${encodeURIComponent(active.uploadSessionId)}/complete`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(), sender: sender.trim(), ocrText: prepared.text,
        }),
      });
      const response: unknown = await finish.json();
      const data = response && typeof response === "object" ? response as Record<string, unknown> : {};
      if (!finish.ok || data.ready !== true) {
        throw new Error(typeof data.error === "string" ? data.error : "Abschluss noch nicht möglich");
      }
      setTicket(null);
      setProgress("Dokument erfolgreich archiviert");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Datei konnte nicht archiviert werden");
      setProgress("Upload kann mit derselben Sitzung erneut versucht werden");
    } finally {
      setBusy(false);
    }
  }

  const pdfOnly = pages.length === 1 && pages[0].file.type === "application/pdf";

  return <div className="scan-backdrop" role="presentation">
    <section className="scan-modal" role="dialog" aria-modal="true" aria-labelledby="scan-title">
      <header className="scan-header">
        <div><p className="eyebrow">DOKUMENTENERFASSUNG</p><h2 id="scan-title">Dokument hinzufügen</h2>
          <p>Fotos lokal zu einem PDF zusammenführen, Text erkennen und in Drive ablegen.</p></div>
        <button type="button" className="scan-close" onClick={onClose}
          aria-label="Schließen" disabled={busy || !!ticket}>✕</button>
      </header>
      <div className="scan-body">
        <div className="scan-column">
          <label className="scan-dropzone">+ Fotos oder PDF auswählen
            <input type="file" ref={initialFocus} accept="image/jpeg,image/png,image/webp,application/pdf"
              multiple onChange={onFiles} disabled={busy || !!ticket} />
            <small>JPEG, PNG, WebP oder PDF · max. 20 Seiten · Verarbeitung im Browser</small>
          </label>
          <div className="scan-pages">
            {pages.map((page, i) => <div className="scan-page" key={page.id}>
              {page.file.type === "application/pdf"
                ? <div className="scan-pdf-tile" aria-label="PDF">PDF</div>
                : <img src={page.preview} alt={`Vorschau Seite ${i + 1}: ${page.file.name}`} />}
              <div className="scan-page-meta"><strong>Seite {i + 1}</strong><small title={page.file.name}>{page.file.name}</small></div>
              <div className="scan-page-actions">
                <button aria-label={`Seite ${i + 1} nach oben`} disabled={i === 0 || busy || !!ticket}
                  onClick={() => move(i, -1)} type="button">↑</button>
                <button aria-label={`Seite ${i + 1} nach unten`} disabled={i === pages.length - 1 || busy || !!ticket}
                  onClick={() => move(i, 1)} type="button">↓</button>
                {!pdfOnly && <button type="button" disabled={busy || !!ticket} aria-label="Seite drehen"
                  onClick={() => updatePages(current => current.map(item =>
                    item.id === page.id ? { ...item, rotation: ((item.rotation + 90) % 360) as 0 | 90 | 180 | 270 } : item))}>↻</button>}
                <button type="button" disabled={busy || !!ticket} aria-label="Seite entfernen"
                  onClick={() => updatePages(current => current.filter(item => item.id !== page.id))}>✕</button>
              </div>
            </div>)}
            {!pages.length && <p className="scan-placeholder">Wähle Fotos deiner Post aus. Du kannst sie danach sortieren und drehen.</p>}
          </div>
        </div>
        <div className="scan-column scan-settings">
          <label>Dokumenttitel
            <input type="text" maxLength={180} required value={title}
              onChange={e => setTitle(e.target.value)} placeholder="Beispiel: Versicherungsschreiben" />
          </label>
          <label>Absender (optional)
            <input type="text" maxLength={180} value={sender}
              onChange={e => setSender(e.target.value)} placeholder="Beispiel: Krankenkasse" />
          </label>
          {!pdfOnly && <><label>PDF-Qualität
            <select value={quality} disabled={busy || !!ticket} onChange={e => {
              setQuality(e.target.value as "readable" | "compact");
              setPrepared(null);
            }}>
              <option value="readable">Gut lesbar (Standard)</option>
              <option value="compact">Kleinere Datei</option>
            </select>
          </label>
          <label className="scan-check"><input type="checkbox" checked={skipOcr} disabled={busy || !!ticket}
            onChange={e => { setSkipOcr(e.target.checked); setPrepared(null); }} />
            OCR überspringen</label></>}
          <p className="scan-explain">{pdfOnly
            ? "Vorhandene PDFs werden unverändert gespeichert. Texterkennung aus importierten PDFs folgt in einem weiteren Schritt."
            : "OCR läuft auf deinem Gerät. Für Deutsch werden beim ersten Mal Sprachdaten geladen. Das PDF enthält, soweit erkannt, eine unsichtbare Textebene. Deine Originalfotos bleiben auf deinem Gerät."}</p>
          <button type="button" className="button button-outline" onClick={prepare}
            disabled={busy || !!ticket || !pages.length || !title.trim()}>
            {busy && !prepared ? "PDF wird erstellt …" : "PDF vorbereiten"}
          </button>
          {prepared && <div className="scan-ready">
            <strong>PDF ist bereit</strong><p>{friendlySize(prepared.blob.size)} · {prepared.pages || "Original"} Seiten</p>
            <p>{prepared.text ? "OCR-Text erkannt und für die Archivsuche vorbereitet." : "Kein OCR-Text verfügbar."}</p>
            <button type="button" className="text-button" onClick={() => {
              const url = URL.createObjectURL(prepared.blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = "doc-archive-vorschau.pdf";
              link.click();
              setTimeout(() => URL.revokeObjectURL(url), 60_000);
            }}>PDF zur Prüfung herunterladen</button>
            {prepared.text && <details><summary>Erkannten Text prüfen</summary><pre className="scan-ocr-preview">{prepared.text.slice(0, 3000)}</pre></details>}
          </div>}
          {progress && <p className="scan-progress" role="status">{progress}</p>}
          {error && <p className="form-error" role="alert">{error}</p>}
          <button type="button" className="button button-primary" onClick={archive}
            disabled={!prepared || !title.trim() || busy}>
            {busy ? "Archivierung läuft …" : ticket ? "Upload erneut abschließen" : "In Google Drive archivieren"}
          </button>
          <p className="scan-explain">Dateien verlassen deinen Browser erst beim ausdrücklichen Archivieren. Bereits erstellte Drive-Dateien werden bei Fehlern nicht automatisch gelöscht.</p>
        </div>
      </div>
    </section>
  </div>;
}
