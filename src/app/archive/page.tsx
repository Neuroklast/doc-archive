import { and, asc, desc, eq, gt, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { documents, folders, storageConnections, uploadSessions } from "@/server/db/schema";
import ArchiveShell from "./shell";

export const dynamic = "force-dynamic";

type Search = Promise<{ drive?: string; q?: string; page?: string; folder?: string }>;
const PAGE_SIZE = 25;

export default async function ArchivePage({ searchParams }: { searchParams: Search }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 120) : "";
  const folderId = typeof params.folder === "string" &&
    /^[0-9a-f-]{36}$/i.test(params.folder) ? params.folder : null;
  const pageNumber = Number(params.page);
  const page = Number.isSafeInteger(pageNumber) && pageNumber > 0 && pageNumber <= 10000
    ? pageNumber : 1;
  const userId = session.user.id;
  const db = getDb();
  const filter = and(
    eq(documents.userId, userId),
    folderId ? eq(documents.folderId, folderId) : undefined,
    q ? sql`(
      ${documents.title} ILIKE ${"%" + q + "%"}
      OR COALESCE(${documents.sender}, '') ILIKE ${"%" + q + "%"}
      OR EXISTS (
        SELECT 1 FROM document_ocr AS o
        WHERE o.document_id = ${documents.id}
          AND o.user_id = ${userId}
          AND to_tsvector('german', o.text) @@ websearch_to_tsquery('german', ${q})
      )
    )` : undefined,
  );

  const [connections, entries, totals, folderRows, pendingRows] = await Promise.all([
    db.select({
      status: storageConnections.status,
      displayName: storageConnections.displayName,
    }).from(storageConnections).where(eq(storageConnections.userId, userId)).limit(1),
    db.select({
      id: documents.id, title: documents.title, sender: documents.sender,
      status: documents.status, createdAt: documents.createdAt,
    }).from(documents).where(filter)
      .orderBy(desc(documents.createdAt), desc(documents.id))
      .limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE),
    db.select({ total: sql<number>`count(*)::int` }).from(documents).where(filter),
    db.select({
      id: folders.id, name: folders.name, parentId: folders.parentId,
      driveFolderId: folders.driveFolderId,
    }).from(folders).where(eq(folders.userId, userId)).orderBy(asc(folders.name)).limit(250),
    db.select({
      id: uploadSessions.id, title: uploadSessions.title,
      createdAt: uploadSessions.createdAt, expectedBytes: uploadSessions.expectedBytes,
    }).from(uploadSessions).where(and(
      eq(uploadSessions.userId, userId),
      eq(uploadSessions.status, "uploading"),
      gt(uploadSessions.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60_000)),
    )).orderBy(desc(uploadSessions.createdAt)).limit(15),
  ]);

  const notice = params.drive === "failed"
    ? "Google Drive konnte nicht verbunden werden. Bitte Berechtigung prüfen."
    : params.drive === "different_account"
      ? "Ein anderes Google-Konto ist bereits verbunden. Kontowechsel würde Dateiverknüpfungen beschädigen."
      : params.drive === "connected" ? "Google Drive wurde verbunden." : null;
  const total = totals[0]?.total ?? 0;

  return <ArchiveShell
    notice={notice}
    displayName={session.user.name}
    connected={connections[0]?.status === "connected"}
    connectionStatus={connections[0]?.status ?? "not_connected"}
    accountLabel={connections[0]?.displayName ?? null}
    documents={entries.map(item => ({ ...item, createdAt: item.createdAt.toISOString() }))}
    folders={folderRows.map(row => ({
      id: row.id, name: row.name, parentId: row.parentId, ready: !!row.driveFolderId,
    }))}
    pending={pendingRows.map(row => ({
      ...row, createdAt: row.createdAt.toISOString(),
    }))}
    selectedFolderId={folderId}
    total={total}
    query={q}
    page={page}
    pageCount={Math.max(1, Math.ceil(total / PAGE_SIZE))}
  />;
}
