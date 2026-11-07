"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

type Item = {
  id: string;
  title: string;
  sender: string | null;
  status: string;
  createdAt: string;
};

export default function ArchiveShell(props: {
  displayName: string;
  connected: boolean;
  connectionStatus: string;
  accountLabel: string | null;
  documents: Item[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const entries = useMemo(() => props.documents.filter(doc =>
    [doc.title, doc.sender ?? ""].some(value => value.toLocaleLowerCase("de").includes(query.toLocaleLowerCase("de"))),
  ), [props.documents, query]);

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
      setMessage("Google Drive getrennt. Bereits gespeicherte Dateien bleiben in deinem Drive.");
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

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="app-brand"><span className="brandmark small">D<span>.</span></span><div>DOC ARCHIVE<small>PRIVATE WORKSPACE</small></div></div>
      <div className="side-heading">ARBEITSBEREICH</div>
      <nav aria-label="Archivnavigation">
        <a className="nav-link active" href="/archive">▦ <span>Alle Dokumente</span></a>
        <span className="nav-link disabled" aria-disabled="true">▤ <span>Eingang</span></span>
      </nav>
      <div className="side-heading">ORDNER</div>
      <div className="folder-hint">Deine Ordner erscheinen hier nach dem ersten Dokumentenimport.</div>
      <div className="sidebar-bottom">
        <span className="person-dot">{props.displayName.slice(0, 1).toUpperCase()}</span>
        <div className="account-detail"><strong>{props.displayName}</strong><small>Privates Archiv</small></div>
        <button type="button" className="icon-button" aria-label="Abmelden" title="Abmelden" onClick={logout}>↪</button>
      </div>
    </aside>

    <main className="content">
      <header className="page-header">
        <div><p className="eyebrow">ÜBERSICHT</p><h1>Dein Archiv</h1><p className="muted">Ein zentraler Ort für deine wichtigen Unterlagen.</p></div>
        <button type="button" disabled title="Dokumentenscanner folgt in der nächsten Entwicklungsphase" className="button button-primary">+ Dokument hinzufügen</button>
      </header>
      <section className="stats-grid" aria-label="Archivstatus">
        <div className="stat"><span>Dokumente</span><strong>{props.documents.length}</strong><small>Im Index</small></div>
        <div className="stat"><span>Speicher</span><strong>Google Drive</strong><small>{props.connected ? "Verbunden" : "Nicht verbunden"}</small></div>
        <div className="stat"><span>Verarbeitung</span><strong>In Vorbereitung</strong><small>Scanner und OCR folgen</small></div>
      </section>
      <section className="panel" aria-label="Dokumente">
        <div className="panel-heading"><div><h2>Dokumente</h2><p>Gespeicherte und indexierte Dateien.</p></div><span className="pill">{props.documents.length} Einträge</span></div>
        <label className="search-box"><span aria-hidden="true">⌕</span><span className="sr-only">Dokumente durchsuchen</span>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Nach Titel oder Absender suchen" />
        </label>
        {entries.length ? <div className="document-list">{entries.map(item => <div className="document-row" key={item.id}>
          <span aria-hidden="true" className="file-symbol">▤</span><div><strong>{item.title}</strong><small>{item.sender ?? "Ohne Absender"} · {new Date(item.createdAt).toLocaleDateString("de-DE")}</small></div><span className="pill">{item.status}</span>
        </div>)}</div> : <div className="empty-state">
          <span className="empty-icon">▧</span>
          <h3>{query ? "Keine Treffer" : "Noch keine Dokumente"}</h3>
          <p>{query ? "Versuche einen anderen Suchbegriff." : "Das Grundgerüst ist eingerichtet. Im nächsten Schritt kommt der Scanner mit PDF-Erstellung und Upload."}</p>
        </div>}
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
          <button type="button" onClick={connect} disabled={busy} className="button button-outline">{busy ? "Bitte warten …" : props.connected ? "Erneut verbinden" : "Google Drive verbinden"}</button>
          {props.connected && <button type="button" className="text-button danger" onClick={disconnect} disabled={busy}>Verbindung trennen</button>}
        </div>
      </section>
      {message && <div className="feedback" role="status">{message}</div>}
      <footer className="content-footer">DOC ARCHIVE · Privates Dokumentenarchiv · Entwicklungsstand Phase 1</footer>
    </main>
  </div>;
}
