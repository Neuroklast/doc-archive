"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import ScanDialog from "./scan-dialog";

type Item = {
  id: string;
  title: string;
  sender: string | null;
  status: string;
  createdAt: string;
};

export default function ArchiveShell(props: {
  displayName: string;
  notice: string | null;
  connected: boolean;
  connectionStatus: string;
  accountLabel: string | null;
  documents: Item[];
  total: number;
  query: string;
  page: number;
  pageCount: number;
}) {
  const router = useRouter();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function connect() {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/google/connect", { method: "POST" });
      const data: { authorizeUrl?: string; error?: string } = await response.json();
      if (!response.ok || !data.authorizeUrl) throw new Error(data.error ?? "Verbindung fehlgeschlagen");
      window.location.assign(data.authorizeUrl);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Verbindung fehlgeschlagen");
      setBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/google/disconnect", { method: "POST" });
      if (!response.ok) throw new Error("Google Drive konnte nicht getrennt werden");
      router.refresh();
      setMessage("Google Drive getrennt. Dateien bleiben in deinem Drive.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Trennen fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await authClient.signOut();
    router.replace("/login");
    router.refresh();
  }

  function archiveHref(page: number) {
    const params = new URLSearchParams();
    if (props.query) params.set("q", props.query);
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    return qs ? `/archive?${qs}` : "/archive";
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="app-brand"><span className="brandmark small">D<span>.</span></span><div>DOC ARCHIVE<small>PRIVATE WORKSPACE</small></div></div>
      <div className="side-heading">ARBEITSBEREICH</div>
      <nav aria-label="Archivnavigation">
        <a className="nav-link active" href="/archive">▦ <span>Alle Dokumente</span></a>
        <span className="nav-link disabled" aria-disabled="true">▤ <span>Eingang</span></span>
      </nav>
      <div className="side-heading">ORDNER</div>
      <div className="folder-hint">Eigene Unterordner und die automatische Sortierung folgen in der nächsten Phase.</div>
      <div className="sidebar-bottom">
        <span className="person-dot">{props.displayName.slice(0, 1).toUpperCase()}</span>
        <div className="account-detail"><strong>{props.displayName}</strong><small>Privates Archiv</small></div>
        <button type="button" className="icon-button" aria-label="Abmelden" title="Abmelden" onClick={logout}>↪</button>
      </div>
    </aside>

    <main className="content">
      <header className="page-header">
        <div><p className="eyebrow">ÜBERSICHT</p><h1>Dein Archiv</h1><p className="muted">Ein zentraler Ort für deine wichtigen Unterlagen.</p></div>
        <button type="button" disabled={!props.connected} title={props.connected ? "Dokumente erfassen" : "Zuerst Google Drive verbinden"}
          onClick={() => setScannerOpen(true)} className="button button-primary">+ Dokument hinzufügen</button>
      </header>
      <section className="stats-grid" aria-label="Archivstatus">
        <div className="stat"><span>Dokumente</span><strong>{props.total}</strong><small>In dieser Suche</small></div>
        <div className="stat"><span>Speicher</span><strong>Google Drive</strong><small>{props.connected ? "Verbunden" : "Nicht verbunden"}</small></div>
        <div className="stat"><span>Verarbeitung</span><strong>PDF + OCR</strong><small>Im Browser, mit Prüfung vor Upload</small></div>
      </section>
      <section className="panel" aria-label="Dokumente">
        <div className="panel-heading"><div><h2>Dokumente</h2><p>Gespeicherte und indexierte Dateien.</p></div><span className="pill">{props.total} Treffer</span></div>
        <form className="search-box" method="get" action="/archive">
          <span aria-hidden="true">⌕</span>
          <label className="sr-only" htmlFor="archive-search">Dokumente durchsuchen</label>
          <input id="archive-search" key={props.query} type="search" name="q" defaultValue={props.query}
            maxLength={120} placeholder="Nach Titel, Absender oder OCR-Text suchen" />
          <button type="submit" className="search-submit">Suchen</button>
        </form>
        {props.documents.length ? <div className="document-list">{props.documents.map(item => <div className="document-row" key={item.id}>
          <span aria-hidden="true" className="file-symbol">▤</span>
          <div><strong>{item.title}</strong><small>{item.sender ?? "Ohne Absender"} · {new Date(item.createdAt).toLocaleDateString("de-DE")}</small></div>
          <span className="pill">{item.status}</span>
          <a className="document-link" href={`/api/documents/${item.id}/download`} target="_blank"
            rel="noopener noreferrer" title="PDF ansehen">Ansehen</a>
          <a className="document-link" href={`/api/documents/${item.id}/download?download=1`}
            title="PDF herunterladen">PDF</a>
        </div>)}</div> : <div className="empty-state">
          <span className="empty-icon">▧</span>
          <h3>{props.query ? "Keine Treffer" : "Noch keine Dokumente"}</h3>
          <p>{props.query ? "Versuche einen anderen Suchbegriff." :
            "Füge Fotos oder ein PDF hinzu. Nach dem Upload kannst du deine Unterlagen hier durchsuchen."}</p>
        </div>}
        {props.pageCount > 1 && <nav className="pagination" aria-label="Ergebnisseiten">
          {props.page > 1 ? <a href={archiveHref(props.page - 1)}>← Zurück</a> : <span />}
          <span>Seite {props.page} von {props.pageCount}</span>
          {props.page < props.pageCount ? <a href={archiveHref(props.page + 1)}>Weiter →</a> : <span />}
        </nav>}
      </section>
      <section className="panel storage-panel" aria-label="Speicherverbindung">
        <div><p className="eyebrow">SPEICHERANBINDUNG</p><h2>Google Drive</h2>
          <p>{props.connected ? `Verbunden mit ${props.accountLabel ?? "Google Drive"}.` :
            props.connectionStatus === "needs_reconnect" ? "Deine Berechtigung ist abgelaufen. Bitte erneut verbinden." :
              "Verbinde dein eigenes Google Drive. Die App erhält nur Zugriff auf von ihr angelegte oder ausdrücklich freigegebene Dateien."}</p>
          <p className="small-note">Deine Drive-Dateien werden beim Trennen nicht gelöscht.</p>
        </div>
        <div className="connection-actions">
          <span className={props.connected ? "connection-state connected" : "connection-state"}>{props.connected ? "● Verbunden" : "○ Nicht verbunden"}</span>
          <button type="button" onClick={connect} disabled={busy} className="button button-outline">
            {busy ? "Bitte warten …" : props.connected ? "Erneut verbinden" : "Google Drive verbinden"}
          </button>
          {props.connected && <button type="button" className="text-button danger" onClick={disconnect} disabled={busy}>Verbindung trennen</button>}
        </div>
      </section>
      {(message || props.notice) && <div className="feedback" role="status">{message || props.notice}</div>}
      <footer className="content-footer">DOC ARCHIVE · Privates Dokumentenarchiv</footer>
    </main>
    {scannerOpen && <ScanDialog
      onClose={() => setScannerOpen(false)}
      onSaved={() => {
        setScannerOpen(false);
        setMessage("Dokument wurde in Google Drive archiviert.");
        router.refresh();
      }}
    />}
  </div>;
}
