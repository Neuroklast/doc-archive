"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { flattenFolders, type FolderEntry } from "@/lib/document/folder-tree";
import ScanDialog from "./scan-dialog";

type Item = {
  id: string;
  title: string;
  sender: string | null;
  status: string;
  createdAt: string;
};

type PendingUpload = {
  id: string;
  title: string;
  expectedBytes: number;
  createdAt: string;
};

export default function ArchiveShell(props: {
  displayName: string;
  notice: string | null;
  connected: boolean;
  connectionStatus: string;
  accountLabel: string | null;
  documents: Item[];
  folders: FolderEntry[];
  pending: PendingUpload[];
  selectedFolderId: string | null;
  total: number;
  query: string;
  page: number;
  pageCount: number;
}) {
  const router = useRouter();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [parentId, setParentId] = useState("");
  const [newFolder, setNewFolder] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const sortedFolders = useMemo(() => flattenFolders(props.folders), [props.folders]);

  function archiveHref(page: number, folder: string | null = props.selectedFolderId) {
    const params = new URLSearchParams();
    if (props.query) params.set("q", props.query);
    if (page > 1) params.set("page", String(page));
    if (folder) params.set("folder", folder);
    const qs = params.toString();
    return qs ? `/archive?${qs}` : "/archive";
  }

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

  async function createFolder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!props.connected || busy || !folderName.trim()) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/folders", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: folderName.trim(), parentId: parentId || null }),
      });
      const data: { error?: string } = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Ordner konnte nicht erstellt werden");
      setFolderName("");
      setParentId("");
      setNewFolder(false);
      setMessage("Ordner wurde in Google Drive angelegt.");
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Ordneranlage fehlgeschlagen");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function retryFolder(id: string) {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/folders/${id}/retry`, { method: "POST" });
      if (!response.ok) throw new Error("Ordner konnte noch nicht synchronisiert werden");
      setMessage("Ordner erfolgreich synchronisiert.");
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Synchronisierung fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  async function recoverUpload(id: string) {
    if (busy || !props.connected) return;
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/uploads/${id}/complete`, { method: "POST" });
      const result: { ready?: boolean; error?: string } = await response.json();
      if (!response.ok || !result.ready) {
        throw new Error(result.error ?? "Dokument konnte noch nicht bestätigt werden");
      }
      setMessage("Der Google-Drive-Upload wurde wiederhergestellt und im Archiv erfasst.");
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Wiederherstellung fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="app-brand">
        <span className="brandmark small">D<span>.</span></span>
        <div>DOC ARCHIVE<small>PRIVATE WORKSPACE</small></div>
      </div>
      <div className="side-heading">ARBEITSBEREICH</div>
      <nav aria-label="Archivnavigation">
        <a className={`nav-link ${!props.selectedFolderId ? "active" : ""}`} href={archiveHref(1, null)}>▦ <span>Alle Dokumente</span></a>
      </nav>
      <div className="side-heading folder-heading">
        ORDNER
        <button type="button" disabled={!props.connected || busy}
          title="Neuen Ordner anlegen" onClick={() => setNewFolder(value => !value)}>+ Ordner</button>
      </div>
      <nav className="folder-nav" aria-label="Archivordner">
        {sortedFolders.map(folder => <div className="folder-item" key={folder.id}>
          <a href={archiveHref(1, folder.id)}
            className={`nav-link folder-link ${folder.id === props.selectedFolderId ? "active" : ""}`}
            style={{ paddingLeft: `${12 + Math.min(folder.depth, 6) * 12}px` }}
            title={folder.path}>
            <span aria-hidden="true">▤</span><span className="folder-label">{folder.name}</span>
            {!folder.ready && <span aria-label="Synchronisierung ausstehend">!</span>}
          </a>
          {!folder.ready && <button type="button" className="folder-retry"
            disabled={busy || !props.connected} title="Ordner mit Drive synchronisieren"
            onClick={() => retryFolder(folder.id)}>↻</button>}
        </div>)}
        {!sortedFolders.length && <p className="folder-hint">Noch keine Ordner. Lege einen Ordner an oder archiviere direkt im Hauptordner.</p>}
      </nav>
      {newFolder && <form className="folder-create" onSubmit={createFolder}>
        <label>Ordnername
          <input required maxLength={90} value={folderName}
            onChange={event => setFolderName(event.target.value)} placeholder="z. B. Versicherungen" />
        </label>
        <label>In diesem Ordner
          <select value={parentId} onChange={event => setParentId(event.target.value)}>
            <option value="">DOC ARCHIVE (Hauptordner)</option>
            {sortedFolders.filter(row => row.ready && row.depth < 11).map(row =>
              <option value={row.id} key={row.id}>{row.path}</option>)}
          </select>
        </label>
        <button type="submit" className="button button-outline" disabled={busy || !folderName.trim()}>
          Erstellen
        </button>
      </form>}
      <div className="sidebar-bottom">
        <span className="person-dot">{props.displayName.slice(0, 1).toUpperCase()}</span>
        <div className="account-detail"><strong>{props.displayName}</strong><small>Privates Archiv</small></div>
        <button type="button" className="icon-button" aria-label="Abmelden" title="Abmelden" onClick={logout}>↪</button>
      </div>
    </aside>

    <main className="content">
      <header className="page-header">
        <div>
          <p className="eyebrow">ÜBERSICHT</p>
          <h1>{props.selectedFolderId
            ? props.folders.find(folder => folder.id === props.selectedFolderId)?.name ?? "Ordner"
            : "Dein Archiv"}</h1>
          <p className="muted">Ein zentraler Ort für deine wichtigen Unterlagen.</p>
        </div>
        <button type="button" disabled={!props.connected}
          title={props.connected ? "Dokumente erfassen" : "Zuerst Google Drive verbinden"}
          onClick={() => setScannerOpen(true)} className="button button-primary">+ Dokument hinzufügen</button>
      </header>

      <section className="stats-grid" aria-label="Archivstatus">
        <div className="stat"><span>Dokumente</span><strong>{props.total}</strong><small>Im aktuellen Filter</small></div>
        <div className="stat"><span>Speicher</span><strong>Google Drive</strong><small>{props.connected ? "Verbunden" : "Nicht verbunden"}</small></div>
        <div className="stat"><span>Ordner</span><strong>{props.folders.length}</strong><small>In deinem Archiv</small></div>
      </section>

      {props.pending.length > 0 && <section className="panel pending-panel" aria-label="Uploads wiederherstellen">
        <div className="panel-heading"><div><h2>Ausstehende Uploads</h2>
          <p>Wenn eine Datei bereits in Drive angekommen ist, kann sie nach einem Verbindungsabbruch hier abgeschlossen werden.</p></div>
          <span className="pill">{props.pending.length}</span>
        </div>
        <div className="pending-list">{props.pending.map(item =>
          <div className="pending-item" key={item.id}>
            <div><strong>{item.title}</strong>
              <small>{new Date(item.createdAt).toLocaleDateString("de-DE")} · {(item.expectedBytes / 1024 / 1024).toFixed(1)} MB</small></div>
            <button type="button" className="button button-outline"
              disabled={busy || !props.connected} onClick={() => recoverUpload(item.id)}>
              Abschluss prüfen
            </button>
          </div>)}</div>
        <p className="small-note">Nicht vollständig übertragene Dateien benötigen einen neuen Upload. Die gespeicherten Metadaten werden nicht als fertige Dokumente ausgegeben.</p>
      </section>}

      <section className="panel" aria-label="Dokumente">
        <div className="panel-heading">
          <div><h2>Dokumente</h2><p>Gespeicherte und indexierte Dateien.</p></div>
          <span className="pill">{props.total} Treffer</span>
        </div>
        <form className="search-box" method="get" action="/archive">
          <span aria-hidden="true">⌕</span>
          <label className="sr-only" htmlFor="archive-search">Dokumente durchsuchen</label>
          <input id="archive-search" key={props.query} type="search" name="q"
            defaultValue={props.query} maxLength={120}
            placeholder="Titel, Absender oder OCR-Text" />
          {props.selectedFolderId && <input type="hidden" name="folder" value={props.selectedFolderId} />}
          <button type="submit" className="search-submit">Suchen</button>
        </form>
        {props.documents.length ? <div className="document-list">
          {props.documents.map(item => <div className="document-row" key={item.id}>
            <span aria-hidden="true" className="file-symbol">▤</span>
            <div><strong>{item.title}</strong>
              <small>{item.sender ?? "Ohne Absender"} · {new Date(item.createdAt).toLocaleDateString("de-DE")}</small></div>
            <span className="pill">{item.status}</span>
            <a className="document-link" href={`/api/documents/${item.id}/download`}
              target="_blank" rel="noopener noreferrer">Ansehen</a>
            <a className="document-link" href={`/api/documents/${item.id}/download?download=1`}>PDF</a>
          </div>)}
        </div> : <div className="empty-state">
          <span className="empty-icon">▧</span>
          <h3>{props.query || props.selectedFolderId ? "Keine Treffer" : "Noch keine Dokumente"}</h3>
          <p>{props.query || props.selectedFolderId
            ? "Versuche einen anderen Filter oder einen anderen Ordner."
            : "Füge Fotos oder ein PDF hinzu. Danach kannst du deine Unterlagen hier durchsuchen."}</p>
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
          <span className={props.connected ? "connection-state connected" : "connection-state"}>
            {props.connected ? "● Verbunden" : "○ Nicht verbunden"}
          </span>
          <button type="button" onClick={connect} disabled={busy} className="button button-outline">
            {busy ? "Bitte warten …" : props.connected ? "Erneut verbinden" : "Google Drive verbinden"}
          </button>
          {props.connected && <button type="button" className="text-button danger"
            onClick={disconnect} disabled={busy}>Verbindung trennen</button>}
        </div>
      </section>

      {(message || props.notice) && <div className="feedback" role="status">{message || props.notice}</div>}
      <footer className="content-footer">DOC ARCHIVE · Privates Dokumentenarchiv</footer>
    </main>

    {scannerOpen && <ScanDialog
      folders={sortedFolders.filter(folder => folder.ready)}
      initialFolderId={props.selectedFolderId}
      onClose={() => { setScannerOpen(false); router.refresh(); }}
      onSaved={() => {
        setScannerOpen(false);
        setMessage("Dokument wurde in Google Drive archiviert.");
        router.refresh();
      }}
    />}
  </div>;
